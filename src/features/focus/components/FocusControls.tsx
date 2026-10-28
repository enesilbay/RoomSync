import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, Theme } from '@/src/theme';
import { FOCUS_DURATIONS } from '../constants';

type Props = {
  /** Oturum sürüyor mu (waiting/focusing/glancing/break). */
  active: boolean;
  minutes: number;
  onSelectMinutes: (minutes: number) => void;
  onStart: () => void;
  onFinish: () => void;
};

// Tek başlat kontrolü: boştayken süre seçimi + Başlat, oturum sürerken yalnızca Bitir.
export function FocusControls({ active, minutes, onSelectMinutes, onStart, onFinish }: Props) {
  if (active) {
    return (
      <TouchableOpacity
        onPress={onFinish}
        activeOpacity={0.85}
        style={s.finishBtn}
        accessibilityRole="button"
        accessibilityLabel="Bitir"
        accessibilityHint="Odak oturumunu şimdi bitirir"
      >
        <FontAwesome5 solid name="stop" size={14} color={C.danger} />
        <Text style={s.finishText}>Bitir</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <View style={s.chips} accessibilityRole="radiogroup" accessibilityLabel="Odak süresi">
        {FOCUS_DURATIONS.map((m) => {
          const selected = m === minutes;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => onSelectMinutes(m)}
              activeOpacity={0.8}
              style={[s.chip, selected && s.chipSelected]}
              accessibilityRole="radio"
              accessibilityLabel={`${m} dakika`}
              accessibilityState={{ selected }}
            >
              <Text style={[s.chipText, selected && s.chipTextSelected]}>{m} dk</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        onPress={onStart}
        activeOpacity={0.88}
        style={s.startBtn}
        accessibilityRole="button"
        accessibilityLabel="Başlat"
        accessibilityHint={`${minutes} dakikalık odak oturumunu başlatır`}
      >
        <LinearGradient colors={[C.primary, C.secondary]} style={s.startGrad}>
          <FontAwesome5 solid name="play" size={14} color={C.onColor} />
          <Text style={s.startText}>Başlat</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: C.softIndigo, borderColor: C.primary },
  chipText: { fontSize: 14, fontWeight: '700', color: C.textMuted },
  chipTextSelected: { color: C.primary, fontWeight: '900' },
  startBtn: { borderRadius: 18, overflow: 'hidden', ...Theme.shadows.medium },
  startGrad: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  startText: { color: C.onColor, fontSize: 15, fontWeight: '900' },
  finishBtn: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.danger,
    backgroundColor: C.softDanger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  finishText: { color: C.danger, fontSize: 15, fontWeight: '900' },
});
