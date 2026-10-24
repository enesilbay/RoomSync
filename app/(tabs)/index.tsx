import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, Animated, Dimensions, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiUrl } from '../config/api';
import { C } from './sensor';
import { Theme } from '../utils/theme';

const T = C;
const { width } = Dimensions.get('window');

// ── ANİMASYONLU INPUT BİLEŞENİ ──
function InputField({
  placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, iconName,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  iconName: string;
}) {
  const [focused, setFocused] = useState(false);
  const colorAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(colorAnim, { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: false }).start();
    Animated.spring(scaleAnim, { toValue: focused ? 1.01 : 1, tension: 120, friction: 8, useNativeDriver: true }).start();
  }, [focused]);

  const borderColor = colorAnim.interpolate({ inputRange: [0, 1], outputRange: [T.border, T.primary] });
  const bgColor = colorAnim.interpolate({ inputRange: [0, 1], outputRange: [T.surface, T.softIndigo] });

  return (
    <Animated.View style={[field.wrap, { borderColor, backgroundColor: bgColor }]}>
      <Animated.View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center' }, { transform: [{ scale: scaleAnim }] }]}>
        <View style={field.iconWrap}>
          <FontAwesome5 name={iconName} size={15} color={focused ? T.primary : T.textMuted} solid />
        </View>
        <TextInput
          style={field.input}
          placeholder={placeholder}
          placeholderTextColor={T.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </Animated.View>
    </Animated.View>
  );
}

