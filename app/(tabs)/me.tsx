import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Modal, ScrollView,
  StyleSheet, Text, TouchableOpacity, View, TextInput, Alert, RefreshControl, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { apiUrl, assetUrl } from '../config/api';
import { FramedAvatar } from '../components/FramedAvatar';
import { FocusSummaryStrip } from '../components/common';
import { C } from './sensor';
import { getRankInfo, getRankProgress } from '../utils/rank';
import { Theme } from '../utils/theme';

const T = C;

type UserProfile = {
  id: number;
  fullName: string;
  username: string;
  totalFocusMinutes: number;
  isPremium: boolean;
  avatarUrl?: string;
  coins?: number;
  currentStreak?: number;
  badges?: string[];
  equippedIcon?: string;
  equippedProfileFrame?: string;
};

type Friend = {
  id: number;
  fullName: string;
  username: string;
  totalFocusMinutes: number;
  avatarUrl?: string;
  equippedProfileFrame?: string;
  isOnline?: boolean;
  currentRoom?: string;
};

const QUICK_ACTIONS = [
  { id: 'messages', icon: 'comment-dots', label: 'Mesajlar', color: '#4F46E5', bg: '#EEF2FF', route: null },
  { id: 'shop', icon: 'shopping-cart', label: 'Mağaza', color: '#D97706', bg: '#FEF3C7', route: '/shop' },
  { id: 'analytics', icon: 'chart-line', label: 'Analitik', color: '#059669', bg: '#D1FAE5', route: '/analytics' },
  { id: 'leaderboard', icon: 'trophy', label: 'Liderlik', color: '#7C3AED', bg: '#EDE9FE', route: '/leaderboard' },
];

