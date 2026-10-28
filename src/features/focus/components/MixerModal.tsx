import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { C } from '@/src/theme';
import type { SoundOption } from '../types';
import { shared } from './sharedStyles';

type Props = {
  visible: boolean;
  isPremium: boolean;
  availableSounds: SoundOption[];
  volumes: Record<string, number>;
  onBroadcast: () => void;
  onClose: () => void;
  onVolumeChange: (key: string, val: number) => void;
};

// MIXER MODAL
export function MixerModal({ visible, isPremium, availableSounds, volumes, onBroadcast, onClose, onVolumeChange }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[shared.modalOverlay, { justifyContent: 'flex-end' }]}>
        <View style={[shared.modalSheet, { width: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 40 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View>
              <Text style={shared.modalTitle}>Ses Mikseri</Text>
              <Text style={{ color: C.textMuted, fontSize: 12 }}>Kendi çalışma ortamını yarat.</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {isPremium && (
                <TouchableOpacity onPress={onBroadcast} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <FontAwesome5 name="broadcast-tower" size={10} color={C.onColor} />
                  <Text style={{ color: C.onColor, fontSize: 10, fontWeight: '800' }}>YAYINLA</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={{ padding: 5 }}>
                <FontAwesome5 solid name="times" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {availableSounds.map(sItem => (
            <View key={sItem.key} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <FontAwesome5 solid name={sItem.icon} size={14} color={C.primary} />
                  <Text style={{ color: C.textDark, fontWeight: '600' }}>{sItem.label}</Text>
                </View>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>{Math.round((volumes[sItem.key] || 0) * 100)}%</Text>
              </View>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={1}
                value={volumes[sItem.key] || 0}
                onValueChange={(val) => onVolumeChange(sItem.key, val)}
                minimumTrackTintColor={C.primary}
                maximumTrackTintColor={C.border}
                thumbTintColor={C.primary}
              />
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}
