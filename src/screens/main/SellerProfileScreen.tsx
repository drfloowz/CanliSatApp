import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 64) / 2; // 24px padding on each side, gap of 16

const mockProducts = [
  { id: '1', title: 'Vintage Nike Ceket', price: '1.200 ₺', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80' },
  { id: '2', title: 'Jordan 1 Retro High', price: '4.500 ₺', image: 'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=400&q=80' },
  { id: '3', title: 'YSL Deri Çanta', price: '12.000 ₺', image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=400&q=80' },
  { id: '4', title: 'Rolex Submariner Kutu', price: '2.500 ₺', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80' },
  { id: '5', title: 'Koleksiyonluk Kaset', price: '450 ₺', image: 'https://images.unsplash.com/photo-1500350431302-d9f7a77e6840?w=400&q=80' },
  { id: '6', title: 'Orijinal Plak', price: '850 ₺', image: 'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=400&q=80' },
];

export const SellerProfileScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'products' | 'streams'>('products');

  const renderHeader = () => (
    <View 
      className="absolute top-0 left-0 right-0 flex-row justify-between items-center px-4 z-10"
      style={{ paddingTop: Math.max(insets.top, 20), paddingBottom: 10 }}
    >
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        className="w-10 h-10 bg-black/40 rounded-full items-center justify-center backdrop-blur-md"
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <View className="flex-row gap-3">
        <TouchableOpacity className="w-10 h-10 bg-black/40 rounded-full items-center justify-center backdrop-blur-md">
          <Ionicons name="share-outline" size={22} color="white" />
        </TouchableOpacity>
        <TouchableOpacity className="w-10 h-10 bg-black/40 rounded-full items-center justify-center backdrop-blur-md">
          <Ionicons name="ellipsis-horizontal" size={22} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProfileInfo = () => (
    <View className="px-6 mt-[-40px]">
      <View className="flex-row justify-between items-end mb-4">
        <View className="w-24 h-24 rounded-full border-4 border-[#121212] overflow-hidden bg-zinc-800">
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80' }} 
            className="w-full h-full"
          />
        </View>
        <View className="flex-row gap-3 mb-2">
          <TouchableOpacity className="bg-zinc-800 px-5 py-2.5 rounded-full items-center justify-center">
            <Text className="text-white font-bold text-[13px]">Mesaj</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-[#FF6B00] px-5 py-2.5 rounded-full items-center justify-center">
            <Text className="text-white font-bold text-[13px]">Takip Et</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="mb-4">
        <View className="flex-row items-center mb-1">
          <Text className="text-white text-2xl font-black mr-2">Vintage Store</Text>
          <Ionicons name="checkmark-circle" size={18} color="#FF6B00" />
        </View>
        <Text className="text-zinc-400 text-[13px]">@vintagestore</Text>
      </View>

      <Text className="text-zinc-300 text-sm leading-5 mb-6">
        Nadir bulunan vintage kıyafetler, antika eşyalar ve koleksiyonluk saatler. Her Cuma saat 20:00'de canlı mezat!
      </Text>

      <View className="flex-row items-center gap-8 mb-6">
        <View className="items-center">
          <Text className="text-white font-black text-lg">1.2K</Text>
          <Text className="text-zinc-400 text-xs mt-1">Takipçi</Text>
        </View>
        <View className="w-[1px] h-8 bg-zinc-800" />
        <View className="items-center">
          <Text className="text-white font-black text-lg">45</Text>
          <Text className="text-zinc-400 text-xs mt-1">Yayın</Text>
        </View>
        <View className="w-[1px] h-8 bg-zinc-800" />
        <View className="items-center">
          <View className="flex-row items-center">
            <Text className="text-white font-black text-lg mr-1">4.9</Text>
            <Ionicons name="star" size={12} color="#FBBF24" />
          </View>
          <Text className="text-zinc-400 text-xs mt-1">Puan</Text>
        </View>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View className="flex-row border-b border-zinc-800 px-6 mb-4">
      <TouchableOpacity 
        className={`pb-3 mr-8 ${activeTab === 'products' ? 'border-b-2 border-[#FF6B00]' : ''}`}
        onPress={() => setActiveTab('products')}
      >
        <Text className={`font-bold ${activeTab === 'products' ? 'text-white' : 'text-zinc-500'}`}>
          Ürünler
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        className={`pb-3 ${activeTab === 'streams' ? 'border-b-2 border-[#FF6B00]' : ''}`}
        onPress={() => setActiveTab('streams')}
      >
        <Text className={`font-bold ${activeTab === 'streams' ? 'text-white' : 'text-zinc-500'}`}>
          Geçmiş Yayınlar
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderProductCard = ({ item }: { item: typeof mockProducts[0] }) => (
    <TouchableOpacity 
      className="bg-[#1E1E1E] rounded-3xl overflow-hidden border border-zinc-800 mb-5" 
      style={{ width: CARD_WIDTH }}
    >
      <View className="w-full h-44">
        <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
      </View>
      <View className="p-3">
        <Text className="text-white font-bold text-[13px] mb-2 leading-5" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="text-[#FF6B00] font-black text-sm">{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#121212]" edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {renderHeader()}
      
      <FlatList
        data={activeTab === 'products' ? mockProducts : []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          activeTab === 'streams' ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="videocam-outline" size={48} color="#52525b" />
              <Text className="text-zinc-400 mt-4 font-medium text-center">Henüz geçmiş yayın bulunmuyor.</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View className="mb-2">
            <View className="w-full h-48 bg-zinc-800">
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80' }} 
                className="w-full h-full" 
                resizeMode="cover" 
              />
              <View className="absolute inset-0 bg-black/20" />
            </View>
            {renderProfileInfo()}
            {renderTabs()}
          </View>
        }
        renderItem={renderProductCard}
        contentContainerStyle={{ paddingBottom: 40 }}
        bounces={false}
      />
    </SafeAreaView>
  );
};
