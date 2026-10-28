import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppScreen, PageHeader, SoftCard } from '@/src/components/common';
import { apiUrl, getAuthHeaders } from '@/src/lib/api';
import { C, Theme } from '@/src/theme';

const T = C;

type UserProfile = {
  id: number;
  coins: number;
  ownedColors: string[];
  ownedIcons: string[];
  equippedBubbleColor: string;
  equippedIcon: string;
  ownedSoundPacks?: string[];
  equippedSoundPack?: string;
  ownedProfileFrames?: string[];
  equippedProfileFrame?: string;
};

const COLORS = [
  { id: T.shopBubble.roomsyncBlue, name: 'RoomSync Mavisi', price: 0 },
  { id: T.shopBubble.emerald, name: 'Zümrüt Yeşili', price: 100 },
  { id: T.shopBubble.ruby, name: 'Yakut Kırmızısı', price: 150 },
  { id: T.shopBubble.amber, name: 'Kehribar Sarısı', price: 150 },
  { id: T.shopBubble.amethyst, name: 'Ametist Moru', price: 200 },
];

const ICONS = [
  { id: '', name: 'Yok', price: 0 },
  { id: '🔥', name: 'Ateş', price: 50 },
  { id: '⚡', name: 'Yıldırım', price: 80 },
  { id: '💎', name: 'Elmas', price: 250 },
  { id: '🎓', name: 'Mezuniyet', price: 300 },
  { id: '🚀', name: 'Roket', price: 400 },
];

const PROFILE_FRAMES = [
  { id: 'none', name: 'Çerçevesiz', desc: 'Sade profil görünümü.', price: 0, color: T.border },
  { id: 'gold', name: 'Altın Halka', desc: 'Parlak başarı çerçevesi.', price: 150, color: T.accent },
  { id: 'emerald', name: 'Zümrüt Odak', desc: 'Yeşil odak çerçevesi.', price: 180, color: T.success },
  { id: 'ruby', name: 'Yakut Seri', desc: 'Kırmızı seri çerçevesi.', price: 220, color: T.danger },
  { id: 'cosmic', name: 'Kozmik Lounge', desc: 'Mor premium çerçeve hissi.', price: 320, color: T.frame.cosmic },
];

