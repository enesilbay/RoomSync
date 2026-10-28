import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { CustomAlertModal, SoftCard } from '@/src/components/common';
import { formatDuration } from '../format';
import type { FocusFlow } from '../hooks/useFocusFlow';
import { BatteryHint } from './BatteryHint';
import { CompletionSummary } from './CompletionSummary';
import { FocusControls } from './FocusControls';
import { FocusOverlay } from './FocusOverlay';
import { FocusStatusCard, type FocusVariant } from './FocusStatusCard';
import { FocusTimer } from './FocusTimer';
import { ModeToggle } from './ModeToggle';
import { WebSensorToggle } from './WebSensorToggle';

type Props = {
  flow: FocusFlow;
  variant: FocusVariant;
};

const IS_WEB = Platform.OS === 'web';

// Solo ve oda ekranlarının ortak odak arayüzü: durum, sayaç, mod, başlat/bitir,
// bitiş onayı, özet ve tam ekran odak katmanı. Modallar ekranın en üstünde çizilir.
export function FocusPanel({ flow, variant }: Props) {
  return (
    <>
      <FocusStatusCard
        phase={flow.phase}
        mode={flow.mode}
        variant={variant}
        breakOverdue={flow.breakOverdue}
        completed={flow.state.completed}
      />

      <SoftCard style={s.card}>
        <FocusTimer
          phase={flow.phase}
          minutes={flow.minutes}
          remainingMs={flow.remainingMs}
          focusedMs={flow.focusedMs}
          breakElapsedMs={flow.breakElapsedMs}
          breakOverdue={flow.breakOverdue}
        />
        <ModeToggle mode={flow.mode} onChange={flow.setMode} disabled={flow.active} />
        <FocusControls
          active={flow.active}
          minutes={flow.minutes}
          onSelectMinutes={flow.setMinutes}
          onStart={flow.start}
          onFinish={flow.requestFinish}
        />
        {!flow.active && flow.battery.visible && <BatteryHint onDismiss={flow.battery.dismiss} />}
        {IS_WEB && flow.active && (
          <WebSensorToggle isAtDesk={flow.reading.onDesk} onPress={() => flow.simulateDesk(!flow.reading.onDesk)} />
        )}
      </SoftCard>

      <CustomAlertModal
        visible={flow.confirmingFinish}
        type="warning"
        title="Oturumu bitirmek istiyor musun?"
        message={`Şu ana kadar ${formatDuration(flow.focusedMs)} odaklandın. Şimdi bitirirsen oturum erken bitirilmiş sayılır.`}
        confirmText="Evet, bitir"
        cancelText="Devam et"
        onConfirm={flow.confirmFinish}
        onCancel={flow.cancelFinish}
      />

      <CompletionSummary summary={flow.summary} onNewSession={flow.newSession} onClose={flow.closeSummary} />

      <FocusOverlay kind={flow.overlay} remainingMs={flow.remainingMs} onWebLift={() => flow.simulateDesk(false)} />
    </>
  );
}

const s = StyleSheet.create({
  card: { marginBottom: 28, borderRadius: 24, padding: 20 },
});
