import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppScreen, SoftCard } from './components/common';
import { C } from './(tabs)/sensor';

const T = C;

export default function ModalScreen() {
  const router = useRouter();

  return (
    <AppScreen contentStyle={styles.screen}>
      <SoftCard style={styles.card}>
        <View style={styles.icon}>
          <FontAwesome5 solid name="info" size={24} color={T.primary} />
        </View>
        <Text style={styles.title}>RoomSync</Text>
        <Text style={styles.text}>
          Odak odalari, arkadaslik, liderlik ve analitik akisini tek uygulamada toplar.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Kapat</Text>
        </TouchableOpacity>
      </SoftCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center' },
  card: { alignItems: 'center', paddingVertical: 32 },
  icon: { width: 62, height: 62, borderRadius: 31, backgroundColor: T.softIndigo, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { color: T.textDark, fontSize: 24, fontWeight: '900', marginBottom: 8 },
  text: { color: T.textMuted, fontSize: 14, fontWeight: '600', lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: T.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  buttonText: { color: '#FFFFFF', fontWeight: '900' },
});
