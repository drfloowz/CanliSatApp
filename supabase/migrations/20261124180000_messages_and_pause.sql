-- Birebir mesajlaşma + yayına ara verme

------------------------------------------------------------
-- YAYINA ARA VERME
------------------------------------------------------------
alter table public.live_streams add column if not exists is_paused boolean not null default false;

create or replace function public.set_stream_paused(p_stream_id uuid, p_paused boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.live_streams set is_paused = p_paused, last_heartbeat = now()
   where id = p_stream_id and host_id = auth.uid() and status = 'live';
  if not found then raise exception 'Yayın bulunamadı'; end if;
  perform public.system_message(p_stream_id, auth.uid(),
    case when p_paused then '⏸ Yayına kısa bir ara verildi' else '▶️ Yayın devam ediyor' end);
end $$;
revoke execute on function public.set_stream_paused(uuid, boolean) from public, anon;
grant execute on function public.set_stream_paused(uuid, boolean) to authenticated;

------------------------------------------------------------
-- MESAJLAŞMA
------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  last_message text,
  last_message_at timestamptz not null default now(),
  last_sender_id uuid,
  created_at timestamptz not null default now(),
  constraint conversations_order check (user_a < user_b),
  constraint conversations_unique unique (user_a, user_b)
);
create index if not exists conversations_a_idx on public.conversations (user_a, last_message_at desc);
create index if not exists conversations_b_idx on public.conversations (user_b, last_message_at desc);
alter table public.conversations enable row level security;
create policy "conversations_select_party" on public.conversations for select to authenticated
  using (auth.uid() in (user_a, user_b));

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists dm_conversation_idx on public.direct_messages (conversation_id, created_at desc);
alter table public.direct_messages enable row level security;
create policy "dm_select_party" on public.direct_messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));
create policy "dm_insert_party" on public.direct_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
       where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)
         and not exists (
           select 1 from public.blocks b
            where (b.blocker_id = c.user_a and b.blocked_id = c.user_b)
               or (b.blocker_id = c.user_b and b.blocked_id = c.user_a))
    )
  );
-- Okundu bilgisi: sadece karşı tarafın mesajları, sadece read_at kolonu
create policy "dm_mark_read" on public.direct_messages for update to authenticated
  using (sender_id <> auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)))
  with check (sender_id <> auth.uid());
revoke update on public.direct_messages from anon, authenticated;
grant update (read_at) on public.direct_messages to authenticated;

create or replace function public.start_conversation(p_other uuid)
returns public.conversations language plpgsql security definer set search_path = '' as $$
declare v_conv public.conversations; v_a uuid; v_b uuid;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısınız'; end if;
  if p_other is null or p_other = auth.uid() then raise exception 'Geçersiz kullanıcı'; end if;
  if not exists (select 1 from public.profiles where id = p_other) then raise exception 'Kullanıcı bulunamadı'; end if;
  if exists (select 1 from public.blocks where (blocker_id = auth.uid() and blocked_id = p_other) or (blocker_id = p_other and blocked_id = auth.uid())) then
    raise exception 'Bu kullanıcıyla mesajlaşamazsınız';
  end if;
  v_a := least(auth.uid(), p_other);
  v_b := greatest(auth.uid(), p_other);
  insert into public.conversations (user_a, user_b) values (v_a, v_b)
  on conflict (user_a, user_b) do nothing;
  select * into v_conv from public.conversations where user_a = v_a and user_b = v_b;
  return v_conv;
end $$;
revoke execute on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

-- Yeni mesajda konuşmanın özetini güncelle ve alıcıya bildirim düşme (bildirim listesini kirletmemek için sadece ilk okunmamış mesajda)
create or replace function public.on_direct_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_conv public.conversations; v_other uuid; v_name text;
begin
  update public.conversations
     set last_message = left(new.body, 120), last_message_at = new.created_at, last_sender_id = new.sender_id
   where id = new.conversation_id
  returning * into v_conv;
  v_other := case when v_conv.user_a = new.sender_id then v_conv.user_b else v_conv.user_a end;
  if not exists (select 1 from public.direct_messages
                  where conversation_id = new.conversation_id and sender_id = new.sender_id
                    and read_at is null and id <> new.id) then
    select username into v_name from public.profiles where id = new.sender_id;
    perform public.notify(v_other, 'message', '💬 @' || coalesce(v_name, 'kullanici') || ' sana mesaj gönderdi',
                          left(new.body, 80), jsonb_build_object('conversation_id', new.conversation_id));
  end if;
  return new;
end $$;
revoke execute on function public.on_direct_message() from public, anon, authenticated;
drop trigger if exists direct_message_after_insert on public.direct_messages;
create trigger direct_message_after_insert after insert on public.direct_messages
  for each row execute function public.on_direct_message();

do $$
begin
  begin alter publication supabase_realtime add table public.direct_messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.conversations; exception when duplicate_object then null; end;
end $$;
