// Saf "telefon masada mı" algılayıcısı: React/RN bağımlılığı yok, yalnızca örnek zaman damgalarıyla çalışır.
import type { DeskDetectorConfig, DeskReading, MotionSample, Orientation } from './types';

export type SensorPlatform = 'ios' | 'android' | 'web';

/*
 * İşaret kuralı (z ekseni)
 * ------------------------
 * Bu modülün normalize kuralı: yüzü yukarı düz duran telefon ⇒ z ≈ -1 g, yüzüstü ⇒ z ≈ +1 g
 * (CoreMotion kuralı; iOS ham verisi zaten böyle).
 *
 * Kanıt (node_modules/expo-sensors, v15):
 * - iOS  ios/AccelerometerModule.swift:34-36 → CMAccelerometerData.acceleration olduğu gibi, g cinsinden
 *   gönderiliyor. Apple kuralı: yüzü yukarı masadaki cihazda z = -1.0.
 * - Android android/.../modules/AccelerometerModule.kt:18-20 → Sensor.TYPE_ACCELEROMETER değeri
 *   SensorManager.GRAVITY_EARTH'e (9.80665) bölünüyor, yani g cinsinden ama işaret değişmiyor.
 *   Android kuralı (tepki kuvveti): yüzü yukarı masadaki cihazda z = +9.81 → +1 g. Yani iOS'un tersi.
 * - Expo da bunu biliyor: DeviceMotion'da Android android/.../DeviceMotionModule.kt:228-230
 *   `values - 2 * gravity` ile vektörü tersine çevirip iOS'un ios/DeviceMotionModule.swift:96-98
 *   kuralına eşitliyor. Accelerometer modülünde bu düzeltme yapılmıyor.
 * - Web src/ExponentAccelerometer.web.ts:24-29 ivme değil, deviceorientation açılarını (radyan)
 *   gönderiyor; web verisi yerçekimi olarak yorumlanamaz, bu yüzden web'de simülasyon kullanılır.
 *
 * Eski useDeskDetection `z < -eşik` durumunu "yüzüstü" sayıyordu: Android'de doğru, iOS'ta ters.
 * Cihazda doğrulama sonrası ters çıkarsa yalnızca aşağıdaki sabiti değiştirmek yeterli.
 */
export const ANDROID_AXIS_SIGN = -1;

/** Örnekleme aralığı (ms). 10 Hz düz/eğik ayrımı ve titreşim ölçümü için yeterli, pil dostu. */
export const SAMPLE_INTERVAL_MS = 100;

/**
 * Varsayılanlar (10 Hz örneklemeye göre):
 * - smoothing 0.25: zaman sabiti ≈ 100ms / 0.25 ≈ 0.4 sn; gürültüyü bastırır, kaldırmayı geciktirmez.
 * - flatEnterZ 0.9 (~25° eğim), flatExitZ 0.8 (~37°): aradaki bant sınırdaki titreşimin
 *   masada/değil arasında gidip gelmesini önler. flatAxisMax 0.3 (~17°) yan eksen sınırı.
 * - settleMs 2000: telefon yerleştirilirken yaşanan sarsıntı bitsin, kazara düz tutuş sayılmasın.
 * - leaveMs 500: kaldırma hızlı fark edilsin ama tek gürültülü örnek düşürmesin.
 * - stillness 1500ms / 0.04 g: masadaki telefonun |a| sapması ~0.005–0.01 g; elde düz tutulan
 *   telefonun el titremesi bunun birkaç katı. Çıkış eşiği 0.1 g: masaya hafif vuruş molaya
 *   düşürmez, ama kaldırma hareketi (0.2 g üstü) kesin düşürür.
 */
export const DEFAULT_DETECTOR_CONFIG: DeskDetectorConfig = {
  mode: 'flexible',
  smoothing: 0.25,
  flatEnterZ: 0.9,
  flatExitZ: 0.8,
  flatAxisMax: 0.3,
  settleMs: 2000,
  leaveMs: 500,
  stillnessWindowMs: 1500,
  stillnessMaxStdDev: 0.04,
  stillnessExitStdDev: 0.1,
};

export const IDLE_READING: DeskReading = { onDesk: false, orientation: 'tilted', still: false };

