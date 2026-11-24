-- CanlıSat MVP çekirdeği: güvenlik, mezat, sipariş, satıcı başvurusu, bildirim
-- Tüm kritik işlemler (teklif, mezat başlatma/bitirme, satın alma) SECURITY DEFINER fonksiyonlarla yapılır.

create extension if not exists pg_cron;

------------------------------------------------------------
-- PROFILES
------------------------------------------------------------
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists bio text,
  add column if not exists is_admin boolean not null default false,
  add column if not exists credits numeric(12,2) not null default 0,
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists push_token text,
  add column if not exists onboarded boolean not null default false;

update public.profiles
   set referral_code = upper(substr(md5(id::text), 1, 6))
 where referral_code is null;

-- Kullanıcı sadece güvenli kolonları güncelleyebilir (is_seller, is_admin, credits korunur)
revoke update on public.profiles from anon, authenticated;
grant update (username, full_name, avatar_url, bio, push_token, onboarded) on public.profiles to authenticated;

drop policy if exists "Kullanıcılar kendi profillerini güncelleyebilir" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_.]{3,24}$') not valid;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_username text := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), '[^a-zA-Z0-9_.]', '', 'g'));
begin
  if length(v_username) < 3 then v_username := 'kullanici'; end if;
  v_username := left(v_username, 18);
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || substr(md5(new.id::text), 1, 5);
  end if;
  insert into public.profiles (id, username, full_name, avatar_url, referral_code)
  values (new.id, v_username, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url',
          upper(substr(md5(new.id::text), 1, 6)));
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

------------------------------------------------------------
-- FOLLOWERS / USER_CATEGORIES (RLS kapalıydı)
------------------------------------------------------------
alter table public.followers enable row level security;
create policy "followers_select" on public.followers for select using (true);
create policy "followers_insert_own" on public.followers for insert to authenticated
  with check (auth.uid() = follower_id and follower_id <> following_id);
create policy "followers_delete_own" on public.followers for delete to authenticated
  using (auth.uid() = follower_id);

alter table public.user_categories enable row level security;
create policy "user_categories_own" on public.user_categories for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- BLOCKS (sohbet ve teklif kontrolünde kullanılır)
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
create policy "blocks_own" on public.blocks for all to authenticated
  using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

------------------------------------------------------------
-- PRODUCTS
------------------------------------------------------------
alter table public.products
  add column if not exists category text,
  add column if not exists condition text not null default 'new',
  add column if not exists images text[] not null default '{}',
  add column if not exists buy_now_price numeric(12,2),
  add column if not exists quantity int not null default 1,
  add column if not exists updated_at timestamptz not null default now();

update public.products set status = 'active' where status is null or status = 'taslak';
update public.products set images = array[image_url] where image_url is not null and cardinality(images) = 0;
alter table public.products alter column status set default 'active';
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check check (status in ('active','in_auction','sold','archived'));
alter table public.products drop constraint if exists products_price_check;
alter table public.products add constraint products_price_check
  check (coalesce(starting_price,0) >= 0 and (buy_now_price is null or buy_now_price > 0) and quantity >= 0);

drop policy if exists "Satıcılar kendi ürünlerini ekleyebilir" on public.products;
drop policy if exists "Satıcılar kendi ürünlerini güncelleyebilir" on public.products;
create policy "products_insert_seller" on public.products for insert to authenticated
  with check (auth.uid() = seller_id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_seller));
create policy "products_update_own" on public.products for update to authenticated
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id and status in ('active','archived'));
create policy "products_delete_own" on public.products for delete to authenticated
  using (auth.uid() = seller_id and status in ('active','archived'));

------------------------------------------------------------
-- LIVE STREAMS
------------------------------------------------------------
alter table public.live_streams
  add column if not exists description text,
  add column if not exists cover_url text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists last_heartbeat timestamptz,
  add column if not exists viewer_count int not null default 0,
  add column if not exists current_auction_id uuid;

