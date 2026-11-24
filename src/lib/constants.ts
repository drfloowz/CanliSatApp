import { Ionicons } from '@expo/vector-icons';

export const COLORS = {
  bg: '#0E0E0E',
  card: '#1A1A1A',
  cardAlt: '#222222',
  border: '#2A2A2A',
  primary: '#FF6B00',
  text: '#FFFFFF',
  muted: '#9CA3AF',
  live: '#EF4444',
  success: '#22C55E',
};

export type Category = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap };

export const CATEGORIES: Category[] = [
  { key: 'saat', label: 'Saat', icon: 'watch-outline' },
  { key: 'taki', label: 'Takı', icon: 'diamond-outline' },
  { key: 'bijuteri', label: 'Bijuteri', icon: 'sparkles-outline' },
  { key: 'giyim', label: 'Giyim', icon: 'shirt-outline' },
  { key: 'ayakkabi', label: 'Ayakkabı', icon: 'footsteps-outline' },
  { key: 'canta', label: 'Çanta', icon: 'bag-handle-outline' },
  { key: 'aksesuar', label: 'Aksesuar', icon: 'glasses-outline' },
  { key: 'vintage', label: 'Vintage', icon: 'time-outline' },
];

export const categoryLabel = (key?: string | null) =>
  CATEGORIES.find((c) => c.key === key)?.label ?? key ?? '';

export const CONDITIONS = [
  { key: 'new', label: 'Sıfır' },
  { key: 'like_new', label: 'Sıfır ayarında' },
  { key: 'good', label: 'İyi' },
  { key: 'fair', label: 'Kullanılmış' },
];

export const AUCTION_DURATIONS = [15, 30, 45, 60];

export const CARRIERS = ['Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'PTT Kargo', 'Sürat Kargo', 'Trendyol Express', 'HepsiJet'];

export const PROMOS = [
  { id: '1', tag: 'YENİ', title: 'Canlı mezatlar başladı', subtitle: 'Saat, takı ve sneaker fırsatları', colors: ['#FF6B00', '#C2410C'] as const },
  { id: '2', tag: 'DAVET', title: 'Arkadaşını davet et', subtitle: 'İlk alışverişinde 50 ₺ kredi kazan', colors: ['#7C3AED', '#4C1D95'] as const },
  { id: '3', tag: 'SATICI', title: 'CanlıSat’ta satış yap', subtitle: 'İlk 3 ay %0 komisyon', colors: ['#2563EB', '#1E3A8A'] as const },
];

export const SUPPORT_EMAIL = 'destek@canlisat.com';
