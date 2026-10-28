import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { C } from '@/src/theme';
import { POMODORO_OPTIONS } from '../constants';
import { shared } from './sharedStyles';

type Props = {
  visible: boolean;
  onSelect: (minutes: number) => void;
  onCancel: () => void;
};

// POMODORO MODAL
export function PomodoroModal({ visible, onSelect, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={shared.modalOverlay}>
        <View style={shared.modalSheet}>
          <Text style={shared.modalTitle}>Pomodoro Süresi</Text>
          {POMODORO_OPTIONS.map(o => (
            <TouchableOpacity key={o.minutes} onPress={() => onSelect(o.minutes)} style={s.modalOpt}>
              <Text style={s.modalOptText}>{o.label}</Text>
              <FontAwesome5 solid name="chevron-right" size={12} color={C.textMuted} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[s.modalOpt, { justifyContent: 'center', borderBottomWidth: 0, marginTop: 10 }]} onPress={onCancel}>
            <Text style={{ color: C.danger, fontWeight: 'bold' }}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalOpt: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: C.border, alignItems: 'center' },
  modalOptText: { color: C.textDark, fontSize: 16, fontWeight: '600' },
});
