import { aggregateDaily, todayTotals, type AggregatableSession } from '../aggregate';

const at = (d: number, h: number, min = 0) => new Date(2026, 9, d, h, min).getTime();
const MIN = 60_000;

const s = (startedAt: number, focusedMin: number, pickups = 0): AggregatableSession => ({
  startedAt,
  focusedMs: focusedMin * MIN,
  pickups,
});

describe('aggregateDaily', () => {
  it('her gün için bir girdi döndürür ve boş günleri sıfırla doldurur', () => {
    const result = aggregateDaily([s(at(23, 10), 25, 1)], at(21, 15), 5);
    expect(result.map((d) => d.dateKey)).toEqual([
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
    expect(result[0]).toEqual({ dateKey: '2026-10-21', focusedMs: 0, sessions: 0, pickups: 0 });
    expect(result[2]).toEqual({ dateKey: '2026-10-23', focusedMs: 25 * MIN, sessions: 1, pickups: 1 });
  });

  it('aynı gündeki birden çok oturumu toplar', () => {
    const records = [s(at(28, 8), 25, 2), s(at(28, 13), 50, 0), s(at(28, 23, 59), 10, 3)];
    expect(aggregateDaily(records, at(28, 0), 1)).toEqual([
      { dateKey: '2026-10-28', focusedMs: 85 * MIN, sessions: 3, pickups: 5 },
    ]);
  });

  it('gece yarısını aşan oturumu başladığı güne yazar', () => {
    // 23:30'da başlayan 90 dk'lık oturum, ertesi güne bölünmez.
    const result = aggregateDaily([s(at(27, 23, 30), 90, 1)], at(27, 0), 2);
    expect(result[0]).toEqual({ dateKey: '2026-10-27', focusedMs: 90 * MIN, sessions: 1, pickups: 1 });
    expect(result[1]).toEqual({ dateKey: '2026-10-28', focusedMs: 0, sessions: 0, pickups: 0 });
  });

  it('aralık dışındaki oturumları yok sayar', () => {
    const records = [s(at(20, 23, 59), 30), s(at(26, 0, 0), 40)];
    const result = aggregateDaily(records, at(21, 0), 5);
    expect(result.every((d) => d.sessions === 0)).toBe(true);
  });

  it('days <= 0 için boş dizi döndürür', () => {
    expect(aggregateDaily([s(at(28, 9), 10)], at(28, 0), 0)).toEqual([]);
  });
});

describe('todayTotals', () => {
  it('yalnızca now gününün toplamını döndürür', () => {
    const records = [s(at(27, 22), 60, 4), s(at(28, 0, 5), 20, 1), s(at(28, 9), 30, 0)];
    expect(todayTotals(records, at(28, 18))).toEqual({
      dateKey: '2026-10-28',
      focusedMs: 50 * MIN,
      sessions: 2,
      pickups: 1,
    });
  });

  it('oturum yoksa sıfır döndürür', () => {
    expect(todayTotals([], at(28, 12))).toEqual({
      dateKey: '2026-10-28',
      focusedMs: 0,
      sessions: 0,
      pickups: 0,
    });
  });
});
