import { addLocalDays, localDateKey, startOfLocalDay } from '../dateUtils';

// Tüm tarihler yerel kurucuyla oluşturulur; testler saat diliminden bağımsızdır.
describe('localDateKey', () => {
  it('yerel günü YYYY-MM-DD olarak döndürür (sıfır dolgulu)', () => {
    expect(localDateKey(new Date(2026, 0, 5, 12).getTime())).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 11, 31, 9).getTime())).toBe('2026-12-31');
  });

  it('gece yarısına yakın anlarda UTC değil yerel günü kullanır', () => {
    expect(localDateKey(new Date(2026, 9, 28, 0, 0, 0, 0).getTime())).toBe('2026-10-28');
    expect(localDateKey(new Date(2026, 9, 28, 23, 59, 59, 999).getTime())).toBe('2026-10-28');
    expect(localDateKey(new Date(2026, 9, 29, 0, 30).getTime())).toBe('2026-10-29');
  });
});

describe('startOfLocalDay', () => {
  it('yerel 00:00:00.000 anını döndürür', () => {
    const ts = new Date(2026, 9, 28, 17, 45, 12, 345).getTime();
    expect(startOfLocalDay(ts)).toBe(new Date(2026, 9, 28).getTime());
  });

  it('zaten gün başıysa aynı değeri döndürür', () => {
    const ts = new Date(2026, 2, 1).getTime();
    expect(startOfLocalDay(ts)).toBe(ts);
  });
});

describe('addLocalDays', () => {
  it('duvar saatini koruyarak gün ekler/çıkarır', () => {
    const ts = new Date(2026, 9, 28, 14, 30).getTime();
    expect(addLocalDays(ts, 1)).toBe(new Date(2026, 9, 29, 14, 30).getTime());
    expect(addLocalDays(ts, -7)).toBe(new Date(2026, 9, 21, 14, 30).getTime());
    expect(addLocalDays(ts, 0)).toBe(ts);
  });

  it('ay ve yıl sınırlarını aşar', () => {
    expect(addLocalDays(new Date(2026, 11, 31).getTime(), 1)).toBe(new Date(2027, 0, 1).getTime());
    expect(addLocalDays(new Date(2024, 1, 28).getTime(), 1)).toBe(new Date(2024, 1, 29).getTime());
    expect(addLocalDays(new Date(2026, 2, 1).getTime(), -1)).toBe(new Date(2026, 1, 28).getTime());
  });

  it('yaz saati geçişi içeren aralıklarda gün başı gün başı kalır', () => {
    // Avrupa/ABD DST geçişlerini kapsayan bir yıl boyunca her adım bir sonraki yerel gün başına düşer.
    let ts = new Date(2026, 0, 1).getTime();
    for (let i = 0; i < 365; i++) {
      const next = addLocalDays(ts, 1);
      expect(startOfLocalDay(next)).toBe(next);
      expect(localDateKey(next)).not.toBe(localDateKey(ts));
      ts = next;
    }
    expect(localDateKey(ts)).toBe('2027-01-01');
  });
});
