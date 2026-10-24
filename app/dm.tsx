import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { apiUrl, assetUrl } from './config/api';
import { FramedAvatar } from './components/FramedAvatar';
import { C } from './(tabs)/sensor';

const BACKEND_URL = apiUrl('');
const T = C;

export default function DMScreen() {
  const router = useRouter();
  const { targetUserId, targetName, targetUsername, targetAvatarUrl, targetProfileFrame } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [myUserId, setMyUserId] = useState<number>(0);
  const [myBubbleColor, setMyBubbleColor] = useState<string>(T.primary);
  const [isLoading, setIsLoading] = useState(true);
  const [keyboardBottom, setKeyboardBottom] = useState(0);
  const [inputHeight, setInputHeight] = useState(76);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const baseBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 28) : Math.max(insets.bottom, 12);
  const inputBottom = keyboardBottom > 0 ? keyboardBottom + 8 : baseBottom;

  useEffect(() => {
    const updateKeyboardBottom = (event: any) => {
      const windowHeight = Dimensions.get('window').height;
      const keyboardTop = event?.endCoordinates?.screenY;
      const nextBottom = typeof keyboardTop === 'number'
        ? Math.max(windowHeight - keyboardTop, 0)
        : event?.endCoordinates?.height || 0;

      setKeyboardBottom(nextBottom);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    };

    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', updateKeyboardBottom);
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardBottom(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        
        let uid = myUserId;
        const stored = await AsyncStorage.getItem('user_data');
        if (stored) {
          const user = JSON.parse(stored);
          uid = user.id;
          setMyUserId(user.id);
          if (user.equippedBubbleColor) setMyBubbleColor(user.equippedBubbleColor);
        } else {
          const meRes = await fetch(apiUrl('/users/me'), { headers: { Authorization: `Bearer ${token}` } });
          const meData = await meRes.json();
          uid = meData.user.id;
          setMyUserId(uid);
          if (meData.user.equippedBubbleColor) setMyBubbleColor(meData.user.equippedBubbleColor);
        }

        const res = await fetch(apiUrl(`/messages/dm/${targetUserId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.log(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [targetUserId]);

  useEffect(() => {
    if (!myUserId) return;
    const initSocket = async () => {
      const token = await AsyncStorage.getItem('access_token');
      socketRef.current = io(BACKEND_URL, { transports: ['websocket'], auth: { token } });
      
      socketRef.current.on('receive_dm', (msg: any) => {
        if (
          (msg.senderId === myUserId && msg.receiverId === Number(targetUserId)) ||
          (msg.senderId === Number(targetUserId) && msg.receiverId === myUserId)
        ) {
          setMessages((prev) => [...prev, msg]);
        }
      });
    };
    initSocket();

    return () => { socketRef.current?.disconnect(); };
  }, [myUserId, targetUserId]);

  const sendMessage = () => {
    if (!inputText.trim() || !socketRef.current) return;
    socketRef.current.emit('send_dm', {
      targetUserId: Number(targetUserId),
      text: inputText.trim()
    });
    setInputText('');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 18) + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <FontAwesome5 name="chevron-left" size={16} color={T.primary} />
        </TouchableOpacity>
        <FramedAvatar
          uri={typeof targetAvatarUrl === 'string' ? assetUrl(targetAvatarUrl) : null}
          name={String(targetName || 'M')}
          frameId={typeof targetProfileFrame === 'string' ? targetProfileFrame : 'none'}
          size={44}
          colors={T}
          backgroundColor={T.primary}
          textColor="#FFFFFF"
          textSize={17}
          style={styles.headerAvatar}
          textStyle={styles.headerAvatarText}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerLabel}>Direkt mesaj</Text>
          <Text style={styles.headerName} numberOfLines={1}>{targetName || 'Mesaj'}</Text>
          {targetUsername ? <Text style={styles.headerUser}>@{targetUsername}</Text> : null}
        </View>
        <View style={styles.headerStatus}>
          <FontAwesome5 solid name="comment-dots" size={14} color={T.primary} />
        </View>
      </View>

      <View style={styles.chatBackground}>
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator color={T.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentContainerStyle={{
              padding: 16,
              gap: 12,
              paddingBottom: inputHeight + inputBottom + 18,
            }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isMe = item.sender?.id === myUserId || item.senderId === myUserId;
              const dateVal = item.createdAt ? new Date(item.createdAt) : new Date();
              return (
                <View style={[styles.bubbleWrapper, isMe ? styles.myBubbleWrapper : styles.theirBubbleWrapper]}>
                  <View style={[styles.bubble, isMe ? [styles.myBubble, { backgroundColor: myBubbleColor }] : styles.theirBubble]}>
                    <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.theirMsgText]}>{item.text}</Text>
                  </View>
                  <Text style={styles.timeText}>
                    {dateVal.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>

      <View
        onLayout={(event) => setInputHeight(event.nativeEvent.layout.height)}
        style={[
          styles.inputArea,
          {
            bottom: inputBottom,
          },
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder="Mesaj yaz..."
          placeholderTextColor={T.textMuted}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <FontAwesome5 name="paper-plane" solid size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: T.softIndigo,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerAvatar: {
    marginRight: 12,
  },
  headerAvatarText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  headerInfo: { flex: 1 },
  headerLabel: { color: T.accent, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, marginBottom: 2 },
  headerName: { fontSize: 19, fontWeight: '900', color: T.textDark },
  headerUser: { fontSize: 12, color: T.textMuted, marginTop: 1, fontWeight: '700' },
  headerStatus: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: T.softIndigo,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  chatBackground: { flex: 1, backgroundColor: T.background },
  inputArea: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    padding: 12,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 12,
  },
  input: {
    flex: 1,
    backgroundColor: T.background,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: T.textDark,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleWrapper: { maxWidth: '80%', marginBottom: 4 },
  myBubbleWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirBubbleWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { padding: 14, borderRadius: 20 },
  myBubble: { backgroundColor: T.primary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 20 },
  myMsgText: { color: '#fff' },
  theirMsgText: { color: T.textDark },
  timeText: { fontSize: 10, color: T.textMuted, marginTop: 4, paddingHorizontal: 4 },
});
