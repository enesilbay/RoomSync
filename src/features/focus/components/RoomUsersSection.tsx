import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FramedAvatar } from '@/src/components/FramedAvatar';
import { assetUrl } from '@/src/lib/api';
import { C, Theme } from '@/src/theme';
import type { RoomUser } from '../types';
import { shared } from './sharedStyles';

type Props = {
  users: RoomUser[];
  isEliteRoom: boolean;
  onChallenge: (targetId: number, targetName: string) => void;
};

// AKTİF KULLANICILAR
export function RoomUsersSection({ users, isEliteRoom, onChallenge }: Props) {
  return (
    <View style={shared.section}>
      <Text style={shared.sectionLabel}>ODADAKİLER ({users.length})</Text>
      <View style={shared.usersWrap}>
        {users.map((u, i) => (
          <View key={i} style={[s.userChip, isEliteRoom && u.isAtDesk && { borderColor: C.accent, backgroundColor: C.lightAmber }]}>
            <View>
              <FramedAvatar
                uri={assetUrl(u.avatarUrl)}
                name={u.fullName}
                frameId={u.equippedProfileFrame}
                size={28}
                colors={C}
                backgroundColor={C.softIndigo}
                textSize={12}
              />
              <View style={[shared.userDot, { backgroundColor: u.isAtDesk ? (isEliteRoom ? C.accent : C.success) : C.textMuted }]} />
            </View>
            <Text style={{ color: C.textDark, fontSize: 13, fontWeight: '500' }}>{u.fullName?.split(' ')[0]}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                onPress={() => onChallenge(Number(u.userId), u.fullName?.split(' ')[0] || 'Arkadaş')}
                style={[s.nudgeBtn, { backgroundColor: C.danger }]}
              >
                <Text style={s.nudgeBtnText}>⚔️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  userChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, ...Theme.shadows.soft },
  nudgeBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.lightAmber, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.accent },
  nudgeBtnText: { fontSize: 13 },
});
