// Cihaz saat dilimine göre tarih yardımcıları (saf fonksiyonlar).
// Not: toISOString UTC döndürür; yerel gün anahtarı için kullanılmamalı.

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/** Yerel takvim günü anahtarı: "YYYY-MM-DD" (cihaz saat dilimi). */
export function localDateKey(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Verilen anın yerel gününün başlangıcı (00:00:00.000) ms cinsinden. */
export function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Yerel takvimde n gün ileri/geri gider; duvar saati korunur.
 * Date setter'ları kullanıldığı için yaz saati geçişlerinde (23/25 saatlik günler) kaymaz.
 */
export function addLocalDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}
