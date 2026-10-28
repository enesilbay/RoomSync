import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import type { Socket } from 'socket.io-client';
import { C } from '@/src/theme';
import { BackgroundOrbs } from './components/BackgroundOrbs';
import { ChatDrawer } from './components/ChatDrawer';
import { ChatFab } from './components/ChatFab';
import { FocusHeader } from './components/FocusHeader';
import { FocusPanel } from './components/FocusPanel';
import { InviteFriendsSection } from './components/InviteFriendsSection';
import { MixerModal } from './components/MixerModal';
import { NudgeToast } from './components/NudgeToast';
import { OfflineBanner } from './components/OfflineBanner';
import { RoomUsersSection } from './components/RoomUsersSection';
import { SoundSection } from './components/SoundSection';
import { useAmbientSounds } from './hooks/useAmbientSounds';
import { useChat } from './hooks/useChat';
import { useFocusFlow } from './hooks/useFocusFlow';
import { useNudgeToast } from './hooks/useNudgeToast';
import { useOnlineFriends } from './hooks/useOnlineFriends';
import { usePresenceSync } from './hooks/usePresenceSync';
import { useRoomSocket } from './hooks/useRoomSocket';
import { useUserPreferences } from './hooks/useUserPreferences';

// Odak odası ekranı: hook'ları ve sunum bileşenlerini birleştirir.
// Odak akışı solo ekranla ortaktır (useFocusFlow + FocusPanel); oda yalnızca varlık, ses ve sosyal özellikleri ekler.
export default function FocusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, fullName, roomName, score } = params;

  const routeUserId = Number(id);
  const safeFullName = typeof fullName === 'string' && fullName.trim() !== '' ? fullName : 'Öğrenci';

  const isFocused = useIsFocused();

  const { storedUserId, isPremium, equippedSoundPack, checkPremiumStatus } = useUserPreferences(routeUserId);

  const isEliteRoom = params.isElite === 'true';
  const myUserId = storedUserId ?? routeUserId;

  const socketRef = useRef<Socket | null>(null);

  // Oturum yerel geçmişe oda adıyla kaydedilir; odadan çıkınca aktif oturum biter.
  const flow = useFocusFlow({
    roomName: typeof roomName === 'string' ? roomName : null,
    screenFocused: isFocused,
    endOnBlur: true,
  });
  // Ses ve oda varlığı için "masada": yalnızca gerçekten odaklanırken.
  const isAtDesk = flow.phase === 'focusing';
  const presenceSync = usePresenceSync({ socketRef, presence: isFocused && isAtDesk, roomName });

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

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(24));

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
    onConnect: presenceSync.onConnect,
    onBeforeDisconnect: presenceSync.onBeforeDisconnect,
  });

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
      <StatusBar barStyle="dark-content" />
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

        {/* ODAK: durum, sayaç, mod, başlat/bitir, özet ve tam ekran katman */}
        <FocusPanel flow={flow} variant={isEliteRoom ? 'elite' : 'room'} />

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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: 22, paddingTop: 15 },
});
