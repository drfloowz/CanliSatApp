import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, ScrollView, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useNavigation, NavigationProp } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 64) / 2;

export const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const [activeCategory, setActiveCategory] = useState('Tümü');
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const categories = ['Tümü', 'Takip Ettiklerim', 'Trendler', 'Giyim', 'Sneaker', 'Koleksiyon', 'Elektronik'];
  
  const promotions = [
    { id: '1', title: 'Summer Sale', desc: 'Sneakerlarda %50 indirim!', color: 'bg-[#7c3aed]', badge: 'PROMOSYON' },
    { id: '2', title: 'Nadir Parçalar', desc: 'Vintage koleksiyonu yayında', color: 'bg-[#2563eb]', badge: 'ÖZEL YAYIN' },
  ];

  const fetchLiveStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          *,
          profiles:host_id (username)
        `)
        .eq('status', 'live')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLiveStreams(data || []);
    } catch (err) {
      console.error('Error fetching live streams:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Fetch on screen focus
    const unsubscribeFocus = navigation.addListener('focus', () => {
      fetchLiveStreams();
    });

    // Initial fetch
    fetchLiveStreams();

    // Supabase Realtime Subscription
    const channel = supabase
      .channel('public:live_streams')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_streams' },
        (payload) => {
          // Whenever a stream is created, updated, or deleted, refresh the list automatically
          fetchLiveStreams();
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      unsubscribeFocus();
      supabase.removeChannel(channel);
    };
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLiveStreams();
  };

  const renderHeader = () => (
    <View className="px-6 py-4 flex-row justify-between items-center bg-[#121212] z-10">
      <Text className="text-white text-2xl font-black tracking-tighter italic">Canlı<Text className="text-[#FF6B00]">Sat</Text></Text>
      <View className="flex-row items-center gap-5">
        <TouchableOpacity>
          <Ionicons name="search" size={22} color="white" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="white" />
        </TouchableOpacity>
        <TouchableOpacity className="relative">
          <Ionicons name="notifications-outline" size={22} color="white" />
          <View className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FF6B00] rounded-full border-2 border-[#121212]" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPromotions = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6 mb-6 mt-2" snapToInterval={width * 0.8 + 16} decelerationRate="fast">
      {promotions.map((promo) => (
        <TouchableOpacity key={promo.id} className={`w-[80vw] h-40 mr-4 rounded-3xl p-5 justify-between ${promo.color}`}>
          <View className="self-start bg-white/20 px-2 py-1 rounded-md backdrop-blur-md">
            <Text className="text-white text-[10px] font-black tracking-wider">{promo.badge}</Text>
          </View>
          <View>
            <Text className="text-white text-2xl font-black mb-1">{promo.title}</Text>
            <Text className="text-white/80 text-sm font-medium">{promo.desc}</Text>
          </View>
        </TouchableOpacity>
      ))}
      <View className="w-6" />
    </ScrollView>
  );

  const renderCategories = () => (
    <View className="mb-6">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6">
        {categories.map((category) => (
          <TouchableOpacity 
            key={category}
            onPress={() => setActiveCategory(category)}
            className={`mr-3 px-5 py-2.5 rounded-full border ${activeCategory === category ? 'bg-[#FF6B00] border-[#FF6B00]' : 'bg-transparent border-zinc-700'}`}
          >
            <Text className={`font-bold text-sm ${activeCategory === category ? 'text-white' : 'text-zinc-400'}`}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
        <View className="w-6" />
      </ScrollView>
    </View>
  );

  const renderLiveStreamCard = ({ item }: { item: any }) => {
    // Fallbacks for missing data
    const sellerName = item.profiles?.username || 'Satıcı';
    const coverImage = item.cover_url || 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=80';
    const modeText = item.mode === 'auction' ? 'Mezat' : 'Ürün Tanıtımı';

    return (
      <TouchableOpacity 
        className="mb-5 bg-[#1E1E1E] rounded-3xl overflow-hidden border border-zinc-800" 
        style={{ width: CARD_WIDTH }}
        onPress={() => navigation.navigate('LiveStreamRoom', { streamId: item.id, mode: item.mode || 'auction', isHost: false })}
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
          <Text className="text-zinc-400 text-[11px] mb-2">@{sellerName}</Text>
          <Text className="text-[#FF6B00] font-black text-xs">{modeText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#121212]" edges={['top']}>
      {renderHeader()}
      <FlatList
        data={liveStreams}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B00" />}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center mt-10">
              <Ionicons name="videocam-off-outline" size={48} color="#52525b" />
              <Text className="text-zinc-400 mt-4 font-medium">Şu an aktif yayın bulunmuyor.</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View>
            {renderPromotions()}
            {renderCategories()}
            <View className="px-6 mb-4 flex-row justify-between items-end">
              <Text className="text-white text-lg font-bold tracking-wide">Aktif Yayınlar</Text>
            </View>
          </View>
        }
        renderItem={renderLiveStreamCard}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
};
