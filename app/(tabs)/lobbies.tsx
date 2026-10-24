import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, FlatList,
  TextInput, Modal, Alert, Animated, Dimensions,
  Platform, KeyboardAvoidingView, StatusBar, ScrollView, Switch, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { apiUrl, assetUrl } from '../config/api';
import { FramedAvatar } from '../components/FramedAvatar';
import { C } from './sensor';
import { Theme } from '../utils/theme';

const T = C;
const { width, height } = Dimensions.get('window');

interface Lobby {
  id: string;
  name: string;
  icon: string;
  description: string;
  category?: string;
  memberCount?: number;
  isActive?: boolean;
  isPrivate?: boolean;
  isPremiumOnly?: boolean;
  maxUsers?: number;
  activeUsers?: number;
}

// ── DEKORATIF ARKAPLAN NOKTALARI ──
function BackgroundOrbs() {
  return (
    <>
      <View style={bg.orb1} />
      <View style={bg.orb2} />
      <View style={bg.orb3} />
    </>
  );
}

// ── Lobi Kartı (Beyaz & Soft Gölgeli) ──
function LobbyCard({ item, onPress, index, friends }: { item: Lobby; onPress: () => void; index: number; friends: any[] }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 150 }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 150 }).start();

  const memberCount = item.memberCount || 0;
  const focusedCount = item.activeUsers || 0;
  const isActive = item.isActive !== false;

  const friendsInLobby = friends?.filter((f: any) => f.currentRoom === item.name && f.isOnline) || [];
  let metaText = `${memberCount} kişi odada · ${focusedCount} odaklanıyor`;
  if (friendsInLobby.length > 0) {
    const firstName = friendsInLobby[0].fullName.split(' ')[0];
    metaText = friendsInLobby.length > 1
      ? `${memberCount} kişi odada · ${focusedCount} odak · ${firstName} +${friendsInLobby.length - 1}`
      : `${memberCount} kişi odada · ${focusedCount} odak · ${firstName} burada`;
  }

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={0.9}>
        <View style={[card.wrap, item.isPremiumOnly && card.eliteWrap]}>
          <View style={[card.iconBox, item.isPremiumOnly && card.eliteIconBox]}>
            <FontAwesome5 solid name={item.isPremiumOnly ? 'crown' : (item.isPrivate ? 'lock' : (item.icon || 'users'))} size={19} color={item.isPremiumOnly ? T.accent : T.primary} />
          </View>
          <View style={card.body}>
            <Text style={[card.name, item.isPremiumOnly && { color: T.primary }]} numberOfLines={1}>
              {item.name} {item.isPremiumOnly && '✨'}
            </Text>
            <Text style={card.desc} numberOfLines={1}>{item.description || 'Odaklanmak icin hazir bir calisma odasi.'}</Text>
            <View style={card.metaRow}>
              <View style={card.metaPill}>
                <View style={[card.dot, { backgroundColor: isActive ? T.success : T.textMuted }]} />
                <Text style={card.metaText}>{metaText}</Text>
              </View>
              {item.isPrivate && (
                <View style={card.metaPill}>
                  <FontAwesome5 solid name="lock" size={9} color={T.textMuted} />
                  <Text style={card.metaText}>Gizli</Text>
                </View>
              )}
              {item.isPremiumOnly && (
                <View style={[card.metaPill, card.elitePill]}>
                  <FontAwesome5 solid name="crown" size={9} color={T.accent} />
                  <Text style={[card.metaText, card.eliteMetaText]}>Elite</Text>
                </View>
              )}
            </View>
          </View>
          <View style={card.chevronWrap}>
            <FontAwesome5 solid name="chevron-right" size={12} color={T.primary} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const CATEGORIES = ['Tümü', 'Bilgisayar Bilimi', 'Tıp & Sağlık', 'Hukuk', 'Sınav Hazırlık', 'Yabancı Dil', 'Tasarım & Sanat', 'Mühendislik', 'İşletme & Ekonomi', 'Fen Bilimleri', 'Genel'];
const ROOM_CATEGORIES = CATEGORIES.filter(c => c !== 'Tümü');

