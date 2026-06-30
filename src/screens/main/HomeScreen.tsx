import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

const LIVE_STREAMS = [
  { id: '1', broadcaster: 'PokemonKing', viewers: '1.2k', image: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?q=80&w=600&auto=format&fit=crop' },
  { id: '2', broadcaster: 'CardMaster', viewers: '850', image: 'https://images.unsplash.com/photo-1601850494422-3fb19e13f04f?q=80&w=600&auto=format&fit=crop' },
  { id: '3', broadcaster: 'SneakerHead', viewers: '3.4k', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600&auto=format&fit=crop' },
  { id: '4', broadcaster: 'VintageToys', viewers: '420', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=600&auto=format&fit=crop' },
  { id: '5', broadcaster: 'TechGuru', viewers: '2.1k', image: 'https://images.unsplash.com/photo-1550009158-9c16fea57fae?q=80&w=600&auto=format&fit=crop' },
  { id: '6', broadcaster: 'ArtisanCrafts', viewers: '150', image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?q=80&w=600&auto=format&fit=crop' },
];

export const HomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();

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
                {/* Decorative background shapes can go here if needed */}
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

          <View className="flex-row flex-wrap justify-between">
            {LIVE_STREAMS.map((stream) => (
              <TouchableOpacity
                key={stream.id}
                activeOpacity={0.9}
                style={{ width: '48%', marginBottom: 16 }}
                onPress={() => navigation.navigate('LiveStreamRoom', { streamId: 'test-room-123', isHost: false })}
              >
                <View className="w-full aspect-[3/4] rounded-2xl bg-zinc-800 overflow-hidden relative">
                  {/* Background Image */}
                  <Image 
                    source={{ uri: stream.image }} 
                    className="absolute w-full h-full"
                    resizeMode="cover"
                  />
                  {/* Soft Gradient Overlay for text readability */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    className="absolute bottom-0 w-full h-2/3"
                  />

                  {/* LIVE Badge (Top Left) */}
                  <View className="absolute top-2 left-2 bg-red-600 px-2 py-1 rounded flex-row items-center gap-1">
                    <View className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <Text className="text-white text-[10px] font-black uppercase tracking-widest">{t('home.live')}</Text>
                  </View>

                  {/* Viewers (Top Right) */}
                  <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded flex-row items-center gap-1">
                    <Ionicons name="eye" size={10} color="white" />
                    <Text className="text-white text-[10px] font-bold">{stream.viewers}</Text>
                  </View>

                  {/* Broadcaster Info (Bottom Left) */}
                  <View className="absolute bottom-2 left-2 right-2 flex-row items-center gap-2">
                    <View className="w-7 h-7 rounded-full bg-zinc-700 items-center justify-center border border-zinc-500 overflow-hidden">
                      <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${stream.broadcaster}` }} className="w-full h-full" />
                    </View>
                    <Text className="text-white font-semibold text-xs flex-1 tracking-tight" numberOfLines={1}>
                      {stream.broadcaster}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* FAB: Start Live Stream */}
      <TouchableOpacity 
        className="absolute bottom-6 right-5 bg-red-600 h-14 w-14 rounded-full items-center justify-center shadow-lg shadow-red-600/30 active:opacity-80"
        onPress={() => navigation.navigate('LiveStreamRoom', { streamId: 'test-room-123', isHost: true })}
      >
        <Ionicons name="videocam" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};