export default function MeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & Forms
  const [isFriendModalVisible, setIsFriendModalVisible] = useState(false);
  const [isSocialModalVisible, setIsSocialModalVisible] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [isSendingFriendReq, setIsSendingFriendReq] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [meRes, friendsRes, reqsRes, unreadRes] = await Promise.all([
        fetch(apiUrl('/users/me'), { headers }),
        fetch(apiUrl('/users/friends/0'), { headers }),
        fetch(apiUrl('/users/friend-requests/0'), { headers }),
        fetch(apiUrl('/messages/unread/dm-senders'), { headers }),
      ]);

      if (meRes.ok) {
        const data = await meRes.json();
        setUser(data.user);
      }
      if (friendsRes.ok) {
        const data = await friendsRes.json();
        const sorted = (Array.isArray(data) ? data : []).sort((a: Friend, b: Friend) =>
          (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)
        );
        setFriends(sorted);
      }
      
      let allRequests: any[] = [];
      if (reqsRes.ok) {
        const data = await reqsRes.json();
        if (Array.isArray(data)) {
          allRequests = data.map(req => ({ ...req, reqType: 'friend' }));
        }
      }
      if (unreadRes.ok) {
        const data = await unreadRes.json();
        if (Array.isArray(data)) {
          const unreadReqs = data.map((sender: any) => ({
            id: `unread_${sender.id}`,
            sender,
            reqType: 'unread_dm',
          }));
          allRequests = [...allRequests, ...unreadReqs];
        }
      }
      setRequests(allRequests);
    } catch (e) {
      console.log('Me tab fetch error:', e);
    } finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]));

  const [dmModalVisible, setDmModalVisible] = useState(false);

  const handleRespondRequest = async (requestId: number, status: 'accepted' | 'rejected') => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl('/users/respond-request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId, status }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
    }
  };

  const handleSendFriendRequest = async () => {
    if (!friendUsername.trim()) return Alert.alert('Eksik Bilgi', 'Lütfen bir kullanıcı adı girin.');
    setIsSendingFriendReq(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl('/users/friend-request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverUsername: friendUsername.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Başarılı', 'Arkadaşlık isteği gönderildi!');
        setIsFriendModalVisible(false);
        setFriendUsername('');
      } else {
        Alert.alert('Hata', data.message || 'İstek gönderilemedi.');
      }
    } catch { Alert.alert('Hata', 'Sunucu bağlantı hatası.'); } 
    finally { setIsSendingFriendReq(false); }
  };

  const handleNudge = async (targetId: number, targetName: string) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl(`/users/nudge/${targetId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert('👋 Dürtüldü!', `${targetName} çalışmaya davet edildi.`);
      } else {
        Alert.alert('Hata', 'Kullanıcı şu an davet edilemiyor.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Sunucu bağlantı hatası.');
    }
  };

  const handleQuickAction = async (action: typeof QUICK_ACTIONS[0]) => {
    if (action.id === 'analytics' && user && !user.isPremium) {
      router.push({ pathname: '/premium', params: { id: user.id } } as any);
      return;
    }
    if (action.id === 'messages') {
      setDmModalVisible(true);
      return;
    }
    if (action.route) router.push(action.route as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingContainer}>
          <ActivityIndicator color={T.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  const rank = getRankInfo(user.totalFocusMinutes);
  const progress = getRankProgress(user.totalFocusMinutes);
  const onlineFriends = friends.filter(f => f.isOnline);
  const offlineFriends = friends.filter(f => !f.isOnline);

  return (
    <SafeAreaView style={s.safe}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={T.primary} colors={[T.primary]} />
        }
      >
        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={require('../../assets/images/logo.png')} style={{ width: 34, height: 34, borderRadius: 10 }} resizeMode="contain" />
            <Text style={s.headerTitle}>Ben</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setIsFriendModalVisible(true)}>
              <FontAwesome5 name="user-plus" size={18} color={T.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsSocialModalVisible(true)} style={{ position: 'relative' }}>
              <FontAwesome5 name="bell" size={20} color={requests.length > 0 ? T.accent : T.primary} />
              {requests.length > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{requests.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push({ pathname: '/profile', params: { id: user.id, openSettings: 'true' } } as any)}>
              <FontAwesome5 name="cog" size={20} color={T.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── PROFİL KARTI ── */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push({ pathname: '/profile', params: { id: user.id } } as any)}
        >
          <LinearGradient
            colors={[T.primary, '#3949AB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.profileCard}
          >
            {/* Avatar */}
            <View style={s.avatarContainer}>
              <FramedAvatar
                uri={assetUrl(user.avatarUrl)}
                name={user.fullName}
                frameId={user.equippedProfileFrame}
                size={64}
                colors={T}
                backgroundColor="rgba(255,255,255,0.2)"
                textColor="#FFF"
                textSize={26}
                baseBorderWidth={3}
                activeBorderWidth={4}
              />
              {user.isPremium && (
                <View style={s.premiumBadge}>
                  <FontAwesome5 name="crown" size={9} color={T.accent} solid />
                </View>
              )}
            </View>

            <View style={s.profileInfo}>
              <Text style={s.profileName}>
                {user.fullName} {user.equippedIcon || ''}
              </Text>
              <Text style={s.profileUsername}>@{user.username}</Text>

              {/* Rütbe */}
              <View style={s.rankRow}>
                <FontAwesome5 name={rank.icon} size={12} color={rank.color} solid />
                <Text style={[s.rankText, { color: rank.color }]}>{rank.title}</Text>
              </View>
            </View>

            {/* Stat Badges */}
            <View style={s.statBadges}>
              <View style={s.statBadge}>
                <FontAwesome5 name="fire-alt" size={12} color="#FF6B6B" solid />
                <Text style={s.statBadgeText}>{user.currentStreak ?? 0}</Text>
              </View>
              <View style={s.statBadge}>
                <FontAwesome5 name="coins" size={12} color={T.accent} solid />
                <Text style={s.statBadgeText}>{user.coins ?? 0}</Text>
              </View>
            </View>

            {/* İlerleme Çubuğu */}
            <View style={s.progressSection}>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${Math.min(progress.percentage, 100)}%` }]} />
              </View>
              <Text style={s.progressLabel}>
                {progress.nextRank ? `${rank.title} → ${progress.nextRank}` : 'Efsane Seviye 🏆'}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── ÖZET ŞERİDİ ── */}
        <FocusSummaryStrip
          todayMinutes={user.totalFocusMinutes ?? 0}
          streakDays={user.currentStreak ?? 1}
          coins={user.coins ?? 0}
          onPressCoins={() => router.push('/shop' as any)}
        />

        {/* ── HIZLI ERİŞİM IZGARASI ── */}
        <Text style={s.sectionTitle}>Hızlı Erişim</Text>
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((action) => {
            const isLocked = action.id === 'analytics' && !user.isPremium;
            return (
              <TouchableOpacity
                key={action.id}
                style={[s.quickCard, { backgroundColor: action.bg }]}
                activeOpacity={0.8}
                onPress={() => handleQuickAction(action)}
              >
                <View style={[s.quickIconBox, { backgroundColor: action.color }]}>
                  <FontAwesome5
                    name={isLocked ? 'lock' : action.icon}
                    size={20}
                    color="#FFF"
                    solid
                  />
                </View>
                <Text style={[s.quickLabel, { color: action.color }]}>{action.label}</Text>
                {isLocked && (
                  <View style={s.proBadge}>
                    <Text style={s.proBadgeText}>PRO</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── ARKADAŞLAR ── */}
        <View style={s.friendsHeader}>
          <Text style={s.sectionTitle}>Arkadaşlar</Text>
          <TouchableOpacity onPress={() => setDmModalVisible(true)}>
            <Text style={s.seeAll}>Tümü →</Text>
          </TouchableOpacity>
        </View>

        {friends.length === 0 ? (
          <View style={s.emptyFriends}>
            <FontAwesome5 name="user-friends" size={28} color={T.textMuted} />
            <Text style={s.emptyText}>Henüz arkadaş yok</Text>
            <Text style={s.emptySubText}>Keşfet sekmesinden arkadaş ekleyebilirsin.</Text>
          </View>
        ) : (
          <>
            {onlineFriends.length > 0 && (
              <>
                <Text style={s.subSectionTitle}>🟢 Çevrimiçi ({onlineFriends.length})</Text>
                {onlineFriends.map(friend => (
                  <FriendRow
                    key={friend.id}
                    friend={friend}
                    onDM={() => router.push({
                      pathname: '/dm',
                      params: { targetUserId: friend.id, targetName: friend.fullName, targetUsername: friend.username, targetAvatarUrl: friend.avatarUrl || '', targetProfileFrame: friend.equippedProfileFrame || 'none' }
                    } as any)}
                    onNudge={handleNudge}
                  />
                ))}
              </>
            )}
            {offlineFriends.length > 0 && (
              <>
                <Text style={[s.subSectionTitle, { marginTop: 12 }]}>⚫ Çevrimdışı</Text>
                {offlineFriends.slice(0, 5).map(friend => (
                  <FriendRow
                    key={friend.id}
                    friend={friend}
                    onDM={() => router.push({
                      pathname: '/dm',
                      params: { targetUserId: friend.id, targetName: friend.fullName, targetUsername: friend.username, targetAvatarUrl: friend.avatarUrl || '', targetProfileFrame: friend.equippedProfileFrame || 'none' }
                    } as any)}
                    onNudge={handleNudge}
                  />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* ── DM MODAL ── */}
      <Modal visible={dmModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={s.dmSheet}>
            <View style={s.dmHandle} />
            <View style={s.dmHeader}>
              <Text style={s.dmTitle}>Mesajlar</Text>
              <TouchableOpacity onPress={() => setDmModalVisible(false)} style={s.dmCloseBtn}>
                <FontAwesome5 name="times" size={16} color={T.textMuted} solid />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {friends.length === 0 ? (
                <View style={s.emptyFriends}>
                  <FontAwesome5 name="comment-slash" size={28} color={T.textMuted} />
                  <Text style={s.emptyText}>Henüz arkadaşın yok</Text>
                  <Text style={s.emptySubText}>Keşfet sekmesinden arkadaş ekle.</Text>
                </View>
              ) : (
                friends.map(friend => (
                  <TouchableOpacity
                    key={friend.id}
                    style={s.dmFriendRow}
                    activeOpacity={0.8}
                    onPress={() => {
                      setDmModalVisible(false);
                      router.push({
                        pathname: '/dm',
                        params: { targetUserId: friend.id, targetName: friend.fullName, targetUsername: friend.username, targetAvatarUrl: friend.avatarUrl || '', targetProfileFrame: friend.equippedProfileFrame || 'none' }
                      } as any);
                    }}
                  >
                    <View style={s.friendAvatar}>
                      <FramedAvatar
                        uri={assetUrl(friend.avatarUrl)}
                        name={friend.fullName}
                        frameId={friend.equippedProfileFrame}
                        size={46}
                        colors={T}
                        backgroundColor={T.softIndigo}
                        textSize={18}
                      />
                      <View style={[s.onlineDot, { backgroundColor: friend.isOnline ? T.success : T.textMuted }]} />
                    </View>
                    <View style={s.friendInfo}>
                      <Text style={s.friendName}>{friend.fullName}</Text>
                      <Text style={s.friendSub}>{friend.isOnline ? '🟢 Çevrimiçi' : `${friend.totalFocusMinutes} dk odak`}</Text>
                    </View>
                    <View style={[s.dmBtn, { backgroundColor: T.primary }]}>
                      <FontAwesome5 name="paper-plane" size={13} color="#FFF" solid />
                    </View>
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── ARKADAŞ EKLEME MODALI ── */}
      <Modal visible={isFriendModalVisible} animationType="fade" transparent statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
          <View style={s.modalSheet}>
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <View style={s.modalIconCircle}>
                <FontAwesome5 solid name="user-plus" size={20} color={T.primary} />
              </View>
              <Text style={s.modalTitle}>Arkadaş Ekle</Text>
              <Text style={s.modalSubtitle}>Beraber odaklanmak için arkadaşlarını davet et.</Text>
            </View>
            <TextInput style={s.modalInput} placeholder="Kullanıcı Adı (Örn: ahmet_123)" placeholderTextColor={T.textMuted} value={friendUsername} onChangeText={setFriendUsername} autoCapitalize="none" />
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setIsFriendModalVisible(false)}><Text style={s.modalCancelText}>İptal</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSendFriendRequest} disabled={isSendingFriendReq} style={{ flex: 1 }}>
                <LinearGradient colors={[T.primary, T.secondary]} style={s.modalCreateBtn}>
                  <Text style={s.modalCreateText}>{isSendingFriendReq ? 'Gönderiliyor...' : 'İstek Gönder'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── GELEN İSTEKLER MODALI ── */}
      <Modal visible={isSocialModalVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={[s.dmSheet, { maxHeight: '85%' }]}>
            <View style={s.dmHandle} />
            <View style={s.dmHeader}>
              <Text style={s.dmTitle}>Gelen İstekler</Text>
              <TouchableOpacity onPress={() => setIsSocialModalVisible(false)} style={s.dmCloseBtn}>
                <FontAwesome5 name="times" size={16} color={T.textMuted} solid />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {requests.length === 0 ? (
                <View style={s.emptyFriends}>
                  <FontAwesome5 name="bell-slash" size={28} color={T.textMuted} />
                  <Text style={s.emptyText}>Yeni istek yok</Text>
                </View>
              ) : (
                requests.map((req) => (
                  <View key={req.id} style={s.dmFriendRow}>
                    <View style={s.friendAvatar}>
                      <FramedAvatar
                        uri={assetUrl(req.sender.avatarUrl)}
                        name={req.sender.fullName}
                        frameId={req.sender.equippedProfileFrame}
                        size={46}
                        colors={T}
                        backgroundColor={T.softIndigo}
                        textSize={18}
                      />
                    </View>

                    <View style={s.friendInfo}>
                      <Text style={s.friendName}>{req.sender.fullName}</Text>
                      <Text style={s.friendSub}>
                        {req.reqType === 'unread_dm' ? 'Mesajınız var!' : `@${req.sender.username}`}
                      </Text>
                    </View>
                    
                    {req.reqType === 'unread_dm' ? (
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: T.primary }]}
                        onPress={() => {
                          setIsSocialModalVisible(false);
                          setDmModalVisible(true);
                        }}
                      >
                        <FontAwesome5 solid name="envelope" size={14} color="#FFF" />
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={[s.actionBtn, s.acceptBtn]} onPress={() => handleRespondRequest(req.id, 'accepted')}>
                          <FontAwesome5 solid name="check" size={14} color="#059669" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.actionBtn, s.rejectBtn]} onPress={() => handleRespondRequest(req.id, 'rejected')}>
                          <FontAwesome5 solid name="times" size={14} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FriendRow({ friend, onDM, onNudge }: { friend: Friend; onDM: () => void; onNudge?: (id: number, name: string) => void }) {
  return (
    <View style={s.friendRow}>
      <View style={s.friendAvatar}>
        <FramedAvatar
          uri={assetUrl(friend.avatarUrl)}
          name={friend.fullName}
          frameId={friend.equippedProfileFrame}
          size={46}
          colors={T}
          backgroundColor={T.softIndigo}
          textSize={18}
        />
        <View style={[s.onlineDot, { backgroundColor: friend.isOnline ? T.success : T.textMuted }]} />
      </View>

      <View style={s.friendInfo}>
        <Text style={s.friendName} numberOfLines={1}>{friend.fullName}</Text>
        <Text style={s.friendSub} numberOfLines={1}>
          {friend.isOnline
            ? (friend.currentRoom ? `📚 ${friend.currentRoom} odasında` : '🟢 Çevrimiçi')
            : `${friend.totalFocusMinutes} dk odak`}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TouchableOpacity style={[s.dmBtn, { backgroundColor: T.secondary }]} onPress={() => onNudge?.(friend.id, friend.fullName)} activeOpacity={0.8}>
          <Text style={{ fontSize: 13 }}>👋</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.dmBtn} onPress={onDM} activeOpacity={0.8}>
          <FontAwesome5 name="comment-dots" size={14} color={T.primary} solid />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { color: T.textDark, fontSize: 28, fontWeight: '900' },

  // Profil Kartı
  profileCard: {
    borderRadius: 24, padding: 20, marginBottom: 28,
    ...Theme.shadows.medium,
  },
  avatarContainer: { position: 'absolute', top: 20, right: 20 },
  premiumBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { paddingRight: 80 },
  profileName: { color: '#FFF', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  profileUsername: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankText: { fontSize: 13, fontWeight: '800' },

  statBadges: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 14 },
  statBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statBadgeText: { color: '#FFF', fontSize: 14, fontWeight: '900' },

  progressSection: { gap: 6 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: T.accent, borderRadius: 3 },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700' },

  // Hızlı Erişim
  sectionTitle: { color: T.textDark, fontSize: 18, fontWeight: '900', marginBottom: 14 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  quickCard: {
    width: '47%', padding: 18, borderRadius: 20, alignItems: 'center', gap: 10,
    ...Theme.shadows.soft,
  },
  quickIconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  proBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: T.accent, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  proBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },

  // Arkadaşlar
  friendsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAll: { color: T.primary, fontSize: 14, fontWeight: '700' },
  subSectionTitle: { color: T.textMuted, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  emptyFriends: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { color: T.textDark, fontSize: 16, fontWeight: '800' },
  emptySubText: { color: T.textMuted, fontSize: 13, textAlign: 'center' },

  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: T.surface, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: T.border,
    ...Theme.shadows.soft,
  },
  friendAvatar: { position: 'relative' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: T.surface },
  friendInfo: { flex: 1 },
  friendName: { color: T.textDark, fontSize: 15, fontWeight: '800' },
  friendSub: { color: T.textMuted, fontSize: 13, fontWeight: '600', marginTop: 2 },
  dmBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: T.softIndigo, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: T.border,
  },

  // DM Modal
  dmSheet: {
    backgroundColor: T.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: '75%',
    borderWidth: 1, borderColor: T.border,
    ...Theme.shadows.medium,
  },
  dmHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 16 },
  dmHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  dmTitle: { color: T.textDark, fontSize: 22, fontWeight: '900' },
  dmCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: T.softIndigo, alignItems: 'center', justifyContent: 'center' },
  dmFriendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: T.background, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: T.border,
  },
  badge: { position: 'absolute', top: -4, right: -6, backgroundColor: T.danger, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.background },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' },

  modalSheet: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 28, padding: 25, gap: 15, ...Theme.shadows.medium },
  modalIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: T.lightAmber, alignItems: 'center', justifyContent: 'center', marginBottom: 5, borderWidth: 1, borderColor: T.accent },
  modalTitle: { fontSize: 24, fontWeight: '900', color: T.textDark, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: T.textMuted, marginTop: -5, marginBottom: 10, textAlign: 'center' },
  modalInput: { backgroundColor: T.background, borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 16, fontSize: 15, color: T.textDark },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 15 },
  modalCancelBtn: { flex: 1, height: 56, borderRadius: 18, backgroundColor: T.softIndigo, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: 'bold', color: T.textDark },
  modalCreateBtn: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalCreateText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },

  actionBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { backgroundColor: T.softSuccess, borderWidth: 1, borderColor: T.success },
  rejectBtn: { backgroundColor: T.softDanger, borderWidth: 1, borderColor: T.danger },
});
