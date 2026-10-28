import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, Animated,
  Dimensions, ScrollView, Modal, StatusBar, Alert, Image, AppState
} from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client'; 
import { Accelerometer } from 'expo-sensors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Brightness from 'expo-brightness';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { BACKEND_URL, apiUrl, assetUrl } from '@/src/lib/api';
import { FramedAvatar } from '@/src/components/FramedAvatar';
import { C, Theme } from '@/src/theme';

const { width, height } = Dimensions.get('window');
const T = C;

const SOUNDS = [
  { key: 'library', label: 'Kütüphane', icon: 'book', file: require('../../assets/sounds/library.mp3') },
  { key: 'rain',    label: 'Yağmur',    icon: 'cloud-rain', file: require('../../assets/sounds/rain.mp3') },
  { key: 'forest',  label: 'Doğa',      icon: 'leaf', file: require('../../assets/sounds/nature.mp3') },
  { key: 'fire',    label: 'Şömine',    icon: 'fire', file: require('../../assets/sounds/fire.mp3') },
];

const SOUND_PACK_PRESETS: Record<string, typeof SOUNDS> = {
  classic: SOUNDS,
  rainy: [
    { key: 'rain', label: 'Yoğun Yağmur', icon: 'cloud-rain', file: require('../../assets/sounds/rain.mp3') },
    { key: 'library', label: 'Sessiz Kütüphane', icon: 'book', file: require('../../assets/sounds/library.mp3') },
  ],
  forest: [
    { key: 'forest', label: 'Orman', icon: 'leaf', file: require('../../assets/sounds/nature.mp3') },
    { key: 'rain', label: 'Hafif Yağmur', icon: 'cloud-rain', file: require('../../assets/sounds/rain.mp3') },
  ],
  fireplace: [
    { key: 'fire', label: 'Şömine', icon: 'fire', file: require('../../assets/sounds/fire.mp3') },
    { key: 'library', label: 'Sıcak Oda', icon: 'book', file: require('../../assets/sounds/library.mp3') },
  ],
  deep: [
    { key: 'deep_focus', label: 'Derin Odak', icon: 'brain', file: require('../../assets/sounds/library.mp3') },
    { key: 'forest', label: 'Düşük Doğa', icon: 'leaf', file: require('../../assets/sounds/nature.mp3') },
  ],
};

const SOUND_PACK_LABELS: Record<string, string> = {
  classic: 'Klasik Lounge',
  rainy: 'Yağmur Modu',
  forest: 'Orman Odası',
  fireplace: 'Şömine Köşesi',
  deep: 'Derin Odak',
};

const POMODORO_OPTIONS = [
  { label: '15 dk', minutes: 15 }, { label: '25 dk', minutes: 25 }, 
  { label: '45 dk', minutes: 45 }, { label: '60 dk', minutes: 60 },
];

const FLAT_Z_THRESHOLD = 0.8;
const FLAT_AXIS_THRESHOLD = 0.3;

type Friend = {
  id: number;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  equippedProfileFrame?: string;
  isOnline?: boolean;
  currentRoom?: string | null;
};

const pad = (n: number) => String(n).padStart(2, '0');

// ── DEKORATIF ARKAPLAN NOKTALARI ──
function BackgroundOrbs({ isElite }: { isElite?: boolean }) {
  return (
    <>
      <View style={[bg.orb1, isElite && { backgroundColor: T.lightAmber, opacity: 0.8 }]} />
      <View style={[bg.orb2, isElite && { backgroundColor: T.softIndigo, opacity: 0.7 }]} />
      <View style={[bg.orb3, isElite && { backgroundColor: T.softInfo, opacity: 0.6 }]} />
    </>
  );
}

