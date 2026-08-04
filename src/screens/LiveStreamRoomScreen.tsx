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
  const roomId = route?.params?.streamId || 'test-room-123';
  
  const [productName, setProductName] = useState('Canlı Satış');
  const { bidsByProduct, setCurrentBid } = useBidStore();
  const currentBid = bidsByProduct[roomId] || 0;
  const [customBid, setCustomBid] = useState('');
  
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [isChatFocused, setIsChatFocused] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const { user } = useAuthStore();
  const currentUser = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonim';

  // Gerçek Yayıncı Flag'i (Ana sayfadan gelen parametreye göre)
  const isBroadcaster = route?.params?.isHost || false;

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
        
        // KRİTİK: Video modülünü hemen aktifleştir
        engine.current.enableVideo();

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
          engine.current.enableLocalAudio(false);
          engine.current.enableLocalVideo(false);
        }

        console.log('Agora Bağlanılıyor. Kanal:', channelName, '| Yayıncı mı:', isBroadcaster);

        // KRİTİK EKSİK: v4 SDK'da yayıncının kamerasını/sesini kanala publish etmesi (göndermesi) için açıkça belirtilmelidir.
        engine.current.joinChannel(token, channelName, 0, {
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
    if (!isBroadcaster) {
      supabase.from('chat_messages').insert([{
        room_id: roomId,
        user_name: 'SYSTEM',
        message: `${currentUser} yayına katıldı 🎉`,
      }]).then();
    }

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, (payload) => {
        if (payload.new && typeof payload.new.amount === 'number') {
          if (!payload.new.product_id || payload.new.product_id === roomId) {
            setCurrentBid(roomId, payload.new.amount);
          }
        }
      })
      .subscribe();

    // Sohbet geçmişi yüklenmiyor, liste boş başlıyor. Sadece yeni gelen mesajlar eklenecek.
    const chatChannel = supabase
      .channel(`chat-channel-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, (payload) => {
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

  const handleBid = async () => {
    // Otomatik olarak mevcut teklife +5 ekle (WhatNot hızlı teklif tarzı)
    const bidAmount = customBid.trim() !== '' ? parseInt(customBid, 10) : (currentBid + 5);
    
    if (isNaN(bidAmount) || bidAmount <= currentBid) {
      Alert.alert('Teklifiniz en son fiyatın üzerinde olmalı!');
      return;
    }

    const { error } = await supabase.from('bids').insert([{
      product_id: roomId,
      product_name: productName,
      user_name: currentUser,
      amount: bidAmount
    }]);

    if (error) {
      console.error('Error placing bid:', error.message);
    } else {
      setCustomBid('');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    const { error } = await supabase.from('chat_messages').insert([{
      room_id: roomId,
      user_name: currentUser,
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
                      setCurrentBid(roomId, 0); // Fiyatı sıfırla
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
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 justify-end relative">
            
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

            {/* NEW Fixed Bottom Bar: Product & Bid */}
            {!isChatFocused && (
              <View className="h-28 bg-black/90 rounded-t-2xl flex-row items-center px-4">
                {/* Left 2/3: Product Info */}
                <View className="flex-[2] flex-row items-center border-r border-white/10 pr-3 h-full">
                  <View className="w-16 h-16 bg-white/10 rounded-xl items-center justify-center mr-3">
                    <Ionicons name="image-outline" size={28} color="#9ca3af" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="text-white font-bold text-sm" numberOfLines={1}>{productName}</Text>
                    <Text className="text-gray-400 text-xs mt-1">En Yüksek:</Text>
                    <Text className="text-green-400 font-extrabold text-lg">${currentBid}</Text>
                  </View>
                </View>
                
                {/* Right 1/3: Custom Bid Input & Button */}
                <View className="flex-1 pl-3 h-full justify-center">
                  <View className="bg-white/10 rounded-lg flex-row items-center px-2 py-1.5 mb-2">
                    <Text className="text-green-400 font-bold mr-1">$</Text>
                    <TextInput
                      className="flex-1 text-white font-bold text-center"
                      placeholder="Miktar"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      returnKeyType="done"
                      value={customBid}
                      onChangeText={setCustomBid}
                    />
                  </View>
                  <TouchableOpacity 
                    className="w-full h-12 bg-green-500 rounded-xl items-center justify-center shadow-lg shadow-green-500/30"
                    onPress={handleBid}
                  >
                    <Text className="text-white font-extrabold text-sm uppercase tracking-wider">Teklif Ver</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};
