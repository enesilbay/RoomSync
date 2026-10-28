import { FontAwesome5 } from '@expo/vector-icons';
import type { ErrorBoundaryProps } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logger } from '@/src/lib/logger';
import { C, Theme } from '@/src/theme';

/**
 * Expo Router hata sınırı için yedek ekran.
 *
 * `app/_layout.tsx` bunu `ErrorBoundary` olarak export eder; bir rota render
 * sırasında hata fırlatırsa bu ekran gösterilir. Hata ayrıntısı yalnızca
 * geliştirme modunda (`__DEV__`) görünür; production'da kullanıcıya sade bir
 * mesaj ve "Tekrar dene" butonu kalır.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    logger.error('[ErrorBoundary] Yakalanmamış render hatası:', error);
  }, [error]);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="exclamation-triangle" size={26} color={C.danger} solid />
          </View>

          <Text style={styles.title} accessibilityRole="header">
            Bir şeyler ters gitti
          </Text>
          <Text style={styles.message}>
            Beklenmedik bir hata oluştu. Endişelenme, verilerin güvende. Ekranı yeniden yüklemeyi
            deneyebilirsin.
          </Text>

          {__DEV__ ? (
            <View style={styles.devBox} testID="error-boundary-dev-details">
              <Text style={styles.devLabel}>Geliştirici ayrıntısı</Text>
              <Text style={styles.devMessage} selectable>
                {error.name}: {error.message}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleRetry}
            disabled={retrying}
            accessibilityRole="button"
            accessibilityLabel="Tekrar dene"
            accessibilityHint="Ekranı yeniden yüklemeyi dener"
            accessibilityState={{ disabled: retrying, busy: retrying }}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              retrying && styles.buttonDisabled,
            ]}
          >
            <FontAwesome5 name="redo-alt" size={14} color={C.onColor} solid />
            <Text style={styles.buttonText}>{retrying ? 'Deneniyor…' : 'Tekrar dene'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.xl,
  },
  card: {
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: Theme.radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.xl,
    ...Theme.shadows.medium,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.softDanger,
    marginBottom: Theme.spacing.md,
  },
  title: {
    ...Theme.typography.h2,
    color: C.textDark,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: C.textMuted,
    textAlign: 'center',
  },
  devBox: {
    alignSelf: 'stretch',
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    backgroundColor: C.softDanger,
  },
  devLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Theme.spacing.xs,
  },
  devMessage: { fontSize: 12, fontWeight: '500', lineHeight: 17, color: C.textDark },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    alignSelf: 'stretch',
    minHeight: 50,
    marginTop: Theme.spacing.lg,
    borderRadius: Theme.radius.md,
    backgroundColor: C.primary,
  },
  buttonPressed: { backgroundColor: C.secondary },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 15, fontWeight: '800', color: C.onColor },
});
