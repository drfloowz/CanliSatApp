# CanlıSat

A live auction mobile app where sellers present products on a live stream and viewers place bids in real time.

> **Status: work in progress.** The core live-streaming, authentication, realtime data and chat features run online and are tested on multiple devices. The payment integration (PayTR) is not finished yet.

CanlıSat is built and maintained by a single developer ([@drfloowz](https://github.com/drfloowz)), from the mobile client to the backend setup and the admin tooling.

## Features

| Area | What it does | Status |
| --- | --- | --- |
| Live streaming | Sellers go live with video through Agora and viewers join the stream | Working |
| Authentication | Sign up and sign in with Supabase Auth, profiles with a seller flag | Working |
| Realtime data | Streams, products and viewer state update live through Supabase | Working |
| Live chat | Per-stream chat, including system messages such as `SYSTEM_AUCTION_ENDED` | Working |
| Seller access control | Only accounts with seller permission can start a stream, other users see a seller application screen | Working |
| Seller panel and admin panel | Tools for sellers and administrators | Built |
| Cart and favorites | Quantity controls, favorites tab and order total | UI built |
| Profile | Wallet, orders, coupons and saved cards screens | UI built |
| Payments (PayTR) | Payment provider integration | **Not completed** |

## Tech stack

- **Client:** React Native (iOS)
- **Backend:** Supabase (Auth, Postgres, Realtime, Row Level Security)
- **Live video:** Agora
- **Payments (planned):** PayTR

## Data model

The app talks to a Postgres database managed by Supabase. Row Level Security policies are enabled on every table.

| Table | Purpose | Key columns |
| --- | --- | --- |
| `profiles` | One row per user | `id`, `username`, `avatar_url`, `is_seller`, `created_at` |
| `products` | Items a seller lists for auction | `id`, `seller_id` → `profiles.id`, `title`, `description`, `starting_price` |
| `live_streams` | One row per live session | `id`, `host_id` → `profiles.id`, `title`, `status`, `agora_channel` |
| `chat_messages` | Live chat and system events | `id`, `stream_id` → `live_streams.id`, `user_id` → `profiles.id`, `message`, `created_at` |

## Screens

Home with active streams, Discover with search and categories, the seller access gate, cart and profile. Add screenshots here, for example in a `docs/screenshots` folder.

## Getting started

Prerequisites: Node.js, a Supabase project, an Agora project and a Mac with Xcode for iOS builds.

```bash
git clone https://github.com/drfloowz/CanliSatApp.git
cd CanliSatApp
npm install
```

Create a `.env` file in the project root. The variable names below are placeholders, so match them to the names used in the code.

```bash
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
AGORA_APP_ID=your-agora-app-id
```

Then start the app:

```bash
npx expo start
# or, for a native iOS run
npx react-native run-ios
```

> Check `package.json` for the exact start command used in this repository and adjust the steps above if needed.

## Roadmap

- [ ] Finish the PayTR payment integration
- [ ] Wallet top-up and checkout flow
- [ ] Order tracking for buyers and sellers
- [ ] Push notifications for followed sellers and auction results
- [ ] Android build

## Author

**Oğuz Çiçek**, Software Engineering student at Nişantaşı Üniversitesi.
[GitHub](https://github.com/drfloowz) · [LinkedIn](https://linkedin.com/in/oguzcicek)