alter table public.live_streams drop column if exists agora_channel_name;
alter table public.live_streams drop column if exists mode;
alter table public.live_streams drop column if exists product_id;
update public.live_streams set status = 'ended', ended_at = coalesce(ended_at, now()) where status <> 'ended';
alter table public.live_streams alter column status set default 'scheduled';
alter table public.live_streams drop constraint if exists live_streams_status_check;
alter table public.live_streams add constraint live_streams_status_check check (status in ('scheduled','live','ended','cancelled'));
create index if not exists live_streams_status_idx on public.live_streams (status, scheduled_at);

-- Yayın oluşturma/güncelleme sadece RPC ile
drop policy if exists "Kullanıcılar yayın başlatabilir" on public.live_streams;
drop policy if exists "Yayıncılar kendi yayınlarını yönetebilir" on public.live_streams;
create policy "live_streams_update_own" on public.live_streams for update to authenticated
  using (auth.uid() = host_id) with check (auth.uid() = host_id);
revoke update on public.live_streams from anon, authenticated;
grant update (title, description, cover_url, category, scheduled_at) on public.live_streams to authenticated;
revoke insert, delete on public.live_streams from anon, authenticated;

------------------------------------------------------------
-- AUCTIONS
------------------------------------------------------------
create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  start_price numeric(12,2) not null check (start_price >= 1),
  current_price numeric(12,2) not null,
  current_winner_id uuid references public.profiles(id) on delete set null,
  bid_count int not null default 0,
  duration_sec int not null check (duration_sec between 10 and 300),
  status text not null default 'running' check (status in ('running','ended','cancelled')),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists auctions_stream_idx on public.auctions (stream_id, created_at desc);
create index if not exists auctions_running_idx on public.auctions (status, ends_at) where status = 'running';
alter table public.auctions enable row level security;
create policy "auctions_select" on public.auctions for select using (true);

alter table public.live_streams drop constraint if exists live_streams_current_auction_fk;
alter table public.live_streams add constraint live_streams_current_auction_fk
  foreign key (current_auction_id) references public.auctions(id) on delete set null;

------------------------------------------------------------
-- BIDS (sadece place_bid ile)
------------------------------------------------------------
delete from public.bids;
alter table public.bids add column if not exists auction_id uuid references public.auctions(id) on delete cascade;
alter table public.bids alter column auction_id set not null;
alter table public.bids alter column amount set not null;
create index if not exists bids_auction_idx on public.bids (auction_id, amount desc);
create index if not exists bids_user_idx on public.bids (user_id, created_at desc);
drop policy if exists "Giriş yapan kullanıcılar teklif verebilir" on public.bids;
revoke insert, update, delete on public.bids from anon, authenticated;

------------------------------------------------------------
-- CHAT
------------------------------------------------------------
alter table public.chat_messages add column if not exists kind text not null default 'chat';
alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
alter table public.chat_messages add constraint chat_messages_kind_check check (kind in ('chat','system'));
alter table public.chat_messages drop constraint if exists chat_messages_len_check;
alter table public.chat_messages add constraint chat_messages_len_check check (char_length(message) between 1 and 300) not valid;
create index if not exists chat_stream_idx on public.chat_messages (stream_id, created_at desc);
drop policy if exists "Giriş yapan kullanıcılar mesaj atabilir" on public.chat_messages;
create policy "chat_insert_own" on public.chat_messages for insert to authenticated
  with check (
    auth.uid() = user_id and kind = 'chat'
    and exists (select 1 from public.live_streams s where s.id = stream_id and s.status = 'live')
    and not exists (select 1 from public.live_streams s join public.blocks b on b.blocker_id = s.host_id
                    where s.id = stream_id and b.blocked_id = auth.uid())
  );

------------------------------------------------------------
-- ORDERS
------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  auction_id uuid references public.auctions(id) on delete set null,
  stream_id uuid references public.live_streams(id) on delete set null,
  source text not null check (source in ('auction','buy_now')),
  product_title text not null,
  product_image text,
  amount numeric(12,2) not null,
  credits_used numeric(12,2) not null default 0,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','paid','shipped','delivered','cancelled')),
  shipping_address jsonb,
  carrier text,
  tracking_number text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz
);
create index if not exists orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index if not exists orders_seller_idx on public.orders (seller_id, created_at desc);
alter table public.orders enable row level security;
create policy "orders_select_party" on public.orders for select to authenticated
  using (auth.uid() in (buyer_id, seller_id) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

------------------------------------------------------------
-- FAVORITES / REMINDERS / ADDRESSES
------------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.favorites enable row level security;
create policy "favorites_own" on public.favorites for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.stream_reminders (
  user_id uuid not null references public.profiles(id) on delete cascade,
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, stream_id)
);
alter table public.stream_reminders enable row level security;
create policy "reminders_own" on public.stream_reminders for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  full_name text not null,
  phone text not null,
  city text not null,
  district text not null,
  address_line text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.addresses enable row level security;
