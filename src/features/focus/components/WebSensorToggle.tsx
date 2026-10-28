import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { C } from '@/src/theme';

type Props = {
  isAtDesk: boolean;
  onPress: () => void;
};

// WEB İÇİN MANUEL SENSÖR SİMÜLASYONU (web'de ivmeölçer verisi yok)
export function WebSensorToggle({ isAtDesk, onPress }: Props) {
  const label = isAtDesk ? 'Masadan Kalk' : 'Masaya Geç';
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.btn, isAtDesk ? s.btnLeave : s.btnEnter]}
      accessibilityRole="button"
      accessibilityLabel={`Web testi: ${label}`}
    >
      <Text style={[s.text, { color: isAtDesk ? C.danger : C.success }]}>[Web Test] {label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { minHeight: 44, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 1 },
  btnEnter: { backgroundColor: C.softSuccess, borderColor: C.success },
  btnLeave: { backgroundColor: C.softDanger, borderColor: C.danger },
  text: { fontWeight: 'bold' },
});
