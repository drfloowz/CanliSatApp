@AGENTS.md

# CanlıSat

Türkiye pazarı için canlı yayında açık artırma (mezat) uygulaması: satıcı ürünü canlı yayında sunar, izleyiciler anlık teklif verir; satıcının ayrıca "Hemen al" ürünleri olan bir mağaza sayfası vardır.
Tek geliştirici projesi; amaç App Store'a çıkıp gelir elde etmek. Kullanıcıyla Türkçe konuş.

## Teknolojiler
- Expo SDK 56 + React Native 0.85 + React 19, TypeScript (strict)
- Stil: NativeWind 4 (`className`). Uygulama sadece koyu tema; ana renk `#FF6B00`, arka plan `#0E0E0E`
- Durum: Zustand (`src/store/useAuthStore.ts` — oturum + profil)
- Navigasyon: React Navigation 7 (`src/navigation/`)
- Backend: Supabase (Auth, Postgres, Realtime, Storage, Edge Functions, pg_cron) → proje `nbcwcslgtmoqbzfiqtrc`
- Canlı video: Agora (`react-native-agora`), token `supabase/functions/agora-token` ile üretilir
- Ödeme: PayTR (henüz yapılmadı — siparişler `awaiting_payment` durumunda oluşur)
- Metinler doğrudan Türkçe yazılır (i18n kaldırıldı)

## Komutlar
- Tip kontrolü: `npx tsc --noEmit`
- Paket testi: `npx expo export --platform ios`
- Cihazda çalıştır: `npx expo run:ios --device` (Agora ve image-picker native modül, Expo Go'da çalışmaz)
- Native ayar değişince (app.json, yeni native paket): `npx expo prebuild --clean` sonra tekrar `run:ios`

## Yapı
- `src/screens/Auth/` giriş/kayıt · `main/` sekmeler, ürün detayı, satıcı profili · `live/` canlı yayın + mezat · `sell/` satıcı paneli, ürün/yayın formları, siparişler · `profile/` profil alt sayfaları, admin
- `src/components/ui.tsx` (Button, Field, Chip, Tabs, Header, Avatar...), `cards.tsx` (StreamCard, ProductCard)
- `src/lib/api.ts` (rpc, hata çevirisi, görsel yükleme), `format.ts` (₺, süre), `constants.ts` (kategoriler, renkler)
- `supabase/migrations/` veritabanı şeması · `supabase/functions/` edge function'lar

## Veritabanı kuralları
- Kritik işlemler SADECE `SECURITY DEFINER` RPC'lerle yapılır: `create_stream`, `go_live`, `end_stream`, `stream_heartbeat`, `start_auction`, `place_bid`, `finalize_auction`, `cancel_auction`, `buy_now`, `mark_order_shipped/delivered`, `cancel_order`, `review_seller_application`, `delete_my_account`. İstemciden `bids`, `orders`, `live_streams` tablolarına doğrudan yazılamaz.
- `profiles` tablosunda kullanıcı sadece `username, full_name, avatar_url, bio, push_token, onboarded` kolonlarını güncelleyebilir (`is_seller`, `is_admin`, `credits` korunur).
- Teklif artış kuralı `bid_increment()` ile `src/lib/format.ts > bidIncrement` aynı kalmalı.
- `pg_cron` işi `canlisat-sweep` her 5 sn'de süresi dolan mezatları bitirir, 90 sn sinyal gelmeyen yayınları kapatır.
- Yeni tabloda RLS açılmalı ve politika yazılmalı; şema değişikliği önce `supabase/migrations/` dosyası olarak yazılır, sonra uygulanır. Uygulamadan önce kullanıcıya sor.
- Görseller `media` bucket'ında `{user_id}/{klasör}/...` yoluna yüklenir.

## Gizli bilgiler
- `.env` (git'e girmez): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Agora App ID/Certificate istemcide DEĞİL, Supabase Edge Function secret'larında (`AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`).
- PayTR merchant key/salt da yalnızca sunucuda (edge function secret) tutulacak.

## Durum ve sıradaki işler
- Bitti: güvenli şema, satıcı başvurusu + admin onayı, yayın açma/planlama/hatırlatma, sunucu taraflı mezat (son saniye uzatması), hemen al, siparişler + kargo takibi, favoriler, takip, bildirimler (uygulama içi), adresler, şikâyet/engelleme, hesap silme, davet kodu.
- Yapılacak: PayTR ödeme + kart saklama, push bildirim (expo-notifications + EAS), Apple ile giriş, yasal metinlerin kesinleşmesi, App Store yayını, Android.