create policy "addresses_own" on public.addresses for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

------------------------------------------------------------
-- SELLER APPLICATIONS
------------------------------------------------------------
create table if not exists public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_name text not null check (char_length(store_name) between 2 and 60),
  category text not null,
  phone text not null,
  instagram text,
  description text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index if not exists seller_app_one_pending on public.seller_applications (user_id) where status = 'pending';
alter table public.seller_applications enable row level security;
create policy "seller_app_select" on public.seller_applications for select to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "seller_app_insert_own" on public.seller_applications for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

------------------------------------------------------------
-- NOTIFICATIONS
------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

------------------------------------------------------------
-- REPORTS / BLOCKS / CREDITS
------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('user','stream','product','message')),
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "reports_insert_own" on public.reports for insert to authenticated with check (auth.uid() = reporter_id);
create policy "reports_select_admin" on public.reports for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  reason text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.credit_transactions enable row level security;
create policy "credits_select_own" on public.credit_transactions for select to authenticated using (auth.uid() = user_id);

------------------------------------------------------------
-- YARDIMCI FONKSİYONLAR
------------------------------------------------------------
create or replace function public.bid_increment(p_price numeric)
returns numeric language sql immutable set search_path = '' as $$
  select case
    when p_price < 100 then 5
    when p_price < 500 then 10
    when p_price < 1000 then 25
    when p_price < 5000 then 50
    when p_price < 10000 then 100
    else 250 end::numeric
$$;

