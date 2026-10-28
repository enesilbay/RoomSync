import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '@/src/theme';

export function OfflineBanner() {
  return (
    <View style={s.offlineBanner}>
      <Text style={s.offlineText}>Bağlantı koptu, yeniden bağlanılıyor...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  offlineBanner: { backgroundColor: C.softDanger, padding: 10, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: C.danger, alignItems: 'center' },
  offlineText: { color: C.danger, fontSize: 13, fontWeight: '700' },
});
