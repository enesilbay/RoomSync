import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import type { Socket } from 'socket.io-client';
import { C } from '@/src/theme';
import { BackgroundOrbs } from './components/BackgroundOrbs';
import { ChatDrawer } from './components/ChatDrawer';
import { ChatFab } from './components/ChatFab';
import { FocusBlackout } from './components/FocusBlackout';
import { FocusHeader } from './components/FocusHeader';
import { FocusStartButton } from './components/FocusStartButton';
import { InviteFriendsSection } from './components/InviteFriendsSection';
import { MixerModal } from './components/MixerModal';
import { NudgeToast } from './components/NudgeToast';
import { OfflineBanner } from './components/OfflineBanner';
import { PomodoroCard } from './components/PomodoroCard';
import { PomodoroModal } from './components/PomodoroModal';
import { RoomUsersSection } from './components/RoomUsersSection';
import { SoundSection } from './components/SoundSection';
import { StatusCard } from './components/StatusCard';
import { WebSensorToggle } from './components/WebSensorToggle';
import { useAmbientSounds } from './hooks/useAmbientSounds';
import { useAppActive } from './hooks/useAppActive';
import { useChat } from './hooks/useChat';
import { useDeskDetection } from './hooks/useDeskDetection';
import { useFocusBrightness } from './hooks/useFocusBrightness';
import { useNudgeToast } from './hooks/useNudgeToast';
import { useOnlineFriends } from './hooks/useOnlineFriends';
import { usePomodoro } from './hooks/usePomodoro';
import { useRoomSocket } from './hooks/useRoomSocket';
import { useUserPreferences } from './hooks/useUserPreferences';

