export const Theme = {
  colors: {
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
