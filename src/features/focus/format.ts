// Odak ekranlarındaki süre biçimleri.

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * "DD:SS" sayaç biçimi (dakika 60'ı aşabilir). Geri sayımda yukarı yuvarlanır: başlar başlamaz
 * 24:59 görünmesin, 00:00 yalnızca gerçekten bitince görünsün.
 */
export function formatClock(ms: number, rounding: 'up' | 'down' = 'down'): string {
  const raw = Math.max(0, ms) / 1000;
  const total = rounding === 'up' ? Math.ceil(raw) : Math.floor(raw);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Okunur süre: "25 dk", "4 dk 30 sn", "45 sn", "1 sa 5 dk". */
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return m > 0 ? `${h} sa ${m} dk` : `${h} sa`;
  if (m > 0) return s > 0 ? `${m} dk ${s} sn` : `${m} dk`;
  return `${s} sn`;
}
