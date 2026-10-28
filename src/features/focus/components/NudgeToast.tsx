import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { C, Theme } from '@/src/theme';
import type { NudgeToastState } from '../types';

type Props = {
  toast: NudgeToastState;
  anim: Animated.Value;
};

// NUDGE TOAST BANNER
export function NudgeToast({ toast, anim }: Props) {
  return (
    <Animated.View
      style={[
        s.nudgeToast,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.nudgeToastTitle}>{toast.senderName} seni çağırıyor!</Text>
        <Text style={s.nudgeToastSub}>Birlikte çalışmaya davet edildiniz.</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  nudgeToast: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.softIndigo, borderRadius: 18, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: C.border, ...Theme.shadows.soft },
  nudgeToastTitle: { color: C.primary, fontWeight: '800', fontSize: 14 },
  nudgeToastSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
});
