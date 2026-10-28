import { C } from '@/src/theme';
import { getRankInfo, getRankProgress, RANKS } from '@/src/lib/rank';

describe('RANKS', () => {
  it('rütbeler 0 dakikadan başlar ve aralıklar boşluksuz ardışıktır', () => {
    expect(RANKS[0].min).toBe(0);
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].min).toBe(RANKS[i - 1].max);
    }
  });

  it('yalnızca son rütbenin üst sınırı yoktur (max: null)', () => {
    const openEnded = RANKS.filter((rank) => rank.max === null);
    expect(openEnded).toHaveLength(1);
    expect(RANKS[RANKS.length - 1]).toBe(openEnded[0]);
    expect(openEnded[0].title).toBe('Efsane');
  });

  it('renkler tema token’larından gelir', () => {
    expect(RANKS.map((rank) => rank.color)).toEqual([
      C.rank.bronze,
      C.rank.silver,
      C.rank.gold,
      C.rank.emerald,
      C.rank.amethyst,
    ]);
  });
});

describe('getRankInfo', () => {
  it.each([
    [0, 'Çaylak'],
    [49, 'Çaylak'],
    [49.99, 'Çaylak'],
    [50, 'Odaklı'],
    [199, 'Odaklı'],
    [200, 'Akademisyen'],
    [499, 'Akademisyen'],
    [500, 'Usta'],
    [999, 'Usta'],
    [1000, 'Efsane'],
    [1_000_000, 'Efsane'],
  ])('%p dakika → %s', (points, title) => {
    expect(getRankInfo(points).title).toBe(title);
  });

  it('eşik değeri bir üst rütbeye aittir (alt sınır dahil, üst sınır hariç)', () => {
    for (const rank of RANKS) {
      expect(getRankInfo(rank.min)).toBe(rank);
    }
  });

  it('NaN ve tanımsız değerleri 0 kabul eder', () => {
    expect(getRankInfo(Number.NaN).title).toBe('Çaylak');
    expect(getRankInfo(undefined as unknown as number).title).toBe('Çaylak');
  });

  it('negatif değerde mevcut davranış: hiçbir aralığa uymaz ve Efsane döner', () => {
    // TODO(Faz 2): negatif puan Çaylak'a düşmeli (0'a sıkıştırılmalı).
    expect(getRankInfo(-5).title).toBe('Efsane');
  });
});

describe('getRankProgress', () => {
  it('0 dakikada ilk rütbenin başındadır', () => {
    expect(getRankProgress(0)).toEqual({
      current: 0,
      total: 50,
      percentage: 0,
      nextRank: 'Odaklı',
    });
  });

  it('rütbe içindeki ilerlemeyi yüzde olarak hesaplar', () => {
    expect(getRankProgress(25)).toEqual({ current: 25, total: 50, percentage: 50, nextRank: 'Odaklı' });
    expect(getRankProgress(125)).toEqual({
      current: 75,
      total: 150,
      percentage: 50,
      nextRank: 'Akademisyen',
    });
  });

  it('tam eşikte yeni rütbede %0 ile başlar', () => {
    expect(getRankProgress(50)).toEqual({ current: 0, total: 150, percentage: 0, nextRank: 'Akademisyen' });
    expect(getRankProgress(200)).toEqual({ current: 0, total: 300, percentage: 0, nextRank: 'Usta' });
    expect(getRankProgress(500)).toEqual({ current: 0, total: 500, percentage: 0, nextRank: 'Efsane' });
  });

  it('son sınırlı rütbenin hemen altında %100’e yaklaşır ama ulaşmaz', () => {
    const progress = getRankProgress(999);
    expect(progress.current).toBe(499);
    expect(progress.total).toBe(500);
    expect(progress.percentage).toBeCloseTo(99.8);
    expect(progress.nextRank).toBe('Efsane');
  });

  it('en üst rütbede (max: null) %100 ve sonraki rütbe yok', () => {
    expect(getRankProgress(1000)).toEqual({ current: 1000, total: 1000, percentage: 100, nextRank: null });
  });

  it('en üst eşiğin ötesinde de %100 kalır', () => {
    expect(getRankProgress(4321)).toEqual({ current: 4321, total: 4321, percentage: 100, nextRank: null });
  });

  it('NaN değerini 0 kabul eder', () => {
    expect(getRankProgress(Number.NaN)).toEqual(getRankProgress(0));
  });
});
