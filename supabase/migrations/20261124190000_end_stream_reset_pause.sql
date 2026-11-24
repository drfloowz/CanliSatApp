-- Yayın bittiğinde "ara verildi" durumunu sıfırla
create or replace function public.end_stream(p_stream_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.live_streams where id = p_stream_id and (host_id = auth.uid() or public.is_admin())) then
    raise exception 'Yetkisiz';
  end if;
  update public.auctions set ends_at = least(ends_at, now()) where stream_id = p_stream_id and status = 'running';
  perform public.finalize_auction(a.id) from public.auctions a where a.stream_id = p_stream_id and a.status = 'running';
  update public.live_streams set status = 'ended', ended_at = now(), viewer_count = 0, current_auction_id = null, is_paused = false
   where id = p_stream_id and status in ('live','scheduled');
end $$;
update public.live_streams set is_paused = false where status <> 'live' and is_paused;
