import {
  ANDROID_AXIS_SIGN,
  createDeskDetector,
  DEFAULT_DETECTOR_CONFIG,
  normalizeSample,
  SAMPLE_INTERVAL_MS,
} from '../deskDetector';
import type { DeskDetectorConfig, DeskReading, MotionSample } from '../types';

type Vec = { x: number; y: number; z: number };

// Normalize kural: yüzü yukarı z = -1, yüzüstü z = +1.
const FACE_UP: Vec = { x: 0, y: 0, z: -1 };
const FACE_DOWN: Vec = { x: 0, y: 0, z: 1 };
const UPRIGHT: Vec = { x: 0, y: -1, z: 0 };

const DT = SAMPLE_INTERVAL_MS;

function makeRunner(config: Partial<DeskDetectorConfig> = {}) {
  const detector = createDeskDetector({ ...DEFAULT_DETECTOR_CONFIG, ...config });
  let t = 0;
  let last: DeskReading = { onDesk: false, orientation: 'tilted', still: false };
  /** durationMs boyunca DT aralıkla örnek basar; jitter(i) ile |a| gürültüsü eklenebilir. */
  const feed = (v: Vec, durationMs: number, jitter: (i: number) => number = () => 0) => {
    const steps = Math.round(durationMs / DT);
    for (let i = 0; i < steps; i++) {
      t += DT;
      const k = 1 + jitter(i);
      last = detector.push({ x: v.x * k, y: v.y * k, z: v.z * k, t });
    }
    return last;
  };
  return { detector, feed, now: () => t };
}

/** Durumun ilk kez gerçekleştiği zamanı bulur (ms). */
function timeUntil(run: ReturnType<typeof makeRunner>, v: Vec, pred: (r: DeskReading) => boolean, maxMs = 10_000) {
  const start = run.now();
  while (run.now() - start < maxMs) {
    if (pred(run.feed(v, DT))) return run.now() - start;
  }
  return Infinity;
}

describe('normalizeSample', () => {
  const s: MotionSample = { x: 0.1, y: -0.2, z: 0.98, t: 5 };

  it('iOS verisini olduğu gibi bırakır (CoreMotion: yüzü yukarı z = -1)', () => {
    expect(normalizeSample(s, 'ios')).toEqual(s);
  });

  it('Android verisini tersine çevirir (yüzü yukarı ham z = +1 → -1)', () => {
    expect(ANDROID_AXIS_SIGN).toBe(-1);
    expect(normalizeSample(s, 'android')).toEqual({ x: -0.1, y: 0.2, z: -0.98, t: 5 });
  });

  it('web verisine dokunmaz', () => {
    expect(normalizeSample(s, 'web')).toEqual(s);
  });
});

