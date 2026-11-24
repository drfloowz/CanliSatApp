export const formatTL = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
};

export const bidIncrement = (price: number) => {
  if (price < 100) return 5;
  if (price < 500) return 10;
  if (price < 1000) return 25;
  if (price < 5000) return 50;
  if (price < 10000) return 100;
  return 250;
};

/** Bir sonraki geçerli teklif (sunucudaki place_bid ile aynı kural) */
export const nextBidAmount = (currentPrice: number, bidCount: number) =>
  bidCount === 0 ? currentPrice : currentPrice + bidIncrement(currentPrice);

export const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
};

export const formatSchedule = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Bugün ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Yarın ${time}`;
  return `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' })} ${time}`;
};

export const initials = (name?: string | null) =>
  (name || '?')
    .split(/[\s._]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

export const ORDER_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Ödeme bekleniyor', color: '#F59E0B' },
  paid: { label: 'Ödendi', color: '#3B82F6' },
  shipped: { label: 'Kargoda', color: '#8B5CF6' },
  delivered: { label: 'Teslim edildi', color: '#22C55E' },
  cancelled: { label: 'İptal', color: '#EF4444' },
};

export const CONDITION_LABEL: Record<string, string> = {
  new: 'Sıfır',
  like_new: 'Sıfır ayarında',
  good: 'İyi',
  fair: 'Kullanılmış',
};
