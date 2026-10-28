import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { C } from '@/src/theme';

const BATTERY_HINT_TEXT = 'Uzun oturumlarda ekran açık kalır; şarja takman iyi olur.';

// Uzun oturum öncesi şarj önerisi; dokununca kapanır.
export function BatteryHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <TouchableOpacity
      onPress={onDismiss}
      activeOpacity={0.8}
      style={s.wrap}
      accessibilityRole="button"
      accessibilityLabel={BATTERY_HINT_TEXT}
      accessibilityHint="Öneriyi kapatır"
    >
      <FontAwesome5 solid name="battery-quarter" size={14} color={C.textMuted} />
      <Text style={s.text}>{BATTERY_HINT_TEXT}</Text>
      <FontAwesome5 solid name="times" size={12} color={C.textMuted} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginTop: 12,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
  },
  text: { flex: 1, fontSize: 12, color: C.textMuted, fontWeight: '600' },
});
