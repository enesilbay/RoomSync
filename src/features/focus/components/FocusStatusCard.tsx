import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { C, Theme } from '@/src/theme';
import type { FocusMode, SessionPhase } from '../engine/types';

/** solo: puan yok; room: odak puanı; elite: x2 puan. */
export type FocusVariant = 'solo' | 'room' | 'elite';

type Tone = 'neutral' | 'success' | 'elite' | 'info' | 'warning' | 'danger';

type StatusCopy = { title: string; description: string; icon: string; tone: Tone };

const PLACE_COPY: Record<FocusMode, string> = {
  strict: 'Telefonu ekranı aşağı bakacak şekilde masaya bırak',
  flexible: 'Telefonu masaya düz bırak',
};

const RETURN_COPY: Record<FocusMode, string> = {
  strict: 'Odaklanmaya dönmek için telefonu ekranı aşağı bakacak şekilde masaya bırak.',
  flexible: 'Odaklanmaya dönmek için telefonu masaya düz bırak.',
};

const IDLE_COPY: Record<FocusVariant, string> = {
  solo: 'Süreni seç ve başlat.',
  room: 'Süreni seç ve başlat; telefon masadayken odak puanı kazanırsın.',
  elite: 'Süreni seç ve başlat; Elite odada x2 puan kazanırsın.',
};

const FOCUS_COPY: Record<FocusVariant, string> = {
  solo: 'Telefonu kaldırırsan sayaç durur.',
  room: 'Cihaz masada, odak puanı kazanıyorsun.',
  elite: 'Elite mod aktif! Çarpan ile x2 Puan kazanıyorsun.',
};

type CopyInput = {
  phase: SessionPhase;
  mode: FocusMode;
  variant: FocusVariant;
  breakOverdue: boolean;
  /** completed fazında: süre doldu mu (yoksa erken bitirildi). */
  completed: boolean;
};

/** Her faz için başlık, açıklama, ikon ve renk tonu. */
function getStatusCopy({ phase, mode, variant, breakOverdue, completed }: CopyInput): StatusCopy {
  switch (phase) {
    case 'idle':
      return { title: 'Hazır', description: IDLE_COPY[variant], icon: 'hourglass-start', tone: 'neutral' };
    case 'waiting':
      return {
        title: PLACE_COPY[mode],
        description: 'Telefon birkaç saniye sabit kalınca sayaç başlar.',
        icon: 'mobile-alt',
        tone: 'info',
      };
    case 'focusing':
      return {
        title: 'Odaklanıyorsun',
        description: FOCUS_COPY[variant],
        icon: 'check-circle',
        tone: variant === 'elite' ? 'elite' : 'success',
      };
    case 'glancing':
      return { title: 'Kısa bakış', description: 'Geri bırakırsan mola sayılmaz.', icon: 'eye', tone: 'info' };
    case 'break':
      return {
        title: 'Moladasın',
        description: breakOverdue ? `Mola uzadı. ${RETURN_COPY[mode]}` : RETURN_COPY[mode],
        icon: 'coffee',
        tone: breakOverdue ? 'danger' : 'warning',
      };
    case 'completed':
      return completed
        ? { title: 'Tamamlandı', description: 'Tebrikler, hedef süreni tamamladın.', icon: 'flag-checkered', tone: 'success' }
        : { title: 'Erken bitirildi', description: 'Oturumun kaydedildi.', icon: 'flag', tone: 'neutral' };
  }
}

const TONES: Record<Tone, { fg: string; bg: string; border: string }> = {
  neutral: { fg: C.textMuted, bg: C.surface, border: C.border },
  success: { fg: C.success, bg: C.softSuccess, border: C.success },
  elite: { fg: C.accent, bg: C.lightAmber, border: C.accent },
  info: { fg: C.info, bg: C.softInfo, border: C.info },
  warning: { fg: C.accent, bg: C.lightAmber, border: C.accent },
  danger: { fg: C.danger, bg: C.softDanger, border: C.danger },
};

type Props = CopyInput;

// Faz durumunu ve sıradaki adımı anlatan kart.
export function FocusStatusCard(props: Props) {
  const copy = getStatusCopy(props);
  const tone = TONES[copy.tone];
  const highlighted = copy.tone !== 'neutral';

  return (
    <View
      style={[s.card, highlighted && { backgroundColor: tone.bg, borderColor: tone.border }]}
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
    >
      <View style={[s.icon, highlighted && { borderColor: tone.border, backgroundColor: C.surface }]}>
        <FontAwesome5 solid name={copy.icon} size={24} color={highlighted ? tone.fg : C.textMuted} />
      </View>
      <View style={s.text}>
        <Text style={[s.title, highlighted && { color: tone.fg }]}>{copy.title}</Text>
        <Text style={s.desc}>{copy.description}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    ...Theme.shadows.soft,
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  text: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: C.textDark, marginBottom: 3 },
  desc: { fontSize: 12, color: C.textMuted },
});
