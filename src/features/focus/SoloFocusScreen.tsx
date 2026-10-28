import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from 'expo-router';
import { PageHeader, SoftCard } from '@/src/components/common';
import { useTodayStats } from '@/src/features/sessions';
import { C } from '@/src/theme';
import { BackgroundOrbs } from './components/BackgroundOrbs';
import { FocusPanel } from './components/FocusPanel';
import { shared } from './components/sharedStyles';
import { SoundSection } from './components/SoundSection';
import { useAmbientSounds } from './hooks/useAmbientSounds';
import { useFocusFlow } from './hooks/useFocusFlow';

// Hesapsız, odasız ve çevrimdışı solo odak ekranı. API'ye ve socket'e dokunmaz;
// oturumlar yalnızca cihazdaki geçmişe (roomName: null) yazılır.
export default function SoloFocusScreen() {
  const isFocused = useIsFocused();
  // Sekme değişse de oturum sürer (molada başka sekmeye bakılabilir); katman yalnızca bu ekrandayken.
  const flow = useFocusFlow({ roomName: null, screenFocused: isFocused });
  const today = useTodayStats();

  const { availableSounds, isSoundOn, setIsSoundOn, volumes, handleSingleSoundSelect } = useAmbientSounds({
    isEliteRoom: false,
    equippedSoundPack: 'classic',
    isAtDesk: flow.phase === 'focusing',
    isFocused,
  });

  const stats = [
    { label: 'dk odak', value: today.focusedMinutes },
    { label: 'oturum', value: today.sessions },
    { label: 'kaldırma', value: today.pickups },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BackgroundOrbs />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <PageHeader title="Odak" eyebrow="Hesapsız, çevrimdışı" />

        <FocusPanel flow={flow} variant="solo" />

        <View style={shared.section}>
          <Text style={shared.sectionLabel}>BUGÜN</Text>
          <SoftCard style={s.statsCard}>
            {stats.map((item) => (
              <View
                key={item.label}
                style={s.stat}
                accessible
                accessibilityLabel={`Bugün ${item.value} ${item.label}`}
              >
                <Text style={s.statValue}>{item.value}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
          </SoftCard>
        </View>

        <SoundSection
          equippedSoundPack="classic"
          isPremium={false}
          isSoundOn={isSoundOn}
          availableSounds={availableSounds}
          volumes={volumes}
          onToggleSound={() => setIsSoundOn(!isSoundOn)}
          onSelectSound={handleSingleSoundSelect}
        />

        {/* Yüzen sekme çubuğunun altında kalmasın */}
        <View style={s.tabBarSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: 22, paddingTop: 12 },
  statsCard: { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 24 },
  stat: { alignItems: 'center', minWidth: 72 },
  statValue: { fontSize: 22, fontWeight: '900', color: C.textDark },
  statLabel: { marginTop: 2, fontSize: 12, fontWeight: '700', color: C.textMuted },
  tabBarSpacer: { height: 100 },
});
