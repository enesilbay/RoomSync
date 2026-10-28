import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { logger } from '@/src/lib/logger';
import { ELITE_DEEP_FOCUS_SOUND, SOUNDS, SOUND_PACK_PRESETS } from '../constants';

type Options = {
  isEliteRoom: boolean;
  equippedSoundPack: string;
  isAtDesk: boolean;
  isFocused: boolean;
};

// ── SES MİKSERİ (SOUND MIXER) MANTIĞI ──
// Ses paketi seçimi, expo-av ile yükleme/çalma ve kanal sesleri.
export function useAmbientSounds({ isEliteRoom, equippedSoundPack, isAtDesk, isFocused }: Options) {
  const [availableSounds, setAvailableSounds] = useState(SOUNDS);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [showMixer, setShowMixer] = useState(false);
  const soundsMapRef = useRef<Record<string, Audio.Sound>>({});

  useEffect(() => {
    const selectedSounds = SOUND_PACK_PRESETS[equippedSoundPack] || SOUNDS;
    const finalSounds = isEliteRoom && equippedSoundPack !== 'deep'
      ? [{ ...ELITE_DEEP_FOCUS_SOUND }, ...selectedSounds]
      : selectedSounds;

    setAvailableSounds(finalSounds);
    setVolumes({ [finalSounds[0].key]: 1 });
  }, [isEliteRoom, equippedSoundPack]);

  useEffect(() => {
    let isMounted = true;

    async function initSounds() {
      // Önceki sesleri temizle
      for (const key in soundsMapRef.current) {
         soundsMapRef.current[key].unloadAsync().catch(()=>{});
      }
      soundsMapRef.current = {};

      // Yeni sesleri yükle (başlangıçta sessiz ve durdurulmuş şekilde)
      for (const s of availableSounds) {
        if (!isMounted) break;
        try {
          const { sound } = await Audio.Sound.createAsync(s.file, { isLooping: true, volume: 0 });
          soundsMapRef.current[s.key] = sound;
        } catch {
          logger.debug("Ses yüklenemedi", s.key);
        }
      }
    }
    initSounds();

    return () => {
      isMounted = false;
      for (const key in soundsMapRef.current) {
        soundsMapRef.current[key].unloadAsync().catch(()=>{});
      }
    };
  }, [availableSounds]);

  useEffect(() => {
    async function syncPlayback() {
      const shouldPlay = isSoundOn && isAtDesk && isFocused;

      for (const key in soundsMapRef.current) {
        const sound = soundsMapRef.current[key];
        const vol = volumes[key] || 0;

        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            await sound.setVolumeAsync(vol);
            if (shouldPlay && vol > 0) {
              if (!status.isPlaying) await sound.playAsync();
            } else {
              if (status.isPlaying) await sound.pauseAsync();
            }
          }
        } catch {}
      }
    }
    syncPlayback();
  }, [isAtDesk, isSoundOn, isFocused, volumes]);

  const handleSingleSoundSelect = (key: string) => {
    const newVolumes: Record<string, number> = {};
    availableSounds.forEach(s => newVolumes[s.key] = s.key === key ? 1 : 0);
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
