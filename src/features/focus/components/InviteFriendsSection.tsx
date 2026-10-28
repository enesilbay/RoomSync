import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { FramedAvatar } from '@/src/components/FramedAvatar';
import { assetUrl } from '@/src/lib/api';
import { C, Theme } from '@/src/theme';
import type { Friend } from '../types';
import { shared } from './sharedStyles';

type Props = {
  friends: Friend[];
  onInvite: (targetUserId: number, targetName: string) => void;
};

// ONLINE ARKADAŞ DAVETLERİ
export function InviteFriendsSection({ friends, onInvite }: Props) {
  return (
    <View style={shared.section}>
      <Text style={shared.sectionLabel}>ONLINE ARKADAŞLAR ({friends.length})</Text>
      {friends.length === 0 ? (
        <View style={s.inviteEmpty}>
          <FontAwesome5 solid name="user-clock" size={15} color={C.textMuted} />
          <Text style={s.inviteEmptyText}>Davet edilecek çevrimiçi arkadaş yok.</Text>
        </View>
      ) : (
        <View style={shared.usersWrap}>
          {friends.map((friend) => (
            <View key={friend.id} style={s.inviteChip}>
              <View>
                <FramedAvatar
                  uri={assetUrl(friend.avatarUrl)}
                  name={friend.fullName}
                  frameId={friend.equippedProfileFrame}
                  size={28}
                  colors={C}
                  backgroundColor={C.softIndigo}
                  textSize={12}
                />
                <View style={[shared.userDot, { backgroundColor: C.success }]} />
              </View>
              <View style={s.inviteInfo}>
                <Text style={s.inviteName} numberOfLines={1}>{friend.fullName?.split(' ')[0] || 'Arkadaş'}</Text>
                <Text style={s.inviteSub} numberOfLines={1}>
                  {friend.currentRoom ? `${friend.currentRoom} odasında` : 'Çevrimiçi'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onInvite(Number(friend.id), friend.fullName?.split(' ')[0] || 'Arkadaş')}
                style={s.inviteBtn}
              >
                <FontAwesome5 solid name="paper-plane" size={11} color={C.onColor} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  inviteEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, ...Theme.shadows.soft },
  inviteEmptyText: { color: C.textMuted, fontSize: 13, fontWeight: '700' },
  inviteChip: { flexDirection: 'row', alignItems: 'center', gap: 9, width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, ...Theme.shadows.soft },
  inviteInfo: { flex: 1, minWidth: 0 },
  inviteName: { color: C.textDark, fontSize: 13, fontWeight: '800' },
  inviteSub: { color: C.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  inviteBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
});