/** Ham örneği ortak kurala çevirir: yüzü yukarı ⇒ z ≈ -1. Web verisi ivme olmadığından olduğu gibi döner. */
export function normalizeSample(sample: MotionSample, platform: SensorPlatform): MotionSample {
  if (platform !== 'android') return sample;
  return {
    x: sample.x * ANDROID_AXIS_SIGN,
    y: sample.y * ANDROID_AXIS_SIGN,
    z: sample.z * ANDROID_AXIS_SIGN,
    t: sample.t,
  };
}

export type DeskDetector = {
  push(sample: MotionSample): DeskReading;
  reset(): void;
};

type Vec = { x: number; y: number; z: number };
type MagSample = { t: number; m: number };

// Sabitlik penceresinin en az yarısı dolmadan ve en az bu kadar örnek gelmeden "sabit" denmez.
const MIN_STILL_SAMPLES = 3;

function stdDev(values: MagSample[]): number {
  const mean = values.reduce((sum, v) => sum + v.m, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v.m - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function createDeskDetector(config: DeskDetectorConfig): DeskDetector {
  const exitStdDev = config.stillnessExitStdDev ?? config.stillnessMaxStdDev;

  let filtered: Vec | null = null;
  let mags: MagSample[] = [];
  let lastT: number | null = null;
  let flat = false;
  let onDesk = false;
  let qualifiedSince: number | null = null;
  let failingSince: number | null = null;
  let reading: DeskReading = IDLE_READING;

  const reset = () => {
    filtered = null;
    mags = [];
    lastT = null;
    flat = false;
    onDesk = false;
    qualifiedSince = null;
    failingSince = null;
    reading = IDLE_READING;
  };

  const push = (sample: MotionSample): DeskReading => {
    // Zaman geri giderse (abonelik yeniden başladı vb.) geçmişe güvenme.
    if (lastT !== null && sample.t < lastT) reset();
    lastT = sample.t;
    const { t } = sample;

    // Low-pass filtre: yön kararı yumuşatılmış yerçekimi vektöründen verilir.
    const a = config.smoothing;
    filtered = filtered
      ? {
          x: filtered.x + a * (sample.x - filtered.x),
          y: filtered.y + a * (sample.y - filtered.y),
          z: filtered.z + a * (sample.z - filtered.z),
        }
      : { x: sample.x, y: sample.y, z: sample.z };

    // Sabitlik ham |a| üzerinden ölçülür; filtre titremeyi gizlerdi.
    mags.push({ t, m: Math.hypot(sample.x, sample.y, sample.z) });
    const windowStart = t - config.stillnessWindowMs;
    while (mags.length > 0 && mags[0].t < windowStart) mags.shift();
    const covered = t - mags[0].t >= config.stillnessWindowMs / 2 && mags.length >= MIN_STILL_SAMPLES;
    const still = covered && stdDev(mags) <= (onDesk ? exitStdDev : config.stillnessMaxStdDev);

    // Düzlük, histerezisli: girmek için flatEnterZ, kalmak için flatExitZ yeterli.
    const zMin = flat ? config.flatExitZ : config.flatEnterZ;
    flat =
      Math.abs(filtered.z) >= zMin &&
      Math.abs(filtered.x) <= config.flatAxisMax &&
      Math.abs(filtered.y) <= config.flatAxisMax;
    const orientation: Orientation = !flat ? 'tilted' : filtered.z < 0 ? 'faceUp' : 'faceDown';

    const orientationOk = config.mode === 'strict' ? orientation === 'faceDown' : orientation !== 'tilted';
    const qualifies = orientationOk && still;

    // Kesintisiz süre kuralları: settleMs boyunca uygunsa masada, leaveMs boyunca değilse kalktı.
    if (qualifies) {
      failingSince = null;
      qualifiedSince ??= t;
      if (!onDesk && t - qualifiedSince >= config.settleMs) onDesk = true;
    } else {
      qualifiedSince = null;
      if (onDesk) {
        failingSince ??= t;
        if (t - failingSince >= config.leaveMs) {
          onDesk = false;
          failingSince = null;
        }
      }
    }

    // Değişmeyen okumada aynı nesne döner; çağıran referans karşılaştırmasıyla yetinebilir.
    if (reading.onDesk !== onDesk || reading.orientation !== orientation || reading.still !== still) {
      reading = { onDesk, orientation, still };
    }
    return reading;
  };

  return { push, reset };
}