// ── ANA EKRAN ──
export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [isVerifyEmail, setIsVerifyEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const formSlide = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();
    checkExistingLogin();
  }, []);

  const switchTab = (toLogin: boolean) => {
    Animated.sequence([
      Animated.timing(formSlide, { toValue: 8, duration: 80, useNativeDriver: true }),
      Animated.spring(formSlide, { toValue: 0, tension: 100, friction: 10, useNativeDriver: true }),
    ]).start();
    setIsLogin(toLogin);
    setIsForgotPassword(false);
    setIsResetPassword(false);
    setIsVerifyEmail(false);
  };

  const checkExistingLogin = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        router.replace({ pathname: '/lobbies' as any, params: parsed });
      }
    } catch (e) {}
  };

  const handleAuth = async () => {
    if (!email || (!isForgotPassword && !isResetPassword && !password) || (!isLogin && (!fullName || !username))) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }
    if (!isLogin) {
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        Alert.alert('Geçersiz Kullanıcı Adı', 'Sadece harf, rakam ve alt çizgi (_) kullanın.');
        return;
      }
      if (password.length < 8) {
        Alert.alert('Zayıf Şifre', 'Şifreniz en az 8 karakter olmalıdır.');
        return;
      }
    }
    setIsLoading(true);
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    try {
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin ? { email, password } : { username, fullName, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.requiresVerification) {
          Alert.alert('Doğrulama Kodu Gönderildi', data.message);
          setIsVerifyEmail(true);
        } else {
          await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
          await AsyncStorage.setItem('access_token', data.access_token);
          router.replace({ pathname: '/lobbies' as any, params: data.user });
        }
      } else {
        if (data.requiresVerification) {
          Alert.alert('E-posta Doğrulama', data.message);
          setIsVerifyEmail(true);
        } else {
          const errorMsg = Array.isArray(data.message)
            ? data.message.join('\n')
            : (data.message || 'Bir sorun oluştu.');
          Alert.alert('Hata', errorMsg);
        }
      }
    } catch {
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamıyor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!email || !verifyToken) {
      Alert.alert('Eksik Bilgi', 'Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('/auth/verify-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: verifyToken.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Tebrikler! 🎉', data.message);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        await AsyncStorage.setItem('access_token', data.access_token);
        router.replace({ pathname: '/lobbies' as any, params: data.user });
      } else {
        Alert.alert('Hata', data.message || 'Doğrulama kodu hatalı.');
      }
    } catch {
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamıyor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { Alert.alert('Eksik Bilgi', 'Lütfen e-posta adresinizi girin.'); return; }
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Başarılı', data.message);
        setIsForgotPassword(false);
        setIsResetPassword(true);
      } else {
        Alert.alert('Hata', data.message || 'Bir sorun oluştu.');
      }
    } catch { Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamıyor.'); }
    finally { setIsLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!email || !resetToken || !newPassword) { Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.'); return; }
    if (newPassword.length < 8) { Alert.alert('Zayıf Şifre', 'Yeni şifreniz en az 8 karakter olmalıdır.'); return; }
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: resetToken, newPass: newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Başarılı', data.message);
        setIsResetPassword(false);
        setIsLogin(true);
      } else {
        Alert.alert('Hata', data.message || 'Bir sorun oluştu.');
      }
    } catch { Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamıyor.'); }
    finally { setIsLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.background} />

      {/* Hafif dekoratif arkaplan lekeleri */}
      <View style={s.blobTop} />
      <View style={s.blobBottom} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <Animated.View style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* LOGO & BAŞLIK */}
            <Animated.View style={[s.heroSection, { transform: [{ scale: logoScale }] }]}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={s.logoImage}
                resizeMode="contain"
              />
              <Text style={s.tagline}>Ayrı Masalarda, Aynı Lobide.</Text>
            </Animated.View>

            {/* KART */}
            <Animated.View style={[s.card, { transform: [{ translateY: formSlide }] }]}>

              {/* SEKME SEÇİCİ */}
              <View style={s.tabContainer}>
                <TouchableOpacity
                  style={[s.tabBtn, isLogin && s.tabBtnActive]}
                  onPress={() => switchTab(true)}
                  activeOpacity={0.8}
                >
                  <FontAwesome5 solid name="sign-in-alt" size={13} color={isLogin ? T.primary : T.textMuted} style={{ marginRight: 7 }} />
                  <Text style={[s.tabText, isLogin && s.tabTextActive]}>Giriş Yap</Text>
                </TouchableOpacity>

                <View style={s.tabDivider} />

                <TouchableOpacity
                  style={[s.tabBtn, !isLogin && s.tabBtnActive]}
                  onPress={() => switchTab(false)}
                  activeOpacity={0.8}
                >
                  <FontAwesome5 solid name="user-plus" size={13} color={!isLogin ? T.primary : T.textMuted} style={{ marginRight: 7 }} />
                  <Text style={[s.tabText, !isLogin && s.tabTextActive]}>Kayıt Ol</Text>
                </TouchableOpacity>
              </View>

              {/* FORM */}
              <View style={s.form}>
                {isVerifyEmail ? (
                  <>
                    <Text style={{ color: T.textDark, fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 12, lineHeight: 18 }}>
                      {email} adresine gönderilen 6 haneli doğrulama kodunu girin:
                    </Text>
                    <InputField placeholder="6 Haneli Doğrulama Kodu" value={verifyToken} onChangeText={setVerifyToken} keyboardType="number-pad" iconName="key" />
                    <TouchableOpacity
                      onPress={handleVerifyEmail}
                      disabled={isLoading}
                      activeOpacity={0.85}
                      style={s.btn}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={s.btnText}>HESABI DOĞRULA VE BAŞLA</Text>
                          <FontAwesome5 solid name="check-circle" size={13} color="#FFFFFF" />
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsVerifyEmail(false)} style={s.backToLoginBtn}>
                      <Text style={s.backToLoginText}>← İptal / Giriş Ekranına Dön</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {!isLogin && (
                      <>
                        <InputField placeholder="Ad Soyad" value={fullName} onChangeText={setFullName} autoCapitalize="words" iconName="user-circle" />
                        <InputField placeholder="Kullanıcı Adı (örn: enes_123)" value={username} onChangeText={setUsername} iconName="at" />
                      </>
                    )}
                    <InputField placeholder="E-posta adresi" value={email} onChangeText={setEmail} keyboardType="email-address" iconName="envelope" />

                    {!isForgotPassword && !isResetPassword && (
                      <InputField placeholder="Şifre" value={password} onChangeText={setPassword} secureTextEntry iconName="lock" />
                    )}

                    {isResetPassword && (
                      <>
                        <InputField placeholder="6 Haneli Kod" value={resetToken} onChangeText={setResetToken} keyboardType="number-pad" iconName="key" />
                        <InputField placeholder="Yeni Şifre" value={newPassword} onChangeText={setNewPassword} secureTextEntry iconName="lock" />
                      </>
                    )}

                    {isLogin && !isForgotPassword && !isResetPassword && (
                      <TouchableOpacity onPress={() => setIsForgotPassword(true)} style={s.forgotBtn}>
                        <Text style={s.forgotText}>Şifremi Unuttum</Text>
                      </TouchableOpacity>
                    )}

                    {/* ANA BUTON */}
                    <TouchableOpacity
                      onPress={isForgotPassword ? handleForgotPassword : (isResetPassword ? handleResetPassword : handleAuth)}
                      disabled={isLoading}
                      activeOpacity={0.85}
                      style={s.btn}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={s.btnText}>
                            {isForgotPassword ? 'KOD GÖNDER' : (isResetPassword ? 'ŞİFREYİ GÜNCELLE' : (isLogin ? 'GİRİŞ YAP' : 'HESAP OLUŞTUR'))}
                          </Text>
                          <FontAwesome5 solid name="arrow-right" size={13} color="#FFFFFF" />
                        </>
                      )}
                    </TouchableOpacity>

                    {(isForgotPassword || isResetPassword) && (
                      <TouchableOpacity onPress={() => { setIsForgotPassword(false); setIsResetPassword(false); }} style={s.backToLoginBtn}>
                        <Text style={s.backToLoginText}>← Giriş Ekranına Dön</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>

              {/* ALT GEÇİŞ */}
              <TouchableOpacity style={s.switchRow} onPress={() => switchTab(!isLogin)} activeOpacity={0.7}>
                <Text style={s.switchText}>
                  {isLogin ? 'Henüz hesabın yok mu?  ' : 'Zaten üye misin?  '}
                  <Text style={s.switchAction}>{isLogin ? 'Kayıt Ol →' : 'Giriş Yap →'}</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ALT ÖZELLİK CHİPLERİ */}
            <View style={s.features}>
              {[
                { icon: 'users', text: 'Çalışma Odaları' },
                { icon: 'fire', text: 'Puan Sistemi' },
                { icon: 'music', text: 'Atmosfer Sesi' },
              ].map((f) => (
                <View key={f.text} style={s.featureChip}>
                  <FontAwesome5 solid name={f.icon} size={11} color={T.primary} />
                  <Text style={s.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 40 },
  content: { width: '100%', maxWidth: 440, alignItems: 'center' },

  // Dekoratif arka plan lekeleri (açık, yumuşak)
  blobTop: {
    position: 'absolute', top: -80, right: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: T.softIndigo,
    opacity: 0.7,
  },
  blobBottom: {
    position: 'absolute', bottom: -60, left: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: T.lightAmber,
    opacity: 0.5,
  },

  heroSection: { alignItems: 'center', marginBottom: 32 },
  logoImage: { width: width * 0.55, height: 70, marginBottom: 14 },
  tagline: { fontSize: 14, color: T.textMuted, fontWeight: '500', letterSpacing: 0.3, textAlign: 'center' },

  card: {
    width: '100%',
    backgroundColor: T.surface,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 22,
    ...Theme.shadows.medium,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: T.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  tabBtn: { flex: 1, flexDirection: 'row', paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  tabBtnActive: { backgroundColor: T.softIndigo, borderBottomWidth: 2, borderBottomColor: T.primary },
  tabDivider: { width: 1, backgroundColor: T.border, marginVertical: 8 },
  tabText: { fontSize: 14, fontWeight: '600', color: T.textMuted },
  tabTextActive: { color: T.primary, fontWeight: '800' },

  form: { gap: 12 },

  btn: {
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: T.primary,
    marginTop: 6,
    ...Theme.shadows.medium,
  },
  btnText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.2 },

  switchRow: { marginTop: 22, alignItems: 'center' },
  switchText: { fontSize: 13, color: T.textMuted, fontWeight: '500' },
  switchAction: { color: T.primary, fontWeight: '800' },

  forgotBtn: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 2 },
  forgotText: { color: T.accent, fontSize: 13, fontWeight: '600' },

  backToLoginBtn: { marginTop: 10, alignItems: 'center' },
  backToLoginText: { color: T.textMuted, fontSize: 13, fontWeight: '600' },

  features: { flexDirection: 'row', gap: 10, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' },
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.softIndigo,
    borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: T.border,
  },
  featureText: { fontSize: 12, color: T.primary, fontWeight: '600' },
});

const field = StyleSheet.create({
  wrap: { height: 54, borderRadius: 12, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  iconWrap: { width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  input: { flex: 1, fontSize: 15, color: T.textDark, fontWeight: '500' },
});
