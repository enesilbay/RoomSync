import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { C, Theme } from '@/src/theme';

type Props = {
  isAtDesk: boolean;
  isEliteRoom: boolean;
};

export function StatusCard({ isAtDesk, isEliteRoom }: Props) {
  return (
    <View style={[s.statusCard, isAtDesk && (isEliteRoom ? s.statusCardEliteActive : s.statusCardActive)]}>
      <View style={[s.statusIcon, isAtDesk && (isEliteRoom ? { backgroundColor: C.lightAmber, borderColor: C.accent } : { backgroundColor: C.softSuccess, borderColor: C.success })]}>
        <FontAwesome5 solid name={isAtDesk ? "check-circle" : "clock"} size={26} color={isAtDesk ? (isEliteRoom ? C.accent : C.success) : C.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.statusTitle, isAtDesk && { color: isEliteRoom ? C.accent : C.success }]}>{isAtDesk ? 'Odaklanıyor' : 'Bekleniyor...'}</Text>
        <Text style={s.statusDesc}>
          {isAtDesk
            ? (isEliteRoom ? 'Elite mod aktif! Çarpan ile x2 Puan kazanıyorsun.' : 'Cihaz masada, odak puanı kazanıyorsun.')
            : (isEliteRoom ? 'Puan kazanmak için telefonu ters çevirip masaya bırakın.' : 'Puan kazanmak için telefonu ters çevirip masaya bırakın.')}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: C.border, ...Theme.shadows.soft },
  statusCardActive: { borderColor: C.success, backgroundColor: C.softSuccess },
  statusCardEliteActive: { borderColor: C.accent, backgroundColor: C.lightAmber },
  statusIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: C.background, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  statusTitle: { fontSize: 17, fontWeight: '800', color: C.textDark, marginBottom: 3 },
  statusDesc: { fontSize: 12, color: C.textMuted },
});
