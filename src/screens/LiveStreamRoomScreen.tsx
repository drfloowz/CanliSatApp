import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Animated, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, LayoutAnimation, UIManager, ActivityIndicator, PermissionsAndroid } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import { createAgoraRtcEngine, RtcSurfaceView, ChannelProfileType, ClientRoleType, IRtcEngine, RenderModeType } from 'react-native-agora';
import { supabase } from '../services/supabase';
import { useBidStore } from '../store/useBidStore';
import { useAuthStore } from '../store/useAuthStore';

const ChatBubble = ({ msg, onComplete }: { msg: any, onComplete: (id: any) => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          if (onComplete) onComplete(msg.id);
        });
      }, 4500);
    });
  }, []);

  if (msg.user_name === 'SYSTEM') {
    return (
      <Animated.View style={{ opacity: fadeAnim }} className="w-full items-center my-1">
        <View className="bg-black/30 px-4 py-1.5 rounded-full">
          <Text className="text-gray-300 text-xs italic font-semibold">{msg.message}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ opacity: fadeAnim }} className="bg-black/40 self-start px-3 py-2 rounded-xl mb-2 flex-row items-center">
      <View className="w-6 h-6 rounded-full bg-blue-500 mr-2 items-center justify-center">
         <Text className="text-white text-xs font-bold">{msg.user_name?.charAt(0) || 'A'}</Text>
      </View>
      <View>
        <Text className="text-gray-300 font-bold text-xs">{msg.user_name}</Text>
        <Text className="text-white text-sm mt-0.5">{msg.message}</Text>
      </View>
    </Animated.View>
  );
};

