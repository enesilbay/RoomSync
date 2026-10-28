import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '@/src/theme';

export function ChatFab({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={s.fab} onPress={onPress}>
      <LinearGradient colors={[C.primary, C.secondary]} style={s.fabGrad}>
        <FontAwesome5 solid name="comment-dots" size={22} color={C.onColor} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  fab: { position: 'absolute', bottom: 115, right: 22, width: 64, height: 64, borderRadius: 32, overflow: 'hidden', elevation: 12, shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 },
  fabGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
