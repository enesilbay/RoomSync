import {
  computeFocusQuality,
  DEFAULT_SESSION_CONFIG,
  getBreakElapsedMs,
  getFocusedMs,
  getRemainingMs,
  initialSessionState,
  isActivePhase,
  isBreakOverdue,
  sessionReducer,
  summarizeSession,
} from '../sessionMachine';
import type { SessionEvent, SessionState } from '../types';

const cfg = DEFAULT_SESSION_CONFIG;
const MIN = 60_000;
const T0 = 1_000_000;

const reduce = (state: SessionState, ...events: SessionEvent[]) =>
  events.reduce((s, e) => sessionReducer(s, e, cfg), state);

const start = (plannedMs = 25 * MIN): SessionState =>
  reduce(initialSessionState, { type: 'START', now: T0, plannedMs, mode: 'strict' });

/** T0+1000'de masaya kondu. */
const focusing = (plannedMs?: number) => reduce(start(plannedMs), { type: 'DESK_ON', now: T0 + 1000 });

describe('sessionReducer geçişleri', () => {
  it('START → waiting', () => {
    expect(start()).toEqual({
      ...initialSessionState,
      phase: 'waiting',
      mode: 'strict',
      plannedMs: 25 * MIN,
      startedAt: T0,
    });
  });

  it('geçersiz süreyle START yok sayılır', () => {
    expect(reduce(initialSessionState, { type: 'START', now: T0, plannedMs: 0, mode: 'strict' })).toBe(
      initialSessionState,
    );
    expect(reduce(initialSessionState, { type: 'START', now: T0, plannedMs: NaN, mode: 'strict' })).toBe(
      initialSessionState,
    );
  });

  it('waiting + DESK_ON → focusing', () => {
    const s = focusing();
    expect(s.phase).toBe('focusing');
    expect(s.segmentStartedAt).toBe(T0 + 1000);
    expect(s.focusedMs).toBe(0);
  });

  it('focusing + DESK_OFF → glancing, segment kapanır, pickups++', () => {
    const s = reduce(focusing(), { type: 'DESK_OFF', now: T0 + 61_000 });
    expect(s).toMatchObject({
      phase: 'glancing',
      focusedMs: 60_000,
      segmentStartedAt: null,
      leftDeskAt: T0 + 61_000,
      pickups: 1,
    });
  });

  it('tolerans içinde geri koyma: mola yok, glanceMs sayılır', () => {
    const s = reduce(
      focusing(),
      { type: 'DESK_OFF', now: T0 + 61_000 },
      { type: 'TICK', now: T0 + 65_000 },
      { type: 'DESK_ON', now: T0 + 66_000 },
    );
    expect(s).toMatchObject({
      phase: 'focusing',
      glanceMs: 5000,
      breakMs: 0,
      breaks: 0,
      pickups: 1,
      leftDeskAt: null,
      segmentStartedAt: T0 + 66_000,
      focusedMs: 60_000,
    });
  });

  it('tolerans aşılınca TICK → break; mola leftDeskAt’ten sayılır', () => {
    const off = reduce(focusing(), { type: 'DESK_OFF', now: T0 + 61_000 });
    const brk = reduce(off, { type: 'TICK', now: T0 + 61_000 + cfg.glanceGraceMs });
    expect(brk.phase).toBe('break');
    expect(brk.leftDeskAt).toBe(T0 + 61_000);
    expect(getBreakElapsedMs(brk, T0 + 61_000 + 30_000)).toBe(30_000);

    const back = reduce(brk, { type: 'DESK_ON', now: T0 + 61_000 + 120_000 });
    expect(back).toMatchObject({ phase: 'focusing', breakMs: 120_000, breaks: 1, glanceMs: 0, pickups: 1 });
  });

  it('tik gelmeden toleransı aşan DESK_ON yine mola sayılır', () => {
    const s = reduce(
      focusing(),
      { type: 'DESK_OFF', now: T0 + 61_000 },
      { type: 'DESK_ON', now: T0 + 61_000 + 20_000 },
    );
    expect(s).toMatchObject({ phase: 'focusing', breakMs: 20_000, breaks: 1, glanceMs: 0 });
  });

  it('tolerans dolmadan TICK glancing’de kalır (aynı nesne)', () => {
    const off = reduce(focusing(), { type: 'DESK_OFF', now: T0 + 61_000 });
    expect(reduce(off, { type: 'TICK', now: T0 + 61_000 + cfg.glanceGraceMs - 1 })).toBe(off);
  });

  it('RESET → initial', () => {
    expect(reduce(focusing(), { type: 'RESET' })).toBe(initialSessionState);
  });

  it('completed iken START yeni oturum başlatır', () => {
    const done = reduce(focusing(MIN), { type: 'TICK', now: T0 + 1000 + MIN });
    const again = reduce(done, { type: 'START', now: T0 + 5 * MIN, plannedMs: MIN, mode: 'flexible' });
    expect(again).toMatchObject({ phase: 'waiting', startedAt: T0 + 5 * MIN, focusedMs: 0, mode: 'flexible' });
  });
});