// ── Ana Ekran ──
export default function LobbiesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const myUserId = Number(params.id); // Kendi ID'miz
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [equippedProfileFrame, setEquippedProfileFrame] = useState<string>('none');

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isPremium, setIsPremium] = useState(false);

  // Lobi Kurma State'leri
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPremiumOnly, setIsPremiumOnly] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');

  // Gizli Odaya Giriş State'leri
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState<Lobby | null>(null);
  const [enterPassword, setEnterPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Tümü');

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const [friends, setFriends] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchLobbies();
      fetchFriends();
      loadUserData();
    }, [myUserId])
  );

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('user_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        setIsPremium(parsed.isPremium === true);
        setEquippedProfileFrame(parsed.equippedProfileFrame || 'none');
        if (parsed.avatarUrl) {
          setAvatarUrl(assetUrl(parsed.avatarUrl));
        }
      }
    } catch (e) {
      console.error('Kullanıcı verisi çekilemedi', e);
    }
  };

  const getToken = async () => await AsyncStorage.getItem('access_token');

  const fetchFriends = async () => {
    try {
      const token = await getToken();
      const res = await fetch(apiUrl('/users/friends/0'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(Array.isArray(data) ? data : []);
      }
    } catch (e) {}
  };

  const fetchLobbies = async () => {
    try {
      const token = await getToken();
      const response = await fetch(apiUrl('/lobbies'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['user_data', 'access_token']);
        router.replace('/');
        return;
      }
      const data = await response.json();
      setLobbies(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('[lobbies] Lobi listesi yüklenemedi:', e);
    }
  };


  const handleCreateLobby = async () => {
    if (!newName.trim()) return Alert.alert('Eksik Bilgi', 'Lütfen bir lobi ismi girin.');
    if (isPrivate && !roomPassword.trim()) return Alert.alert('Eksik Bilgi', 'Lütfen gizli oda için bir şifre belirleyin.');
    
    const maxUsers = isPrivate ? (isPremium ? 5 : 2) : 50;

    try {
      const token = await getToken();
      const res = await fetch(apiUrl('/lobbies'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          name: newName, 
          description: newDesc, 
          category: newCategory,
          icon: isPremiumOnly ? 'crown' : 'users',
          isPrivate,
          isPremiumOnly,
          password: isPrivate ? roomPassword : undefined,
          maxUsers,
        }),
      });
      if (res.ok) {
        setIsModalVisible(false);
        setNewName(''); setNewDesc(''); setNewCategory(''); setIsPrivate(false); setIsPremiumOnly(false); setRoomPassword('');
        fetchLobbies();
      } else {
        const errData = await res.json();
        const errMsg = Array.isArray(errData.message) ? errData.message.join('\n') : (errData.message || 'Lobi kurulamadı.');
        Alert.alert('Hata', errMsg);
      }
    } catch { Alert.alert('Hata', 'Sunucu bağlantı hatası.'); }
  };

  const handleVerifyPassword = async () => {
    if (!selectedLobby) return;
    if (!enterPassword.trim()) return Alert.alert('Hata', 'Lütfen şifre girin.');
    setIsVerifying(true);
    try {
      const token = await getToken();
      const res = await fetch(apiUrl('/lobbies/verify-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lobbyId: selectedLobby.id, password: enterPassword }),
      });
      if (res.ok) {
        setIsPasswordModalVisible(false);
        setEnterPassword('');
        router.push({ pathname: '/sensor' as any, params: { ...params, roomName: selectedLobby.name, maxUsers: selectedLobby.maxUsers || 50, isElite: selectedLobby.isPremiumOnly ? 'true' : 'false' } });
      } else {
        Alert.alert('Hata', 'Şifre hatalı!');
      }
    } catch (e) {
      console.error('Verify password error:', e);
      Alert.alert('Hata', 'Sunucu bağlantı hatası.');
    } finally {
      setIsVerifying(false);
    }
  };


  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user_data');
      router.replace('/');
    } catch (e) { console.error('Çıkış hatası:', e); }
  };

  const filteredLobbies = lobbies.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategoryFilter === 'Tümü' || l.category === selectedCategoryFilter;
    return matchSearch && matchCategory;
  });
  const activeCount = lobbies.reduce((sum, lobby) => sum + (lobby.memberCount || 0), 0);
  const eliteCount = lobbies.filter((lobby) => lobby.isPremiumOnly).length;
  const userName = typeof params.fullName === 'string' ? params.fullName.split(' ')[0] : 'Öğrenci';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.background} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackgroundOrbs />
      </View>

      <View style={s.container}>
        {/* ── HEADER ── */}
        <Animated.View style={[s.header, { opacity: headerAnim }]}>
          <View style={s.headerTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image source={require('../../assets/images/logo.png')} style={{ width: 38, height: 38, borderRadius: 10 }} resizeMode="contain" />
              <View>
                <Text style={s.greeting}>İyi Çalışmalar,</Text>
                <Text style={s.pageTitle}>{userName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push({ pathname: '/profile', params: { id: myUserId } } as any)} activeOpacity={0.7}>
              <FramedAvatar
                uri={avatarUrl}
                name={userName}
                frameId={equippedProfileFrame}
                size={48}
                colors={T}
                backgroundColor={T.softIndigo}
                textSize={18}
                textStyle={hdr.profileAvatarText}
                style={hdr.profileAvatar}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── ARAMA KUTUSU VE KATEGORİ FİLTRESİ ── */}
        <Animated.View style={[s.summaryCard, { opacity: headerAnim }]}>
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>{lobbies.length}</Text>
            <Text style={s.summaryLabel}>Oda</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>{activeCount}</Text>
            <Text style={s.summaryLabel}>Aktif</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>{eliteCount}</Text>
            <Text style={s.summaryLabel}>Elite</Text>
          </View>
        </Animated.View>

        <Animated.View style={[s.searchWrap, { opacity: headerAnim }]}>
          <FontAwesome5 solid name="search" size={14} color={T.textMuted} style={{ marginRight: 12 }} />
          <TextInput style={s.searchInput} placeholder="Çalışma odası bul..." placeholderTextColor={T.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
        </Animated.View>

        <Animated.View style={[{ opacity: headerAnim, marginBottom: 20 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategoryFilter === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategoryFilter(cat)}
                  style={[
                    s.catChip,
                    isSelected ? s.catChipActive : s.catChipInactive
                  ]}
                >
                  <Text style={[s.catText, isSelected ? s.catTextActive : s.catTextInactive]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>Aktif Odalar</Text>
          <Text style={s.sectionCount}>{filteredLobbies.length} sonuç</Text>
        </View>

        <FlatList
          data={filteredLobbies}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, gap: 14 }}
          renderItem={({ item, index }) => (
            <LobbyCard 
              item={item} 
              index={index}
              friends={friends}
              onPress={() => {
                if (item.isPremiumOnly && !isPremium) {
                  Alert.alert(
                    'Elite Lounge 👑',
                    'Bu oda sadece Premium kullanıcılar içindir.',
                    [
                      { text: 'İptal', style: 'cancel' },
                      { text: 'Premium Ol', onPress: () => router.push({ pathname: '/premium', params: { id: myUserId } } as any) }
                    ]
                  );
                  return;
                }

                if (item.isPrivate) {
                  setSelectedLobby(item);
                  setIsPasswordModalVisible(true);
                } else {
                  router.push({ pathname: '/sensor' as any, params: { ...params, roomName: item.name, isElite: item.isPremiumOnly ? 'true' : 'false' } });
                }
              }} 
            />
          )}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <FontAwesome5 solid name="door-open" size={30} color={T.textMuted} />
              </View>
              <Text style={s.emptyText}>Henüz lobi yok</Text>
              <Text style={s.emptySubText}>İlk çalışma odasını sen kur!</Text>
            </View>
          }
        />
      </View>

      {/* ODA KUR BUTONU */}
      <TouchableOpacity 
        style={s.fab} 
        onPress={() => {
          if (isPremium) setIsModalVisible(true);
          else router.push({ pathname: '/premium', params: { id: myUserId } } as any);
        }} 
        activeOpacity={0.85}
      >
        <LinearGradient colors={[T.primary, T.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.fabGrad}>
          <FontAwesome5 solid name={isPremium ? "plus" : "lock"} size={14} color="#FFFFFF" />
          <Text style={s.fabText}>ODA KUR</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* ── LOBİ KURMA MODALI ── */}
      <Modal visible={isModalVisible} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={mdl.overlay}>
            <View style={mdl.sheet}>
              <View style={mdl.handle} />
              <Text style={mdl.title}>Yeni Çalışma Odası</Text>
              <Text style={mdl.subtitle}>Arkadaşlarınla odaklanmak için bir oda oluştur.</Text>
              <TextInput style={mdl.input} placeholder="Oda İsmi" placeholderTextColor={T.textMuted} value={newName} onChangeText={setNewName} />
              
              <Text style={{ color: T.textDark, fontSize: 13, fontWeight: 'bold', marginTop: 15, paddingHorizontal: 5 }}>Kategori Seç</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 8 }}>
                {ROOM_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewCategory(cat)}
                    style={[
                      s.catChip,
                      newCategory === cat ? s.catChipActive : s.catChipInactive
                    ]}
                  >
                    <Text style={[s.catText, newCategory === cat ? s.catTextActive : s.catTextInactive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput style={[mdl.input, { height: 80, textAlignVertical: 'top', paddingTop: 15, marginTop: 15 }]} placeholder="Açıklama" placeholderTextColor={T.textMuted} value={newDesc} onChangeText={setNewDesc} multiline />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingHorizontal: 5 }}>
                <Text style={{ color: T.textDark, fontSize: 15, fontWeight: 'bold' }}>Gizli Oda (Kilitli)</Text>
                <Switch
                  trackColor={{ false: T.border, true: T.primary }}
                  thumbColor={isPrivate ? T.textDark : '#94A3B8'}
                  onValueChange={setIsPrivate}
                  value={isPrivate}
                />
              </View>

              {isPremium && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingHorizontal: 5 }}>
                  <Text style={{ color: T.accent, fontSize: 15, fontWeight: 'bold' }}>Elite Oda</Text>
                  <Switch
                    trackColor={{ false: T.border, true: T.primary }}
                    thumbColor={isPremiumOnly ? T.textDark : '#94A3B8'}
                    onValueChange={setIsPremiumOnly}
                    value={isPremiumOnly}
                  />
                </View>
              )}

              {isPrivate && (
                <>
                  <TextInput style={[mdl.input, { marginTop: 15 }]} placeholder="Oda Şifresi" placeholderTextColor={T.textMuted} value={roomPassword} onChangeText={setRoomPassword} secureTextEntry />
                  <Text style={{ color: T.textMuted, fontSize: 12, marginTop: 8, paddingHorizontal: 5 }}>
                    Gizli odalar {isPremium ? 'Premium olduğunuz için en fazla 5' : 'ücretsiz planda en fazla 2'} kişiliktir.
                  </Text>
                </>
              )}

              <View style={[mdl.btnRow, { marginTop: 20 }]}>
                <TouchableOpacity style={mdl.cancelBtn} onPress={() => { setIsModalVisible(false); setIsPrivate(false); setIsPremiumOnly(false); setRoomPassword(''); }}>
                  <Text style={mdl.cancelText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateLobby} style={{ flex: 1 }}>
                  <LinearGradient colors={[T.primary, T.secondary]} style={mdl.createBtn}>
                    <Text style={mdl.createText}>Oluştur</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>



      {/* ── ŞİFRE GİRİŞ MODALI (Gizli Odalar İçin) ── */}
      <Modal visible={isPasswordModalVisible} animationType="fade" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={[mdl.overlay, { justifyContent: 'center', padding: 20 }]}>
            <View style={[mdl.sheet, { borderRadius: 28 }]}>
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <View style={mdl.iconCircle}>
                  <FontAwesome5 solid name="lock" size={20} color={T.primary} />
                </View>
                <Text style={[mdl.title, { textAlign: 'center' }]}>Gizli Oda</Text>
                <Text style={[mdl.subtitle, { textAlign: 'center', marginTop: 5 }]}>
                  &quot;{selectedLobby?.name}&quot; odasına girmek için şifreyi giriniz.
                </Text>
              </View>

              <TextInput 
                style={[mdl.input, { textAlign: 'center', fontSize: 20, letterSpacing: 2 }]} 
                placeholder="Şifre" 
                placeholderTextColor={T.textMuted} 
                value={enterPassword} 
                onChangeText={setEnterPassword} 
                secureTextEntry 
                autoFocus
              />

              <View style={mdl.btnRow}>
                <TouchableOpacity style={mdl.cancelBtn} onPress={() => { setIsPasswordModalVisible(false); setEnterPassword(''); }}>
                  <Text style={mdl.cancelText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleVerifyPassword} disabled={isVerifying} style={{ flex: 1 }}>
                  <LinearGradient colors={[T.primary, T.secondary]} style={mdl.createBtn}>
                    {isVerifying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={mdl.createText}>Giriş Yap</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STİLLER
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },
  container: { flex: 1, paddingHorizontal: 22, paddingTop: 15 },
  header: { marginBottom: 18 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  greeting: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: T.textMuted, letterSpacing: 0.5 },
  pageTitle: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 30, color: T.textDark, marginTop: 2, letterSpacing: 0.5 },
  
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catChipActive: { backgroundColor: T.primary, borderColor: T.primary },
  catChipInactive: { backgroundColor: T.surface, borderColor: T.border },
  catText: { fontSize: 13, fontWeight: 'bold' },
  catTextActive: { color: '#FFF' },
  catTextInactive: { color: T.textMuted },
  
  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 20, paddingVertical: 16, marginBottom: 16, borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '900', color: T.primary },
  summaryLabel: { fontSize: 12, fontWeight: '700', color: T.textMuted, marginTop: 3 },
  summaryDivider: { width: 1, height: 30, backgroundColor: T.border },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 16, paddingHorizontal: 18, height: 54, marginBottom: 22, borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  searchInput: { flex: 1, fontSize: 15, color: T.textDark, fontWeight: '500' },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  sectionLabel: { fontSize: 14, color: T.textDark, fontWeight: '900', letterSpacing: 0.5 },
  sectionCount: { fontSize: 12, color: T.textMuted, fontWeight: '700' },
  
  emptyWrap: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: T.softIndigo, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  emptyText: { fontSize: 18, color: T.textDark, fontWeight: 'bold' },
  emptySubText: { fontSize: 14, color: T.textMuted },
  
  fab: { position: 'absolute', bottom: 110, right: 22, borderRadius: 18, overflow: 'hidden', elevation: 12, shadowColor: T.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 15 },
  fabGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 16 },
  fabText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.2 },
});