export default function SensorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, fullName, roomName, score } = params;

  const routeUserId = Number(id);
  const safeFullName = typeof fullName === 'string' && fullName.trim() !== '' ? fullName : 'Öğrenci';

  const isFocused = useIsFocused();
  // Uygulama arka plana gecince (baska uygulama, ekrani kilitleme) odak durur; sensor yalnizca on plandayken okunur.
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  const [totalScore, setTotalScore] = useState(Number(score) || 0);
  const [storedUserId, setStoredUserId] = useState<number | null>(Number.isFinite(routeUserId) ? routeUserId : null);
  const [isAtDesk, setIsAtDesk] = useState(false);
  const [isPremium, setIsPremium] = useState(false); 
  const [isConnected, setIsConnected] = useState(true);

  const isEliteRoom = params.isElite === 'true';
  const myUserId = storedUserId ?? routeUserId;

  const [availableSounds, setAvailableSounds] = useState(SOUNDS);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [equippedSoundPack, setEquippedSoundPack] = useState('classic');
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [showMixer, setShowMixer] = useState(false);
  const soundsMapRef = useRef<Record<string, Audio.Sound>>({});

  useEffect(() => {
    const selectedSounds = SOUND_PACK_PRESETS[equippedSoundPack] || SOUNDS;
    const finalSounds = isEliteRoom && equippedSoundPack !== 'deep'
      ? [{ key: 'deep_focus', label: 'Derin Odak', icon: 'brain', file: require('../../assets/sounds/library.mp3') }, ...selectedSounds]
      : selectedSounds;

    setAvailableSounds(finalSounds);
    setVolumes({ [finalSounds[0].key]: 1 });
  }, [isEliteRoom, equippedSoundPack]);

  const [chatVisible, setChatVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [chatList, setChatList] = useState<any[]>([]);
  const chatAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const [roomUsers, setRoomUsers] = useState<any[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<Friend[]>([]);

  // Nudge (Dürtme) toast state'leri
  const [nudgeToast, setNudgeToast] = useState<{ message: string; senderName: string } | null>(null);
  const nudgeAnim = useRef(new Animated.Value(0)).current;
  const nudgeTimer = useRef<any>(null);

  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [pomodoroSec, setPomodoroSec] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [focusRequested, setFocusRequested] = useState(false);
  const [isPhoneFaceDownOnDesk, setIsPhoneFaceDownOnDesk] = useState(false);
  const [focusScreenDimmed, setFocusScreenDimmed] = useState(false);
  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const pomTimerRef = useRef<any>(null); 
  const pomAnim = useRef(new Animated.Value(1)).current;

  const socketRef = useRef<any>(null);
  const previousDeskState = useRef<boolean | null>(null);
  const brightnessBeforeFocusRef = useRef<number | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
    checkPremiumStatus();
  }, []);

  useEffect(() => {
    fetchChatHistory();
  }, [roomName]);

  useEffect(() => {
    if (isFocused) {
      checkPremiumStatus();
      fetchOnlineFriends();
    }
  }, [isFocused, roomName]);

  const checkPremiumStatus = async () => {
    const stored = await AsyncStorage.getItem('user_data');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed.id === 'number') {
        setStoredUserId(parsed.id);
      }
      if (typeof parsed.equippedSoundPack === 'string') {
        setEquippedSoundPack(parsed.equippedSoundPack);
      }
      setIsPremium(parsed.isPremium === true);
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const res = await fetch(apiUrl('/users/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.user) {
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        if (typeof data.user.id === 'number') {
          setStoredUserId(data.user.id);
        }
        if (typeof data.user.equippedSoundPack === 'string') {
          setEquippedSoundPack(data.user.equippedSoundPack);
        }
        setIsPremium(data.user.isPremium === true);
      }
    } catch {
      console.log('Kullanıcı tercihleri güncellenemedi');
    }
  };

  const fetchChatHistory = async () => {
    setChatList([]); // Eski oda mesajlarını temizle
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl(`/messages/${roomName}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setChatList(data.map((m: any) => ({
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
      })));
    } catch (e) { console.error("Geçmiş yüklenemedi"); }
  };

  const fetchOnlineFriends = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl('/users/friends/0'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setOnlineFriends((Array.isArray(data) ? data : []).filter((friend: Friend) => friend.isOnline));
    } catch {
      console.log('Online arkadaşlar yüklenemedi');
    }
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
    } catch (err) { console.log(err); }
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
    } catch (err) { console.log(err); }
  };

  const uploadFile = async (fileAsset: any, explicitType: string = 'file') => {
    const formData = new FormData();
    // @ts-ignore
    const name = fileAsset.name || fileAsset.fileName || fileAsset.uri.split('/').pop();
    let mimeType = fileAsset.mimeType;
    if (!mimeType || mimeType === 'image' || mimeType === 'success') {
      mimeType = explicitType === 'image' ? 'image/jpeg' : 'application/pdf';
    }
    
    formData.append('file', { uri: fileAsset.uri, name, type: mimeType } as any);
    formData.append('roomName', String(roomName));

    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl('/messages/upload'), {
        method: 'POST', body: formData, headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const errText = await res.text();
        console.log("Upload failed with status", res.status, errText);
        Alert.alert("Sunucu Hatası", `Kod: ${res.status}\n\nDetay: ${errText.substring(0, 150)}`);
        return;
      }
      
      const data = await res.json();
      socketRef.current?.emit('send_message', {
        fullName: safeFullName, roomName, 
        text: name, type: data.type || explicitType, fileUrl: data.fileUrl, isPremium
      });
    } catch (e) { Alert.alert("Hata", "Dosya yüklenemedi"); }
  };

  // ── SES MİKSERİ (SOUND MIXER) MANTIĞI ──
  useEffect(() => {
    let isMounted = true;
    
    async function initSounds() {
      // Önceki sesleri temizle
      for (const key in soundsMapRef.current) {
         soundsMapRef.current[key].unloadAsync().catch(()=>{});
      }
      soundsMapRef.current = {};

      // Yeni sesleri yükle (başlangıçta sessiz ve durdurulmuş şekilde)
      for (const s of availableSounds) {
        if (!isMounted) break;
        try {
          const { sound } = await Audio.Sound.createAsync(s.file, { isLooping: true, volume: 0 });
          soundsMapRef.current[s.key] = sound;
        } catch (e) {
          console.log("Ses yüklenemedi", s.key);
        }
      }
    }
    initSounds();

    return () => {
      isMounted = false;
      for (const key in soundsMapRef.current) {
        soundsMapRef.current[key].unloadAsync().catch(()=>{});
      }
    };
  }, [availableSounds]);

  useEffect(() => {
    async function syncPlayback() {
      const shouldPlay = isSoundOn && isAtDesk && isFocused;
      
      for (const key in soundsMapRef.current) {
        const sound = soundsMapRef.current[key];
        const vol = volumes[key] || 0;
        
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            await sound.setVolumeAsync(vol);
            if (shouldPlay && vol > 0) {
              if (!status.isPlaying) await sound.playAsync();
            } else {
              if (status.isPlaying) await sound.pauseAsync();
            }
          }
        } catch(e){}
      }
    }
    syncPlayback();
  }, [isAtDesk, isSoundOn, isFocused, volumes]);

  const handleSingleSoundSelect = (key: string) => {
    const newVolumes: Record<string, number> = {};
    availableSounds.forEach(s => newVolumes[s.key] = s.key === key ? 1 : 0);
    setVolumes(newVolumes);
    setIsSoundOn(true);
  };

  const updateMixerVolume = (key: string, val: number) => {
    setVolumes(prev => ({ ...prev, [key]: val }));
    setIsSoundOn(true);
  };

  useEffect(() => {
    if (pomodoroRunning && isAtDesk) {
      pomTimerRef.current = setInterval(() => {
        setPomodoroSec((prev) => (
          prev <= 1
            ? (clearInterval(pomTimerRef.current), setPomodoroRunning(false), setFocusRequested(false), 0)
            : prev - 1
        ));
      }, 1000);
    } else {
      clearInterval(pomTimerRef.current);
    }
    return () => clearInterval(pomTimerRef.current);
  }, [pomodoroRunning, isAtDesk]);

  const startPomodoro = (minutes: number) => {
    setPomodoroMinutes(minutes); setPomodoroSec(minutes * 60);
    setPomodoroRunning(true); setShowPomodoroModal(false);
  };

  const startFocusSession = () => {
    if (pomodoroSec === 0) {
      setPomodoroSec(pomodoroMinutes * 60);
    }
    setFocusRequested(true);
    setPomodoroRunning(true);
  };

  const togglePomodoro = () => {
    if (pomodoroSec === 0) {
      startPomodoro(pomodoroMinutes);
      return;
    }

    const nextRunning = !pomodoroRunning;
    setPomodoroRunning(nextRunning);
    if (!nextRunning) {
      setFocusRequested(false);
    }
  };

  const restoreFocusBrightness = async () => {
    if (Platform.OS === 'web' || brightnessBeforeFocusRef.current === null) return;

    const brightness = brightnessBeforeFocusRef.current;
    brightnessBeforeFocusRef.current = null;

    try {
      await Brightness.setBrightnessAsync(brightness);
    } catch {
      console.log('Parlaklık geri yüklenemedi');
    }
  };

  useEffect(() => {
    const initSocket = async () => {
      const token = await AsyncStorage.getItem('access_token');
      socketRef.current = io(BACKEND_URL, { transports: ['websocket'], auth: { token } });
      socketRef.current.on('connect', () => {
        setIsConnected(true);
        socketRef.current?.emit('join_lobby', { roomName, fullName: safeFullName, maxUsers: params.maxUsers });
      });
      socketRef.current.on('disconnect', () => {
        setIsConnected(false);
      });
      
      socketRef.current.on('room_users', (users: any[]) => {
        setRoomUsers(users);
        const me = users.find(u => Number(u.userId) === myUserId);
        if (me && typeof me.score === 'number') setTotalScore(me.score);
      });
      
      socketRef.current.on('receive_message', (msg: any) => {
        setChatList(prev => [...prev, msg]);
      });
      
      socketRef.current.on('score_updated', (data: any) => {
        if (Number(data.userId) === myUserId) setTotalScore(data.newTotal);
      });

      // Dürtme (Nudge) alındığında toast göster
      socketRef.current.on('nudge_received', (data: { senderName: string; message: string }) => {
        showNudgeToast(data.senderName, data.message);
      });

      // AŞAMA 4: DÜELLO
      socketRef.current.on('duel_received', (data: any) => {
        Alert.alert(
          '⚔️ Düello Teklifi!',
          `${data.challengerName} sana ${data.betAmount} Odak Puanlık bir düello teklif etti! Kabul edersen masadan telefonunu ilk kaldıran kaybeder. Kabul ediyor musun?`,
          [
            { text: 'Reddet', style: 'cancel' },
            { 
              text: 'Kabul Et', 
              onPress: () => {
                socketRef.current?.emit('accept_duel', { duelId: data.duelId });
              }
            }
          ]
        );
      });

      socketRef.current.on('duel_started', (data: any) => {
        Alert.alert('⚔️ Düello Başladı!', `${data.opponentName} ile düellodasın! Telefonu masadan ilk kaldıran ${data.betAmount} puan kaybeder.`);
      });

      socketRef.current.on('duel_ended', (data: any) => {
        if (data.winner) {
          Alert.alert('🏆 Düelloyu Kazandın!', `Tebrikler! ${data.opponentName} pes etti. ${data.betAmount * 2} puan kazandın!`);
        } else {
          Alert.alert('💀 Düelloyu Kaybettin!', `Odaktan koptun! ${data.betAmount} puan kaybettin.`);
        }
      });

      socketRef.current.on('error', (data: any) => {
        Alert.alert('Uyarı', data.message);
      });

      socketRef.current.on('atmosphere_updated', (data: any) => {
        Alert.alert(
          '🎵 Atmosfer Senkronu',
          `${data.ownerName} odanın atmosferini paylaştı. Bu ses ayarlarını kendi cihazına uygulamak ister misin?`,
          [
            { text: 'Hayır', style: 'cancel' },
            { 
              text: 'Uygula', 
              onPress: () => {
                setVolumes(data.volumes);
                Alert.alert('Başarılı', 'Atmosfer senkronize edildi!');
              }
            }
          ]
        );
      });
    };
    if (isFocused) {
      initSocket();
    }
    
    return () => { socketRef.current?.disconnect(); };
  }, [roomName, isFocused]);

  useEffect(() => {
    let sub: any = null;
    if (isFocused && appActive) {
      if (Platform.OS === 'web') {
        sub = { remove: () => {} };
      } else {
        sub = Accelerometer.addListener(({ x, y, z }) => {
          const isPhoneFaceDown =
            z < -FLAT_Z_THRESHOLD &&
            Math.abs(x) < FLAT_AXIS_THRESHOLD &&
            Math.abs(y) < FLAT_AXIS_THRESHOLD;
          const isPhoneFlat =
            Math.abs(z) > FLAT_Z_THRESHOLD &&
            Math.abs(x) < FLAT_AXIS_THRESHOLD &&
            Math.abs(y) < FLAT_AXIS_THRESHOLD;
          const flat = isPhoneFlat && focusRequested; // Odak istendiğinde telefon iki yönde de masadaysa odaklanma başlar
          setIsPhoneFaceDownOnDesk(isPhoneFaceDown);
          
          if (flat) {
            if (previousDeskState.current !== true) {
              setIsAtDesk(true);
              if (socketRef.current?.connected) {
                socketRef.current.emit('update_presence', { isAtDesk: true, roomName });
              }
              previousDeskState.current = true;
            }
          } else {
            if (previousDeskState.current === true) {
              setIsAtDesk(false);
              if (socketRef.current?.connected) {
                socketRef.current.emit('update_presence', { isAtDesk: false, roomName });
              }
              previousDeskState.current = false;
            } else {
              setIsAtDesk(false);
            }
          }
        });
      }
    } else {
      setIsAtDesk(false);
      setIsPhoneFaceDownOnDesk(false);
      if (socketRef.current?.connected && previousDeskState.current !== false) {
        socketRef.current.emit('update_presence', { isAtDesk: false, roomName });
        previousDeskState.current = false;
      }
    }
    return () => {
      if (sub && typeof sub.remove === 'function') sub.remove();
      setIsPhoneFaceDownOnDesk(false);
    };
  }, [isFocused, appActive, focusRequested, roomName]);

  // Odak modu acikken ekran kendiliginden kilitlenmesin (parlaklik zaten kisiliyor);
  // aksi halde telefon masada dururken uygulama arka plana duser ve odak kesilir.
  useEffect(() => {
    if (Platform.OS === 'web' || !isFocused || !focusRequested) return;
    const tag = 'roomsync-focus';
    activateKeepAwakeAsync(tag).catch(() => undefined);
    return () => {
      deactivateKeepAwake(tag).catch(() => undefined);
    };
  }, [isFocused, focusRequested]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setFocusScreenDimmed(false);
      return;
    }

    let mounted = true;
    const shouldDimScreen = isFocused && isAtDesk && isPhoneFaceDownOnDesk && focusRequested;

    const syncScreenBrightness = async () => {
      if (shouldDimScreen) {
        try {
          if (brightnessBeforeFocusRef.current === null) {
            brightnessBeforeFocusRef.current = await Brightness.getBrightnessAsync();
          }
          await Brightness.setBrightnessAsync(0);
          if (mounted) setFocusScreenDimmed(true);
        } catch {
          console.log('Odak ekranı karartılamadı');
        }
      } else {
        if (mounted) setFocusScreenDimmed(false);
        await restoreFocusBrightness();
      }
    };

    syncScreenBrightness();

    return () => {
      mounted = false;
    };
  }, [isFocused, isAtDesk, isPhoneFaceDownOnDesk, focusRequested]);

  useEffect(() => {
    return () => {
      restoreFocusBrightness();
    };
  }, []);

  // Web'de sensörü simüle etmek için
  const toggleWebSensor = () => {
    const newState = !isAtDesk;
    setIsAtDesk(newState);
    if (socketRef.current?.connected) {
      socketRef.current.emit('update_presence', { isAtDesk: newState, roomName });
    }
    previousDeskState.current = newState;
  };


  // Nudge: Toast animasyonunu göster
  const showNudgeToast = (senderName: string, message: string) => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    setNudgeToast({ message, senderName });
    Animated.spring(nudgeAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }).start();
    nudgeTimer.current = setTimeout(() => {
      Animated.timing(nudgeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setNudgeToast(null);
      });
    }, 4000);
  };

  // Nudge: Odadaki bir kullanıcıya dürtme gönder
  const sendNudge = (targetUserId: number, targetName: string) => {
    if (targetUserId === myUserId) return;
    socketRef.current?.emit('nudge_friend', {
      targetUserId,
      senderName: safeFullName,
      roomName,
    });
    Alert.alert('Davet gönderildi', `${targetName} ${roomName} odasına çağrıldı.`);
  };

  const roomUserIds = new Set(roomUsers.map((u) => Number(u.userId)));
  const inviteableFriends = onlineFriends.filter((friend) => !roomUserIds.has(Number(friend.id)));
  const otherRoomUsers = roomUsers.filter(u => Number(u.userId) !== myUserId);

  const challengeDuel = (targetId: number, targetName: string) => {
    if (targetId === myUserId) return;
    Alert.alert(
      '⚔️ Düello İsteği',
      `${targetName} adlı kullanıcıya düello isteği göndermek istediğine emin misin? (Bahis: 50 Puan)`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Gönder', onPress: () => {
            socketRef.current?.emit('challenge_duel', {
              targetUserId: targetId,
              betAmount: 50,
              roomName: roomName
            });
        }}
      ]
    );
  };

  const broadcastAtmosphere = () => {
    if (!isPremium) return;
    socketRef.current?.emit('broadcast_atmosphere', {
      volumes,
      roomName
    });
    Alert.alert('🎵 Yayınlandı', 'Ses ayarların odadaki diğer kullanıcılarla paylaşıldı!');
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

  const openLink = async (url: string | null) => {
    if (!url) return;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      Alert.alert("Tarayıcı Bulunamadı", `Cihazınızda bağlantıyı açacak bir tarayıcı yok:\n\n${url}`);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar hidden={focusScreenDimmed} barStyle="dark-content" backgroundColor={T.background} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackgroundOrbs isElite={isEliteRoom} />
      </View>

      <Animated.ScrollView contentContainerStyle={s.scroll} style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        
        {!isConnected && (
          <View style={s.offlineBanner}>
            <Text style={s.offlineText}>Bağlantı koptu, yeniden bağlanılıyor...</Text>
          </View>
        )}

        {/* HEADER */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.replace('/lobbies')} style={s.backBtn}>
            <FontAwesome5 solid name="chevron-left" size={16} color={T.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[s.headerRoom, isEliteRoom && { color: T.accent }]}>
                {isEliteRoom ? 'ELITE ODA' : 'ODAK ODASI'}
              </Text>
              {isEliteRoom && (
                <View style={{ backgroundColor: T.lightAmber, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: T.accent }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: T.accent, letterSpacing: 0.5 }}>+2x PUAN</Text>
                </View>
              )}
            </View>
            <Text style={[s.headerName, isEliteRoom && { color: T.accent }]} numberOfLines={1}>{roomName}</Text>
          </View>
          <View style={s.scorePill}>
            <FontAwesome5 solid name="fire" size={12} color={T.accent} />
            <Text style={s.scoreText}>{totalScore}</Text>
          </View>
        </View>

        {/* STATUS CARD */}
        <View style={[s.statusCard, isAtDesk && (isEliteRoom ? s.statusCardEliteActive : s.statusCardActive)]}>
          <View style={[s.statusIcon, isAtDesk && (isEliteRoom ? { backgroundColor: T.lightAmber, borderColor: T.accent } : { backgroundColor: T.softSuccess, borderColor: T.success })]}>
            <FontAwesome5 solid name={isAtDesk ? "check-circle" : "clock"} size={26} color={isAtDesk ? (isEliteRoom ? T.accent : T.success) : T.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.statusTitle, isAtDesk && { color: isEliteRoom ? T.accent : T.success }]}>{isAtDesk ? 'Odaklanıyor' : 'Bekleniyor...'}</Text>
            <Text style={s.statusDesc}>
              {isAtDesk 
                ? (isEliteRoom ? 'Elite mod aktif! Çarpan ile x2 Puan kazanıyorsun.' : 'Cihaz masada, odak puanı kazanıyorsun.') 
                : (isEliteRoom ? 'Puan kazanmak için telefonu ters çevirip masaya bırakın.' : 'Puan kazanmak için telefonu ters çevirip masaya bırakın.')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={startFocusSession}
          disabled={focusRequested && pomodoroRunning}
          activeOpacity={0.88}
          style={[s.focusStartBtn, focusRequested && pomodoroRunning && s.focusStartBtnActive]}
        >
          <LinearGradient
            colors={focusRequested && pomodoroRunning ? [T.success, T.success] : [T.primary, T.secondary]}
            style={s.focusStartGrad}
          >
            <FontAwesome5 solid name={focusRequested && pomodoroRunning ? 'check-circle' : 'bullseye'} size={16} color="#FFFFFF" />
            <Text style={s.focusStartText}>
              {focusRequested && pomodoroRunning ? 'Odaklanma Hazır' : 'Odaklanmayı Başlat'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* WEB İÇİN MANUEL SENSÖR SİMÜLASYONU */}
        {Platform.OS === 'web' && (
          <TouchableOpacity 
            onPress={toggleWebSensor} 
            style={{ backgroundColor: isAtDesk ? T.softDanger : T.softSuccess, padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: isAtDesk ? T.danger : T.success }}
          >
            <Text style={{ color: isAtDesk ? T.danger : T.success, fontWeight: 'bold' }}>
              [Web Test] {isAtDesk ? 'Masadan Kalk' : 'Masaya Geç'}
            </Text>
          </TouchableOpacity>
        )}

        {/* POMODORO */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>POMODORO SAYACI</Text>
          <View style={s.pomodoroCard}>
            <Animated.View style={[s.timerInner, pomodoroRunning && { borderColor: T.primary, shadowColor: T.primary, shadowOffset: {width:0, height:0}, shadowOpacity: 0.3, shadowRadius: 10 }]}>
              <Text style={s.timerText}>{pad(Math.floor(pomodoroSec / 60))}:{pad(pomodoroSec % 60)}</Text>
            </Animated.View>
            <View style={{ flex: 1, flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowPomodoroModal(true)} style={s.pomSettingsBtn}>
                <FontAwesome5 solid name="sliders-h" size={16} color={T.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={togglePomodoro}>
                <LinearGradient colors={pomodoroRunning ? [T.border, T.border] : [T.primary, T.secondary]} style={s.pomPlayBtn}>
                  <FontAwesome5 solid name={pomodoroRunning ? "pause" : "play"} size={16} color={pomodoroRunning ? T.textDark : '#FFFFFF'} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ATMOSFER & MIXER */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={s.sectionLabel}>ATMOSFER SESİ</Text>
              <Text style={s.soundPackLabel}>{SOUND_PACK_LABELS[equippedSoundPack] || 'Klasik Lounge'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
              <TouchableOpacity onPress={() => {
                if (!isPremium) {
                  Alert.alert('PRO Özellik', 'Ses mikseri sadece Premium kullanıcılara özeldir.', [
                    { text: 'İptal', style: 'cancel' },
                    { text: 'Premium Ol', onPress: () => router.push({ pathname: '/premium', params: { id: myUserId } } as any) }
                  ]);
                  return;
                }
                setShowMixer(true);
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isPremium ? T.lightAmber : T.softIndigo, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: isPremium ? T.accent : T.border }}>
                  <FontAwesome5 solid name="sliders-h" size={12} color={isPremium ? T.accent : T.textMuted} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isPremium ? T.accent : T.textMuted }}>MİKSER</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsSoundOn(!isSoundOn)}>
                <FontAwesome5 solid name={isSoundOn ? "volume-up" : "volume-mute"} size={16} color={isSoundOn ? T.primary : T.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {availableSounds.map(sItem => {
              const active = (volumes[sItem.key] || 0) > 0;
              return (
                <TouchableOpacity key={sItem.key} onPress={() => handleSingleSoundSelect(sItem.key)} style={[s.soundTile, active && s.soundTileActive]}>
                  <FontAwesome5 solid name={sItem.icon} size={20} color={active ? '#FFFFFF' : T.textMuted} />
                  <Text style={[s.soundText, active && { color: '#FFFFFF' }]}>{sItem.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* NUDGE TOAST BANNER */}
        {nudgeToast && (
          <Animated.View
            style={[
              s.nudgeToast,
              { opacity: nudgeAnim, transform: [{ translateY: nudgeAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.nudgeToastTitle}>{nudgeToast.senderName} seni çağırıyor!</Text>
              <Text style={s.nudgeToastSub}>Birlikte çalışmaya davet edildiniz.</Text>
            </View>
          </Animated.View>
        )}

        {/* ONLINE ARKADAŞ DAVETLERİ */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ONLINE ARKADAŞLAR ({inviteableFriends.length})</Text>
          {inviteableFriends.length === 0 ? (
            <View style={s.inviteEmpty}>
              <FontAwesome5 solid name="user-clock" size={15} color={T.textMuted} />
              <Text style={s.inviteEmptyText}>Davet edilecek çevrimiçi arkadaş yok.</Text>
            </View>
          ) : (
            <View style={s.usersWrap}>
              {inviteableFriends.map((friend) => (
                <View key={friend.id} style={s.inviteChip}>
                  <View>
                    <FramedAvatar
                      uri={assetUrl(friend.avatarUrl)}
                      name={friend.fullName}
                      frameId={friend.equippedProfileFrame}
                      size={28}
                      colors={T}
                      backgroundColor={T.softIndigo}
                      textSize={12}
                    />
                    <View style={[s.userDot, { backgroundColor: T.success }]} />
                  </View>
                  <View style={s.inviteInfo}>
                    <Text style={s.inviteName} numberOfLines={1}>{friend.fullName?.split(' ')[0] || 'Arkadaş'}</Text>
                    <Text style={s.inviteSub} numberOfLines={1}>
                      {friend.currentRoom ? `${friend.currentRoom} odasında` : 'Çevrimiçi'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => sendNudge(Number(friend.id), friend.fullName?.split(' ')[0] || 'Arkadaş')}
                    style={s.inviteBtn}
                  >
                    <FontAwesome5 solid name="paper-plane" size={11} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* AKTİF KULLANICILAR */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ODADAKİLER ({otherRoomUsers.length})</Text>
          <View style={s.usersWrap}>
            {otherRoomUsers.map((u, i) => (
              <View key={i} style={[s.userChip, isEliteRoom && u.isAtDesk && { borderColor: T.accent, backgroundColor: T.lightAmber }]}>
                <View>
                  <FramedAvatar
                    uri={assetUrl(u.avatarUrl)}
                    name={u.fullName}
                    frameId={u.equippedProfileFrame}
                    size={28}
                    colors={T}
                    backgroundColor={T.softIndigo}
                    textSize={12}
                  />
                  <View style={[s.userDot, { backgroundColor: u.isAtDesk ? (isEliteRoom ? T.accent : T.success) : T.textMuted }]} />
                </View>
                <Text style={{ color: T.textDark, fontSize: 13, fontWeight: '500' }}>{u.fullName?.split(' ')[0]}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => challengeDuel(Number(u.userId), u.fullName?.split(' ')[0] || 'Arkadaş')}
                    style={[s.nudgeBtn, { backgroundColor: T.danger }]}
                  >
                    <Text style={s.nudgeBtnText}>⚔️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* CHAT DRAWER */}
      {chatVisible && (
        <Animated.View style={[s.chatDrawer, { transform: [{ translateY: chatAnim.interpolate({ inputRange: [0, 1], outputRange: [height * 0.6, 0] }) }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={s.chatHeader}>
              <Text style={s.chatTitle}>Lobi Sohbeti</Text>
              <TouchableOpacity onPress={toggleChat} style={s.chatCloseBtn}>
                <FontAwesome5 solid name="times" size={16} color={T.textMuted} />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={flatListRef} data={chatList} keyExtractor={(_, i) => i.toString()} style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 12 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
              renderItem={({ item }) => {
                const isMe = item.userId === myUserId;
                const isFile = item.type === 'file';
                const isImage = item.type === 'image';
                const bubbleColor = typeof item.equippedBubbleColor === 'string' && item.equippedBubbleColor.trim()
                  ? item.equippedBubbleColor
                  : undefined;
                const equippedIcon = typeof item.equippedIcon === 'string' ? item.equippedIcon : '';
                return (
                  <View style={[
                    s.bubble,
                    isMe ? s.bubbleMe : s.bubbleOther,
                    bubbleColor && { backgroundColor: bubbleColor, borderColor: bubbleColor },
                  ]}>
                    {!isMe && (
                      <View style={s.bubbleUserRow}>
                        <FramedAvatar
                          uri={assetUrl(item.avatarUrl)}
                          name={item.fullName}
                          frameId={item.equippedProfileFrame}
                          size={24}
                          colors={T}
                          backgroundColor={T.softIndigo}
                          textSize={10}
                          activeBorderWidth={2}
                        />
                        <Text style={s.bubbleUser}>
                          {item.fullName?.split(' ')[0]} {equippedIcon ? <Text style={s.equippedNameIcon}>{equippedIcon}</Text> : null} {item.isPremium && <FontAwesome5 solid name="crown" size={10} color={T.accent} />}
                        </Text>
                      </View>
                    )}
                    {isImage ? (
                      <TouchableOpacity onPress={() => openLink(assetUrl(item.fileUrl))}>
                        <Image source={{ uri: assetUrl(item.fileUrl) ?? '' }} style={s.imagePreview} />
                      </TouchableOpacity>
                    ) : isFile ? (
                      <TouchableOpacity style={s.fileCard} onPress={() => openLink(assetUrl(item.fileUrl))}>
                        <View style={s.fileIconWrap}><FontAwesome5 solid name="file-pdf" size={16} color={T.danger} /></View>
                        <Text style={s.fileName} numberOfLines={1}>{item.text}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={[s.messageText, (isMe || bubbleColor) && s.messageTextOnColor]}>{item.text}</Text>
                    )}
                  </View>
                );
              }}
            />

            <View style={s.chatInputRow}>
              <TouchableOpacity onPress={pickImage} style={s.attachBtn}><FontAwesome5 solid name="image" size={18} color={T.primary} /></TouchableOpacity>
              <TouchableOpacity onPress={pickDocument} style={s.attachBtn}><FontAwesome5 solid name="paperclip" size={18} color={T.primary} /></TouchableOpacity>
              <TextInput
                style={s.chatInput} value={message} onChangeText={setMessage}
                placeholder="Mesaj yaz..." placeholderTextColor={T.textMuted}
              />
              <TouchableOpacity onPress={sendMessage} style={s.sendBtn}>
                <LinearGradient colors={[T.primary, T.secondary]} style={s.sendBtnGrad}>
                  <FontAwesome5 solid name="paper-plane" size={14} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {!chatVisible && (
        <TouchableOpacity style={s.fab} onPress={toggleChat}>
          <LinearGradient colors={[T.primary, T.secondary]} style={s.fabGrad}>
            <FontAwesome5 solid name="comment-dots" size={22} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
      
      {/* POMODORO MODAL */}
      <Modal visible={showPomodoroModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Pomodoro Süresi</Text>
            {POMODORO_OPTIONS.map(o => (
              <TouchableOpacity key={o.minutes} onPress={() => startPomodoro(o.minutes)} style={s.modalOpt}>
                <Text style={s.modalOptText}>{o.label}</Text>
                <FontAwesome5 solid name="chevron-right" size={12} color={T.textMuted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.modalOpt, { justifyContent: 'center', borderBottomWidth: 0, marginTop: 10 }]} onPress={() => setShowPomodoroModal(false)}>
              <Text style={{ color: T.danger, fontWeight: 'bold' }}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MIXER MODAL */}
      <Modal visible={showMixer} transparent animationType="slide">
        <View style={[s.modalOverlay, { justifyContent: 'flex-end' }]}>
          <View style={[s.modalSheet, { width: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 40 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View>
                <Text style={s.modalTitle}>Ses Mikseri</Text>
                <Text style={{ color: T.textMuted, fontSize: 12 }}>Kendi çalışma ortamını yarat.</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {isPremium && (
                  <TouchableOpacity onPress={broadcastAtmosphere} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                    <FontAwesome5 name="broadcast-tower" size={10} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>YAYINLA</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowMixer(false)} style={{ padding: 5 }}>
                  <FontAwesome5 solid name="times" size={20} color={T.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            
            {availableSounds.map(sItem => (
              <View key={sItem.key} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <FontAwesome5 solid name={sItem.icon} size={14} color={T.primary} />
                    <Text style={{ color: T.textDark, fontWeight: '600' }}>{sItem.label}</Text>
                  </View>
                  <Text style={{ color: T.textMuted, fontSize: 12 }}>{Math.round((volumes[sItem.key] || 0) * 100)}%</Text>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0}
                  maximumValue={1}
                  value={volumes[sItem.key] || 0}
                  onValueChange={(val) => updateMixerVolume(sItem.key, val)}
                  minimumTrackTintColor={T.primary}
                  maximumTrackTintColor={T.border}
                  thumbTintColor={T.primary}
                />
              </View>
            ))}
          </View>
        </View>
      </Modal>

      {focusScreenDimmed && <View pointerEvents="auto" style={s.focusBlackout} />}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STİLLER
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },
  focusBlackout: { ...StyleSheet.absoluteFillObject, backgroundColor: T.screenOff, zIndex: 9999, elevation: 9999 },
  scroll: { paddingHorizontal: 22, paddingTop: 15 },
  offlineBanner: { backgroundColor: T.softDanger, padding: 10, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: T.danger, alignItems: 'center' },
  offlineText: { color: T.danger, fontSize: 13, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', ...Theme.shadows.soft },
  headerRoom: { fontSize: 12, color: T.accent, fontWeight: '800', letterSpacing: 1 },
  headerName: { fontSize: 24, fontWeight: '900', color: T.textDark },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.lightAmber, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: T.accent },
  scoreText: { color: T.accent, fontWeight: '900', fontSize: 16 },
  
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  statusCardActive: { borderColor: T.success, backgroundColor: T.softSuccess },
  statusCardEliteActive: { borderColor: T.accent, backgroundColor: T.lightAmber },
  statusIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: T.background, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  statusTitle: { fontSize: 17, fontWeight: '800', color: T.textDark, marginBottom: 3 },
  statusDesc: { fontSize: 12, color: T.textMuted },
  focusStartBtn: { borderRadius: 18, overflow: 'hidden', marginTop: -12, marginBottom: 24, ...Theme.shadows.medium },
  focusStartBtnActive: { opacity: 0.88 },
  focusStartGrad: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  focusStartText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  
  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 12, color: T.textMuted, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  
  pomodoroCard: { flexDirection: 'row', backgroundColor: T.surface, borderRadius: 24, padding: 20, gap: 20, alignItems: 'center', borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  timerInner: { width: 85, height: 85, borderRadius: 42.5, borderWidth: 3, borderColor: T.border, alignItems: 'center', justifyContent: 'center', backgroundColor: T.background },
  timerText: { fontSize: 24, fontWeight: '900', color: T.textDark },
  pomSettingsBtn: { width: 48, height: 48, backgroundColor: T.softIndigo, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  pomPlayBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  
  soundTile: { width: 90, alignItems: 'center', backgroundColor: T.surface, paddingVertical: 18, borderRadius: 20, borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  soundTileActive: { backgroundColor: T.primary, borderColor: T.secondary },
  soundText: { marginTop: 10, fontSize: 12, fontWeight: '700', color: T.textMuted },
  soundPackLabel: { marginTop: -8, color: T.primary, fontSize: 12, fontWeight: '800' },
  
  usersWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  userChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  userDot: { position: 'absolute', right: -1, bottom: -1, width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.5, borderColor: T.surface },
  inviteEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 14, padding: 14, ...Theme.shadows.soft },
  inviteEmptyText: { color: T.textMuted, fontSize: 13, fontWeight: '700' },
  inviteChip: { flexDirection: 'row', alignItems: 'center', gap: 9, width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  inviteInfo: { flex: 1, minWidth: 0 },
  inviteName: { color: T.textDark, fontSize: 13, fontWeight: '800' },
  inviteSub: { color: T.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  inviteBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: T.primary, alignItems: 'center', justifyContent: 'center' },
  nudgeBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: T.lightAmber, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.accent },
  nudgeBtnText: { fontSize: 13 },
  nudgeToast: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.softIndigo, borderRadius: 18, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  nudgeToastTitle: { color: T.primary, fontWeight: '800', fontSize: 14 },
  nudgeToastSub: { color: T.textMuted, fontSize: 12, marginTop: 2 },
  
  chatDrawer: { position: 'absolute', bottom: 100, left: 0, right: 0, height: height * 0.6, backgroundColor: T.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: T.border, ...Theme.shadows.medium },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderBottomWidth: 1, borderColor: T.border },
  chatTitle: { color: T.textDark, fontSize: 16, fontWeight: '800' },
  chatCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: T.softIndigo, alignItems: 'center', justifyContent: 'center' },
  
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 20, marginVertical: 6 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: T.softIndigo, borderBottomRightRadius: 4, borderWidth: 1, borderColor: T.primary },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: T.background, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: T.border },
  messageText: { color: T.textDark, fontSize: 14 },
  messageTextOnColor: { color: '#FFFFFF' },
  bubbleUserRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  bubbleUser: { fontSize: 11, color: T.accent, fontWeight: '800' },
  equippedNameIcon: { fontSize: 11 },
  imagePreview: { width: 160, height: 160, borderRadius: 14, marginVertical: 5 },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.softDanger, padding: 12, borderRadius: 14 },
  fileIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: T.softDanger, alignItems: 'center', justifyContent: 'center' },
  fileName: { color: T.textDark, fontSize: 13, flex: 1, fontWeight: '500' },
  
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10, backgroundColor: T.background, borderTopWidth: 1, borderColor: T.border },
  chatInput: { flex: 1, height: 48, backgroundColor: T.surface, borderRadius: 24, paddingHorizontal: 18, color: T.textDark, borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  attachBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: T.softIndigo, borderWidth: 1, borderColor: T.border },
  sendBtn: { borderRadius: 24, overflow: 'hidden', elevation: 4 },
  sendBtnGrad: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  
  fab: { position: 'absolute', bottom: 115, right: 22, width: 64, height: 64, borderRadius: 32, overflow: 'hidden', elevation: 12, shadowColor: T.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 },
  fabGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalSheet: { backgroundColor: T.surface, padding: 30, borderRadius: 28, width: '85%', borderWidth: 1, borderColor: T.border, ...Theme.shadows.medium },
  modalTitle: { color: T.textDark, fontSize: 20, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  modalOpt: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: T.border, alignItems: 'center' },
  modalOptText: { color: T.textDark, fontSize: 16, fontWeight: '600' }
});

const bg = StyleSheet.create({
  orb1: { position: 'absolute', top: -height * 0.08, right: -width * 0.22, width: width * 0.75, height: width * 0.75, borderRadius: width * 0.375, backgroundColor: T.softIndigo, opacity: 0.75 },
  orb2: { position: 'absolute', bottom: -height * 0.06, left: -width * 0.28, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: T.lightAmber, opacity: 0.58 },
  orb3: { position: 'absolute', top: height * 0.37, right: width * 0.08, width: width * 0.32, height: width * 0.32, borderRadius: width * 0.16, backgroundColor: T.softInfo, opacity: 0.45 },
});