describe('zaman damgası doğruluğu', () => {
  it('tamamlanma anı tam: geç gelen tik fazla saymaz', () => {
    const done = reduce(focusing(MIN), { type: 'TICK', now: T0 + 1000 + MIN + 4321 });
    expect(done).toMatchObject({
      phase: 'completed',
      completed: true,
      focusedMs: MIN,
      endedAt: T0 + 1000 + MIN,
      segmentStartedAt: null,
    });
  });

  it('bölünmüş odakta bitiş anı kalan süreye göre hesaplanır', () => {
    const s = reduce(
      focusing(MIN),
      { type: 'DESK_OFF', now: T0 + 31_000 }, // 30 sn odak
      { type: 'DESK_ON', now: T0 + 33_000 }, // 2 sn bakış
      { type: 'TICK', now: T0 + 33_000 + 29_999 },
    );
    expect(s.phase).toBe('focusing');
    expect(getRemainingMs(s, T0 + 33_000 + 29_999)).toBe(1);
    const done = reduce(s, { type: 'TICK', now: T0 + 200_000 });
    expect(done).toMatchObject({ phase: 'completed', focusedMs: MIN, glanceMs: 2000, endedAt: T0 + 63_000 });
  });

  it('süre dolduktan sonra gelen DESK_OFF bakışa değil tamamlanmaya gider', () => {
    const s = reduce(focusing(MIN), { type: 'DESK_OFF', now: T0 + 1000 + MIN + 500 });
    expect(s).toMatchObject({ phase: 'completed', completed: true, pickups: 0, endedAt: T0 + 1000 + MIN });
  });

  it('saat geri giderse süreler negatif olmaz', () => {
    const s = focusing();
    expect(getFocusedMs(s, T0)).toBe(0);
    expect(getRemainingMs(s, T0)).toBe(25 * MIN);
  });
});

describe('FINISH', () => {
  it('waiting’den erken bitiş', () => {
    const s = reduce(start(), { type: 'FINISH', now: T0 + 5000 });
    expect(s).toMatchObject({ phase: 'completed', completed: false, endedAt: T0 + 5000, focusedMs: 0 });
  });

  it('focusing’den: açık segment kapanır', () => {
    const s = reduce(focusing(), { type: 'FINISH', now: T0 + 11_000 });
    expect(s).toMatchObject({ phase: 'completed', completed: false, focusedMs: 10_000, segmentStartedAt: null });
  });

  it('glancing’den: bakış kapanır', () => {
    const s = reduce(focusing(), { type: 'DESK_OFF', now: T0 + 11_000 }, { type: 'FINISH', now: T0 + 14_000 });
    expect(s).toMatchObject({ phase: 'completed', focusedMs: 10_000, glanceMs: 3000, breakMs: 0, leftDeskAt: null });
  });

  it('break’ten: mola kapanır ve sayılır', () => {
    const s = reduce(
      focusing(),
      { type: 'DESK_OFF', now: T0 + 11_000 },
      { type: 'TICK', now: T0 + 30_000 },
      { type: 'FINISH', now: T0 + 71_000 },
    );
    expect(s).toMatchObject({ phase: 'completed', breakMs: 60_000, breaks: 1, glanceMs: 0, completed: false });
  });

  it('süre zaten dolmuşsa FINISH tamamlanmış sayılır', () => {
    const s = reduce(focusing(MIN), { type: 'FINISH', now: T0 + 1000 + MIN + 10 });
    expect(s).toMatchObject({ completed: true, endedAt: T0 + 1000 + MIN });
  });
});

