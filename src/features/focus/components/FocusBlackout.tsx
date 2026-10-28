import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '@/src/theme';

// Telefon yüzüstü masadayken ekranı tamamen karartan katman (FocusOverlay içinde gösterilir).
export function FocusBlackout() {
  return <View style={s.focusBlackout} testID="focus-blackout" />;
}

const s = StyleSheet.create({
  focusBlackout: { flex: 1, backgroundColor: C.screenOff },
});