describe('createDeskDetector', () => {
  it('yalnızca settleMs + sabitlik penceresi dolduktan sonra masada sayar', () => {
    const run = makeRunner();
    // Sabitlik için pencerenin yarısı dolmalı, ardından settleMs kesintisiz uygunluk.
    expect(run.feed(FACE_UP, 1500).onDesk).toBe(false);
    const total = 1500 + timeUntil(run, FACE_UP, (r) => r.onDesk);
    expect(total).toBeGreaterThanOrEqual(DEFAULT_DETECTOR_CONFIG.settleMs);
    expect(total).toBeLessThanOrEqual(DEFAULT_DETECTOR_CONFIG.settleMs + DEFAULT_DETECTOR_CONFIG.stillnessWindowMs);
    expect(run.feed(FACE_UP, DT)).toEqual({ onDesk: true, orientation: 'faceUp', still: true });
  });

  it('settleMs dolmadan bozulan yerleştirme sayacı sıfırlar', () => {
    const run = makeRunner();
    run.feed(FACE_UP, 1900);
    run.feed(UPRIGHT, 1000);
    // Tekrar düz: yeniden en az settleMs gerekir.
    expect(timeUntil(run, FACE_UP, (r) => r.onDesk)).toBeGreaterThanOrEqual(DEFAULT_DETECTOR_CONFIG.settleMs);
  });

  it('leaveMs’ten kısa eğilme masadan düşürmez, uzun eğilme düşürür', () => {
    const run = makeRunner({ smoothing: 1 });
    run.feed(FACE_UP, 5000);
    expect(run.feed(FACE_UP, DT).onDesk).toBe(true);

    expect(run.feed(UPRIGHT, 300).onDesk).toBe(true);
    expect(run.feed(FACE_UP, DT).onDesk).toBe(true);

    expect(timeUntil(run, UPRIGHT, (r) => !r.onDesk)).toBeGreaterThanOrEqual(DEFAULT_DETECTOR_CONFIG.leaveMs);
  });

  it('histerezis: |z| giriş eşiğinin altında masaya girmez, ama çıkış bandında masada kalır', () => {
    // 0.85: flatExitZ (0.8) ile flatEnterZ (0.9) arası; x ile |a| ≈ 1 tutulur ama x < flatAxisMax.
    const band: Vec = { x: 0.25, y: 0, z: -0.85 };
    const below: Vec = { x: 0.25, y: 0, z: -0.75 };

    const fresh = makeRunner({ smoothing: 1 });
    expect(fresh.feed(band, 6000)).toMatchObject({ onDesk: false, orientation: 'tilted' });

    const run = makeRunner({ smoothing: 1 });
    run.feed(FACE_UP, 5000);
    expect(run.feed(band, 6000)).toMatchObject({ onDesk: true, orientation: 'faceUp' });
    expect(run.feed(below, 1000)).toMatchObject({ onDesk: false, orientation: 'tilted' });
  });

  it('yan eksen flatAxisMax’i aşınca düz sayılmaz', () => {
    const run = makeRunner({ smoothing: 1 });
    expect(run.feed({ x: 0.35, y: 0, z: -0.94 }, 6000)).toMatchObject({ onDesk: false, orientation: 'tilted' });
  });

  it('elde düz tutulan (titreyen) telefon sabit değildir, masada sayılmaz', () => {
    const run = makeRunner();
    // ±0.08 g |a| titremesi → std ≈ 0.08 > 0.04.
    const r = run.feed(FACE_UP, 8000, (i) => (i % 2 === 0 ? 0.08 : -0.08));
    expect(r.orientation).toBe('faceUp');
    expect(r.still).toBe(false);
    expect(r.onDesk).toBe(false);
  });

  it('masadaki küçük sensör gürültüsü sabitliği bozmaz', () => {
    const run = makeRunner();
    const r = run.feed(FACE_UP, 5000, (i) => (i % 2 === 0 ? 0.01 : -0.01));
    expect(r).toEqual({ onDesk: true, orientation: 'faceUp', still: true });
  });

  it('masadayken tek bir vuruş masadan düşürmez (sabitlik çıkış eşiği)', () => {
    const run = makeRunner();
    run.feed(FACE_UP, 5000);
    const r = run.feed(FACE_UP, 1500, (i) => (i === 0 ? 0.2 : 0));
    expect(r.onDesk).toBe(true);
  });

  it('kaldırma hareketi (büyük |a| oynaması) düz kalsa bile masadan düşürür', () => {
    const run = makeRunner();
    run.feed(FACE_UP, 5000);
    const r = run.feed(FACE_UP, 1500, (i) => (i % 2 === 0 ? 0.3 : -0.3));
    expect(r.onDesk).toBe(false);
  });

  describe('modlar', () => {
    it('strict: yalnızca yüzüstü sayılır', () => {
      expect(makeRunner({ mode: 'strict' }).feed(FACE_UP, 6000)).toMatchObject({
        onDesk: false,
        orientation: 'faceUp',
      });
      expect(makeRunner({ mode: 'strict' }).feed(FACE_DOWN, 6000)).toMatchObject({
        onDesk: true,
        orientation: 'faceDown',
      });
    });

    it('flexible: yüzü yukarı ve yüzüstü ikisi de sayılır', () => {
      expect(makeRunner({ mode: 'flexible' }).feed(FACE_UP, 6000).onDesk).toBe(true);
      expect(makeRunner({ mode: 'flexible' }).feed(FACE_DOWN, 6000).onDesk).toBe(true);
    });

    it('dik tutulan telefon hiçbir modda sayılmaz', () => {
      expect(makeRunner({ mode: 'flexible' }).feed(UPRIGHT, 6000)).toMatchObject({
        onDesk: false,
        orientation: 'tilted',
      });
    });
  });

  it('low-pass filtre tek bir sıçramayla yönü değiştirmez', () => {
    const run = makeRunner();
    run.feed(FACE_UP, 5000);
    // Ham örnek tek başına eğik (x = 0.8) ama filtreli vektör düz kalır.
    expect(run.feed({ x: 0.8, y: 0, z: -0.6 }, DT).orientation).toBe('faceUp');
    const raw = makeRunner({ smoothing: 1 });
    raw.feed(FACE_UP, 5000);
    expect(raw.feed({ x: 0.8, y: 0, z: -0.6 }, DT).orientation).toBe('tilted');
  });

  it('reset tüm durumu siler', () => {
    const run = makeRunner();
    run.feed(FACE_UP, 5000);
    run.detector.reset();
    expect(run.feed(FACE_UP, DT)).toEqual({ onDesk: false, orientation: 'faceUp', still: false });
  });

  it('zaman geri giderse durumu sıfırlar', () => {
    const detector = createDeskDetector(DEFAULT_DETECTOR_CONFIG);
    let r: DeskReading | undefined;
    for (let t = 100_000; t <= 106_000; t += DT) r = detector.push({ ...FACE_UP, t });
    expect(r?.onDesk).toBe(true);
    expect(detector.push({ ...FACE_UP, t: 50 }).onDesk).toBe(false);
  });

  it('okuma değişmedikçe aynı nesneyi döndürür', () => {
    const run = makeRunner();
    run.feed(FACE_UP, 5000);
    const a = run.feed(FACE_UP, DT);
    expect(run.feed(FACE_UP, DT)).toBe(a);
  });
});
