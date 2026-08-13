import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { streamService } from '../services/streamService';
import { createAgoraRtcEngine, RtcSurfaceView, ChannelProfileType, ClientRoleType, IRtcEngine } from 'react-native-agora';

export const BroadcastRoomScreen = ({ route, navigation }: any) => {
  const { streamId, isHost = true } = route.params || {};
  const engine = useRef<IRtcEngine | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    const initAgora = async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
      }

      const appId = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

      try {
        engine.current = createAgoraRtcEngine();
        engine.current.initialize({ appId });
        engine.current.enableVideo();

        engine.current.addListener('onUserJoined', (connection, uid) => {
          setRemoteUid(uid);
        });

        engine.current.addListener('onUserOffline', (connection, uid) => {
          setRemoteUid((prev) => (prev === uid ? null : prev));
        });

        engine.current.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);

        if (isHost) {
          engine.current.setClientRole(ClientRoleType.ClientRoleBroadcaster);
          engine.current.startPreview();
        } else {
          engine.current.setClientRole(ClientRoleType.ClientRoleAudience);
        }

        engine.current.joinChannel(
          process.env.EXPO_PUBLIC_AGORA_TOKEN || '',
          process.env.EXPO_PUBLIC_AGORA_CHANNEL || 'testroom',
          0,
          {
            clientRoleType: isHost ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience,
            publishMicrophoneTrack: isHost,
            publishCameraTrack: isHost,
            autoSubscribeAudio: true,
            autoSubscribeVideo: true,
          }
        );
      } catch (e) {
        console.warn('Agora Init Error:', e);
      }
    };

    initAgora();

    return () => {
      engine.current?.leaveChannel();
      engine.current?.release();
    };
  }, [isHost]);

  const handleEndStream = () => {
    Alert.alert(
      'Yayını Bitir',
      'Yayını bitirmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Bitir',
          style: 'destructive',
          onPress: async () => {
            try {
              if (streamId) {
                await streamService.endLiveStream(streamId);
              }
              // Cleanly pop the navigation
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.popToTop();
              }
            } catch (error) {
              Alert.alert('Hata', 'Yayın sonlandırılamadı.');
            }
          }
        }
      ]
    );
  };

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.popToTop();
    }
  };

  const toggleMic = () => {
    engine.current?.muteLocalAudioStream(!isMuted);
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    engine.current?.muteLocalVideoStream(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };

  const switchCamera = () => {
    engine.current?.switchCamera();
  };

  return (
    <View style={styles.container}>
      {/* Agora Video Background */}
      {isHost ? (
        <RtcSurfaceView canvas={{ uid: 0 }} style={StyleSheet.absoluteFill} />
      ) : remoteUid !== null ? (
        <RtcSurfaceView canvas={{ uid: remoteUid }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: 'white' }}>Waiting for host...</Text>
        </View>
      )}

      {/* Floating UI on top */}
      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">

        {/* Top Controls Container */}
        <View style={styles.topControls}>
          {/* Live Badge */}
          <View className="bg-[#1E1E1E] px-4 py-2 rounded-full border border-zinc-800 flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse" />
            <Text className="text-[#FF6B00] font-bold tracking-widest">LIVE</Text>
          </View>

          {/* Right Buttons */}
          <View className="flex-row gap-4">
            {/* End Stream Button */}
            {isHost && (
              <TouchableOpacity
                className="w-10 h-10 bg-red-600 rounded-lg items-center justify-center shadow-lg shadow-red-600/40"
                onPress={handleEndStream}
              >
                <Ionicons name="stop" size={20} color="white" />
              </TouchableOpacity>
            )}

            {/* Close Button */}
            <TouchableOpacity
              className="w-10 h-10 bg-[#1E1E1E] rounded-full items-center justify-center border border-zinc-800"
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Host Controls (Right Side) */}
        {isHost && (
          <View
            style={{
              position: 'absolute',
              right: 16,
              top: 200,
              zIndex: 9999,
              elevation: 15,
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: 30,
              paddingVertical: 16,
              paddingHorizontal: 8,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)'
            }}
          >
            <TouchableOpacity 
              onPress={switchCamera} 
              style={{ marginBottom: 24, alignItems: 'center', justifyContent: 'center', width: 44, height: 44, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 22 }}
            >
              <Ionicons name="camera-reverse-outline" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={toggleMic} 
              style={{ marginBottom: 24, alignItems: 'center', justifyContent: 'center', width: 44, height: 44, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 22 }}
            >
              <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color={isMuted ? "#ef4444" : "white"} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={toggleVideo} 
              style={{ alignItems: 'center', justifyContent: 'center', width: 44, height: 44, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 22 }}
            >
              <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={24} color={isVideoOff ? "#ef4444" : "white"} />
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topControls: {
    position: 'absolute',
    top: 48,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  }
});
