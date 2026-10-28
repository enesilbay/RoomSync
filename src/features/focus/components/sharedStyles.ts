import { StyleSheet } from 'react-native';
import { C, Theme } from '@/src/theme';

// Birden fazla bileşende kullanılan bölüm, kullanıcı listesi ve modal stilleri.
export const shared = StyleSheet.create({
  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 12, color: C.textMuted, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },

  usersWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  userDot: { position: 'absolute', right: -1, bottom: -1, width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.5, borderColor: C.surface },

  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', alignItems: 'center' },
  modalSheet: { backgroundColor: C.surface, padding: 30, borderRadius: 28, width: '85%', borderWidth: 1, borderColor: C.border, ...Theme.shadows.medium },
  modalTitle: { color: C.textDark, fontSize: 20, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
});
