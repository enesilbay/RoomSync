import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { C } from '@/src/theme';

type Props = {
  isAtDesk: boolean;
  onPress: () => void;
};

// WEB İÇİN MANUEL SENSÖR SİMÜLASYONU
export function WebSensorToggle({ isAtDesk, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ backgroundColor: isAtDesk ? C.softDanger : C.softSuccess, padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: isAtDesk ? C.danger : C.success }}
    >
      <Text style={{ color: isAtDesk ? C.danger : C.success, fontWeight: 'bold' }}>
        [Web Test] {isAtDesk ? 'Masadan Kalk' : 'Masaya Geç'}
      </Text>
    </TouchableOpacity>
  );
}
