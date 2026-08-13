import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Animated, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, LayoutAnimation, UIManager, ActivityIndicator, PermissionsAndroid, Modal } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import { createAgoraRtcEngine, RtcSurfaceView, ChannelProfileType, ClientRoleType, IRtcEngine, RenderModeType } from 'react-native-agora';
import { supabase } from '../services/supabase';
import { useBidStore } from '../store/useBidStore';
import { useAuthStore } from '../store/useAuthStore';

export const ChatBubble = ({ msg }: { msg: any }) => {
  return (
    <View className="self-start mb-2 px-3 py-1.5 bg-black/40 rounded-2xl max-w-[85%]">
      <Text style={{ lineHeight: 20 }}>
        <Text className="text-gray-300 font-bold text-[14px]">
          {msg.user_name || 'Kullanıcı'}{'   '}
        </Text>
        <Text className="text-white text-[14px] font-medium">
          {msg.message}
        </Text>
      </Text>
    </View>
  );
};

export const LiveStreamRoomScreen = ({ navigation, route }: any) => {
  const roomId = route?.params?.stream?.id || route?.params?.streamId || 'test-room-123';

  const [productName, setProductName] = useState('Canlı Satış');
  const [currentHighestBid, setCurrentHighestBid] = useState(0);
  const [highestBidderName, setHighestBidderName] = useState('');

  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [isAuctionEnded, setIsAuctionEnded] = useState(false);
  const [productDetails, setProductDetails] = useState<any>(null);

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
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteVideoMuted, setRemoteVideoMuted] = useState(false);
  const [remoteAudioMuted, setRemoteAudioMuted] = useState(false);

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

        engine.current.addListener('onUserMuteVideo', (connection, uid, muted) => {
          setRemoteVideoMuted(muted);
        });

        engine.current.addListener('onUserMuteAudio', (connection, uid, muted) => {
          setRemoteAudioMuted(muted);
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
    // Fallback to a hardcoded product ID for MVP testing if stream doesn't have one
    const productId = stream?.product_id || "7b34a8bf-fe6c-4153-a4d2-7be71bc7e934";

    // FETCH INITIAL AUCTION STATE
    const fetchInitialAuctionState = async () => {
      // 1. Fetch Product Starting Price
      const { data: productData } = await supabase
        .from('products')
        .select('name, description, price, starting_price')
        .eq('id', productId)
        .single();

      const startPrice = productData?.starting_price || productData?.price || 0;
      setProductDetails(productData);
      if (productData?.name) setProductName(productData.name);

      // 2. Fetch Highest Bid
      const { data: bidsData } = await supabase
        .from('bids')
        .select('amount, user_id')
        .eq('product_id', productId)
        .order('amount', { ascending: false })
        .limit(1)
        .single();

      if (bidsData) {
        setCurrentHighestBid(bidsData.amount);
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, full_name, name')
          .eq('id', bidsData.user_id)
          .single();
        setHighestBidderName(profile?.username || profile?.display_name || profile?.full_name || profile?.name || 'Gizli Kullanıcı');
      } else {
        setCurrentHighestBid(startPrice);
      }
    };
    fetchInitialAuctionState();

    const bidsChannel = supabase
      .channel(`bids-channel-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids', filter: `product_id=eq.${productId}` }, async (payload) => {
        if (payload.new && typeof payload.new.amount === 'number') {
          setCurrentHighestBid(payload.new.amount);

          if (payload.new.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, display_name, full_name, name')
              .eq('id', payload.new.user_id)
              .single();
            setHighestBidderName(profile?.username || profile?.display_name || profile?.full_name || profile?.name || 'Gizli Kullanıcı');
          }
        }
      })
      .subscribe();

    // Sohbet geçmişi yüklenmiyor, liste boş başlıyor. Sadece yeni gelen mesajlar eklenecek.
    const chatChannel = supabase
      .channel(`chat-channel-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `stream_id=eq.${roomId}` }, (payload) => {
        if (payload.new.message === 'SYSTEM_AUCTION_ENDED') {
          setIsAuctionEnded(true);
        } else {
          setMessages((prev) => [...prev, payload.new]);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }
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
    // Fallback to a hardcoded product ID for MVP testing if stream doesn't have one
    const targetProductId = stream?.product_id || "7b34a8bf-fe6c-4153-a4d2-7be71bc7e934";

    console.log("TESTING BID - Target Product ID:", targetProductId);

    if (!targetProductId) {
      Alert.alert('Hata', 'Bu yayına bağlı geçerli bir ürün (product_id) bulunamadı!');
      return;
    }

    const { error } = await supabase.from('bids').insert([{
      product_id: targetProductId,
      user_id: user?.id,
      amount: newBid
    }]);

    if (error) {
      console.error('Error placing bid:', error.message);
    }
  };

  const handleEndAuction = async () => {
    setIsAuctionEnded(true);
    await supabase.from('chat_messages').insert([{
      stream_id: roomId,
      user_id: user?.id,
      message: 'SYSTEM_AUCTION_ENDED'
    }]);
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

    if (error) {
      console.error('Error sending message:', error.message);
    } else {
      Keyboard.dismiss();
    }
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

      {/* Video Paused Overlay */}
      {((!isBroadcaster && remoteVideoMuted) || (isBroadcaster && isVideoOff)) && (
        <View 
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 10, 10, 0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 5 }]}
          pointerEvents="none"
        >
          <View className="bg-black/40 p-6 rounded-3xl items-center border border-white/10 w-3/4">
            <Ionicons name="videocam-off" size={56} color="rgba(255,255,255,0.9)" />
            <Text className="text-white text-lg mt-4 font-semibold tracking-wide text-center">
              {isBroadcaster ? "Görüntünüzü duraklattınız" : "Yayıncı görüntüyü duraklattı"}
            </Text>
            {!isBroadcaster && (
              <Text className="text-white/60 text-sm mt-2 text-center">
                Lütfen ayrılmayın, yayın kısa süre içinde devam edecek...
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Audio Muted Badge (Show only if video is still active) */}
      {(!isBroadcaster && remoteAudioMuted && !remoteVideoMuted) && (
        <View className="absolute top-1/2 self-center bg-red-600/90 px-4 py-2 rounded-full flex-row items-center z-10 shadow-lg shadow-black/50">
          <Ionicons name="mic-off" size={18} color="white" />
          <Text className="text-white text-sm font-bold ml-2">Yayıncı Sessizde</Text>
        </View>
      )}

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
                <View className="bg-black/40 self-start rounded-full px-3 py-1 flex-row items-center mb-2">
                  <Ionicons name="eye" size={14} color="#ef4444" />
                  <Text className="text-white text-xs font-bold ml-1">{viewerCount} Watching</Text>
                </View>

                {/* Product Details Button */}
                <TouchableOpacity
                  className="bg-blue-600/80 self-start rounded-full px-3 py-1.5 flex-row items-center"
                  onPress={() => setIsProductModalVisible(true)}
                >
                  <Text className="text-white text-xs font-bold">ℹ️ Ürün Detayları</Text>
                </TouchableOpacity>

                {/* Host Controls (Top Left - Vertical Stack) */}
                {isBroadcaster && (
                  <View className="flex-col items-center mt-3 ml-2 w-12">
                    <TouchableOpacity onPress={switchCamera} className="items-center justify-center w-10 h-10 bg-black/60 rounded-full border border-white/20 mb-3">
                      <Ionicons name="camera-reverse-outline" size={20} color="white" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={toggleMic} className="items-center justify-center w-10 h-10 bg-black/60 rounded-full border border-white/20 mb-3">
                      <Ionicons name={isMuted ? "mic-off" : "mic"} size={20} color={isMuted ? "#ef4444" : "white"} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={toggleVideo} className="items-center justify-center w-10 h-10 bg-black/60 rounded-full border border-white/20">
                      <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={20} color={isVideoOff ? "#ef4444" : "white"} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Right Side: Actions & Close */}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="w-10 h-10 bg-black/40 rounded-full items-center justify-center"
                  onPress={() => { /* Handle Share */ }}
                >
                  <Ionicons name="share-social-outline" size={20} color="white" />
                </TouchableOpacity>
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

            {/* SOLD Overlay */}
            {isAuctionEnded && (
              <View className="absolute inset-0 items-center justify-center z-50" pointerEvents="none">
                <View className="bg-black/80 p-8 rounded-3xl border-4 border-yellow-500 shadow-2xl shadow-yellow-500/50 transform -rotate-12">
                  <Text className="text-yellow-400 font-black text-6xl text-center mb-2">SATILDI! 🎉</Text>
                  <Text className="text-white font-bold text-2xl text-center">Kazanan:</Text>
                  <Text className="text-green-400 font-black text-3xl text-center">{highestBidderName}</Text>
                </View>
              </View>
            )}

            {/* Sleek Auction Top Overlay */}
            {!isAuctionEnded && (
              <View className="absolute top-24 right-4 z-10" pointerEvents="none">
                <View className="bg-black/60 rounded-full px-4 py-2 backdrop-blur-sm border border-yellow-500/50 shadow-lg shadow-black/50 flex-row items-center w-auto max-w-[220px] mt-4">
                  <View className="bg-yellow-500/20 w-8 h-8 rounded-full items-center justify-center mr-2 flex-shrink-0">
                    <Ionicons name="pricetag" size={16} color="#fbbf24" />
                  </View>
                  <View className="flex-shrink">
                    <Text className="text-yellow-400 font-black text-xl" numberOfLines={1}>₺{currentHighestBid}</Text>
                    <Text className="text-white text-xs font-bold" numberOfLines={1}>{highestBidderName || 'Başlangıç Fiyatı'}</Text>
                  </View>
                </View>
              </View>
            )}

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
                  />
                ))}
              </ScrollView>
            </View>

            {/* Chat Input Bar */}
            <View className="w-full flex-row items-center px-4 mb-4">
              <View className="flex-1 bg-black/40 rounded-full flex-row items-center h-[44px] px-4 border border-white/20">
                <TextInput
                  className="flex-1 text-white text-[15px]"
                  style={{ height: 44, paddingVertical: 0, margin: 0, textAlignVertical: 'center' }}
                  placeholder="Sohbete katıl..."
                  placeholderTextColor="#e5e7eb"
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
                  <Ionicons name="send" size={20} color="#3b82f6" />
                </TouchableOpacity>
              </View>
            </View>

            {/* NEW Quick Bid Bottom Bar */}
            {!isChatFocused && !isBroadcaster && !isAuctionEnded && (
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
            {!isChatFocused && isBroadcaster && !isAuctionEnded && (
              <View className="h-28 bg-transparent flex-row items-end justify-center px-4 pb-6" pointerEvents="box-none">
                <TouchableOpacity
                  className="bg-red-600/90 px-8 py-4 rounded-full border border-red-500 shadow-lg shadow-red-500/40"
                  onPress={handleEndAuction}
                >
                  <Text className="text-white font-black text-lg">🔨 Satışı Kapat</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Product Info Modal */}
      <Modal visible={isProductModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-zinc-900 w-full p-6 rounded-3xl border border-zinc-700 shadow-2xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white font-black text-2xl">{productDetails?.name || productName}</Text>
              <TouchableOpacity onPress={() => setIsProductModalVisible(false)} className="bg-zinc-800 p-2 rounded-full">
                <Ionicons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <View className="bg-black/40 p-4 rounded-2xl mb-6">
              <Text className="text-gray-300 text-base leading-6">
                {productDetails?.description || "Bu ürün hakkında henüz detaylı bir açıklama girilmemiş."}
              </Text>
            </View>

            <View className="flex-row justify-between items-center bg-zinc-800 p-4 rounded-2xl">
              <Text className="text-gray-400 font-bold">Piyasa Değeri:</Text>
              <Text className="text-green-400 font-black text-xl">₺{productDetails?.price || 0}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
