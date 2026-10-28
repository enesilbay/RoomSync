import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { apiUrl } from '@/src/lib/api';
import { logger } from '@/src/lib/logger';
import { appendFile } from '@/src/lib/upload';
import type { ApiMessage, ChatMessage, SearchParam, SocketRef } from '../types';

// DocumentPicker ve ImagePicker varlıklarının ortak alanları.
type PickedAsset = {
  uri: string;
  name?: string;
  fileName?: string | null;
  mimeType?: string;
};

type Options = {
  roomName: SearchParam;
  socketRef: SocketRef;
  safeFullName: string;
  isPremium: boolean;
  isEliteRoom: boolean;
};

// Odanın sohbet geçmişini getirir; hata durumunda reddeder.
async function requestChatHistory(roomName: SearchParam): Promise<ChatMessage[]> {
  const token = await AsyncStorage.getItem('access_token');
  const res = await fetch(apiUrl(`/messages/${roomName}`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.map((m: ApiMessage) => ({
    userId: m.user?.id,
    fullName: m.user?.fullName || 'Bilinmeyen',
    avatarUrl: m.user?.avatarUrl,
    equippedProfileFrame: m.user?.equippedProfileFrame,
    text: m.text,
    type: m.type || 'text',
    fileUrl: m.fileUrl,
    isPremium: m.user?.isPremium || false,
    equippedBubbleColor: m.user?.equippedBubbleColor,
    equippedIcon: m.user?.equippedIcon,
  }));
}

// Lobi sohbeti: geçmiş, mesaj gönderme, dosya/görsel yükleme ve çekmece animasyonu.
export function useChat({ roomName, socketRef, safeFullName, isPremium, isEliteRoom }: Options) {
  const [chatVisible, setChatVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [chatList, setChatList] = useState<ChatMessage[]>([]);
  const [chatAnim] = useState(() => new Animated.Value(0));
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // Oda değişince eski oda mesajlarını render sırasında temizle (effect içinde senkron setState yok).
  // Dizi parametrede kimlik her render değişebilir; URL ile aynı string anahtarı karşılaştır.
  const roomKey = String(roomName);
  const [historyRoom, setHistoryRoom] = useState(roomKey);
  if (historyRoom !== roomKey) {
    setHistoryRoom(roomKey);
    setChatList([]);
  }

  // setState yalnızca promise geri çağrısında.
  const fetchChatHistory = useCallback(
    () =>
      requestChatHistory(roomName).then(setChatList, () => {
        logger.error("Geçmiş yüklenemedi");
      }),
    [roomName],
  );

  useEffect(() => {
    void fetchChatHistory();
  }, [fetchChatHistory]);

  const uploadFile = async (fileAsset: PickedAsset, explicitType: string = 'file') => {
    const formData = new FormData();
    const name = fileAsset.name || fileAsset.fileName || fileAsset.uri.split('/').pop() || '';
    let mimeType = fileAsset.mimeType;
    if (!mimeType || mimeType === 'image' || mimeType === 'success') {
      mimeType = explicitType === 'image' ? 'image/jpeg' : 'application/pdf';
    }

    appendFile(formData, 'file', { uri: fileAsset.uri, name, type: mimeType });
    formData.append('roomName', String(roomName));

    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl('/messages/upload'), {
        method: 'POST', body: formData, headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errText = await res.text();
        logger.debug("Upload failed with status", res.status, errText);
        Alert.alert("Sunucu Hatası", `Kod: ${res.status}\n\nDetay: ${errText.substring(0, 150)}`);
        return;
      }

      const data = await res.json();
      socketRef.current?.emit('send_message', {
        fullName: safeFullName, roomName,
        text: name, type: data.type || explicitType, fileUrl: data.fileUrl, isPremium
      });
    } catch { Alert.alert("Hata", "Dosya yüklenemedi"); }
  };

  const pickDocument = async () => {
    if (!isEliteRoom) {
      Alert.alert('Elite Özellik 👑', 'Belge (PDF) paylaşımı sadece Elite odalarda kullanılabilir.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!result.canceled) {
        uploadFile(result.assets[0], 'file');
      }
    } catch (err) { logger.debug(err); }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (!result.canceled) {
        uploadFile(result.assets[0], 'image');
      }
    } catch (err) { logger.debug(err); }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    socketRef.current?.emit('send_message', { fullName: safeFullName, roomName, text: message, isPremium });
    setMessage('');
  };

  const toggleChat = () => {
    if (!chatVisible) setChatVisible(true);
    Animated.spring(chatAnim, { toValue: chatVisible ? 0 : 1, useNativeDriver: true, tension: 60, friction: 12 }).start(() => {
      if (chatVisible) setChatVisible(false);
    });
  };

  return {
    chatVisible,
    message,
    setMessage,
    chatList,
    setChatList,
    chatAnim,
    flatListRef,
    pickDocument,
    pickImage,
    sendMessage,
    toggleChat,
  };
}
