import type { SoundOption } from './types';

export const SOUNDS: SoundOption[] = [
  { key: 'library', label: 'Kütüphane', icon: 'book', file: require('../../../assets/sounds/library.mp3') },
  { key: 'rain',    label: 'Yağmur',    icon: 'cloud-rain', file: require('../../../assets/sounds/rain.mp3') },
  { key: 'forest',  label: 'Doğa',      icon: 'leaf', file: require('../../../assets/sounds/nature.mp3') },
  { key: 'fire',    label: 'Şömine',    icon: 'fire', file: require('../../../assets/sounds/fire.mp3') },
];

export const SOUND_PACK_PRESETS: Record<string, SoundOption[]> = {
  classic: SOUNDS,
  rainy: [
    { key: 'rain', label: 'Yoğun Yağmur', icon: 'cloud-rain', file: require('../../../assets/sounds/rain.mp3') },
    { key: 'library', label: 'Sessiz Kütüphane', icon: 'book', file: require('../../../assets/sounds/library.mp3') },
  ],
  forest: [
    { key: 'forest', label: 'Orman', icon: 'leaf', file: require('../../../assets/sounds/nature.mp3') },
    { key: 'rain', label: 'Hafif Yağmur', icon: 'cloud-rain', file: require('../../../assets/sounds/rain.mp3') },
  ],
  fireplace: [
    { key: 'fire', label: 'Şömine', icon: 'fire', file: require('../../../assets/sounds/fire.mp3') },
    { key: 'library', label: 'Sıcak Oda', icon: 'book', file: require('../../../assets/sounds/library.mp3') },
  ],
  deep: [
    { key: 'deep_focus', label: 'Derin Odak', icon: 'brain', file: require('../../../assets/sounds/library.mp3') },
    { key: 'forest', label: 'Düşük Doğa', icon: 'leaf', file: require('../../../assets/sounds/nature.mp3') },
  ],
};

// Elite odalarda ('deep' paketi seçili değilse) listenin başına eklenen ses.
export const ELITE_DEEP_FOCUS_SOUND: SoundOption = {
  key: 'deep_focus', label: 'Derin Odak', icon: 'brain', file: require('../../../assets/sounds/library.mp3'),
};

export const SOUND_PACK_LABELS: Record<string, string> = {
  classic: 'Klasik Lounge',
  rainy: 'Yağmur Modu',
  forest: 'Orman Odası',
  fireplace: 'Şömine Köşesi',
  deep: 'Derin Odak',
};

export const POMODORO_OPTIONS = [
  { label: '15 dk', minutes: 15 }, { label: '25 dk', minutes: 25 },
  { label: '45 dk', minutes: 45 }, { label: '60 dk', minutes: 60 },
];

export const FLAT_Z_THRESHOLD = 0.8;
export const FLAT_AXIS_THRESHOLD = 0.3;