const hdr = StyleSheet.create({
  iconBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', ...Theme.shadows.soft },
  iconBtnDanger: { borderColor: T.softDanger, backgroundColor: '#FFFFFF' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: T.danger, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.background },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  profileAvatar: { ...Theme.shadows.soft },
  profileAvatarText: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 18, color: T.primary },
  logoutWrap: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
});

const card = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 20, padding: 16, gap: 16, borderWidth: 1, borderColor: T.border, ...Theme.shadows.soft },
  eliteWrap: { borderColor: '#F3D57A', backgroundColor: '#FFFCF2' },
  iconBox: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border, backgroundColor: T.softIndigo },
  eliteIconBox: { backgroundColor: T.lightAmber, borderColor: '#F3D57A' },
  body: { flex: 1 },
  name: { fontSize: 17, fontWeight: '800', color: T.textDark, marginBottom: 4 },
  desc: { fontSize: 13, color: T.textMuted, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.background, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: T.border },
  elitePill: { backgroundColor: T.lightAmber, borderColor: '#F3D57A' },
  eliteMetaText: { color: T.primary },
  dot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { fontSize: 12, color: T.textMuted, fontWeight: '700' },
  chevronWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.softIndigo, alignItems: 'center', justifyContent: 'center' },
});

const mdl = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, gap: 15, ...Theme.shadows.medium },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 10 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: T.lightAmber, alignItems: 'center', justifyContent: 'center', marginBottom: 5, borderWidth: 1, borderColor: T.accent },
  title: { fontSize: 24, fontWeight: '900', color: T.textDark },
  subtitle: { fontSize: 14, color: T.textMuted, marginTop: -5, marginBottom: 10 },
  input: { backgroundColor: T.background, borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 16, fontSize: 15, color: T.textDark },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 15 },
  cancelBtn: { flex: 1, height: 56, borderRadius: 18, backgroundColor: T.softIndigo, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: 'bold', color: T.textDark },
  createBtn: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  createText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.softIndigo, alignItems: 'center', justifyContent: 'center' },
});

