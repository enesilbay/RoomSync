// Odak motorunun ortak sözleşmesi: algılayıcı, oturum durum makinesi ve UI bu tipler üzerinden konuşur.

/** Sıkı mod: yalnızca ekranı aşağı bakan telefon masada sayılır. Esnek mod: düz duran her telefon sayılır. */
export type FocusMode = 'strict' | 'flexible';

/** Platformdan bağımsız yön: yerçekimi ekranın arkasına doğruysa faceUp, ekranın önüne doğruysa faceDown. */
export type Orientation = 'faceUp' | 'faceDown' | 'tilted';

/** g cinsinden ivmeölçer örneği; t ms cinsinden zaman damgası. */
export type MotionSample = {
  x: number;
  y: number;
  z: number;
  t: number;
};

export type DeskReading = {
  /** Kararlılık ve histerezis uygulandıktan sonra telefon masada mı (mod kurallarına göre). */
  onDesk: boolean;
  orientation: Orientation;
  /** Son pencerede ivme büyüklüğü sabit mi (elde tutulan telefonu eler). */
  still: boolean;
};

export type DeskDetectorConfig = {
  mode: FocusMode;
  /** Low-pass filtre katsayısı (0–1); büyük değer yeni örneğe daha çok güvenir. */
  smoothing: number;
  /** Masaya girme eşiği: |z| bu değerin üstünde ve |x|,|y| flatAxisMax altında olmalı. */
  flatEnterZ: number;
  /** Masadan çıkma eşiği (histerezis için flatEnterZ'den küçük). */
  flatExitZ: number;
  flatAxisMax: number;
  /** Masada sayılmak için kesintisiz düz ve sabit kalma süresi. */
  settleMs: number;
  /** Masadan kalktı sayılmak için kesintisiz "düz değil" kalma süresi (titreşim/gürültü filtresi). */
  leaveMs: number;
  /** Sabitlik penceresi ve izin verilen ivme büyüklüğü standart sapması (g). */
  stillnessWindowMs: number;
  stillnessMaxStdDev: number;
  /**
   * Masadayken sabitliği kaybetme eşiği (g). Verilmezse stillnessMaxStdDev kullanılır.
   * Masaya hafif vuruş gibi kısa sarsıntılar molaya düşürmesin diye girişten büyük tutulur.
   */
  stillnessExitStdDev?: number;
};

/** idle → waiting → focusing ⇄ glancing → break → … → completed */
export type SessionPhase = 'idle' | 'waiting' | 'focusing' | 'glancing' | 'break' | 'completed';

export type SessionState = {
  phase: SessionPhase;
  mode: FocusMode;
  plannedMs: number;
  startedAt: number | null;
  endedAt: number | null;
  /** Tamamlanan odak segmentlerinin toplamı (devam eden segment hariç). */
  focusedMs: number;
  /** Devam eden odak segmentinin başlangıcı (phase === 'focusing' iken dolu). */
  segmentStartedAt: number | null;
  /** Telefonun masadan kalktığı an (glancing/break iken dolu). */
  leftDeskAt: number | null;
  /** Mola sayılmayan kısa kaldırmaların toplamı. */
  glanceMs: number;
  breakMs: number;
  /** Odak sırasında telefonun kaç kez kaldırıldığı (kısa bakışlar dahil). */
  pickups: number;
  breaks: number;
  /** Süre dolduysa true; kullanıcı erken bitirdiyse false. */
  completed: boolean;
};

export type SessionConfig = {
  /** Bu süreden kısa kaldırmalar mola sayılmaz (sayaç bu sürede durur ama mola başlamaz). */
  glanceGraceMs: number;
  /** Mola bu süreyi aşınca UI/bildirim katmanı uyarır. */
  breakLimitMs: number;
};

export type SessionEvent =
  | { type: 'START'; now: number; plannedMs: number; mode: FocusMode }
  | { type: 'DESK_ON'; now: number }
  | { type: 'DESK_OFF'; now: number }
  | { type: 'TICK'; now: number }
  | { type: 'FINISH'; now: number }
  | { type: 'RESET' };

/** Biten bir oturumun özeti; yerel geçmişe kaydedilir ve özet kartında gösterilir. */
export type SessionSummary = {
  startedAt: number;
  endedAt: number;
  plannedMs: number;
  focusedMs: number;
  glanceMs: number;
  breakMs: number;
  pickups: number;
  breaks: number;
  mode: FocusMode;
  completed: boolean;
  /** 0–100: odak süresinin, odak + kısa bakış + mola toplamına oranı. */
  focusQuality: number;
};