describe('yok sayılan olaylar', () => {
  it.each<[string, () => SessionState, SessionEvent]>([
    ['idle + DESK_ON', () => initialSessionState, { type: 'DESK_ON', now: T0 }],
    ['idle + TICK', () => initialSessionState, { type: 'TICK', now: T0 }],
    ['idle + FINISH', () => initialSessionState, { type: 'FINISH', now: T0 }],
    ['idle + RESET', () => initialSessionState, { type: 'RESET' }],
    ['waiting + DESK_OFF', () => start(), { type: 'DESK_OFF', now: T0 + 1 }],
    ['waiting + TICK', () => start(), { type: 'TICK', now: T0 + MIN }],
    ['waiting + START', () => start(), { type: 'START', now: T0 + 1, plannedMs: MIN, mode: 'flexible' }],
    ['focusing + DESK_ON', () => focusing(), { type: 'DESK_ON', now: T0 + 2000 }],
    ['focusing + TICK (süre dolmadı)', () => focusing(), { type: 'TICK', now: T0 + 2000 }],
    ['focusing + START', () => focusing(), { type: 'START', now: T0 + 2, plannedMs: MIN, mode: 'strict' }],
  ])('%s', (_name, make, event) => {
    const s = make();
    expect(sessionReducer(s, event, cfg)).toBe(s);
  });

  it('glancing + DESK_OFF ve completed + olaylar yok sayılır', () => {
    const off = reduce(focusing(), { type: 'DESK_OFF', now: T0 + 2000 });
    expect(reduce(off, { type: 'DESK_OFF', now: T0 + 3000 })).toBe(off);
    const done = reduce(focusing(), { type: 'FINISH', now: T0 + 2000 });
    for (const e of [
      { type: 'DESK_ON', now: T0 + 3000 },
      { type: 'DESK_OFF', now: T0 + 3000 },
      { type: 'TICK', now: T0 + 3000 },
      { type: 'FINISH', now: T0 + 3000 },
    ] as SessionEvent[]) {
      expect(reduce(done, e)).toBe(done);
    }
  });
});

describe('seçiciler ve özet', () => {
  it('getFocusedMs / getRemainingMs açık segmenti içerir', () => {
    const s = focusing(10 * MIN);
    expect(getFocusedMs(s, T0 + 1000 + MIN)).toBe(MIN);
    expect(getRemainingMs(s, T0 + 1000 + MIN)).toBe(9 * MIN);
    expect(getFocusedMs(s, T0 + 1000 + 20 * MIN)).toBe(10 * MIN);
    expect(getRemainingMs(s, T0 + 1000 + 20 * MIN)).toBe(0);
  });

  it('isBreakOverdue yalnızca molada ve limit aşılınca true', () => {
    const off = reduce(focusing(), { type: 'DESK_OFF', now: T0 + 2000 });
    expect(isBreakOverdue(off, T0 + 2000 + cfg.breakLimitMs, cfg)).toBe(false); // henüz glancing
    const brk = reduce(off, { type: 'TICK', now: T0 + 2000 + cfg.glanceGraceMs });
    expect(isBreakOverdue(brk, T0 + 2000 + cfg.breakLimitMs - 1, cfg)).toBe(false);
    expect(isBreakOverdue(brk, T0 + 2000 + cfg.breakLimitMs, cfg)).toBe(true);
    expect(getBreakElapsedMs(off, T0 + 9000)).toBe(0);
  });

  it('isActivePhase', () => {
    expect(['idle', 'waiting', 'focusing', 'glancing', 'break', 'completed'].map((p) => isActivePhase(p as SessionState['phase']))).toEqual([
      false,
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it('summarizeSession yalnızca completed için özet döner', () => {
    expect(summarizeSession(initialSessionState)).toBeNull();
    expect(summarizeSession(focusing())).toBeNull();

    const s = reduce(
      focusing(10 * MIN),
      { type: 'DESK_OFF', now: T0 + 1000 + 4 * MIN }, // 4 dk odak
      { type: 'DESK_ON', now: T0 + 1000 + 4 * MIN + 5000 }, // 5 sn bakış
      { type: 'DESK_OFF', now: T0 + 1000 + 6 * MIN + 5000 }, // +2 dk odak
      { type: 'TICK', now: T0 + 1000 + 6 * MIN + 15_000 },
      { type: 'DESK_ON', now: T0 + 1000 + 8 * MIN + 5000 }, // 2 dk mola
      { type: 'TICK', now: T0 + 1000 + 30 * MIN },
    );
    expect(summarizeSession(s)).toEqual({
      startedAt: T0,
      endedAt: T0 + 1000 + 12 * MIN + 5000,
      plannedMs: 10 * MIN,
      focusedMs: 10 * MIN,
      glanceMs: 5000,
      breakMs: 2 * MIN,
      pickups: 2,
      breaks: 1,
      mode: 'strict',
      completed: true,
      focusQuality: Math.round((100 * 10 * MIN) / (10 * MIN + 5000 + 2 * MIN)),
    });
  });

  it('focusQuality: payda 0 iken 100, aksi halde yuvarlanmış oran', () => {
    expect(computeFocusQuality(0, 0, 0)).toBe(100);
    expect(computeFocusQuality(3, 1, 0)).toBe(75);
    expect(computeFocusQuality(2, 0, 1)).toBe(67);
    expect(summarizeSession(reduce(start(), { type: 'FINISH', now: T0 + 1 }))?.focusQuality).toBe(100);
  });
});
