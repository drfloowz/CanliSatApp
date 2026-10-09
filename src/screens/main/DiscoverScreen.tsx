import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Image, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useNavigation, NavigationProp } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 64) / 2;

export const DiscoverScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const [trendingStreams, setTrendingStreams] = useState<any[]>([]);

  const categories = [
    { id: '1', name: 'Giyim', icon: 'shirt-outline' },
    { id: '2', name: 'Sneaker', icon: 'footsteps-outline' },
    { id: '3', name: 'Elektronik', icon: 'hardware-chip-outline' },
    { id: '4', name: 'Saat', icon: 'watch-outline' },
    { id: '5', name: 'Koleksiyon', icon: 'diamond-outline' },
  ];

  const fetchDiscoverData = async () => {
    try {
      // Fetch trending streams
      const { data: streamsData, error: streamsError } = await supabase
        .from('live_streams')
        .select(`
          *,
          profiles:host_id (username)
        `)
        .eq('status', 'live')
        .order('created_at', { ascending: false });

      if (streamsError) throw streamsError;
      setTrendingStreams(streamsData || []);
    } catch (err) {
      console.error('Error fetching discover data:', err);
    }
  };

  useEffect(() => {
    // 1. Sayfaya her odaklanıldığında veriyi çek
    const unsubscribeFocus = navigation.addListener('focus', () => {
      fetchDiscoverData(); // Veya senin fonksiyonunun adı fetchTrendingStreams ise onu yaz
    });

    // 2. İlk açılışta veriyi çek
    fetchDiscoverData();

    // 3. Supabase Realtime (Benzersiz kanal ismiyle!)
    // Kanal ismine Date.now() ekliyoruz ki, eski açık kalan kanallarla çakışıp hata vermesin.
    const channelName = `discover_live_streams_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_streams' },
        (payload) => {
          fetchDiscoverData();
        }
      )
      .subscribe();

    // 4. Sayfadan çıkıldığında radarı temizle
    return () => {
      unsubscribeFocus();
      supabase.removeChannel(channel);
    };
  }, [navigation]);

  // UI Components
  const renderSearchBar = () => (
    <View className="px-6 py-2 mb-6">
      <View className="flex-row items-center bg-[#1E1E1E] rounded-2xl px-4 h-14 border border-zinc-800">
        <Ionicons name="search" size={20} color="#a1a1aa" />
        <TextInput
          placeholder="Yayıncı, kategori veya ürün ara..."
          placeholderTextColor="#a1a1aa"
          className="flex-1 ml-3 text-white text-[15px]"
        />
        <TouchableOpacity className="bg-zinc-800 p-2 rounded-xl">
          <Ionicons name="options" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategories = () => (
    <View className="mb-8">
      <View className="px-6 mb-3">
        <Text className="text-white text-lg font-bold">Kategorileri Keşfet</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6">
        {categories.map((cat) => (
          <TouchableOpacity key={cat.id} className="mr-4 items-center bg-[#1E1E1E] border border-zinc-800 px-6 py-4 rounded-3xl">
            <View className="w-12 h-12 rounded-full bg-zinc-800/50 items-center justify-center mb-3">
              <Ionicons name={cat.icon as any} size={24} color="#FF6B00" />
            </View>
            <Text className="text-white font-bold text-[13px]">{cat.name}</Text>
          </TouchableOpacity>
        ))}
        <View className="w-6" />
      </ScrollView>
    </View>
  );

  const renderLiveStreamCard = ({ item }: { item: any }) => {
    const sellerName = item.profiles?.username || 'Satıcı';
    const coverImage = item.cover_url || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80';
    const priceText = item.mode === 'auction' ? 'Mezat' : 'Ürün Tanıtımı';

    return (
      <TouchableOpacity
        className="mb-5 bg-[#1E1E1E] rounded-3xl overflow-hidden border border-zinc-800"
        style={{ width: CARD_WIDTH }}
        onPress={() => navigation.navigate('LiveStreamRoom', { streamId: item.id, mode: item.mode || 'auction', isHost: false, hostId: item.host_id })}
      >
        <View className="w-full h-48 relative">
          <Image source={{ uri: coverImage }} className="w-full h-full" resizeMode="cover" />
          <View className="absolute inset-0 bg-black/40" />
          <View className="absolute top-2 left-2 right-2 flex-row justify-between items-center">
            <View className="bg-red-600 px-2 py-1 rounded-md flex-row items-center">
              <View className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-1" />
              <Text className="text-white text-[9px] font-black tracking-wider">CANLI</Text>
            </View>
            <View className="bg-black/60 px-2 py-1 rounded-md flex-row items-center backdrop-blur-md">
              <Ionicons name="eye" size={10} color="white" />
              <Text className="text-white text-[10px] font-bold ml-1">{item.viewer_count || 0}</Text>
            </View>
          </View>
        </View>
        <View className="p-3">
          <Text className="text-white font-bold text-[13px] mb-1 leading-5" numberOfLines={2}>{item.title}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SellerProfile', { sellerId: item.host_id || item.id })}>
            <Text className="text-zinc-400 text-[11px] mb-2">@{sellerName}</Text>
          </TouchableOpacity>
          <Text className="text-[#FF6B00] font-black text-[13px]">{priceText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#121212]" edges={['top']}>
      {/* Simple Header */}
      <View className="px-6 py-4">
        <Text className="text-white text-2xl font-black tracking-wide">Keşfet</Text>
      </View>

      <FlatList
        data={trendingStreams}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {renderSearchBar()}
            {renderCategories()}
            <View className="px-6 mb-4 mt-2">
              <Text className="text-white text-lg font-bold tracking-wide">Önerilen Yayınlar</Text>
            </View>
          </View>
        }
        renderItem={renderLiveStreamCard}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
};
