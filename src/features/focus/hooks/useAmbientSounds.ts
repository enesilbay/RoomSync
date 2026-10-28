import { useEffect, useMemo, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { logger } from '@/src/lib/logger';
import { ELITE_DEEP_FOCUS_SOUND, SOUNDS, SOUND_PACK_PRESETS } from '../constants';
import type { SoundOption } from '../types';

type Options = {
  isEliteRoom: boolean;
  equippedSoundPack: string;
  isAtDesk: boolean;
  isFocused: boolean;
};

/** Yumuşak açılış/kısılış süresi (ms). */
export const FADE_DURATION_MS = 600;
/** Fade adım aralığı (ms): 600 / 50 = 12 adım. */
export const FADE_STEP_MS = 50;

// Tek bir sesin oynatıcısı ve bizim uyguladığımız anlık ses düzeyi.
type Channel = { player: AudioPlayer; level: number; playing: boolean };

// Bir yükleme kuşağı: her paket yüklemesi kendi haritasını tutar.
type Bank = { channels: Record<string, Channel>; ready: boolean; cancelled: boolean };

// En son istenen oynatma durumu (yükleme bitince yeniden senkron için).
type Desired = { shouldPlay: boolean; volumes: Record<string, number>; isFocused: boolean };

type TimerRef = { current: ReturnType<typeof setInterval> | null };

// ── SES OTURUMU ──
// Uygulama boyunca bir kez: iOS sessiz anahtarında da çal, kayıt yok,
// arka planda çalma yok, diğer uygulamaların sesini kesmeden karış.
let audioModePromise: Promise<void> | null = null;
function ensureAudioMode(): Promise<void> {
  if (!audioModePromise) {
    audioModePromise = setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'mixWithOthers',
    }).catch((err: unknown) => {
      // Başarısızsa bir sonraki yüklemede tekrar denensin.
      audioModePromise = null;
      logger.warn('Ses modu ayarlanamadı', err);
    });
  }
  return audioModePromise;
}

// Oynatıcıları art arda oluştururken arayüze nefes aldır.
const yieldToUi = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function releaseBank(bank: Bank) {
  bank.cancelled = true;
  for (const key in bank.channels) {
    try {
      bank.channels[key].player.remove();
    } catch (err) {
      logger.debug('Ses oynatıcısı bırakılamadı', key, err);
    }
  }
  bank.channels = {};
}

