import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { C, Theme } from '@/src/theme';
import { SOUND_PACK_LABELS } from '../constants';
import type { SoundOption } from '../types';
import { shared } from './sharedStyles';

type Props = {
  equippedSoundPack: string;
  isPremium: boolean;
  isSoundOn: boolean;
  availableSounds: SoundOption[];
  volumes: Record<string, number>;
  /** Verilmezse mikser düğmesi gösterilmez (ör. hesapsız solo ekran). */
  onMixerPress?: () => void;
  onToggleSound: () => void;
  onSelectSound: (key: string) => void;
};

// ATMOSFER & MIXER
export function SoundSection({
  equippedSoundPack,
  isPremium,
  isSoundOn,
  availableSounds,
  volumes,
  onMixerPress,
  onToggleSound,
  onSelectSound,
}: Props) {
  return (
    <View style={shared.section}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View>
          <Text style={shared.sectionLabel}>ATMOSFER SESİ</Text>
          <Text style={s.soundPackLabel}>{SOUND_PACK_LABELS[equippedSoundPack] || 'Klasik Lounge'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
          {onMixerPress && (
            <TouchableOpacity onPress={onMixerPress}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isPremium ? C.lightAmber : C.softIndigo, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: isPremium ? C.accent : C.border }}>
                <FontAwesome5 solid name="sliders-h" size={12} color={isPremium ? C.accent : C.textMuted} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: isPremium ? C.accent : C.textMuted }}>MİKSER</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onToggleSound}>
            <FontAwesome5 solid name={isSoundOn ? "volume-up" : "volume-mute"} size={16} color={isSoundOn ? C.primary : C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {availableSounds.map(sItem => {
          const active = (volumes[sItem.key] || 0) > 0;
          return (
            <TouchableOpacity key={sItem.key} onPress={() => onSelectSound(sItem.key)} style={[s.soundTile, active && s.soundTileActive]}>
              <FontAwesome5 solid name={sItem.icon} size={20} color={active ? C.onColor : C.textMuted} />
              <Text style={[s.soundText, active && { color: C.onColor }]}>{sItem.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  soundTile: { width: 90, alignItems: 'center', backgroundColor: C.surface, paddingVertical: 18, borderRadius: 20, borderWidth: 1, borderColor: C.border, ...Theme.shadows.soft },
  soundTileActive: { backgroundColor: C.primary, borderColor: C.secondary },
  soundText: { marginTop: 10, fontSize: 12, fontWeight: '700', color: C.textMuted },
  soundPackLabel: { marginTop: -8, color: C.primary, fontSize: 12, fontWeight: '800' },
});
