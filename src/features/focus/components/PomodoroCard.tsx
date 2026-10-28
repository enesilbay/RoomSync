import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, Theme } from '@/src/theme';
import { shared } from './sharedStyles';

const pad = (n: number) => String(n).padStart(2, '0');

type Props = {
  pomodoroSec: number;
  pomodoroRunning: boolean;
  onOpenSettings: () => void;
  onToggle: () => void;
};

export function PomodoroCard({ pomodoroSec, pomodoroRunning, onOpenSettings, onToggle }: Props) {
  return (
    <View style={shared.section}>
      <Text style={shared.sectionLabel}>POMODORO SAYACI</Text>
      <View style={s.pomodoroCard}>
        <Animated.View style={[s.timerInner, pomodoroRunning && { borderColor: C.primary, shadowColor: C.primary, shadowOffset: {width:0, height:0}, shadowOpacity: 0.3, shadowRadius: 10 }]}>
          <Text style={s.timerText}>{pad(Math.floor(pomodoroSec / 60))}:{pad(pomodoroSec % 60)}</Text>
        </Animated.View>
        <View style={{ flex: 1, flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
          <TouchableOpacity onPress={onOpenSettings} style={s.pomSettingsBtn}>
            <FontAwesome5 solid name="sliders-h" size={16} color={C.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onToggle}>
            <LinearGradient colors={pomodoroRunning ? [C.border, C.border] : [C.primary, C.secondary]} style={s.pomPlayBtn}>
              <FontAwesome5 solid name={pomodoroRunning ? "pause" : "play"} size={16} color={pomodoroRunning ? C.textDark : C.onColor} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pomodoroCard: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 24, padding: 20, gap: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border, ...Theme.shadows.soft },
  timerInner: { width: 85, height: 85, borderRadius: 42.5, borderWidth: 3, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
  timerText: { fontSize: 24, fontWeight: '900', color: C.textDark },
  pomSettingsBtn: { width: 48, height: 48, backgroundColor: C.softIndigo, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  pomPlayBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
