import React from 'react';
import { Modal, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { C } from '@/src/theme';
import { formatClock } from '../format';
import type { FocusOverlayKind } from '../hooks/useFocusFlow';
import { FocusBlackout } from './FocusBlackout';

type Props = {
  kind: FocusOverlayKind;
  remainingMs: number;
  /** Yalnızca web: sensör olmadığından katmana dokunmak masadan kalkmayı taklit eder. */
  onWebLift?: () => void;
};

const IS_WEB = Platform.OS === 'web';
/** OLED'de iz kalmasın diye minimal sayaç her dakika birkaç piksel kayar. */
const DRIFT_STEPS = [-24, -12, 0, 12, 24];

// Odakta tam ekran katman. Modal içinde çizilir: sekme çubuğunu ve durum çubuğunu da örter.
export function FocusOverlay({ kind, remainingMs, onWebLift }: Props) {
  const minuteIndex = Math.floor(remainingMs / 60_000);
  const drift = DRIFT_STEPS[minuteIndex % DRIFT_STEPS.length];
  const webLift = IS_WEB ? onWebLift : undefined;

  const content =
    kind === 'blackout' ? (
      <FocusBlackout />
    ) : (
      <View style={s.minimal} testID="focus-minimal">
        <View style={{ transform: [{ translateY: drift }] }}>
          <Text style={s.digits}>{formatClock(remainingMs, 'up')}</Text>
          <Text style={s.caption}>Odaklanıyorsun</Text>
        </View>
      </View>
    );

  return (
    <Modal
      visible={kind !== null}
      transparent
      // Animasyonsuz: kapanırken bir önceki katmanın yerine yanlış içerik görünmesin, kalkış anında tepki versin.
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      // Geri tuşu katmanı kapatmaz; telefon kaldırılınca katman kendiliğinden kalkar.
      onRequestClose={() => undefined}
    >
      <StatusBar hidden />
      {webLift ? (
        <Pressable
          style={s.fill}
          onPress={webLift}
          accessibilityRole="button"
          accessibilityLabel="Web testi: masadan kalk"
        >
          {content}
          <Text style={s.webHint}>[Web Test] Masadan kalkmak için dokun</Text>
        </Pressable>
      ) : (
        <View style={s.fill}>{content}</View>
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.screenOff },
  minimal: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.screenOff },
  digits: {
    fontSize: 88,
    fontWeight: '200',
    color: C.oled.digits,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  caption: { marginTop: 8, fontSize: 14, fontWeight: '600', color: C.oled.caption, textAlign: 'center', letterSpacing: 1 },
  webHint: { position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', color: C.oled.caption, fontSize: 12 },
});