create or replace function public.notify(p_user uuid, p_type text, p_title text, p_body text, p_data jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, title, body, data) values (p_user, p_type, p_title, p_body, coalesce(p_data, '{}'));
$$;
revoke execute on function public.notify(uuid, text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.system_message(p_stream uuid, p_user uuid, p_message text)
returns void language sql security definer set search_path = '' as $$
  insert into public.chat_messages (stream_id, user_id, message, kind) values (p_stream, p_user, p_message, 'system');
$$;
revoke execute on function public.system_message(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.is_seller()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_seller from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

------------------------------------------------------------
-- YAYIN RPC'LERİ
------------------------------------------------------------
create or replace function public.create_stream(
  p_title text, p_category text, p_description text default null,
  p_cover_url text default null, p_scheduled_at timestamptz default null)
returns public.live_streams language plpgsql security definer set search_path = '' as $$
declare v_stream public.live_streams;
begin
  if not public.is_seller() then raise exception 'Yayın açmak için satıcı olmalısınız'; end if;
  if char_length(coalesce(trim(p_title), '')) < 3 then raise exception 'Başlık en az 3 karakter olmalı'; end if;

  if p_scheduled_at is null or p_scheduled_at <= now() + interval '1 minute' then
    -- Hemen canlıya geç: açık kalan eski yayınları kapat
    update public.live_streams set status = 'ended', ended_at = now()
     where host_id = auth.uid() and status = 'live';
    insert into public.live_streams (host_id, title, category, description, cover_url, status, started_at, last_heartbeat)
    values (auth.uid(), trim(p_title), p_category, p_description, p_cover_url, 'live', now(), now())
    returning * into v_stream;
    perform public.notify(f.follower_id, 'stream_live', '🔴 ' || coalesce(pr.username, 'Bir satıcı') || ' canlı yayında',
                          v_stream.title, jsonb_build_object('stream_id', v_stream.id))
      from public.followers f join public.profiles pr on pr.id = auth.uid()
     where f.following_id = auth.uid();
  else
    insert into public.live_streams (host_id, title, category, description, cover_url, status, scheduled_at)
    values (auth.uid(), trim(p_title), p_category, p_description, p_cover_url, 'scheduled', p_scheduled_at)
    returning * into v_stream;
  end if;
  return v_stream;
end $$;

create or replace function public.go_live(p_stream_id uuid)
returns public.live_streams language plpgsql security definer set search_path = '' as $$
declare v_stream public.live_streams;
begin
  update public.live_streams set status = 'ended', ended_at = now()
   where host_id = auth.uid() and status = 'live' and id <> p_stream_id;
  update public.live_streams set status = 'live', started_at = now(), last_heartbeat = now()
   where id = p_stream_id and host_id = auth.uid() and status = 'scheduled'
  returning * into v_stream;
  if v_stream.id is null then raise exception 'Yayın bulunamadı'; end if;
  perform public.notify(r.user_id, 'stream_live', '🔴 Hatırlattığın yayın başladı', v_stream.title,
                        jsonb_build_object('stream_id', v_stream.id))
    from public.stream_reminders r where r.stream_id = p_stream_id;
  return v_stream;
end $$;

create or replace function public.stream_heartbeat(p_stream_id uuid, p_viewers int default null)
returns void language sql security definer set search_path = '' as $$
  update public.live_streams
     set last_heartbeat = now(), viewer_count = coalesce(greatest(p_viewers, 0), viewer_count)
   where id = p_stream_id and host_id = auth.uid() and status = 'live';
$$;

create or replace function public.end_stream(p_stream_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.live_streams where id = p_stream_id and (host_id = auth.uid() or public.is_admin())) then
    raise exception 'Yetkisiz';
  end if;
  -- Çalışan mezat varsa hemen sonuçlandır
  update public.auctions set ends_at = least(ends_at, now()) where stream_id = p_stream_id and status = 'running';
  perform public.finalize_auction(a.id) from public.auctions a where a.stream_id = p_stream_id and a.status = 'running';
  update public.live_streams set status = 'ended', ended_at = now(), viewer_count = 0, current_auction_id = null
   where id = p_stream_id and status in ('live','scheduled');
end $$;

------------------------------------------------------------
-- MEZAT RPC'LERİ
------------------------------------------------------------
create or replace function public.start_auction(p_stream_id uuid, p_product_id uuid, p_start_price numeric, p_duration_sec int default 30)
returns public.auctions language plpgsql security definer set search_path = '' as $$
declare v_auction public.auctions; v_product public.products;
begin
  perform 1 from public.live_streams where id = p_stream_id and host_id = auth.uid() and status = 'live' for update;
  if not found then raise exception 'Canlı yayınınız bulunamadı'; end if;
  if exists (select 1 from public.auctions where stream_id = p_stream_id and status = 'running') then
    raise exception 'Devam eden bir mezat var';
  end if;
  select * into v_product from public.products where id = p_product_id and seller_id = auth.uid() for update;
  if v_product.id is null or v_product.status <> 'active' or v_product.quantity < 1 then
    raise exception 'Ürün mezata uygun değil';
  end if;
  if p_start_price is null or p_start_price < 1 then raise exception 'Başlangıç fiyatı en az 1 ₺ olmalı'; end if;

  insert into public.auctions (stream_id, product_id, seller_id, start_price, current_price, duration_sec, ends_at)
  values (p_stream_id, p_product_id, auth.uid(), p_start_price, p_start_price, p_duration_sec,
          now() + make_interval(secs => p_duration_sec))
  returning * into v_auction;

  update public.products set status = 'in_auction', updated_at = now() where id = p_product_id;
  update public.live_streams set current_auction_id = v_auction.id where id = p_stream_id;
  perform public.system_message(p_stream_id, auth.uid(), '🔨 Mezat başladı: ' || v_product.title || ' — ' || p_start_price || ' ₺');
  return v_auction;
end $$;

create or replace function public.place_bid(p_auction_id uuid, p_amount numeric)
returns public.auctions language plpgsql security definer set search_path = '' as $$
declare
  v_auction public.auctions;
  v_min numeric;
  v_prev_winner uuid;
  v_username text;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısınız'; end if;
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if v_auction.id is null or v_auction.status <> 'running' or now() >= v_auction.ends_at then
    raise exception 'Mezat sona erdi';
  end if;
  if v_auction.seller_id = auth.uid() then raise exception 'Kendi ürününüze teklif veremezsiniz'; end if;
  if v_auction.current_winner_id = auth.uid() then raise exception 'Zaten en yüksek teklif sizde'; end if;
  if exists (select 1 from public.blocks where blocker_id = v_auction.seller_id and blocked_id = auth.uid()) then
    raise exception 'Bu satıcının mezatlarına katılamazsınız';
  end if;
  if not exists (select 1 from public.addresses where user_id = auth.uid()) then
    raise exception 'ADRES_GEREKLI';
  end if;

  v_min := case when v_auction.bid_count = 0 then v_auction.start_price
                else v_auction.current_price + public.bid_increment(v_auction.current_price) end;
  if p_amount is null or p_amount < v_min then
    raise exception 'Teklif en az % ₺ olmalı', v_min;
  end if;
  if p_amount > v_min * 20 + 1000 then raise exception 'Teklif tutarı çok yüksek'; end if;

  v_prev_winner := v_auction.current_winner_id;
  insert into public.bids (auction_id, product_id, user_id, amount) values (v_auction.id, v_auction.product_id, auth.uid(), p_amount);

  update public.auctions
     set current_price = p_amount,
         current_winner_id = auth.uid(),
         bid_count = bid_count + 1,
         -- Son saniye koruması: son 10 saniyede teklif gelirse süre 10 saniyeye uzar
         ends_at = greatest(ends_at, now() + interval '10 seconds')
   where id = v_auction.id
  returning * into v_auction;

  if v_prev_winner is not null and v_prev_winner <> auth.uid() then
    select username into v_username from public.profiles where id = auth.uid();
    perform public.notify(v_prev_winner, 'outbid', 'Teklifin geçildi', coalesce(v_username,'Biri') || ' ' || p_amount || ' ₺ teklif verdi',
                          jsonb_build_object('stream_id', v_auction.stream_id, 'auction_id', v_auction.id));
  end if;
  return v_auction;
end $$;

create or replace function public.finalize_auction(p_auction_id uuid)
returns public.auctions language plpgsql security definer set search_path = '' as $$
declare v_auction public.auctions; v_product public.products; v_winner text; v_address jsonb; v_order uuid;
begin
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if v_auction.id is null or v_auction.status <> 'running' or now() < v_auction.ends_at then
    return v_auction;
  end if;
  select * into v_product from public.products where id = v_auction.product_id for update;

  update public.auctions set status = 'ended', ended_at = now() where id = v_auction.id returning * into v_auction;
  update public.live_streams set current_auction_id = null where id = v_auction.stream_id and current_auction_id = v_auction.id;

  if v_auction.current_winner_id is null then
    update public.products set status = 'active', updated_at = now() where id = v_product.id;
    perform public.system_message(v_auction.stream_id, v_auction.seller_id, '⏱ Teklif gelmedi: ' || v_product.title);
    return v_auction;
  end if;

  select to_jsonb(a) - 'id' - 'user_id' - 'created_at' into v_address
    from public.addresses a where a.user_id = v_auction.current_winner_id
   order by a.is_default desc, a.created_at desc limit 1;

  insert into public.orders (buyer_id, seller_id, product_id, auction_id, stream_id, source, product_title, product_image, amount, shipping_address)
  values (v_auction.current_winner_id, v_auction.seller_id, v_product.id, v_auction.id, v_auction.stream_id, 'auction',
          v_product.title, v_product.images[1], v_auction.current_price, v_address)
  returning id into v_order;

  update public.products
     set quantity = greatest(quantity - 1, 0),
         status = case when quantity - 1 > 0 then 'active' else 'sold' end,
         updated_at = now()
   where id = v_product.id;

  select username into v_winner from public.profiles where id = v_auction.current_winner_id;
  perform public.system_message(v_auction.stream_id, v_auction.current_winner_id,
     '🎉 SATILDI! ' || v_product.title || ' → @' || coalesce(v_winner,'kullanici') || ' (' || v_auction.current_price || ' ₺)');
  perform public.notify(v_auction.current_winner_id, 'auction_won', 'Tebrikler, kazandın! 🎉',
     v_product.title || ' — ' || v_auction.current_price || ' ₺', jsonb_build_object('order_id', v_order));
  perform public.notify(v_auction.seller_id, 'new_order', 'Yeni satış 💸',
     v_product.title || ' — ' || v_auction.current_price || ' ₺', jsonb_build_object('order_id', v_order));
  return v_auction;
end $$;

create or replace function public.cancel_auction(p_auction_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_auction public.auctions;
begin
  update public.auctions set status = 'cancelled', ended_at = now()
   where id = p_auction_id and seller_id = auth.uid() and status = 'running'
  returning * into v_auction;
  if v_auction.id is null then raise exception 'Mezat bulunamadı'; end if;
  update public.products set status = 'active' where id = v_auction.product_id;
  update public.live_streams set current_auction_id = null where id = v_auction.stream_id;
  perform public.system_message(v_auction.stream_id, auth.uid(), 'Mezat iptal edildi');
end $$;

------------------------------------------------------------
-- HEMEN AL / SİPARİŞ
------------------------------------------------------------
create or replace function public.buy_now(p_product_id uuid)
returns public.orders language plpgsql security definer set search_path = '' as $$
declare v_product public.products; v_address jsonb; v_order public.orders;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısınız'; end if;
  select * into v_product from public.products where id = p_product_id for update;
  if v_product.id is null or v_product.status <> 'active' or v_product.buy_now_price is null or v_product.quantity < 1 then
    raise exception 'Ürün şu an satın alınamaz';
  end if;
  if v_product.seller_id = auth.uid() then raise exception 'Kendi ürününüzü satın alamazsınız'; end if;
  select to_jsonb(a) - 'id' - 'user_id' - 'created_at' into v_address
    from public.addresses a where a.user_id = auth.uid() order by a.is_default desc, a.created_at desc limit 1;
  if v_address is null then raise exception 'ADRES_GEREKLI'; end if;

  insert into public.orders (buyer_id, seller_id, product_id, source, product_title, product_image, amount, shipping_address)
  values (auth.uid(), v_product.seller_id, v_product.id, 'buy_now', v_product.title, v_product.images[1], v_product.buy_now_price, v_address)
  returning * into v_order;
  update public.products set quantity = quantity - 1,
         status = case when quantity - 1 > 0 then 'active' else 'sold' end, updated_at = now()
   where id = v_product.id;
  perform public.notify(v_product.seller_id, 'new_order', 'Yeni sipariş 💸',
     v_product.title || ' — ' || v_product.buy_now_price || ' ₺', jsonb_build_object('order_id', v_order.id));
  return v_order;
end $$;

create or replace function public.mark_order_shipped(p_order_id uuid, p_carrier text, p_tracking text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders;
begin
  update public.orders set status = 'shipped', carrier = p_carrier, tracking_number = p_tracking, shipped_at = now()
   where id = p_order_id and seller_id = auth.uid() and status in ('awaiting_payment','paid')
  returning * into v_order;
  if v_order.id is null then raise exception 'Sipariş bulunamadı'; end if;
  perform public.notify(v_order.buyer_id, 'order_shipped', 'Siparişin kargoda 📦',
     v_order.product_title || ' — ' || p_carrier || ' ' || p_tracking, jsonb_build_object('order_id', v_order.id));
end $$;

create or replace function public.mark_order_delivered(p_order_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.orders set status = 'delivered', delivered_at = now()
   where id = p_order_id and buyer_id = auth.uid() and status = 'shipped';
$$;

create or replace function public.cancel_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders;
begin
  update public.orders set status = 'cancelled'
   where id = p_order_id and (seller_id = auth.uid() or public.is_admin()) and status = 'awaiting_payment'
  returning * into v_order;
  if v_order.id is null then raise exception 'Sipariş iptal edilemez'; end if;
  update public.products set quantity = quantity + 1, status = 'active' where id = v_order.product_id and status in ('sold','active');
  perform public.notify(v_order.buyer_id, 'order_cancelled', 'Sipariş iptal edildi', v_order.product_title, jsonb_build_object('order_id', v_order.id));
end $$;

------------------------------------------------------------
-- SATICI BAŞVURUSU (ADMIN)
------------------------------------------------------------
create or replace function public.review_seller_application(p_application_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_app public.seller_applications;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  update public.seller_applications
     set status = case when p_approve then 'approved' else 'rejected' end, admin_note = p_note, reviewed_at = now()
   where id = p_application_id and status = 'pending'
  returning * into v_app;
  if v_app.id is null then raise exception 'Başvuru bulunamadı'; end if;
  if p_approve then
    update public.profiles set is_seller = true where id = v_app.user_id;
    perform public.notify(v_app.user_id, 'seller_approved', 'Satıcı başvurun onaylandı 🎉', 'Artık canlı yayın açıp satış yapabilirsin.');
  else
    perform public.notify(v_app.user_id, 'seller_rejected', 'Satıcı başvurun reddedildi', coalesce(p_note, ''));
  end if;
end $$;

------------------------------------------------------------
-- DAVET KODU
------------------------------------------------------------
create or replace function public.apply_referral_code(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ref uuid;
begin
  select id into v_ref from public.profiles where referral_code = upper(trim(p_code));
  if v_ref is null or v_ref = auth.uid() then raise exception 'Geçersiz davet kodu'; end if;
  update public.profiles set referred_by = v_ref where id = auth.uid() and referred_by is null;
  if not found then raise exception 'Davet kodu zaten kullanıldı'; end if;
  perform public.notify(v_ref, 'referral', 'Davetin katıldı 🎁', 'Arkadaşın ilk alışverişini yapınca 50 ₺ kredi kazanacaksın.');
end $$;

------------------------------------------------------------
-- HESAP SİLME (Apple zorunluluğu)
------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısınız'; end if;
  if exists (select 1 from public.orders where (buyer_id = auth.uid() or seller_id = auth.uid())
             and status in ('awaiting_payment','paid','shipped')) then
    raise exception 'Devam eden siparişleriniz varken hesabınızı silemezsiniz';
  end if;
  update public.live_streams set status = 'ended', ended_at = now() where host_id = auth.uid() and status in ('live','scheduled');
  delete from public.orders where buyer_id = auth.uid() or seller_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;

------------------------------------------------------------
-- OTOMATİK TEMİZLİK (pg_cron)
------------------------------------------------------------
create or replace function public.sweep_live()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.finalize_auction(a.id) from public.auctions a where a.status = 'running' and a.ends_at <= now();
  -- 90 saniyedir sinyal göndermeyen yayınları kapat
  update public.auctions set ends_at = now()
   where status = 'running' and stream_id in (select id from public.live_streams where status = 'live' and last_heartbeat < now() - interval '90 seconds');
  perform public.finalize_auction(a.id) from public.auctions a
    join public.live_streams s on s.id = a.stream_id
   where a.status = 'running' and s.status = 'live' and s.last_heartbeat < now() - interval '90 seconds';
  update public.live_streams set status = 'ended', ended_at = now(), viewer_count = 0
   where status = 'live' and last_heartbeat < now() - interval '90 seconds';
  -- Başlamayan planlı yayınları 6 saat sonra iptal et
  update public.live_streams set status = 'cancelled' where status = 'scheduled' and scheduled_at < now() - interval '6 hours';
end $$;
revoke execute on function public.sweep_live() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'canlisat-sweep';
select cron.schedule('canlisat-sweep', '5 seconds', 'select public.sweep_live()');

-- Fonksiyon yetkileri: anon çağıramaz
do $$
declare f text;
begin
  foreach f in array array[
    'create_stream(text,text,text,text,timestamptz)','go_live(uuid)','stream_heartbeat(uuid,int)','end_stream(uuid)',
    'start_auction(uuid,uuid,numeric,int)','place_bid(uuid,numeric)','finalize_auction(uuid)','cancel_auction(uuid)',
    'buy_now(uuid)','mark_order_shipped(uuid,text,text)','mark_order_delivered(uuid)','cancel_order(uuid)',
    'review_seller_application(uuid,boolean,text)','apply_referral_code(text)','delete_my_account()','is_seller()','is_admin()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

------------------------------------------------------------
-- REALTIME
------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.auctions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
end $$;
alter table public.auctions replica identity full;

------------------------------------------------------------
-- STORAGE
------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "media_public_read" on storage.objects for select using (bucket_id = 'media');
create policy "media_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
