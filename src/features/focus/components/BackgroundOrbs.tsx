import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { C } from '@/src/theme';

const { width, height } = Dimensions.get('window');

// ── DEKORATIF ARKAPLAN NOKTALARI ──
export function BackgroundOrbs({ isElite }: { isElite?: boolean }) {
  return (
    <>
      <View style={[bg.orb1, isElite && { backgroundColor: C.lightAmber, opacity: 0.8 }]} />
      <View style={[bg.orb2, isElite && { backgroundColor: C.softIndigo, opacity: 0.7 }]} />
      <View style={[bg.orb3, isElite && { backgroundColor: C.softInfo, opacity: 0.6 }]} />
    </>
  );
}

const bg = StyleSheet.create({
  orb1: { position: 'absolute', top: -height * 0.08, right: -width * 0.22, width: width * 0.75, height: width * 0.75, borderRadius: width * 0.375, backgroundColor: C.softIndigo, opacity: 0.75 },
  orb2: { position: 'absolute', bottom: -height * 0.06, left: -width * 0.28, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: C.lightAmber, opacity: 0.58 },
  orb3: { position: 'absolute', top: height * 0.37, right: width * 0.08, width: width * 0.32, height: width * 0.32, borderRadius: width * 0.16, backgroundColor: C.softInfo, opacity: 0.45 },
});
