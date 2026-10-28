import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '@/src/theme';
import type { SessionPhase } from '../engine/types';
import { formatClock } from '../format';

type Props = {
  phase: SessionPhase;
  /** Boştayken gösterilecek seçili süre (dk). */
  minutes: number;
  remainingMs: number;
  focusedMs: number;
  breakElapsedMs: number;
  breakOverdue: boolean;
};

/** Faza göre büyük sayaç: odakta kalan süre, molada ileri sayan mola süresi. */
function getTimerDisplay({ phase, minutes, remainingMs, focusedMs, breakElapsedMs }: Props) {
  switch (phase) {
    case 'idle':
      return { label: 'SÜRE', spoken: 'Süre', value: formatClock(minutes * 60_000) };
    case 'break':
      return { label: 'MOLA SÜRESİ', spoken: 'Mola süresi', value: formatClock(breakElapsedMs, 'down') };
    case 'completed':
      return { label: 'ODAKLANILAN', spoken: 'Odaklanılan', value: formatClock(focusedMs, 'down') };
    default:
      return { label: 'KALAN SÜRE', spoken: 'Kalan süre', value: formatClock(remainingMs, 'up') };
  }
}

export function FocusTimer(props: Props) {
  const { label, spoken, value } = getTimerDisplay(props);
  const color =
    props.phase === 'break' ? (props.breakOverdue ? C.danger : C.accent) : props.phase === 'focusing' ? C.primary : C.textDark;

  return (
    <View style={s.wrap} accessible accessibilityLabel={`${spoken}: ${value}`}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, { color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 18 },
  label: { fontSize: 12, color: C.textMuted, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  value: { fontSize: 64, fontWeight: '900', fontVariant: ['tabular-nums'], color: C.textDark },
});