// Odak odası ekranı: hook'ları ve sunum bileşenlerini birleştirir.
// Not: Hook çağrı sırası effect sırasını belirler; socket hook'u masa algılamadan önce gelmeli.
export default function FocusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, fullName, roomName, score } = params;

  const routeUserId = Number(id);
  const safeFullName = typeof fullName === 'string' && fullName.trim() !== '' ? fullName : 'Öğrenci';

  const isFocused = useIsFocused();
  const appActive = useAppActive();

  const { storedUserId, isPremium, equippedSoundPack, checkPremiumStatus } = useUserPreferences(routeUserId);

  const isEliteRoom = params.isElite === 'true';
  const myUserId = storedUserId ?? routeUserId;

  // Birden fazla hook'un paylaştığı durum: masa durumu ve oda socket'i.
  const [isAtDesk, setIsAtDesk] = useState(false);
  const previousDeskState = useRef<boolean | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const {
    availableSounds,
    isSoundOn,
    setIsSoundOn,
    volumes,
    setVolumes,
    showMixer,
    setShowMixer,
    handleSingleSoundSelect,
    updateMixerVolume,
  } = useAmbientSounds({ isEliteRoom, equippedSoundPack, isAtDesk, isFocused });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
    checkPremiumStatus();
  }, [fadeAnim, slideAnim, checkPremiumStatus]);

  const {
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
  } = useChat({ roomName, socketRef, safeFullName, isPremium, isEliteRoom });

  const { onlineFriends, fetchOnlineFriends } = useOnlineFriends();

  useEffect(() => {
    if (isFocused) {
      checkPremiumStatus();
      fetchOnlineFriends();
    }
  }, [isFocused, roomName, checkPremiumStatus, fetchOnlineFriends]);

  const { nudgeToast, nudgeAnim, showNudgeToast } = useNudgeToast();

  const {
    pomodoroSec,
    pomodoroRunning,
    focusRequested,
    showPomodoroModal,
    setShowPomodoroModal,
    startPomodoro,
    startFocusSession,
    togglePomodoro,
  } = usePomodoro(isAtDesk);

  const { totalScore, isConnected, roomUsers, sendNudge, challengeDuel, broadcastAtmosphere } = useRoomSocket({
    socketRef,
    roomName,
    isFocused,
    safeFullName,
    maxUsers: params.maxUsers,
    myUserId,
    initialScore: Number(score) || 0,
    isPremium,
    volumes,
    setChatList,
    setVolumes,
    showNudgeToast,
  });

  const { isPhoneFaceDownOnDesk, toggleWebSensor } = useDeskDetection({
    isFocused,
    appActive,
    focusRequested,
    roomName,
    socketRef,
    isAtDesk,
    setIsAtDesk,
    previousDeskState,
  });

  const focusScreenDimmed = useFocusBrightness({ isFocused, focusRequested, isAtDesk, isPhoneFaceDownOnDesk });

  const roomUserIds = new Set(roomUsers.map((u) => Number(u.userId)));
  const inviteableFriends = onlineFriends.filter((friend) => !roomUserIds.has(Number(friend.id)));
  const otherRoomUsers = roomUsers.filter(u => Number(u.userId) !== myUserId);

  const openMixer = () => {
    if (!isPremium) {
      Alert.alert('PRO Özellik', 'Ses mikseri sadece Premium kullanıcılara özeldir.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Premium Ol', onPress: () => router.push({ pathname: '/premium', params: { id: myUserId } }) }
      ]);
      return;
    }
    setShowMixer(true);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar hidden={focusScreenDimmed} barStyle="dark-content" backgroundColor={C.background} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackgroundOrbs isElite={isEliteRoom} />
      </View>

      <Animated.ScrollView contentContainerStyle={s.scroll} style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {!isConnected && <OfflineBanner />}

        {/* HEADER */}
        <FocusHeader
          isEliteRoom={isEliteRoom}
          roomName={roomName}
          totalScore={totalScore}
          onBack={() => router.replace('/lobbies')}
        />

        {/* STATUS CARD */}
        <StatusCard isAtDesk={isAtDesk} isEliteRoom={isEliteRoom} />

        <FocusStartButton
          focusRequested={focusRequested}
          pomodoroRunning={pomodoroRunning}
          onPress={startFocusSession}
        />

        {/* WEB İÇİN MANUEL SENSÖR SİMÜLASYONU */}
        {Platform.OS === 'web' && (
          <WebSensorToggle isAtDesk={isAtDesk} onPress={toggleWebSensor} />
        )}

        {/* POMODORO */}
        <PomodoroCard
          pomodoroSec={pomodoroSec}
          pomodoroRunning={pomodoroRunning}
          onOpenSettings={() => setShowPomodoroModal(true)}
          onToggle={togglePomodoro}
        />

        {/* ATMOSFER & MIXER */}
        <SoundSection
          equippedSoundPack={equippedSoundPack}
          isPremium={isPremium}
          isSoundOn={isSoundOn}
          availableSounds={availableSounds}
          volumes={volumes}
          onMixerPress={openMixer}
          onToggleSound={() => setIsSoundOn(!isSoundOn)}
          onSelectSound={handleSingleSoundSelect}
        />

        {/* NUDGE TOAST BANNER */}
        {nudgeToast && <NudgeToast toast={nudgeToast} anim={nudgeAnim} />}

        {/* ONLINE ARKADAŞ DAVETLERİ */}
        <InviteFriendsSection friends={inviteableFriends} onInvite={sendNudge} />

        {/* AKTİF KULLANICILAR */}
        <RoomUsersSection users={otherRoomUsers} isEliteRoom={isEliteRoom} onChallenge={challengeDuel} />
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* CHAT DRAWER */}
      {chatVisible && (
        <ChatDrawer
          chatAnim={chatAnim}
          chatList={chatList}
          flatListRef={flatListRef}
          myUserId={myUserId}
          message={message}
          onChangeMessage={setMessage}
          onClose={toggleChat}
          onPickImage={pickImage}
          onPickDocument={pickDocument}
          onSend={sendMessage}
        />
      )}

      {!chatVisible && <ChatFab onPress={toggleChat} />}

      {/* POMODORO MODAL */}
      <PomodoroModal
        visible={showPomodoroModal}
        onSelect={startPomodoro}
        onCancel={() => setShowPomodoroModal(false)}
      />

      {/* MIXER MODAL */}
      <MixerModal
        visible={showMixer}
        isPremium={isPremium}
        availableSounds={availableSounds}
        volumes={volumes}
        onBroadcast={broadcastAtmosphere}
        onClose={() => setShowMixer(false)}
        onVolumeChange={updateMixerVolume}
      />

      {focusScreenDimmed && <FocusBlackout />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: 22, paddingTop: 15 },
});
