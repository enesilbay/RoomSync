import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { C } from '@/src/theme';
import type { FocusMode } from '../engine/types';

type Props = {
  mode: FocusMode;
  onChange: (mode: FocusMode) => void;
  /** Aktif oturum başladığı modu korur; değişiklik bir sonraki oturuma kalır. */
  disabled: boolean;
};

const OPTIONS: { mode: FocusMode; label: string; icon: string; hint: string }[] = [
  { mode: 'strict', label: 'Sıkı', icon: 'lock', hint: 'Telefon ekranı aşağı bakmalı; ekran tamamen kararır.' },
  { mode: 'flexible', label: 'Esnek', icon: 'mobile-alt', hint: 'Telefon düz durması yeter; ekranda soluk bir sayaç kalır.' },
];

// Sıkı / Esnek odak modu seçici.
export function ModeToggle({ mode, onChange, disabled }: Props) {
  const current = OPTIONS.find((o) => o.mode === mode) ?? OPTIONS[1];

  return (
    <View style={s.wrap}>
      <View style={[s.row, disabled && s.disabled]} accessibilityRole="radiogroup">
        {OPTIONS.map((o) => {
          const selected = o.mode === mode;
          return (
            <TouchableOpacity
              key={o.mode}
              onPress={() => onChange(o.mode)}
              disabled={disabled}
              activeOpacity={0.8}
              style={[s.option, selected && s.optionSelected]}
              accessibilityRole="radio"
              accessibilityLabel={`${o.label} mod`}
              accessibilityHint={o.hint}
              accessibilityState={{ selected, disabled }}
            >
              <FontAwesome5 solid name={o.icon} size={12} color={selected ? C.onColor : C.textMuted} />
              <Text style={[s.optionText, selected && s.optionTextSelected]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={s.hint}>{disabled ? 'Mod, oturum bitince değiştirilebilir.' : current.hint}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 16 },
  row: {
    flexDirection: 'row',
    backgroundColor: C.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    gap: 4,
  },
  disabled: { opacity: 0.55 },
  option: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  optionSelected: { backgroundColor: C.primary },
  optionText: { fontSize: 14, fontWeight: '800', color: C.textMuted },
  optionTextSelected: { color: C.onColor },
  hint: { marginTop: 8, fontSize: 12, color: C.textMuted, textAlign: 'center' },
});
