-- Profil oluşturma tetikleyicisinden önce açılmış hesaplar için profil kaydı oluşturur
-- ve uygulamanın eksik profili kendisi onarabilmesi için ensure_profile() RPC'sini ekler.

create or replace function public.ensure_profile()
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_user auth.users;
  v_username text;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısınız'; end if;
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is not null then return v_profile; end if;

  select * into v_user from auth.users where id = auth.uid();
  v_username := lower(regexp_replace(coalesce(v_user.raw_user_meta_data->>'username', split_part(v_user.email, '@', 1)), '[^a-zA-Z0-9_.]', '', 'g'));
  if length(v_username) < 3 then v_username := 'kullanici'; end if;
  v_username := left(v_username, 18);
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || substr(md5(v_user.id::text), 1, 5);
  end if;

  insert into public.profiles (id, username, full_name, avatar_url, referral_code)
  values (v_user.id, v_username, v_user.raw_user_meta_data->>'full_name', v_user.raw_user_meta_data->>'avatar_url',
          upper(substr(md5(v_user.id::text), 1, 6)))
  returning * into v_profile;
  return v_profile;
end $$;
revoke execute on function public.ensure_profile() from public, anon;
grant execute on function public.ensure_profile() to authenticated;

-- Mevcut eksik profilleri doldur
insert into public.profiles (id, username, full_name, referral_code)
select u.id,
       left(lower(regexp_replace(coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)), '[^a-zA-Z0-9_.]', '', 'g')), 18)
         || substr(md5(u.id::text), 1, 4),
       u.raw_user_meta_data->>'full_name',
       upper(substr(md5(u.id::text), 1, 6))
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id);
