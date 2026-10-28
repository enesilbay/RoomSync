import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { C, Theme } from '@/src/theme';
import type { SearchParam } from '../types';

type Props = {
  isEliteRoom: boolean;
  roomName: SearchParam;
  totalScore: number;
  onBack: () => void;
};

export function FocusHeader({ isEliteRoom, roomName, totalScore, onBack }: Props) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} style={s.backBtn}>
        <FontAwesome5 solid name="chevron-left" size={16} color={C.primary} />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 15 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[s.headerRoom, isEliteRoom && { color: C.accent }]}>
            {isEliteRoom ? 'ELITE ODA' : 'ODAK ODASI'}
          </Text>
          {isEliteRoom && (
            <View style={{ backgroundColor: C.lightAmber, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: C.accent }}>
              <Text style={{ fontSize: 9, fontWeight: '900', color: C.accent, letterSpacing: 0.5 }}>+2x PUAN</Text>
            </View>
          )}
        </View>
        <Text style={[s.headerName, isEliteRoom && { color: C.accent }]} numberOfLines={1}>{roomName}</Text>
      </View>
      <View style={s.scorePill}>
        <FontAwesome5 solid name="fire" size={12} color={C.accent} />
        <Text style={s.scoreText}>{totalScore}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', ...Theme.shadows.soft },
  headerRoom: { fontSize: 12, color: C.accent, fontWeight: '800', letterSpacing: 1 },
  headerName: { fontSize: 24, fontWeight: '900', color: C.textDark },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.lightAmber, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.accent },
  scoreText: { color: C.accent, fontWeight: '900', fontSize: 16 },
});