// ── OYNATMA SENKRONU ──
function stopFade(timerRef: TimerRef) {
  if (timerRef.current !== null) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

// Kanalları istenen duruma getirir; fade=true ise kademeli ses rampası kullanır.
function applyPlayback(bank: Bank, desired: Desired, fade: boolean, timerRef: TimerRef) {
  stopFade(timerRef);
  const entries = Object.entries(bank.channels);
  const targets = entries.map(([key]) =>
    desired.shouldPlay ? clamp01(desired.volumes[key] || 0) : 0,
  );

  const finish = () => {
    entries.forEach(([, ch], i) => {
      ch.level = targets[i];
      ch.player.volume = targets[i];
      if (targets[i] === 0 && ch.playing) {
        ch.player.pause();
        ch.playing = false;
      }
    });
  };

  // Açılacak kanallar mevcut (genelde 0) seviyeden başlayarak çalmaya başlar.
  entries.forEach(([, ch], i) => {
    if (targets[i] > 0 && !ch.playing) {
      ch.player.volume = fade ? ch.level : targets[i];
      ch.player.play();
      ch.playing = true;
    }
  });

  if (!fade || entries.every(([, ch], i) => ch.level === targets[i])) {
    finish();
    return;
  }

  // Kademeli ses rampası; yeni bir geçiş gelirse stopFade ile iptal edilir.
  const from = entries.map(([, ch]) => ch.level);
  const steps = Math.max(1, Math.round(FADE_DURATION_MS / FADE_STEP_MS));
  let step = 0;
  timerRef.current = setInterval(() => {
    if (bank.cancelled) {
      stopFade(timerRef);
      return;
    }
    step += 1;
    if (step >= steps) {
      stopFade(timerRef);
      finish();
      return;
    }
    const t = step / steps;
    entries.forEach(([, ch], i) => {
      ch.level = from[i] + (targets[i] - from[i]) * t;
      ch.player.volume = ch.level;
    });
  }, FADE_STEP_MS);
}

// ── SES MİKSERİ (SOUND MIXER) MANTIĞI ──
// Ses paketi seçimi, expo-audio ile yükleme/çalma, kanal sesleri ve yumuşak geçişler.
export function useAmbientSounds({ isEliteRoom, equippedSoundPack, isAtDesk, isFocused }: Options) {
  const availableSounds = useMemo<SoundOption[]>(() => {
    const selectedSounds = SOUND_PACK_PRESETS[equippedSoundPack] || SOUNDS;
    return isEliteRoom && equippedSoundPack !== 'deep'
      ? [{ ...ELITE_DEEP_FOCUS_SOUND }, ...selectedSounds]
      : selectedSounds;
  }, [isEliteRoom, equippedSoundPack]);

  const [isSoundOn, setIsSoundOn] = useState(false);
  // Paket değişince varsayılan olarak ilk ses tam açık (render sırasında; effect içinde setState yok).
  const [volumes, setVolumes] = useState<Record<string, number>>(() => ({ [availableSounds[0].key]: 1 }));
  const [volumesPack, setVolumesPack] = useState(availableSounds);
  if (volumesPack !== availableSounds) {
    setVolumesPack(availableSounds);
    setVolumes({ [availableSounds[0].key]: 1 });
  }
  const [showMixer, setShowMixer] = useState(false);

  const bankRef = useRef<Bank | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const desiredRef = useRef<Desired>({ shouldPlay: false, volumes: {}, isFocused });
  const lastShouldPlayRef = useRef(false);

  // ── YÜKLEME ── Her paket kendi kuşağını (Bank) yükler; eskisi bırakılır.
  useEffect(() => {
    const bank: Bank = { channels: {}, ready: false, cancelled: false };
    bankRef.current = bank;

    async function load() {
      await ensureAudioMode();
      for (const s of availableSounds) {
        // Paket değiştiyse ya da ekran kapandıysa bu kuşak yarıda bırakılır.
        if (bank.cancelled) return;
        try {
          const player = createAudioPlayer(s.file, { updateInterval: 1000 });
          player.loop = true;
          player.volume = 0;
          bank.channels[s.key] = { player, level: 0, playing: false };
        } catch (err) {
          logger.debug('Ses yüklenemedi', s.key, err);
        }
        await yieldToUi();
      }
      if (bank.cancelled) return;
      bank.ready = true;
      // Yükleme bitti: o anki isteğe göre (yumuşak açılışla) senkronla.
      const desired = desiredRef.current;
      applyPlayback(bank, desired, desired.isFocused, fadeTimerRef);
    }
    load().catch(err => logger.warn('Sesler yüklenemedi', err));

    return () => {
      stopFade(fadeTimerRef);
      releaseBank(bank);
      if (bankRef.current === bank) bankRef.current = null;
    };
  }, [availableSounds]);

  // Masada + ses açık + ekran odakta iken çal. Durum geçişlerinde yumuşak aç/kıs.
  useEffect(() => {
    const shouldPlay = isSoundOn && isAtDesk && isFocused;
    const desired: Desired = { shouldPlay, volumes, isFocused };
    desiredRef.current = desired;

    const isTransition = shouldPlay !== lastShouldPlayRef.current;
    lastShouldPlayRef.current = shouldPlay;

    const bank = bankRef.current;
    if (!bank || !bank.ready) return;

    // Ekran odaktan çıktıysa (arka plan) zamanlayıcıya güvenme: hemen durdur.
    // Mikser sürüklemesi gibi geçiş dışı değişiklikler anında uygulanır,
    // ancak süren bir fade varsa yeni hedefe yumuşakça devam edilir.
    const fade = isFocused && (isTransition || fadeTimerRef.current !== null);
    applyPlayback(bank, desired, fade, fadeTimerRef);
  }, [isAtDesk, isSoundOn, isFocused, volumes]);

  const handleSingleSoundSelect = (key: string) => {
    const newVolumes: Record<string, number> = {};
    availableSounds.forEach(s => (newVolumes[s.key] = s.key === key ? 1 : 0));
    setVolumes(newVolumes);
    setIsSoundOn(true);
  };

  const updateMixerVolume = (key: string, val: number) => {
    setVolumes(prev => ({ ...prev, [key]: val }));
    setIsSoundOn(true);
  };

  return {
    availableSounds,
    isSoundOn,
    setIsSoundOn,
    volumes,
    setVolumes,
    showMixer,
    setShowMixer,
    handleSingleSoundSelect,
    updateMixerVolume,
  };
}
