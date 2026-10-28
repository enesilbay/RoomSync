import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { apiUrl } from '@/src/lib/api';
import { AppScreen, CustomAlertModal, PageHeader, SoftCard } from '@/src/components/common';
import { C, Theme } from '@/src/theme';

const T = C;

const benefits = [
  { icon: 'crown', title: 'Elite Odalar', text: 'Sadece Premium üyelere özel odalara gir ve oda kur.' },
  { icon: 'users', title: 'Genişletilmiş Grup Odaları', text: 'Gizli çalışma odalarında daha fazla arkadaşınla odaklan.' },
  { icon: 'chart-pie', title: 'Detaylı Odak Analitiği', text: 'Haftalık grafikler, verimli saatlerin ve odak istatistiklerin.' },
  { icon: 'id-badge', title: 'Özel Profil Rozeti ve Çerçeve', text: 'Profilinde altın taç ikonu ve özel animasyonlu çerçeveler.' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [isStripeModalVisible, setIsStripeModalVisible] = useState(false);
  const [cardNumber] = useState('4242 •••• •••• 4242');
  const [alertState, setAlertState] = useState<{ visible: boolean; type?: 'info' | 'success' | 'danger'; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const handleStartPayment = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const amount = selectedPlan === 'yearly' ? 399 : 49;
      const res = await fetch(apiUrl('/payments/create-intent'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, currency: 'try' }),
      });

      if (res.ok) {
        setIsStripeModalVisible(true);
      } else {
        throw new Error('Ödeme kanalı açılamadı.');
      }
    } catch {
      setAlertState({
        visible: true,
        type: 'danger',
        title: 'Hata',
        message: 'Ödeme kanalı başlatılamadı. Lütfen tekrar deneyin.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmStripePayment = async () => {
    setIsStripeModalVisible(false);
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(apiUrl('/users/demo/upgrade'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Premium aktifleştirilemedi.');
      }

      const stored = await AsyncStorage.getItem('user_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.isPremium = true;
        await AsyncStorage.setItem('user_data', JSON.stringify(parsed));
      }

      setAlertState({
        visible: true,
        type: 'success',
        title: 'Tebrikler! 👑',
        message: 'RoomSync PRO üyeliğiniz başarıyla aktif edildi. Keyifli çalışmalar!',
      });
    } catch {
      setAlertState({
        visible: true,
        type: 'danger',
        title: 'Hata',
        message: 'Ödeme işlemi tamamlanamadı.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppScreen scroll>
      <PageHeader title="RoomSync PRO" eyebrow="Premium çalışma deneyimi" onBack={() => router.back()} />

      <View style={styles.hero}>
        <View style={styles.crown}>
          <FontAwesome5 solid name="crown" size={36} color={T.accent} />
        </View>
        <Text style={styles.title}>Odaklanma Potansiyelini İkiye Katla</Text>
        <Text style={styles.subtitle}>Elite çalışma odaları, detaylı analitikler ve kişiselleştirilmiş profil avantajları tek pakette.</Text>
      </View>

      {/* PLAN SEÇENEKLERİ */}
      <View style={styles.plansContainer}>
        <TouchableOpacity
          style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardActive]}
          onPress={() => setSelectedPlan('yearly')}
          activeOpacity={0.9}
        >
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>%33 Tasarruf</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>Yıllık PRO</Text>
            <Text style={styles.planSub}>Yılda ₺399.99 (₺33.33/ay)</Text>
          </View>
          <Text style={styles.planPrice}>₺399.99</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardActive]}
          onPress={() => setSelectedPlan('monthly')}
          activeOpacity={0.9}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>Aylık PRO</Text>
            <Text style={styles.planSub}>Her ay yenilenir, istediğin zaman iptal et</Text>
          </View>
          <Text style={styles.planPrice}>₺49.99</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.features}>
        {benefits.map((item) => (
          <SoftCard key={item.title} style={styles.feature}>
            <View style={styles.featureIcon}>
              <FontAwesome5 solid name={item.icon} size={16} color={T.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureText}>{item.text}</Text>
            </View>
          </SoftCard>
        ))}
      </View>

      <SoftCard style={styles.stripeInfoBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <FontAwesome5 solid name="shield-alt" size={14} color={T.primary} />
          <Text style={styles.stripeInfoTitle}>Stripe Güvenli Ödeme Testi</Text>
        </View>
        <Text style={styles.stripeInfoText}>
          Kart bilgileriniz uygulamamızda saklanmaz. Ödemeler Stripe Altyapısı (PaymentSheet / Test Modu) ile güvenle simüle edilir.
        </Text>
      </SoftCard>

      <TouchableOpacity onPress={handleStartPayment} disabled={isLoading} activeOpacity={0.88}>
        <LinearGradient colors={[T.primary, T.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <FontAwesome5 solid name="bolt" size={15} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                {selectedPlan === 'yearly' ? 'YILLIK PRO İLE BAŞLA (₺399.99)' : 'AYLIK PRO İLE BAŞLA (₺49.99)'}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* STRIPE TEST SHEET MODAL */}
      <Modal visible={isStripeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.stripeSheet}>
            <View style={styles.sheetHeader}>
              <FontAwesome5 name="stripe" size={32} color="#635BFF" brand />
              <TouchableOpacity onPress={() => setIsStripeModalVisible(false)} style={styles.closeBtn}>
                <FontAwesome5 name="times" size={16} color={T.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetTitle}>Stripe Test Ödeme Ekranı</Text>
            <Text style={styles.sheetSub}>
              {selectedPlan === 'yearly' ? 'RoomSync PRO Yıllık Abonelik (₺399.99)' : 'RoomSync PRO Aylık Abonelik (₺49.99)'}
            </Text>

            <View style={styles.cardInputFake}>
              <FontAwesome5 name="credit-card" size={18} color={T.primary} solid />
              <Text style={styles.cardNumberText}>{cardNumber}</Text>
              <View style={styles.testBadge}>
                <Text style={styles.testBadgeText}>TEST KARTI</Text>
              </View>
            </View>

            <View style={styles.cardRowMeta}>
              <View style={[styles.cardInputFake, { flex: 1 }]}>
                <Text style={styles.cardMetaText}>SKT: 12/28</Text>
              </View>
              <View style={[styles.cardInputFake, { flex: 1 }]}>
                <Text style={styles.cardMetaText}>CVC: 424</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.payConfirmBtn} onPress={confirmStripePayment} activeOpacity={0.85}>
              <FontAwesome5 name="lock" size={14} color="#FFF" solid />
              <Text style={styles.payConfirmText}>ÖDEMEYİ ONAYLA VEYA TEST ET</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomAlertModal
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onConfirm={() => {
          setAlertState({ ...alertState, visible: false });
          if (alertState.type === 'success') router.back();
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: 10, marginBottom: 20 },
  crown: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: T.lightAmber,
    borderWidth: 1,
    borderColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Theme.shadows.soft,
  },
  title: { color: T.textDark, fontSize: 24, fontWeight: '900', textAlign: 'center', lineHeight: 30 },
  subtitle: { color: T.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19, marginTop: 8 },
  plansContainer: { gap: 10, marginBottom: 18 },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: T.border,
    padding: 16,
    position: 'relative',
    ...Theme.shadows.soft,
  },
  planCardActive: { borderColor: T.primary, backgroundColor: T.softIndigo },
  saveBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: T.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  saveBadgeText: { color: T.textDark, fontSize: 10, fontWeight: '900' },
  planTitle: { fontSize: 16, fontWeight: '900', color: T.textDark },
  planSub: { fontSize: 11, fontWeight: '600', color: T.textMuted, marginTop: 2 },
  planPrice: { fontSize: 17, fontWeight: '900', color: T.primary },
  features: { gap: 10, marginBottom: 16 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  featureIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.lightAmber, borderWidth: 1, borderColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { color: T.textDark, fontSize: 15, fontWeight: '900' },
  featureText: { color: T.textMuted, fontSize: 12, fontWeight: '600', lineHeight: 17, marginTop: 2 },
  stripeInfoBox: { backgroundColor: T.softInfo, marginBottom: 18, padding: 14 },
  stripeInfoTitle: { color: T.primary, fontSize: 13, fontWeight: '900' },
  stripeInfoText: { color: T.textDark, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  button: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginBottom: 30, ...Theme.shadows.medium },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' },
  stripeSheet: { backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: T.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: T.background, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: T.textDark },
  sheetSub: { fontSize: 13, fontWeight: '600', color: T.textMuted, marginTop: 4, marginBottom: 18 },
  cardInputFake: {
    height: 52,
    borderRadius: 14,
    backgroundColor: T.background,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardNumberText: { flex: 1, color: T.textDark, fontSize: 14, fontWeight: '700', marginLeft: 10 },
  testBadge: { backgroundColor: T.lightAmber, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: T.accent },
  testBadgeText: { fontSize: 9, fontWeight: '900', color: T.textDark },
  cardRowMeta: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  cardMetaText: { color: T.textDark, fontSize: 13, fontWeight: '700' },
  payConfirmBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#635BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  payConfirmText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
});

