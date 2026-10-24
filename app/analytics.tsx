import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { apiUrl } from './config/api';
import { AppScreen, PageHeader, SoftCard } from './components/common';
import { C } from './(tabs)/sensor';

const T = C;
const { width } = Dimensions.get('window');

type AnalyticsRecord = {
  date: string;
  focusMinutes: number;
  hourlyDistribution?: number[];
};

export default function AnalyticsScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<AnalyticsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError('');
    try {
      const stored = await AsyncStorage.getItem('user_data');
      const token = await AsyncStorage.getItem('access_token');
      if (!stored || !token) {
        throw new Error('Oturum bulunamadı.');
      }

      const user = JSON.parse(stored);
      const res = await fetch(apiUrl(`/users/analytics/${user.id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Analitik alınamadı.');
      }

      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setError('Analitik verileri yüklenemedi.');
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const analytics = useMemo(() => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const labels = last7Days.map((date) => {
      const day = new Date(date).getDay();
      return ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][day];
    });

    const points = last7Days.map((date) => {
      const record = records.find((item) => item.date === date);
      return record?.focusMinutes ?? 0;
    });

    const heatmap = Array<number>(24).fill(0);
    const dayTotals = Array<number>(7).fill(0);
    
    records.forEach((record) => {
      const d = new Date(record.date).getDay();
      dayTotals[d] += record.focusMinutes;
      record.hourlyDistribution?.forEach((value, index) => {
        heatmap[index] += value;
      });
    });

    const dayNames = ['Pazar', 'Pzt', 'Salı', 'Çarş', 'Perş', 'Cuma', 'Cmt'];
    const bestDayIndex = dayTotals.indexOf(Math.max(...dayTotals));
    const bestDay = Math.max(...dayTotals) > 0 ? dayNames[bestDayIndex] : '-';

    return {
      labels,
      points,
      heatmap,
      bestDay,
      total: points.reduce((sum, value) => sum + value, 0),
      bestHour: heatmap.indexOf(Math.max(...heatmap)),
    };
  }, [records]);

  const hasData = analytics.total > 0;
  const chartPoints = hasData ? analytics.points : Array(7).fill(0.1);

  const chartConfig = {
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(26, 35, 126, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    propsForDots: { r: '5', strokeWidth: '2', stroke: T.accent },
    propsForBackgroundLines: { strokeDasharray: '', stroke: T.border },
  };

  return (
    <AppScreen scroll>
      <PageHeader title="Analitik" eyebrow="PRO Panel" onBack={() => router.back()} right={<FontAwesome5 solid name="crown" size={18} color={T.accent} />} />

      {isLoading ? (
        <SoftCard style={styles.stateCard}>
          <ActivityIndicator color={T.primary} />
          <Text style={styles.muted}>Odak verilerin hazırlanıyor.</Text>
        </SoftCard>
      ) : error ? (
        <SoftCard style={styles.stateCard}>
          <FontAwesome5 solid name="chart-line" size={24} color={T.danger} />
          <Text style={styles.stateTitle}>{error}</Text>
          <TouchableOpacity onPress={fetchAnalytics} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Tekrar dene</Text>
          </TouchableOpacity>
        </SoftCard>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <Metric icon="fire-alt" label="Bu hafta" value={`${analytics.total} dk`} color={T.danger} />
            <Metric icon="clock" label="En verimli" value={hasData ? `${String(analytics.bestHour).padStart(2, '0')}:00` : '-'} color={T.info} />
            <Metric icon="calendar-check" label="En iyi gün" value={analytics.bestDay} color={T.success} />
          </View>

          {!hasData ? (
            <SoftCard style={styles.stateCard}>
              <FontAwesome5 solid name="seedling" size={24} color={T.primary} />
              <Text style={styles.stateTitle}>Henüz analitik yok</Text>
              <Text style={styles.muted}>Bir odada odak oturumu tamamladığında grafikler burada dolacak.</Text>
            </SoftCard>
          ) : null}

          <SoftCard style={styles.chartBox}>
            <Text style={styles.sectionTitle}>Haftalik odaklanma</Text>
            <LineChart
              data={{ labels: analytics.labels, datasets: [{ data: chartPoints }] }}
              width={width - 74}
              height={218}
              chartConfig={chartConfig}
              bezier
              withVerticalLines={false}
              style={styles.chart}
            />
          </SoftCard>

          <SoftCard>
            <Text style={styles.sectionTitle}>Verimli saatler</Text>
            <View style={styles.heatmap}>
              {analytics.heatmap.map((value, index) => {
                const max = Math.max(...analytics.heatmap, 1);
                const opacity = value > 0 ? value / max : 0;
                return (
                  <View key={index} style={styles.hourCell}>
                    <View
                      style={[
                        styles.hourBox,
                        {
                          backgroundColor: value > 0 ? `rgba(255, 193, 7, ${0.25 + opacity * 0.65})` : T.softIndigo,
                          borderColor: value > 0 ? T.accent : T.border,
                        },
                      ]}
                    >
                      {value > 0 ? <Text style={styles.hourValue}>{value}</Text> : null}
                    </View>
                    <Text style={styles.hourLabel}>{String(index).padStart(2, '0')}</Text>
                  </View>
                );
              })}
            </View>
          </SoftCard>
        </>
      )}
    </AppScreen>
  );
}

function Metric({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <SoftCard style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
        <FontAwesome5 solid name={icon} size={16} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </SoftCard>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  metricCard: { flex: 1, padding: 12, alignItems: 'center' },
  metricIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 10 },
  metricValue: { color: T.textDark, fontSize: 18, fontWeight: '900' },
  muted: { color: T.textMuted, fontSize: 11, fontWeight: '700', lineHeight: 16, textAlign: 'center' },
  sectionTitle: { color: T.textDark, fontSize: 16, fontWeight: '900', marginBottom: 12 },
  chartBox: { marginBottom: 16, overflow: 'hidden' },
  chart: { marginLeft: -18, marginVertical: 4 },
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  hourCell: { width: '15%', alignItems: 'center', marginBottom: 14 },
  hourBox: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hourValue: { color: T.textDark, fontSize: 10, fontWeight: '900' },
  hourLabel: { color: T.textMuted, fontSize: 10, fontWeight: '800', marginTop: 5 },
  stateCard: { alignItems: 'center', gap: 12, paddingVertical: 34, marginBottom: 16 },
  stateTitle: { color: T.textDark, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  primaryBtn: { backgroundColor: T.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900' },
});