export const LiveStreamRoomScreen = ({ navigation, route }: any) => {
  const roomId = route?.params?.stream?.id || route?.params?.streamId || 'test-room-123';
  
  const [productName, setProductName] = useState('Canlı Satış');
  const [currentHighestBid, setCurrentHighestBid] = useState(0);
  const [highestBidderName, setHighestBidderName] = useState('');
  
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [isChatFocused, setIsChatFocused] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const { user } = useAuthStore();
  const currentUser = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonim';

  // Gerçek Yayıncı Flag'i
  const stream = route.params?.stream;
  const isBroadcaster = route.params?.isHost === true || route.params?.stream?.host_id === user?.id;
  
  console.log("Am I Broadcaster?: ", isBroadcaster, "Stream Host ID:", stream?.host_id, "My ID:", user?.id);

  // Agora States
  const engine = useRef<IRtcEngine | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);

  useEffect(() => {
    // === AGORA INITIALIZATION ===
    const initAgora = async () => {
      // 1. İzinleri İste (Özellikle Yayıncı İçin Çok Kritik)
      if (isBroadcaster) {
        if (Platform.OS === 'android') {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
        }
        // Not: iOS izinleri otomatik native katmanda veya app.json üzerinden yönetilir ancak
        // kamera akışı başlatılırken sistem otomatik sorar.
      }

      const appId = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';
      const token = process.env.EXPO_PUBLIC_AGORA_TEMP_TOKEN || '';
      const channelName = roomId;

      try {
        engine.current = createAgoraRtcEngine();
        engine.current.initialize({ appId });
        
        // KRİTİK: Video ve Ses modülünü hemen aktifleştir
        engine.current.enableVideo();
        engine.current.enableAudio();

        // Setup Event Listeners
        engine.current.addListener('onError', (err, msg) => {
          console.warn(`LOG: Agora Error - Code: ${err}, Msg: ${msg}`);
        });

        engine.current.addListener('onJoinChannelSuccess', (connection, elapsed) => {
          console.log(`LOG: Odaya Başarıyla Girildi! Kanal: ${connection.channelId}, UID: ${connection.localUid}`);
        });

        engine.current.addListener('onUserJoined', (connection, uid) => {
          console.log(`LOG: Yayıncının görüntüsü yakalandı, UID: ${uid}`);
          engine.current?.setupRemoteVideo({
            uid: uid,
            renderMode: RenderModeType.RenderModeHidden,
          });
          setRemoteUid(uid);
        });
        engine.current.addListener('onUserOffline', (connection, uid) => {
          setRemoteUid((prev) => (prev === uid ? null : prev));
        });

        engine.current.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);

        if (isBroadcaster) {
          engine.current.setClientRole(ClientRoleType.ClientRoleBroadcaster);
          engine.current.startPreview();
        } else {
          engine.current.setClientRole(ClientRoleType.ClientRoleAudience);
        }

        console.log('Agora Bağlanılıyor. Kanal:', channelName, '| Yayıncı mı:', isBroadcaster);

        // KRİTİK EKSİK: v4 SDK'da yayıncının kamerasını/sesini kanala publish etmesi (göndermesi) için açıkça belirtilmelidir.
        engine.current.joinChannel(process.env.EXPO_PUBLIC_AGORA_TOKEN || '', process.env.EXPO_PUBLIC_AGORA_CHANNEL || 'testyayini', 0, {
          clientRoleType: isBroadcaster ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience,
          publishMicrophoneTrack: isBroadcaster,
          publishCameraTrack: isBroadcaster,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });
      } catch (e) {
        console.warn('Agora Error:', e);
      }
    }
    
    initAgora();
    
    // === Keyboard Layout Animation & State ===
    // Keyboard listeners removed in favor of isChatFocused

    // === System Message (User Joined) ===
    // System message removed because schema does not support user_name or system type


    // === SUPABASE REALTIME INITIALIZATION ===
    // Dinleyici 1: Yayın Bitti Senkronizasyonu (Sadece İzleyiciler)
    const liveStreamSyncChannel = supabase
      .channel(`live-stream-sync-${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${roomId}` }, (payload) => {
        if (!isBroadcaster && payload.new.status === 'ended') {
          Alert.alert('Yayın Bitti', 'Yayıncı yayını sonlandırdı.');
          navigation.goBack();
        }
      })
      .subscribe();
    const bidsChannel = supabase
      .channel(`bids-channel-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids', filter: `stream_id=eq.${roomId}` }, (payload) => {
        if (payload.new && typeof payload.new.amount === 'number') {
          setCurrentHighestBid(prev => payload.new.amount > prev ? payload.new.amount : prev);
        }
      })
      .subscribe();

    // Sohbet geçmişi yüklenmiyor, liste boş başlıyor. Sadece yeni gelen mesajlar eklenecek.
    const chatChannel = supabase
      .channel(`chat-channel-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `stream_id=eq.${roomId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    const fetchRoom = async () => {
      const { data } = await supabase.from('rooms').select('viewer_count').eq('id', roomId).single();
      if (data && data.viewer_count !== undefined) {
        setViewerCount(data.viewer_count);
      } else {
        const randomViewers = Math.floor(Math.random() * 50) + 10;
        setViewerCount(randomViewers);
        await supabase.from('rooms').insert([{ id: roomId, room_name: `Room ${roomId}`, viewer_count: randomViewers, is_live: true }]);
      }
    };
    fetchRoom();

    const roomChannel = supabase
      .channel(`room-channel-${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.new && payload.new.viewer_count !== undefined) {
          setViewerCount(payload.new.viewer_count);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(liveStreamSyncChannel);
      supabase.removeChannel(bidsChannel);
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(roomChannel);
      
      if (isBroadcaster) {
        supabase.from('live_streams').update({ status: 'ended' }).eq('id', roomId).then();
      }

      // Release Agora Engine
      engine.current?.leaveChannel();
      engine.current?.release();
    };
  }, [roomId, isBroadcaster]);

  const placeBid = async (amount: number) => {
    const newBid = currentHighestBid + amount;
    
    const { error } = await supabase.from('bids').insert([{
      stream_id: roomId,
      user_id: user?.id,
      amount: newBid
    }]);

    if (error) {
      console.error('Error placing bid:', error.message);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    const { error } = await supabase.from('chat_messages').insert([{
      stream_id: roomId,
      user_id: user?.id,
      message: msg
    }]);
    if (error) console.error('Error sending message:', error.message);
  };

  const handleSettings = () => {
    Alert.alert(
      'Yayıncı Ayarları',
      'Ne yapmak istersiniz?',
      [
        {
          text: 'Ürün Değiştir',
          onPress: () => {
            Alert.prompt(
              'Yeni Ürün',
              'Yeni satılacak ürünün adını girin:',
              [
                { text: 'İptal', style: 'cancel' },
                { 
                  text: 'Değiştir', 
                  onPress: (newProduct?: string) => {
                    if (newProduct) {
                      setProductName(newProduct);
                      setCurrentHighestBid(0); // Fiyatı sıfırla
                    }
                  }
                }
              ]
            );
          }
        },
        {
          text: 'Yayını Bitir',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Emin misiniz?', 'Yayın sonlandırılacak.', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Bitir', style: 'destructive', onPress: () => navigation.goBack() }
            ]);
          }
        },
        { text: 'İptal', style: 'cancel' }
      ]
    );
  };

  return (
    <View className="flex-1 bg-black">
      {/* Agora Video Background - Absolutely positioned, outside KeyboardAvoidingView so it doesn't shrink */}
      <View style={StyleSheet.absoluteFill}>
        {isBroadcaster ? (
          <RtcSurfaceView canvas={{ uid: 0 }} style={StyleSheet.absoluteFill} />
        ) : remoteUid !== null ? (
          <RtcSurfaceView canvas={{ uid: remoteUid }} style={StyleSheet.absoluteFill} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white text-lg">Yayıncı Bekleniyor...</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView 
        style={StyleSheet.absoluteFill} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 justify-end relative bg-transparent" pointerEvents="box-none">
            
            {/* Top Overlay */}
            <View className="absolute top-0 w-full z-10 flex-row justify-between items-start px-4 pt-14">
              {/* Left Side: Broadcaster Info & Viewers */}
              <View>
                <View className="bg-black/40 rounded-full flex-row items-center p-1 pr-4 mb-2">
                  <View className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center mr-2">
                    <Text className="text-white font-bold">PK</Text>
                  </View>
                  <View className="mr-3">
                    <Text className="text-white font-bold text-sm">PokemonKing</Text>
                    <View className="flex-row items-center">
                      <Ionicons name="star" size={10} color="#fbbf24" />
                      <Text className="text-white text-xs ml-1">4.7</Text>
                    </View>
                  </View>
                  <TouchableOpacity className="bg-blue-600 px-3 py-1.5 rounded-full">
                    <Text className="text-white text-xs font-bold">Follow</Text>
                  </TouchableOpacity>
                </View>

                {/* Viewer Count Badge */}
                <View className="bg-black/40 self-start rounded-full px-3 py-1 flex-row items-center">
                  <Ionicons name="eye" size={14} color="#ef4444" />
                  <Text className="text-white text-xs font-bold ml-1">{viewerCount} Watching</Text>
                </View>
              </View>

              {/* Right Side: Settings & Close */}
              <View className="flex-row gap-2">
                {isBroadcaster && (
                  <TouchableOpacity 
                    className="w-10 h-10 bg-black/40 rounded-full items-center justify-center"
                    onPress={handleSettings}
                  >
                    <Ionicons name="settings" size={20} color="white" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  className="w-10 h-10 bg-black/40 rounded-full items-center justify-center"
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Auction Top Overlay */}
            <View className="absolute top-36 w-full items-center z-10" pointerEvents="none">
              <View className="bg-black/60 px-8 py-4 rounded-3xl border border-yellow-500/50 shadow-lg shadow-yellow-500/30">
                <Text className="text-yellow-400 font-black text-lg tracking-wider text-center uppercase">En Yüksek Teklif</Text>
                <Text className="text-white font-black text-4xl text-center mt-1">₺{currentHighestBid}</Text>
              </View>
            </View>

            {/* Chat Overlay */}
            <View className="w-2/3 h-1/2 justify-end pb-2 px-4">
              <ScrollView 
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.map((msg, index) => (
                  <ChatBubble 
                    key={msg.id || index.toString()} 
                    msg={msg} 
                    onComplete={(id) => {
                      setMessages(prev => prev.filter(m => m.id !== id));
                    }}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Chat Input Bar */}
            <View className="w-full flex-row items-center px-4 mb-4">
              <View className="flex-1 bg-black/60 rounded-full flex-row items-center px-4 py-3.5 mr-3 shadow-lg shadow-black/50 border border-white/10 backdrop-blur-md">
                <TextInput 
                  className="flex-1 text-white text-base font-semibold"
                  placeholder="Sohbete katıl..."
                  placeholderTextColor="#9ca3af"
                  value={chatInput}
                  onChangeText={setChatInput}
                  onSubmitEditing={handleSendMessage}
                  returnKeyType="send"
                  onFocus={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setIsChatFocused(true);
                  }}
                  onBlur={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setIsChatFocused(false);
                  }}
                />
                <TouchableOpacity onPress={handleSendMessage}>
                  <Ionicons name="send" size={20} color="#60a5fa" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity className="w-12 h-12 bg-black/60 rounded-full items-center justify-center shadow-lg shadow-black/50 border border-white/10 backdrop-blur-md">
                <Ionicons name="share-social-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* NEW Quick Bid Bottom Bar */}
            {!isChatFocused && !isBroadcaster && (
              <View className="h-28 bg-transparent flex-row items-end justify-center px-4 pb-6 gap-4" pointerEvents="box-none">
                <TouchableOpacity 
                  className="bg-zinc-800/90 px-6 py-4 rounded-full border border-zinc-600 shadow-lg"
                  onPress={() => placeBid(10)}
                >
                  <Text className="text-white font-black text-lg">+10 ₺</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="bg-orange-600/90 px-6 py-4 rounded-full border border-orange-500 shadow-lg shadow-orange-500/40"
                  onPress={() => placeBid(50)}
                >
                  <Text className="text-white font-black text-lg">+50 ₺</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="bg-yellow-500/90 px-6 py-4 rounded-full border border-yellow-400 shadow-lg shadow-yellow-500/40"
                  onPress={() => placeBid(100)}
                >
                  <Text className="text-black font-black text-lg">+100 ₺</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Host End Auction Button */}
            {!isChatFocused && isBroadcaster && (
               <View className="h-28 bg-transparent flex-row items-end justify-center px-4 pb-6" pointerEvents="box-none">
                  <TouchableOpacity 
                    className="bg-red-600/90 px-8 py-4 rounded-full border border-red-500 shadow-lg shadow-red-500/40"
                  >
                    <Text className="text-white font-black text-lg">Açık Artırmayı Bitir</Text>
                  </TouchableOpacity>
               </View>
            )}
            
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};
