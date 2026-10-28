import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { DarkSheetModal } from '@/src/components/common';
import { C } from '@/src/theme';
import type { SessionSummary } from '../engine/types';
import { formatDuration } from '../format';

type Props = {
  summary: SessionSummary | null;
  onNewSession: () => void;
  onClose: () => void;
};

/** Özet satırları: etiket ve değer. */
function summaryRows(summary: SessionSummary): { label: string; value: string }[] {
  return [
    { label: 'Odaklanılan süre', value: formatDuration(summary.focusedMs) },
    { label: 'Planlanan süre', value: formatDuration(summary.plannedMs) },
    { label: 'Telefonu kaldırma', value: `${summary.pickups} kez` },
    {
      label: 'Mola',
      value: summary.breaks > 0 ? `${summary.breaks} kez · ${formatDuration(summary.breakMs)}` : 'Yok',
    },
    { label: 'Odak kalitesi', value: `%${summary.focusQuality}` },
  ];
}

// Oturum bitince (süre dolunca veya erken bitirince) açılan özet.
export function CompletionSummary({ summary, onNewSession, onClose }: Props) {
  return (
    <DarkSheetModal visible={summary !== null} onClose={onClose}>
      {summary ? (
        <View>
          <View style={s.head}>
            <View style={[s.badge, { backgroundColor: summary.completed ? C.softSuccess : C.softIndigo }]}>
              <FontAwesome5
                solid
                name={summary.completed ? 'flag-checkered' : 'flag'}
                size={22}
                color={summary.completed ? C.success : C.primary}
              />
            </View>
            <Text style={s.title} accessibilityRole="header">
              {summary.completed ? 'Tamamlandı' : 'Erken bitirildi'}
            </Text>
            <Text style={s.subtitle}>
              {summary.completed ? 'Hedef süreni tamamladın.' : 'Odaklandığın süre kaydedildi.'}
            </Text>
          </View>

          <View style={s.rows}>
            {summaryRows(summary).map((row) => (
              <View key={row.label} style={s.row} accessible accessibilityLabel={`${row.label}: ${row.value}`}>
                <Text style={s.rowLabel}>{row.label}</Text>
                <Text style={s.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          <View style={s.actions}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={[s.btn, s.btnSecondary]}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
            >
              <Text style={s.btnSecondaryText}>Kapat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onNewSession}
              activeOpacity={0.85}
              style={[s.btn, s.btnPrimary]}
              accessibilityRole="button"
              accessibilityLabel="Yeni oturum"
            >
              <Text style={s.btnPrimaryText}>Yeni oturum</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </DarkSheetModal>
  );
}

const s = StyleSheet.create({
  head: { alignItems: 'center', marginBottom: 18 },
  badge: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '900', color: C.textDark },
  subtitle: { marginTop: 4, fontSize: 13, color: C.textMuted, fontWeight: '600' },
  rows: { borderTopWidth: 1, borderColor: C.border, marginBottom: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  rowLabel: { fontSize: 14, color: C.textMuted, fontWeight: '600' },
  rowValue: { fontSize: 15, color: C.textDark, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnSecondary: { backgroundColor: C.background, borderWidth: 1, borderColor: C.border },
  btnSecondaryText: { color: C.textDark, fontWeight: '800', fontSize: 14 },
  btnPrimary: { backgroundColor: C.primary },
  btnPrimaryText: { color: C.onColor, fontWeight: '900', fontSize: 14 },
});
