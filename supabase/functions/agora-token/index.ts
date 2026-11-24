// Canlı yayın için Agora token üretir.
// Yayıncı (host) PUBLISHER, diğer herkes SUBSCRIBER rolü alır. Kanal adı = yayın ID'si.
// Gerekli secret'lar: AGORA_APP_ID, AGORA_APP_CERTIFICATE (Supabase > Edge Functions > Secrets)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { RtcRole, RtcTokenBuilder } from 'npm:agora-token@2.0.5';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Giriş yapmalısınız' }, 401);

    const { streamId } = await req.json().catch(() => ({}));
    if (!streamId) return json({ error: 'streamId gerekli' }, 400);

    const { data: stream } = await supabase
      .from('live_streams')
      .select('id, host_id, status')
      .eq('id', streamId)
      .maybeSingle();
    if (!stream || stream.status !== 'live') return json({ error: 'Yayın aktif değil' }, 404);

    const appId = Deno.env.get('AGORA_APP_ID');
    const certificate = Deno.env.get('AGORA_APP_CERTIFICATE');
    if (!appId) return json({ error: 'AGORA_NOT_CONFIGURED' }, 500);

    const isHost = stream.host_id === user.id;
    const expireSec = 60 * 60 * 6;
    // Sertifikası kapalı (test modu) projelerde token gerekmez
    const token = certificate
      ? RtcTokenBuilder.buildTokenWithUid(
          appId,
          certificate,
          stream.id,
          0,
          isHost ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
          expireSec,
          expireSec,
        )
      : null;

    return json({ appId, token, channel: stream.id, uid: 0, role: isHost ? 'host' : 'audience' });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
