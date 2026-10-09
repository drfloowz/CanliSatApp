import React from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Image, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 64) / 2;

export const DiscoverScreen = () => {
  // Mock Data
  const stars = [
    { id: '1', name: 'gamestore', image: 'https://images.unsplash.com/photo-1542156822-6924d1a71ace?w=150&q=80', isTop: true },
    { id: '2', name: 'sneakerhead', image: 'https://images.unsplash.com/photo-1512353087810-254cb9859f69?w=150&q=80', isTop: true },
    { id: '3', name: 'vintageshop', image: 'https://images.unsplash.com/photo-1550614000-4b95d4ed79ea?w=150&q=80', isTop: false },
    { id: '4', name: 'luxurywatch', image: 'https://images.unsplash.com/photo-1508656264871-331b1ebf5819?w=150&q=80', isTop: false },
    { id: '5', name: 'techguru', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&q=80', isTop: false },
  ];

  const categories = [
    { id: '1', name: 'Giyim', icon: 'shirt-outline' },
    { id: '2', name: 'Sneaker', icon: 'footsteps-outline' },
    { id: '3', name: 'Elektronik', icon: 'hardware-chip-outline' },
    { id: '4', name: 'Saat', icon: 'watch-outline' },
    { id: '5', name: 'Koleksiyon', icon: 'diamond-outline' },
  ];

  const trendingStreams = [
    { id: '1', title: 'iPhone 15 Pro Max Mezatı', seller: '@techguru', price: '65.000 ₺', image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80', viewers: 1845 },
    { id: '2', title: 'Özel Seri Nike Dunk', seller: '@sneakerhead', price: '7.500 ₺', image: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=400&q=80', viewers: 920 },
    { id: '3', title: 'Antika Gümüş Yüzük', seller: '@vintageshop', price: '2.100 ₺', image: 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?w=400&q=80', viewers: 430 },
    { id: '4', title: 'Omega Speedmaster', seller: '@luxurywatch', price: '120.000 ₺', image: 'https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=400&q=80', viewers: 310 },
  ];

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

  const renderStars = () => (
    <View className="mb-8">
      <View className="px-6 mb-3 flex-row justify-between items-center">
        <Text className="text-white text-lg font-bold">Ayın Yıldızları 🏆</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6">
        {stars.map((star) => (
          <TouchableOpacity key={star.id} className="mr-5 items-center">
            <View className={`w-16 h-16 rounded-full p-0.5 mb-2 ${star.isTop ? 'bg-gradient-to-tr from-[#FF6B00] to-yellow-400' : 'bg-zinc-800'}`}>
              <Image source={{ uri: star.image }} className="w-full h-full rounded-full border-2 border-[#121212]" />
            </View>
            <Text className="text-zinc-300 text-[11px] font-medium max-w-[64px]" numberOfLines={1}>
              {star.name}
            </Text>
          </TouchableOpacity>
        ))}
        <View className="w-6" />
      </ScrollView>
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

  const renderLiveStreamCard = ({ item }: { item: typeof trendingStreams[0] }) => (
    <TouchableOpacity className="mb-5 bg-[#1E1E1E] rounded-3xl overflow-hidden border border-zinc-800" style={{ width: CARD_WIDTH }}>
      <View className="w-full h-48 relative">
        <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
        <View className="absolute inset-0 bg-black/40" />
        <View className="absolute top-2 left-2 right-2 flex-row justify-between items-center">
          <View className="bg-red-600 px-2 py-1 rounded-md flex-row items-center">
            <View className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-1" />
            <Text className="text-white text-[9px] font-black tracking-wider">CANLI</Text>
          </View>
          <View className="bg-black/60 px-2 py-1 rounded-md flex-row items-center backdrop-blur-md">
            <Ionicons name="eye" size={10} color="white" />
            <Text className="text-white text-[10px] font-bold ml-1">{item.viewers}</Text>
          </View>
        </View>
      </View>
      <View className="p-3">
        <Text className="text-white font-bold text-[13px] mb-1 leading-5" numberOfLines={2}>{item.title}</Text>
        <Text className="text-zinc-400 text-[11px] mb-2">{item.seller}</Text>
        <Text className="text-[#FF6B00] font-black text-base">{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

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
            {renderStars()}
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
