import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '@/src/theme';

// Telefon ters çevrilip masadayken ekranı tamamen karartan katman.
export function FocusBlackout() {
  return <View pointerEvents="auto" style={s.focusBlackout} />;
}

const s = StyleSheet.create({
  focusBlackout: { ...StyleSheet.absoluteFillObject, backgroundColor: C.screenOff, zIndex: 9999, elevation: 9999 },
});