const flist = StyleSheet.create({
  sectionTitle: { fontSize: 13, fontWeight: '800', color: T.textMuted, letterSpacing: 1, marginBottom: 12 },
  itemWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.background, padding: 14, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: T.border },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: T.softIndigo, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { fontSize: 18, fontWeight: '800', color: T.primary },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: 'bold', color: T.textDark, marginBottom: 3 },
  username: { fontSize: 13, color: T.textMuted },
  scoreTitle: { fontSize: 10, color: T.textMuted, fontWeight: '600', marginBottom: 2 },
  score: { fontSize: 14, color: T.accent, fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { backgroundColor: T.softSuccess, borderWidth: 1, borderColor: T.success },
  rejectBtn: { backgroundColor: T.softDanger, borderWidth: 1, borderColor: T.danger },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 10, backgroundColor: T.background, borderRadius: 20, borderWidth: 1, borderColor: T.border },
  emptyText: { fontSize: 14, color: T.textMuted, fontWeight: '500' }
});

const bg = StyleSheet.create({
  orb1: { position: 'absolute', top: -height * 0.08, right: -width * 0.22, width: width * 0.75, height: width * 0.75, borderRadius: width * 0.375, backgroundColor: T.softIndigo, opacity: 0.75 },
  orb2: { position: 'absolute', bottom: -height * 0.06, left: -width * 0.28, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: T.lightAmber, opacity: 0.58 },
  orb3: { position: 'absolute', top: height * 0.37, right: width * 0.08, width: width * 0.32, height: width * 0.32, borderRadius: width * 0.16, backgroundColor: T.softInfo, opacity: 0.45 },
  gridLine1: { position: 'absolute', top: 0, left: width * 0.33, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
  gridLine2: { position: 'absolute', top: 0, left: width * 0.66, width: 1, height: height, backgroundColor: 'rgba(255,255,255,0.02)' },
});