export default function ShopScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchUserData = React.useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl('/users/me'), { headers });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
      }
    } catch {
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );

  const handleBuy = async (itemType: 'color' | 'icon' | 'soundPack' | 'profileFrame', itemId: string, price: number) => {
    if (!user) return;
    if (user.coins < price) {
      Alert.alert('Yetersiz Bakiye', 'Bu öğeyi almak için yeterli Odak Puanınız yok.');
      return;
    }

    Alert.alert(
      'Satın Alma Onayı',
      `Bu öğeyi ${price} puana satın almak istediğine emin misin?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Satın Al',
          style: 'default',
          onPress: async () => {
            setProcessing(true);
            try {
              const headers = await getAuthHeaders();
              const res = await fetch(apiUrl('/users/buy'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify({ itemType, itemId, price }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.message || 'Satın alma başarısız oldu.');

              setUser(data.user);
              Alert.alert('Başarılı', 'Öğe başarıyla satın alındı!');
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleEquip = async (itemType: 'color' | 'icon' | 'soundPack' | 'profileFrame', itemId: string) => {
    setProcessing(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(apiUrl('/users/equip'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ itemType, itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Kuşanma başarısız oldu.');

      setUser(data.user);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !user) {
    return (
      <AppScreen>
        <PageHeader title="Odak Mağazası" onBack={() => router.back()} />
        <View style={styles.loading}>
          <ActivityIndicator color={T.primary} size="large" />
        </View>
      </AppScreen>
    );
  }

  const renderColorItem = (item: typeof COLORS[0]) => {
    const isOwned = item.price === 0 || user.ownedColors.includes(item.id);
    const isEquipped = user.equippedBubbleColor === item.id;

    return (
      <SoftCard key={item.id} style={styles.itemCard}>
        <View style={styles.itemLeft}>
          <View style={[styles.colorPreview, { backgroundColor: item.id }]} />
          <View>
            <Text style={styles.itemName}>{item.name}</Text>
            {!isOwned && <Text style={styles.itemPrice}>{item.price} Puan</Text>}
            {isOwned && <Text style={styles.itemOwned}>Sahipsin</Text>}
          </View>
        </View>
        <View style={styles.itemRight}>
          {isEquipped ? (
            <View style={styles.equippedBadge}>
              <FontAwesome5 name="check" size={12} color={T.onColor} />
              <Text style={styles.equippedText}>Kuşanıldı</Text>
            </View>
          ) : isOwned ? (
            <TouchableOpacity style={styles.equipBtn} onPress={() => handleEquip('color', item.id)} disabled={processing}>
              <Text style={styles.equipBtnText}>Kuşan</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.buyBtn} onPress={() => handleBuy('color', item.id, item.price)} disabled={processing}>
              <FontAwesome5 name="shopping-cart" size={12} color={T.onColor} />
              <Text style={styles.buyBtnText}>Al</Text>
            </TouchableOpacity>
          )}
        </View>
      </SoftCard>
    );
  };

  const renderIconItem = (item: typeof ICONS[0]) => {
    const isOwned = item.price === 0 || user.ownedIcons.includes(item.id);
    const isEquipped = user.equippedIcon === item.id;

    return (
      <SoftCard key={item.id} style={styles.itemCard}>
        <View style={styles.itemLeft}>
          <View style={styles.iconPreview}>
            <Text style={styles.iconPreviewText}>{item.id || '🚫'}</Text>
          </View>
          <View>
            <Text style={styles.itemName}>{item.name}</Text>
            {!isOwned && <Text style={styles.itemPrice}>{item.price} Puan</Text>}
            {isOwned && <Text style={styles.itemOwned}>Sahipsin</Text>}
          </View>
        </View>
        <View style={styles.itemRight}>
          {isEquipped ? (
            <View style={styles.equippedBadge}>
              <FontAwesome5 name="check" size={12} color={T.onColor} />
              <Text style={styles.equippedText}>Kuşanıldı</Text>
            </View>
          ) : isOwned ? (
            <TouchableOpacity style={styles.equipBtn} onPress={() => handleEquip('icon', item.id)} disabled={processing}>
              <Text style={styles.equipBtnText}>Kuşan</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.buyBtn} onPress={() => handleBuy('icon', item.id, item.price)} disabled={processing}>
              <FontAwesome5 name="shopping-cart" size={12} color={T.onColor} />
              <Text style={styles.buyBtnText}>Al</Text>
            </TouchableOpacity>
          )}
        </View>
      </SoftCard>
    );
  };

  const renderProfileFrameItem = (item: typeof PROFILE_FRAMES[0]) => {
    const ownedProfileFrames = user.ownedProfileFrames || ['none'];
    const isOwned = item.price === 0 || ownedProfileFrames.includes(item.id);
    const isEquipped = (user.equippedProfileFrame || 'none') === item.id;

    return (
      <SoftCard key={item.id} style={styles.itemCard}>
        <View style={styles.itemLeft}>
          <View style={[styles.framePreview, { borderColor: item.color }]}>
            <View style={[styles.framePreviewInner, { backgroundColor: item.color }]} />
          </View>
          <View style={styles.itemCopy}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDesc}>{item.desc}</Text>
            {!isOwned && <Text style={styles.itemPrice}>{item.price} Puan</Text>}
            {isOwned && <Text style={styles.itemOwned}>Sahipsin</Text>}
          </View>
        </View>
        <View style={styles.itemRight}>
          {isEquipped ? (
            <View style={styles.equippedBadge}>
              <FontAwesome5 name="check" size={12} color={T.onColor} />
              <Text style={styles.equippedText}>Kuşanıldı</Text>
            </View>
          ) : isOwned ? (
            <TouchableOpacity style={styles.equipBtn} onPress={() => handleEquip('profileFrame', item.id)} disabled={processing}>
              <Text style={styles.equipBtnText}>Kuşan</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.buyBtn} onPress={() => handleBuy('profileFrame', item.id, item.price)} disabled={processing}>
              <FontAwesome5 name="shopping-cart" size={12} color={T.onColor} />
              <Text style={styles.buyBtnText}>Al</Text>
            </TouchableOpacity>
          )}
        </View>
      </SoftCard>
    );
  };

  return (
    <AppScreen scroll>
      <PageHeader title="Odak Mağazası" eyebrow="Puanlarını harca" onBack={() => router.back()} />

      <View style={styles.balanceContainer}>
        <FontAwesome5 name="coins" size={28} color={T.accent} />
        <View>
          <Text style={styles.balanceLabel}>Mevcut Bakiyen</Text>
          <Text style={styles.balanceText}>{user.coins} Odak Puanı</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Sohbet Balonu Renkleri</Text>
      <View style={styles.itemsList}>{COLORS.map(renderColorItem)}</View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>İsim Yanı İkonları</Text>
      <View style={styles.itemsList}>{ICONS.map(renderIconItem)}</View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Profil Çerçeveleri</Text>
      <View style={styles.itemsList}>{PROFILE_FRAMES.map(renderProfileFrameItem)}</View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.accent,
    gap: 16,
    marginBottom: 24,
    ...Theme.shadows.medium,
  },
  balanceLabel: { color: T.textMuted, fontSize: 13, fontWeight: '700' },
  balanceText: { color: T.textDark, fontSize: 24, fontWeight: '900' },
  sectionTitle: { color: T.textDark, fontSize: 18, fontWeight: '900', marginBottom: 12, marginLeft: 4 },
  itemsList: { gap: 12 },
  itemCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  itemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: 10 },
  itemCopy: { flex: 1 },
  colorPreview: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: T.border },
  iconPreview: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  iconPreviewText: { fontSize: 20 },
  framePreview: { width: 44, height: 44, borderRadius: 22, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface },
  framePreviewInner: { width: 24, height: 24, borderRadius: 12, opacity: 0.22 },
  itemName: { color: T.textDark, fontSize: 15, fontWeight: '800' },
  itemDesc: { color: T.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2, lineHeight: 15 },
  itemPrice: { color: T.primary, fontSize: 13, fontWeight: '700', marginTop: 2 },
  itemOwned: { color: T.textMuted, fontSize: 13, fontWeight: '700', marginTop: 2, fontStyle: 'italic' },
  itemRight: {},
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  buyBtnText: { color: T.onColor, fontSize: 13, fontWeight: '800' },
  equipBtn: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  equipBtnText: { color: T.primary, fontSize: 13, fontWeight: '800' },
  equippedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.success, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  equippedText: { color: T.onColor, fontSize: 13, fontWeight: '800' },
});
