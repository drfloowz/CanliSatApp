import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
  RenderModeType,
} from 'react-native-agora';
import { supabase } from '../../services/supabase';

type AgoraState = {
  ready: boolean;
  joined: boolean;
  remoteUid: number | null;
  remoteVideoMuted: boolean;
  error: string | null;
};

/** Yayın kanalına bağlanır. Token sunucudan (agora-token edge function) alınır. */
export const useAgora = (streamId: string | undefined, isHost: boolean, enabled: boolean) => {
  const engine = useRef<IRtcEngine | null>(null);
  const [state, setState] = useState<AgoraState>({ ready: false, joined: false, remoteUid: null, remoteVideoMuted: false, error: null });
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  useEffect(() => {
    if (!streamId || !enabled) return;
    let cancelled = false;

    (async () => {
      try {
        if (isHost && Platform.OS === 'android') {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
        }
        const { data, error } = await supabase.functions.invoke('agora-token', { body: { streamId } });
        if (error || !data?.appId) {
          let msg = 'Yayın bağlantısı kurulamadı';
          try {
            const body = await (error as any)?.context?.json?.();
            if (body?.error === 'AGORA_NOT_CONFIGURED') msg = 'Agora ayarları eksik (sunucu secret’ları girilmemiş)';
            else if (body?.error) msg = body.error;
          } catch {}
          throw new Error(msg);
        }
        if (cancelled) return;

        const e = createAgoraRtcEngine();
        engine.current = e;
        e.initialize({ appId: data.appId, channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting });
        e.registerEventHandler({
          onJoinChannelSuccess: () => setState((s) => ({ ...s, joined: true })),
          onUserJoined: (_c, uid) => setState((s) => ({ ...s, remoteUid: uid, remoteVideoMuted: false })),
          onUserOffline: (_c, uid) => setState((s) => (s.remoteUid === uid ? { ...s, remoteUid: null } : s)),
          onUserMuteVideo: (_c, _uid, m) => setState((s) => ({ ...s, remoteVideoMuted: m })),
          onError: (err, msg) => console.warn('Agora hata', err, msg),
        });
        e.enableVideo();
        if (isHost) e.startPreview();
        setState((s) => ({ ...s, ready: true }));
        e.joinChannel(data.token ?? '', data.channel, 0, {
          clientRoleType: isHost ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience,
          publishCameraTrack: isHost,
          publishMicrophoneTrack: isHost,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });
      } catch (err: any) {
        if (!cancelled) setState((s) => ({ ...s, error: err?.message ?? 'Yayın bağlantısı kurulamadı' }));
      }
    })();

    return () => {
      cancelled = true;
      const e = engine.current;
      engine.current = null;
      if (e) {
        e.leaveChannel();
        e.release();
      }
    };
  }, [streamId, isHost, enabled]);

  return {
    ...state,
    renderMode: RenderModeType.RenderModeHidden,
    muted,
    videoOff,
    toggleMic: () => {
      const next = !muted;
      engine.current?.muteLocalAudioStream(next);
      setMuted(next);
    },
    toggleVideo: () => {
      const next = !videoOff;
      engine.current?.muteLocalVideoStream(next);
      engine.current?.enableLocalVideo(!next);
      setVideoOff(next);
    },
    switchCamera: () => engine.current?.switchCamera(),
  };
};
