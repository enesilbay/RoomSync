import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { apiUrl, assetUrl, getAuthHeaders } from './config/api';
import { AppScreen, DarkSheetModal, IconButton, PageHeader, SoftCard } from './components/common';
import { FramedAvatar } from './components/FramedAvatar';
import { C } from './(tabs)/sensor';
import { getRankInfo, getRankProgress } from './utils/rank';
import { Theme } from './utils/theme';

const T = C;

type UserProfile = {
  id: number;
  username?: string;
  email?: string;
  fullName?: string;
  totalFocusMinutes?: number;
  avatarUrl?: string;
  isPremium?: boolean;
  coins?: number;
  currentStreak?: number;
  badges?: string[];
  equippedIcon?: string;
  equippedProfileFrame?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const myUserId = Number(params.id);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchUserData = React.useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('user_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setEditName(parsed.fullName || '');
        setEditEmail(parsed.email || '');
        setEditUsername(parsed.username || '');
      }

      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl('/users/me'), { headers });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setEditName(data.user.fullName || '');
        setEditEmail(data.user.email || '');
        setEditUsername(data.user.username || '');
      }
    } catch {
      Alert.alert('Hata', 'Profil bilgileri yuklenemedi.');
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
      if (params.openSettings === 'true') {
        setSettingsVisible(true);
        router.setParams({ openSettings: undefined }); // Prevent reopening on subsequent focuses
      }
    }, [fetchUserData, params.openSettings]),
  );

  const handleLogout = () => {
    Alert.alert(
      'Cikis Yap',
      'Hesabindan cikis yapmak istediginize emin misiniz?',
      [
        { text: 'Iptal', style: 'cancel' },
        {
          text: 'Cikis Yap',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['user_data', 'access_token']);
            router.replace('/' as any);
          },
        },
      ]
    );
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin gerekli', 'Avatar secmek icin galeri izni gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0]);
    }
  };

  const uploadAvatar = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      const fileUri = imageAsset.uri;
      const fileName = imageAsset.fileName || fileUri.split('/').pop() || 'avatar.jpg';
      formData.append('file', { uri: fileUri, name: fileName, type: imageAsset.mimeType || 'image/jpeg' } as any);

      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl(`/users/avatar/${myUserId}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      const resText = await res.text();
      if (!res.ok) {
        console.log('Upload error response:', resText);
        throw new Error(`Avatar yuklenemedi: ${resText.substring(0, 100)}`);
      }

      const data = JSON.parse(resText);
      setUser(data.user);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
    } catch (err: any) {
      console.error(err);
      Alert.alert('Hata', err.message || 'Avatar yuklenemedi.');
    } finally {
      setIsUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Hata', 'Isim bos olamaz.');
      return;
    }
    if (!editEmail.trim() || !editUsername.trim()) {
      Alert.alert('Hata', 'E-posta ve kullanici adi bos olamaz.');
      return;
    }
    if (!currentPassword) {
      Alert.alert('Hata', 'Degisiklikleri kaydetmek icin mevcut sifrenizi girmelisiniz.');
      return;
    }

    setIsSaving(true);
    try {
      const headers = await getAuthHeaders();
      const profileRes = await fetch(apiUrl(`/users/${myUserId}/profile`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ fullName: editName.trim() }),
      });
      const profileData = await profileRes.json();
      if (!profileRes.ok) {
        throw new Error('Profil guncellenemedi.');
      }

      const settingsRes = await fetch(apiUrl('/users/me/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          email: editEmail.trim(),
          username: editUsername.trim(),
          currentPassword,
          ...(newPassword ? { newPassword } : {}),
        }),
      });
      const settingsData = await settingsRes.json();
      if (!settingsRes.ok) {
        throw new Error(settingsData.message || 'Ayarlar guncellenemedi.');
      }

      const updatedUser = { ...profileData.user, ...settingsData.user };
      setUser(updatedUser);
      setCurrentPassword('');
      setNewPassword('');
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
      if (settingsData.access_token) {
        await AsyncStorage.setItem('access_token', settingsData.access_token);
      }
      setSettingsVisible(false);
      Alert.alert('Kaydedildi', 'Profil ayarlari guncellendi.');
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Profil guncellenemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <AppScreen>
        <View style={styles.loading}>
          <ActivityIndicator color={T.primary} />
        </View>
      </AppScreen>
    );
  }

  const score = user.totalFocusMinutes ?? 0;
  const rank = getRankInfo(score);
  const progress = getRankProgress(score);
  const avatar = assetUrl(user.avatarUrl);
  const earnedBadges = (Array.isArray(user.badges) ? user.badges : []).filter(
    (badge) => typeof badge === 'string' && badge.trim().length > 0,
  );

  return (
    <AppScreen scroll>
      <PageHeader
        title="Profil"
        eyebrow="Odak kimligin"
        onBack={() => router.back()}
        right={
          <View style={styles.headerActions}>
            <IconButton name="cog" onPress={() => setSettingsVisible(true)} />
            <IconButton name="info" onPress={() => setInfoVisible(true)} />
          </View>
        }
      />

      <View style={styles.hero}>
        <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.86}>
          <FramedAvatar
            uri={avatar}
            name={user.fullName}
            frameId={user.equippedProfileFrame}
            size={144}
            colors={T}
            backgroundColor={T.surface}
            textSize={46}
            baseBorderWidth={4}
            activeBorderWidth={6}
            style={styles.avatarFrame}
            imageStyle={styles.avatarImage}
          >
            <View style={styles.cameraBadge}>
              {isUploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <FontAwesome5 solid name="camera" size={13} color="#FFFFFF" />}
            </View>
          </FramedAvatar>
        </TouchableOpacity>

        <Text style={styles.name}>
          {user.fullName} {user.equippedIcon ? user.equippedIcon : ''}
        </Text>
        <Text style={styles.username}>@{user.username || 'ogrenci'}</Text>
        <View style={[styles.premiumBadge, user.isPremium ? styles.premiumActive : styles.premiumPassive]}>
          <FontAwesome5 solid name={user.isPremium ? 'crown' : 'user'} size={11} color={user.isPremium ? T.accent : T.textMuted} />
          <Text style={[styles.premiumText, user.isPremium && { color: T.accent }]}>
            {user.isPremium ? 'Premium aktif' : 'Standart hesap'}
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <SoftCard style={styles.statCard}>
          <FontAwesome5 solid name={rank.icon} size={22} color={rank.color} />
          <Text style={[styles.statValue, { color: rank.color }]}>{rank.title}</Text>
          <Text style={styles.statLabel}>Rutbe</Text>
        </SoftCard>
        <SoftCard style={styles.statCard}>
          <FontAwesome5 solid name="brain" size={22} color={T.primary} />
          <Text style={styles.statValue}>{score}</Text>
          <Text style={styles.statLabel}>Odak Dk.</Text>
        </SoftCard>
      </View>

      <View style={styles.statsGrid}>
        <SoftCard style={styles.statCard}>
          <FontAwesome5 solid name="fire-alt" size={22} color={T.danger} />
          <Text style={styles.statValue}>{user.currentStreak ?? 0}</Text>
          <Text style={styles.statLabel}>Gunluk Seri</Text>
        </SoftCard>
        <SoftCard style={styles.statCard}>
          <FontAwesome5 solid name="coins" size={22} color={T.accent} />
          <Text style={styles.statValue}>{user.coins ?? 0}</Text>
          <Text style={styles.statLabel}>Bakiye</Text>
        </SoftCard>
      </View>

      <SoftCard style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.sectionTitle}>Sonraki rutbe</Text>
          <Text style={styles.progressText}>{progress.nextRank ?? 'Maksimum'}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress.percentage}%`, backgroundColor: rank.color }]} />
        </View>
        <Text style={styles.statLabel}>
          {progress.nextRank ? `${progress.current} / ${progress.total} dakika` : 'Tum rutbeler tamamlandi.'}
        </Text>
      </SoftCard>

      <SoftCard style={styles.badgesCard}>
        <Text style={styles.sectionTitle}>Kazanilan Rozetler</Text>
        <View style={styles.badgesList}>
          {earnedBadges.length > 0 ? (
            earnedBadges.map((badge, i) => (
              <View key={i} style={styles.badgeItem}>
                <FontAwesome5 name="medal" size={20} color={T.accent} />
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noBadgeText}>Henuz rozet kazanilamadi.</Text>
          )}
        </View>
      </SoftCard>

      <TouchableOpacity onPress={() => router.push('/shop' as any)} activeOpacity={0.86}>
        <SoftCard style={[styles.analyticsButton, { backgroundColor: T.primary, marginBottom: 16 }]}>
          <FontAwesome5 solid name="shopping-cart" size={16} color="#FFF" />
          <Text style={[styles.analyticsText, { color: '#FFF' }]}>Magazaya Git (Shop)</Text>
          <FontAwesome5 solid name="chevron-right" size={12} color="#FFF" />
        </SoftCard>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => {
          if (user.isPremium) {
            router.push('/analytics' as any);
          } else {
            router.push({ pathname: '/premium', params: { id: myUserId } } as any);
          }
        }}
      >
        <SoftCard style={styles.analyticsButton}>
          <FontAwesome5 solid name={user.isPremium ? 'chart-pie' : 'lock'} size={16} color={user.isPremium ? T.accent : T.textMuted} />
          <Text style={styles.analyticsText}>{user.isPremium ? 'Analitik paneline git' : 'Analitik icin PRO gerekli'}</Text>
          <FontAwesome5 solid name="chevron-right" size={12} color={T.primary} />
        </SoftCard>
      </TouchableOpacity>

      <DarkSheetModal visible={infoVisible} onClose={() => setInfoVisible(false)}>
        <View style={styles.infoHero}>
          <View style={styles.infoIconWrap}>
            <FontAwesome5 solid name="bolt" size={20} color={T.accent} />
          </View>
          <Text style={styles.infoTitle}>Puan nasil kazanilir?</Text>
          <Text style={styles.infoSubtitle}>Odak puanin calisma odalarinda masada kaldigin sureye gore artar.</Text>
        </View>

        <View style={styles.infoList}>
          <View style={styles.infoStep}>
            <View style={[styles.infoStepIcon, { backgroundColor: T.softIndigo }]}>
              <FontAwesome5 solid name="play" size={13} color={T.primary} />
            </View>
            <View style={styles.infoStepText}>
              <Text style={styles.infoStepTitle}>Pomodoro baslat</Text>
              <Text style={styles.infoStepDesc}>Bir calisma odasina girip zamanlayiciyi calistir.</Text>
            </View>
          </View>

          <View style={styles.infoStep}>
            <View style={[styles.infoStepIcon, { backgroundColor: T.softSuccess }]}>
              <FontAwesome5 solid name="mobile-alt" size={15} color={T.success} />
            </View>
            <View style={styles.infoStepText}>
              <Text style={styles.infoStepTitle}>Telefonu masaya birak</Text>
              <Text style={styles.infoStepDesc}>Telefon masadayken her dakika 1 odak puani kazanirsin.</Text>
            </View>
          </View>

          <View style={styles.infoStep}>
            <View style={[styles.infoStepIcon, { backgroundColor: T.lightAmber }]}>
              <FontAwesome5 solid name="crown" size={14} color={T.accent} />
            </View>
            <View style={styles.infoStepText}>
              <Text style={styles.infoStepTitle}>Elite odalarda x2</Text>
              <Text style={styles.infoStepDesc}>Elite odalarda ayni sure iki kat puan olarak hesabina islenir.</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoTip}>
          <FontAwesome5 solid name="info-circle" size={14} color={T.info} />
          <Text style={styles.infoTipText}>Telefonu ekran asagi koyarsan odak ekrani kararir ve dikkat dagitmaz.</Text>
        </View>

        <TouchableOpacity onPress={() => setInfoVisible(false)} style={[styles.primaryBtn, { flex: 0 }]}>
          <Text style={styles.primaryBtnText}>Anladim</Text>
        </TouchableOpacity>
      </DarkSheetModal>

      <DarkSheetModal visible={settingsVisible} onClose={() => setSettingsVisible(false)}>
        <Text style={styles.sheetTitle}>Hesap ayarlari</Text>
        <Text style={styles.inputLabel}>Ad Soyad</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Ad Soyad" placeholderTextColor={T.textMuted} />
        </View>
        <Text style={styles.inputLabel}>Kullanici adi</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={editUsername} onChangeText={setEditUsername} placeholder="kullanici_adi" placeholderTextColor={T.textMuted} autoCapitalize="none" />
        </View>
        <Text style={styles.inputLabel}>E-posta</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} placeholder="mail@ornek.com" placeholderTextColor={T.textMuted} keyboardType="email-address" autoCapitalize="none" />
        </View>
        <View style={styles.premiumRow}>
          <View>
            <Text style={styles.premiumRowTitle}>Premium durumu</Text>
            <Text style={styles.premiumRowText}>{user.isPremium ? 'Premium ozellikler acik.' : 'Premium ozellikler kapali.'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setSettingsVisible(false);
              router.push({ pathname: '/premium', params: { id: myUserId } } as any);
            }}
            style={styles.premiumAction}
          >
            <Text style={styles.premiumActionText}>{user.isPremium ? 'Gor' : 'Yukselt'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.inputLabel}>Güvenlik Doğrulaması (Zorunlu)</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Mevcut şifrenizi girin" placeholderTextColor={T.textMuted} secureTextEntry />
        </View>
        <Text style={styles.inputLabel}>Yeni Şifre (İsteğe Bağlı)</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="Şifrenizi değiştirmek istiyorsanız girin" placeholderTextColor={T.textMuted} secureTextEntry />
        </View>
        <View style={styles.sheetActions}>
          <TouchableOpacity onPress={() => setSettingsVisible(false)} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Iptal</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={saveProfile} disabled={isSaving} style={styles.primaryBtn}>
            {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Kaydet</Text>}
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <FontAwesome5 solid name="sign-out-alt" size={15} color="#E53935" />
          <Text style={styles.logoutBtnText}>Cikis Yap</Text>
        </TouchableOpacity>
      </DarkSheetModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  hero: {
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: T.border,
    padding: 26,
    marginBottom: 16,
    ...Theme.shadows.medium,
  },
  avatarFrame: { marginBottom: 0 },
  avatarImage: { backgroundColor: T.softIndigo },
  cameraBadge: { position: 'absolute', right: 4, bottom: 4, width: 38, height: 38, borderRadius: 19, backgroundColor: T.primary, borderWidth: 3, borderColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  name: { color: T.textDark, fontSize: 26, fontWeight: '900', marginTop: 18, textAlign: 'center' },
  username: { color: T.textMuted, fontSize: 15, fontWeight: '700', marginTop: 4 },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  premiumActive: { backgroundColor: T.lightAmber, borderColor: T.accent },
  premiumPassive: { backgroundColor: T.softIndigo, borderColor: T.border },
  premiumText: { color: T.textMuted, fontSize: 12, fontWeight: '900' },
  statsGrid: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', gap: 8 },
  statValue: { color: T.textDark, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  statLabel: { color: T.textMuted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  progressCard: { marginBottom: 16 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: T.textDark, fontSize: 16, fontWeight: '900' },
  progressText: { color: T.primary, fontSize: 13, fontWeight: '900' },
  track: { height: 9, backgroundColor: T.border, borderRadius: 999, overflow: 'hidden', marginBottom: 10 },
  fill: { height: '100%', borderRadius: 999 },
  badgesCard: { marginBottom: 16 },
  badgesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  badgeItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: T.border },
  badgeText: { color: T.textDark, fontSize: 13, fontWeight: '700' },
  noBadgeText: { color: T.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  analyticsButton: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30 },
  analyticsText: { flex: 1, color: T.textDark, fontSize: 15, fontWeight: '900' },
  infoHero: { alignItems: 'center', marginBottom: 18 },
  infoIconWrap: { width: 54, height: 54, borderRadius: 18, backgroundColor: T.lightAmber, borderWidth: 1, borderColor: T.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  infoTitle: { color: T.textDark, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  infoSubtitle: { color: T.textMuted, fontSize: 13, fontWeight: '700', lineHeight: 19, textAlign: 'center', marginTop: 6 },
  infoList: { gap: 10, marginBottom: 14 },
  infoStep: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: T.background, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 13 },
  infoStepIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  infoStepText: { flex: 1 },
  infoStepTitle: { color: T.textDark, fontSize: 14, fontWeight: '900', marginBottom: 3 },
  infoStepDesc: { color: T.textMuted, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  infoTip: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: T.softInfo, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, marginBottom: 16 },
  infoTipText: { flex: 1, color: T.textDark, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  sheetTitle: { color: T.textDark, fontSize: 20, fontWeight: '900', marginBottom: 10 },
  sheetText: { color: T.textMuted, fontSize: 14, fontWeight: '600', lineHeight: 21, marginBottom: 18 },
  inputLabel: { color: T.textDark, fontSize: 12, fontWeight: '900', marginBottom: 7, marginLeft: 2 },
  inputWrap: { backgroundColor: T.softIndigo, borderRadius: 14, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, marginBottom: 16 },
  input: { height: 52, color: T.textDark, fontSize: 16, fontWeight: '600' },
  premiumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, backgroundColor: T.lightAmber, borderRadius: 16, borderWidth: 1, borderColor: T.accent, padding: 14, marginBottom: 16 },
  premiumRowTitle: { color: T.textDark, fontSize: 14, fontWeight: '900' },
  premiumRowText: { color: T.textMuted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  premiumAction: { backgroundColor: T.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: T.accent },
  premiumActionText: { color: T.accent, fontSize: 12, fontWeight: '900' },
  sheetActions: { flexDirection: 'row', gap: 10 },
  primaryBtn: { flex: 1, backgroundColor: T.primary, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 16 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900' },
  secondaryBtn: { flex: 1, backgroundColor: T.softIndigo, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderWidth: 1, borderColor: T.border },
  secondaryBtnText: { color: T.textDark, fontWeight: '900' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFF5F5' },
  logoutBtnText: { color: '#E53935', fontWeight: '900', fontSize: 15 },
});
