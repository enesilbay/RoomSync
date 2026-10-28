import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, Theme } from '@/src/theme';

type Props = {
  focusRequested: boolean;
  pomodoroRunning: boolean;
  onPress: () => void;
};

export function FocusStartButton({ focusRequested, pomodoroRunning, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={focusRequested && pomodoroRunning}
      activeOpacity={0.88}
      style={[s.focusStartBtn, focusRequested && pomodoroRunning && s.focusStartBtnActive]}
    >
      <LinearGradient
        colors={focusRequested && pomodoroRunning ? [C.success, C.success] : [C.primary, C.secondary]}
        style={s.focusStartGrad}
      >
        <FontAwesome5 solid name={focusRequested && pomodoroRunning ? 'check-circle' : 'bullseye'} size={16} color={C.onColor} />
        <Text style={s.focusStartText}>
          {focusRequested && pomodoroRunning ? 'Odaklanma Hazır' : 'Odaklanmayı Başlat'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  focusStartBtn: { borderRadius: 18, overflow: 'hidden', marginTop: -12, marginBottom: 24, ...Theme.shadows.medium },
  focusStartBtnActive: { opacity: 0.88 },
  focusStartGrad: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  focusStartText: { color: C.onColor, fontSize: 15, fontWeight: '900' },
});
