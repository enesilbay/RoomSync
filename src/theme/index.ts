/**
 * RoomSync tasarım token'ları.
 *
 * Kural: `src/theme/` dışında ham renk değeri (hex / rgba) yazılmaz; tüm
 * renkler buradaki token'lardan okunur (ESLint `no-restricted-syntax` kuralı).
 */
export const Theme = {
  colors: {
    // --- Temel palet ---
    primary: '#1A237E', // Deep Indigo
    secondary: '#303F9F', // Indigo Hover
    softIndigo: '#E8EAF6',
    accent: '#FFC107', // Amber
    lightAmber: '#FFF8E1',
    success: '#2E7D32',
    softSuccess: '#E8F5E9',
    info: '#0288D1',
    softInfo: '#E1F5FE',
    danger: '#D32F2F',
    softDanger: '#FFEBEE',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    screenOff: '#000000',
    border: '#E5E7EB',
    textDark: '#1F2937',
    textMuted: '#6B7280',

    // --- Genel yardımcı tonlar ---
    /** Dolgulu/renkli zemin üzerindeki beyaz metin ve ikonlar. */
    onColor: '#FFFFFF',
    /** Gölge rengi (shadowColor). */
    shadow: '#000000',
    /** Modal arka plan karartması. */
    overlay: 'rgba(0, 0, 0, 0.4)',
    /** Koyu lacivert modal karartması (sheet / alert). */
    overlayDark: 'rgba(15, 23, 42, 0.65)',
    /** Koyu lacivert modal karartması, biraz daha hafif (DarkSheetModal). */
    overlayDarkSoft: 'rgba(15, 23, 42, 0.62)',
    /** Switch kapalıyken topuz rengi. */
    switchThumbOff: '#94A3B8',

    // --- Elit (premium) lobi kartı ---
    elite: {
      border: '#F3D57A',
      background: '#FFFCF2',
    },

    // --- "Ben" sekmesi profil kartı (gradyan üzerindeki öğeler) ---
    profileCard: {
      gradientEnd: '#3949AB',
      glass: 'rgba(255, 255, 255, 0.2)',
      glassSoft: 'rgba(255, 255, 255, 0.15)',
      textSoft: 'rgba(255, 255, 255, 0.8)',
      textMuted: 'rgba(255, 255, 255, 0.7)',
      streakFire: '#FF6B6B',
    },

    // --- "Ben" sekmesi hızlı işlem kutuları ---
    quickAction: {
      messagesFg: '#4F46E5',
      messagesBg: '#EEF2FF',
      shopFg: '#D97706',
      shopBg: '#FEF3C7',
      analyticsFg: '#059669',
      analyticsBg: '#D1FAE5',
      leaderboardFg: '#7C3AED',
      leaderboardBg: '#EDE9FE',
    },

    // --- Arkadaşlık isteği kabul / ret ikonları ---
    friendRequest: {
      accept: '#059669',
      reject: '#DC2626',
    },

    // --- Profil ekranı çıkış butonu ---
    logout: {
      foreground: '#E53935',
      border: '#FFCDD2',
      background: '#FFF5F5',
    },

    // --- Liderlik tablosu madalyaları (2. ve 3. sıra) ---
    medal: {
      silver: '#94A3B8',
      bronze: '#B45309',
    },

    // --- Üçüncü taraf marka renkleri ---
    brand: {
      stripe: '#635BFF',
    },

    // --- Profil çerçevesi renkleri (diğer çerçeveler temel paleti kullanır) ---
    frame: {
      cosmic: '#7C3AED',
    },

    // --- Mağaza: sohbet balonu renkleri ---
    // DİKKAT: Bu değerler backend'de ürün kimliği (id) olarak saklanır ve
    // karşılaştırılır; string değerleri DEĞİŞTİRİLMEMELİDİR.
    shopBubble: {
      roomsyncBlue: '#4F46E5',
      emerald: '#059669',
      ruby: '#E11D48',
      amber: '#D97706',
      amethyst: '#7C3AED',
    },

    // --- Rütbe renkleri (src/lib/rank.ts) ---
    rank: {
      bronze: '#cd7f32', // Çaylak
      silver: '#C0C0C0', // Odaklı
      gold: '#FFD700', // Akademisyen
      emerald: '#2ecc71', // Usta
      amethyst: '#9b59b6', // Efsane
    },

    // --- Analitik grafikleri (opaklığa göre rgba üretir) ---
    chart: {
      /** Çizgi rengi: primary (#1A237E). */
      line: (opacity: number) => `rgba(26, 35, 126, ${opacity})`,
      /** Eksen etiketleri: textMuted (#6B7280). */
      label: (opacity: number) => `rgba(107, 114, 128, ${opacity})`,
      /** Saat yoğunluk haritası: accent (#FFC107). */
      heat: (opacity: number) => `rgba(255, 193, 7, ${opacity})`,
    },

    // --- Android bildirim kanalı LED rengi ---
    notification: {
      lightColor: '#FF231F7C',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 999,
  },
  shadows: {
    soft: {
      shadowColor: '#1F2937',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    medium: {
      shadowColor: '#1A237E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 15,
      elevation: 4,
    }
  },
  typography: {
    h1: { fontSize: 28, fontWeight: '900' as const, color: '#1F2937' },
    h2: { fontSize: 24, fontWeight: '800' as const, color: '#1F2937' },
    h3: { fontSize: 18, fontWeight: '700' as const, color: '#1F2937' },
    body: { fontSize: 14, fontWeight: '500' as const, color: '#1F2937' },
    caption: { fontSize: 12, fontWeight: '400' as const, color: '#6B7280' },
  }
};

/** Uygulama genelindeki renk paleti (kısa ad). */
export const C = Theme.colors;
