import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, SafeAreaView, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useBidStore } from '../store/useBidStore';

const ChatBubble = ({ msg, onComplete }: { msg: any, onComplete: (id: any) => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Mesaj geldiğinde görünür yap
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // 4.5 saniye ekranda kalsın, sonra yavaşça kaybolsun
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          // Animasyon bitince parent bileşene haber ver ki listeden (state) silsin
          if (onComplete) onComplete(msg.id);
        });
      }, 4500);
    });
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim }} className="bg-black/40 self-start px-3 py-2 rounded-xl mb-2 flex-row items-center">
      {/* Kullanıcı Profili (İsmin ilk harfi) */}
      <View className="w-6 h-6 rounded-full bg-blue-500 mr-2 items-center justify-center">
         <Text className="text-white text-xs font-bold">{msg.user_name?.charAt(0) || 'U'}</Text>
      </View>
      <View>
        <Text className="text-gray-300 font-bold text-xs">{msg.user_name}</Text>
        <Text className="text-white text-sm mt-0.5">{msg.message}</Text>
      </View>
    </Animated.View>
  );
};

export const LiveStreamRoomScreen = ({ navigation, route }: any) => {
  const productId = route?.params?.streamId || 'charizard_1';
  
  const [productName, setProductName] = useState('Charizard Holo');
  const { bidsByProduct, setCurrentBid } = useBidStore();
  const currentBid = bidsByProduct[productId] || 0;
  
  const [customBid, setCustomBid] = useState('');
  
  // Phase 5 States
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Temporary broadcaster flag for testing
  const isBroadcaster = true;
  const currentUser = 'TestUser';

  useEffect(() => {
    // 1. Fetch & Listen to Bids
    const bidsChannel = supabase
      .channel(`bids-channel-${productId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids' },
        (payload) => {
          if (payload.new && typeof payload.new.amount === 'number') {
            if (!payload.new.product_id || payload.new.product_id === productId) {
              setCurrentBid(productId, payload.new.amount);
            }
          }
        }
      )
      .subscribe();

    // 2. Fetch & Listen to Chat Messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', productId)
        .order('created_at', { ascending: true })
        .limit(50);
      if (data) setMessages(data);
    };
    fetchMessages();

    const chatChannel = supabase
      .channel(`chat-channel-${productId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${productId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    // 3. Fetch & Listen to Room Viewer Count
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('viewer_count')
        .eq('id', productId)
        .single();
      
      if (data) {
        setViewerCount(data.viewer_count);
      } else {
        // If room doesn't exist, create it with random viewers
        const randomViewers = Math.floor(Math.random() * 50) + 10;
        setViewerCount(randomViewers);
        await supabase.from('rooms').insert([{ 
          id: productId, 
          room_name: `Room ${productId}`, 
          viewer_count: randomViewers,
          is_live: true 
        }]);
      }
    };
    fetchRoom();

    const roomChannel = supabase
      .channel(`room-channel-${productId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${productId}` },
        (payload) => {
          if (payload.new && payload.new.viewer_count !== undefined) {
            setViewerCount(payload.new.viewer_count);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bidsChannel);
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [productId]);

  const handleBid = async () => {
    const bidAmount = parseInt(customBid, 10);
    if (isNaN(bidAmount) || bidAmount <= currentBid) {
      Alert.alert('Teklifiniz en son fiyatın üzerinde olmalı!');
      return;
    }
    if (!productName || productName.trim() === '') {
      Alert.alert('Ürün bilgisi eksik!', 'Teklif verebilmek için ürün adının yüklendiğinden emin olun.');
      return;
    }
    setCurrentBid(productId, bidAmount);
    setCustomBid('');
    const { error } = await supabase.from('bids').insert([{ 
      amount: bidAmount,
      product_id: productId, 
      product_name: productName,
      user_name: currentUser
    }]);
    if (error) console.error('Error placing bid:', error.message);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    const { error } = await supabase.from('chat_messages').insert([{
      room_id: productId,
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
                      setCurrentBid(productId, 0); // Fiyatı sıfırla
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
    <View className="flex-1 bg-gray-900 relative">
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

      {/* Product & Bid Overlay */}
      <View className="absolute bottom-24 right-4 z-10 w-48 bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-lg">
        <View className="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2 items-center justify-center">
          <Ionicons name="image-outline" size={32} color="#9ca3af" />
        </View>
        <Text className="text-black dark:text-white font-bold text-sm mb-1" numberOfLines={1}>
          {productName}
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-xs mb-3">
          Current Bid: <Text className="font-bold text-black dark:text-white">${currentBid}</Text>
        </Text>
        <View className="flex-row items-center mb-2">
          <Text className="text-black dark:text-white font-bold mr-2">$</Text>
          <TextInput 
            className="flex-1 bg-gray-100 dark:bg-gray-700 text-black dark:text-white px-3 py-2 rounded-lg"
            placeholder={String(currentBid === 0 ? 5 : currentBid + 5)}
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            value={customBid}
            onChangeText={setCustomBid}
          />
        </View>
        <TouchableOpacity 
          className="w-full bg-green-500 py-3 rounded-xl items-center shadow-sm"
          onPress={handleBid}
        >
          <Text className="text-white font-bold text-lg">Teklif Ver</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Overlay */}
      <View className="absolute bottom-24 left-4 z-10 w-2/3 h-1/2 justify-end pb-2">
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

      {/* Bottom Interaction Bar */}
      <View className="absolute bottom-0 w-full z-20 flex-row items-center px-4 pb-8 bg-gradient-to-t from-black/80 to-transparent pt-4">
        <View className="flex-1 bg-black/40 rounded-full flex-row items-center px-4 py-3 mr-3 border border-white/20">
          <TextInput 
            className="flex-1 text-white text-base"
            placeholder="Say something..."
            placeholderTextColor="#9ca3af"
            value={chatInput}
            onChangeText={setChatInput}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={handleSendMessage}>
            <Ionicons name="send" size={18} color="white" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity className="w-12 h-12 bg-black/40 rounded-full items-center justify-center mr-2">
          <Ionicons name="wallet-outline" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity className="w-12 h-12 bg-black/40 rounded-full items-center justify-center">
          <Ionicons name="share-social-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
