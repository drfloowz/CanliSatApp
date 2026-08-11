import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ImageBackground, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';

const { width } = Dimensions.get('window');

const BANNERS = [
  { id: '1', title: 'Summer Sale', desc: 'Up to 50% off on Sneakers', color: 'bg-purple-600' },
  { id: '2', title: 'Vintage Comics', desc: 'Rare finds tonight at 8 PM', color: 'bg-blue-600' },
  { id: '3', title: 'Pokemon Cards', desc: 'Box Breaks with ProCollector', color: 'bg-emerald-600' },
];

const CATEGORIES = [
  { id: 'all', labelKey: 'home.catAll' },
  { id: 'clothing', labelKey: 'home.catClothing' },
  { id: 'collectibles', labelKey: 'home.catCollectibles' },
  { id: 'electronics', labelKey: 'home.catElectronics' },
];

export const HomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const [liveStreams, setLiveStreams] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch initial live streams
    const fetchLiveStreams = async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('status', 'live');
      
      if (data) {
        setLiveStreams(data);
        
        // Auto-Rejoin Logic: If the current user has an active stream, immediately navigate them
        if (user) {
          const activeHostStream = data.find(stream => stream.host_id === user.id);
          if (activeHostStream) {
            navigation.navigate('LiveStreamRoom', { stream: activeHostStream, isHost: true });
          }
        }
      }
    };
    
    fetchLiveStreams();

    // 2. Subscribe to realtime updates for live_streams table
    const uniqueChannelName = `home_live_streams_${Date.now()}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_streams' }, (payload: any) => {
        if (payload.new && payload.new.status === 'live') {
          setLiveStreams((prev) => [payload.new, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_streams' }, (payload: any) => {
        if (payload.new && payload.new.status === 'ended') {
          setLiveStreams((prev) => prev.filter(stream => stream.id !== payload.new.id));
        } else if (payload.new && payload.new.status === 'live') {
          // Edge case: update to live from another status, or stream metadata updated
          setLiveStreams((prev) => {
            const exists = prev.some(s => s.id === payload.new.id);
            if (!exists) return [payload.new, ...prev];
            return prev.map(s => s.id === payload.new.id ? payload.new : s);
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigation]);

  return (
    <SafeAreaView className="flex-1 bg-[#121212]" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* Header / Logo Area */}
        <View className="px-5 py-4">
          <Text className="text-3xl font-extrabold text-white tracking-tight">CanlıSat</Text>
        </View>

        {/* Banners */}
        <View className="mt-2">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            snapToInterval={width * 0.8 + 16}
            decelerationRate="fast"
          >
            {BANNERS.map((banner) => (
              <TouchableOpacity
                key={banner.id}
                activeOpacity={0.9}
                style={{ width: width * 0.8 }}
                className={`h-40 ${banner.color} mr-4 rounded-2xl p-5 justify-between shadow-lg relative overflow-hidden`}
              >
                <View className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full" />
                <View className="absolute -left-5 -bottom-5 w-24 h-24 bg-black/10 rounded-full" />

                <View>
                  <View className="bg-white/20 self-start px-2 py-1 rounded mb-2">
                    <Text className="text-white text-xs font-bold tracking-wider uppercase">Promosyon</Text>
                  </View>
                  <Text className="text-white text-2xl font-black">{banner.title}</Text>
                </View>
                <Text className="text-white/90 text-sm font-semibold">{banner.desc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Categories */}
        <View className="mt-8 px-5">
          <Text className="text-xl font-bold text-white mb-4">{t('home.categories')}</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="-mx-5"
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {CATEGORIES.map((cat, index) => (
              <TouchableOpacity
                key={cat.id}
                className={`px-5 py-2.5 rounded-full border ${index === 0 ? 'bg-white border-white' : 'bg-zinc-900 border-zinc-800'}`}
              >
                <Text className={`font-semibold ${index === 0 ? 'text-black' : 'text-zinc-300'}`}>
                  {t(cat.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Live Streams 2-Column Grid */}
        <View className="mt-8 px-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-white">{t('home.activeStreams')}</Text>
            <TouchableOpacity>
              <Text className="text-zinc-400 font-semibold">{t('home.seeAll')}</Text>
            </TouchableOpacity>
          </View>

          {liveStreams.length === 0 ? (
            <View className="py-10 items-center justify-center">
              <Ionicons name="videocam-off-outline" size={48} color="#52525b" />
              <Text className="text-zinc-400 mt-4">Şu an aktif yayın bulunmuyor.</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {liveStreams.map((stream) => (
                <View key={stream.id} className="w-[48%] mb-4">
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('LiveStreamRoom', { stream: stream, isHost: false })}
                  >
                    <View className="w-full aspect-[3/4] bg-zinc-800 rounded-2xl overflow-hidden shadow-lg border border-zinc-800/50">
                      <ImageBackground 
                        source={{ uri: stream.cover_image || `https://picsum.photos/seed/${stream.id}/400/600` }}
                        className="w-full h-full"
                        imageStyle={{ opacity: 0.9 }}
                      >
                        <LinearGradient
                          colors={['rgba(0,0,0,0.6)', 'transparent']}
                          className="absolute top-0 w-full h-20 z-0"
                        />
                        
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.8)']}
                          className="absolute bottom-0 w-full h-24 z-0"
                        />

                        <View className="absolute top-2 left-2 bg-red-600 px-2 py-1 rounded flex-row items-center gap-1 z-10 shadow-sm shadow-black">
                          <View className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <Text className="text-white text-[10px] font-black uppercase tracking-widest">{t('home.live')}</Text>
                        </View>

                        <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded flex-row items-center gap-1 z-10 backdrop-blur-sm">
                          <Ionicons name="eye" size={10} color="white" />
                          <Text className="text-white text-[10px] font-bold">12</Text>
                        </View>

                        <View className="absolute bottom-2 left-2 right-2 flex-row items-center gap-2 z-10">
                          <View className="w-7 h-7 rounded-full bg-zinc-700 items-center justify-center border border-white/20 overflow-hidden shadow-md shadow-black">
                            <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${stream.host_id}` }} className="w-full h-full" />
                          </View>
                          <Text className="text-white font-bold text-xs flex-1 tracking-tight drop-shadow-md" numberOfLines={1}>
                            Satıcı
                          </Text>
                        </View>
                      </ImageBackground>
                    </View>
                    
                    <Text className="text-white font-semibold text-sm mt-2 px-1" numberOfLines={2}>
                      {stream.title}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
