import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
  RemoteVideoState,
  RemoteVideoStateReason,
  RenderModeType,
} from 'react-native-agora';
import { supabase } from '../../services/supabase';

/** İzleyici tarafında yayıncının görüntü durumu */
export type RemoteVideo = 'waiting' | 'playing' | 'camera_off' | 'frozen';

type AgoraState = {
  ready: boolean;
  joined: boolean;
  remoteUid: number | null;
  remoteVideo: RemoteVideo;
  error: string | null;
};

/** Yayın kanalına bağlanır. Token sunucudan (agora-token edge function) alınır. */
export const useAgora = (streamId: string | undefined, isHost: boolean, enabled: boolean) => {
  const engine = useRef<IRtcEngine | null>(null);
  const [state, setState] = useState<AgoraState>({ ready: false, joined: false, remoteUid: null, remoteVideo: 'waiting', error: null });
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
          onUserJoined: (_c, uid) => setState((s) => ({ ...s, remoteUid: uid, remoteVideo: 'waiting' })),
          onUserOffline: (_c, uid) => setState((s) => (s.remoteUid === uid ? { ...s, remoteUid: null, remoteVideo: 'waiting' } : s)),
          onRemoteVideoStateChanged: (_c, uid, st, reason) => {
            let next: RemoteVideo | null = null;
            if (st === RemoteVideoState.RemoteVideoStateDecoding) next = 'playing';
            else if (st === RemoteVideoState.RemoteVideoStateFrozen) next = 'frozen';
            else if (
              st === RemoteVideoState.RemoteVideoStateStopped &&
              (reason === RemoteVideoStateReason.RemoteVideoStateReasonRemoteMuted ||
                reason === RemoteVideoStateReason.RemoteVideoStateReasonLocalMuted)
            )
              next = 'camera_off';
            else if (st === RemoteVideoState.RemoteVideoStateStopped) next = 'waiting';
            if (next) setState((s) => ({ ...s, remoteUid: s.remoteUid ?? uid, remoteVideo: next! }));
          },
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

  const setCamera = (off: boolean) => {
    engine.current?.muteLocalVideoStream(off);
    engine.current?.enableLocalVideo(!off);
    setVideoOff(off);
  };
  const setMic = (off: boolean) => {
    engine.current?.muteLocalAudioStream(off);
    setMuted(off);
  };

  return {
    ...state,
    renderMode: RenderModeType.RenderModeHidden,
    muted,
    videoOff,
    toggleMic: () => setMic(!muted),
    toggleVideo: () => setCamera(!videoOff),
    /** Ara ver: kamera ve mikrofon birlikte kapanır/açılır */
    setPaused: (paused: boolean) => {
      setCamera(paused);
      setMic(paused);
    },
    switchCamera: () => engine.current?.switchCamera(),
  };
};
