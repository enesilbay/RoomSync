import type { SoundOption } from './types';

// Ses dosyaları: mono AAC 64 kbps, dikişsiz döngü. Ayrıntı: assets/sounds/CREDITS.md

export const SOUNDS: SoundOption[] = [
  { key: 'library', label: 'Kütüphane', icon: 'book', file: require('../../../assets/sounds/library.m4a') },
  { key: 'rain',    label: 'Yağmur',    icon: 'cloud-rain', file: require('../../../assets/sounds/rain.m4a') },
  { key: 'forest',  label: 'Doğa',      icon: 'leaf', file: require('../../../assets/sounds/nature.m4a') },
  { key: 'fire',    label: 'Şömine',    icon: 'fire', file: require('../../../assets/sounds/fire.m4a') },
];

export const SOUND_PACK_PRESETS: Record<string, SoundOption[]> = {
  classic: SOUNDS,
  rainy: [
    { key: 'rain', label: 'Yoğun Yağmur', icon: 'cloud-rain', file: require('../../../assets/sounds/rain.m4a') },
    { key: 'library', label: 'Sessiz Kütüphane', icon: 'book', file: require('../../../assets/sounds/library.m4a') },
  ],
  forest: [
    { key: 'forest', label: 'Orman', icon: 'leaf', file: require('../../../assets/sounds/nature.m4a') },
    { key: 'rain', label: 'Hafif Yağmur', icon: 'cloud-rain', file: require('../../../assets/sounds/rain.m4a') },
  ],
  fireplace: [
    { key: 'fire', label: 'Şömine', icon: 'fire', file: require('../../../assets/sounds/fire.m4a') },
    { key: 'library', label: 'Sıcak Oda', icon: 'book', file: require('../../../assets/sounds/library.m4a') },
  ],
  deep: [
    { key: 'deep_focus', label: 'Derin Odak', icon: 'brain', file: require('../../../assets/sounds/deep-focus.m4a') },
    { key: 'forest', label: 'Düşük Doğa', icon: 'leaf', file: require('../../../assets/sounds/nature.m4a') },
  ],
};

// Elite odalarda ('deep' paketi seçili değilse) listenin başına eklenen ses.
export const ELITE_DEEP_FOCUS_SOUND: SoundOption = {
  key: 'deep_focus', label: 'Derin Odak', icon: 'brain', file: require('../../../assets/sounds/deep-focus.m4a'),
};

export const SOUND_PACK_LABELS: Record<string, string> = {
  classic: 'Klasik Lounge',
  rainy: 'Yağmur Modu',
  forest: 'Orman Odası',
  fireplace: 'Şömine Köşesi',
  deep: 'Derin Odak',
};

/** Odak süresi seçenekleri (dk). */
export const FOCUS_DURATIONS = [15, 25, 45, 60] as const;
export const DEFAULT_FOCUS_MINUTES = 25;

/** Bu süre ve üstündeki oturumlarda şarj önerisi gösterilir (dk). */
export const LONG_SESSION_MINUTES = 60;
