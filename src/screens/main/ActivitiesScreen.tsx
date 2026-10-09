import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export const ActivitiesScreen = () => {
  const [activeTab, setActiveTab] = useState<'cart' | 'favorites'>('cart');

  // Mock Cart Data
  const [cartItems, setCartItems] = useState([
    { id: '1', title: 'Vintage Deri Ceket', seller: '@vintageshop', price: 1200, qty: 1, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80' },
    { id: '2', title: 'Air Jordan 1 Retro High', seller: '@sneakerhead', price: 4200, qty: 1, image: 'https://images.unsplash.com/photo-1552346154-21d32810baa3?w=400&q=80' },
  ]);

  // Mock Favorites Data (From our previous Watchlist)
  const favorites = [
    { id: '1', title: 'PlayStation 5 Kapalı Kutu', seller: '@gamestore', price: '18.500₺', image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=80', isLive: true, viewers: 124 },
    { id: '3', title: 'MacBook Pro M2 16GB', seller: '@techpazari', price: '32.000₺', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80', isLive: false, time: 'Yarın 19:30' },
  ];

  const updateQty = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeCartItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return (
    <SafeAreaView className="flex-1 bg-[#121212]" edges={['top']}>
      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center">
        <Text className="text-white text-2xl font-black tracking-wide">Sepetim</Text>
        <TouchableOpacity className="w-10 h-10 bg-[#1E1E1E] rounded-full items-center justify-center border border-zinc-800">
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Custom Tabs */}
      <View className="flex-row px-6 mb-4 mt-2">
        <TouchableOpacity 
          onPress={() => setActiveTab('cart')}
          className={`flex-1 pb-3 items-center border-b-2 ${activeTab === 'cart' ? 'border-[#FF6B00]' : 'border-zinc-800'}`}
        >
          <Text className={`font-bold ${activeTab === 'cart' ? 'text-[#FF6B00]' : 'text-zinc-500'}`}>
            Sepetteki Ürünler ({cartItems.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setActiveTab('favorites')}
          className={`flex-1 pb-3 items-center border-b-2 ${activeTab === 'favorites' ? 'border-[#FF6B00]' : 'border-zinc-800'}`}
        >
          <Text className={`font-bold ${activeTab === 'favorites' ? 'text-[#FF6B00]' : 'text-zinc-500'}`}>
            Favorilerim
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: activeTab === 'cart' ? 120 : 40 }}>
        
        {/* CART TAB */}
        {activeTab === 'cart' && (
          <View className="px-4">
            {cartItems.length === 0 ? (
              <View className="items-center justify-center mt-20">
                <Ionicons name="cart-outline" size={64} color="#3f3f46" />
                <Text className="text-zinc-400 mt-4 text-lg font-medium">Sepetiniz şu an boş.</Text>
              </View>
            ) : (
              cartItems.map((item) => (
                <View key={item.id} className="bg-[#1E1E1E] p-3 rounded-3xl mb-4 border border-zinc-800 flex-row">
                  <Image source={{ uri: item.image }} className="w-24 h-24 rounded-2xl bg-zinc-800" />
                  <View className="flex-1 ml-4 justify-between py-1">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-2">
                        <Text className="text-white font-bold text-base leading-5" numberOfLines={2}>{item.title}</Text>
                        <Text className="text-zinc-400 text-xs mt-1">{item.seller}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeCartItem(item.id)}>
                        <Ionicons name="close-circle" size={24} color="#52525b" />
                      </TouchableOpacity>
                    </View>
                    
                    <View className="flex-row justify-between items-end mt-2">
                      <Text className="text-[#FF6B00] font-black text-lg">{item.price.toLocaleString('tr-TR')} ₺</Text>
                      
                      {/* Quantity Controls */}
                      <View className="flex-row items-center bg-black/40 rounded-full p-1 border border-zinc-700">
                        <TouchableOpacity 
                          className="w-7 h-7 bg-zinc-800 rounded-full items-center justify-center"
                          onPress={() => updateQty(item.id, -1)}
                        >
                          <Ionicons name="remove" size={16} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white font-bold px-3">{item.qty}</Text>
                        <TouchableOpacity 
                          className="w-7 h-7 bg-zinc-800 rounded-full items-center justify-center"
                          onPress={() => updateQty(item.id, 1)}
                        >
                          <Ionicons name="add" size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* FAVORITES TAB */}
        {activeTab === 'favorites' && (
          <View className="px-4">
            {favorites.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                className="bg-[#1E1E1E] rounded-3xl mb-4 overflow-hidden border border-zinc-800 flex-row h-32"
              >
                <View className="w-32 h-full relative">
                  <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
                  <View className="absolute inset-0 bg-black/20" />
                  <View className="absolute top-2 left-2">
                    {item.isLive ? (
                      <View className="bg-red-600 px-2 py-1 rounded-md flex-row items-center">
                        <View className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-1" />
                        <Text className="text-white text-[10px] font-black tracking-wider">CANLI</Text>
                      </View>
                    ) : (
                      <View className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded-md border border-white/20">
                        <Text className="text-white text-[10px] font-bold">{item.time}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View className="flex-1 p-4 justify-between">
                  <View>
                    <Text className="text-white font-bold text-base mb-1" numberOfLines={2}>{item.title}</Text>
                    <Text className="text-zinc-400 text-xs">{item.seller}</Text>
                  </View>
                  
                  <View className="flex-row justify-between items-end mt-2">
                    <Text className="text-white font-black text-lg">{item.price}</Text>
                    <TouchableOpacity className="bg-zinc-800 px-3 py-1.5 rounded-full flex-row items-center">
                      <Ionicons name="cart-outline" size={14} color="white" />
                      <Text className="text-white text-xs font-bold ml-1">Sepete Ekle</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky Checkout Footer (Only visible on Cart Tab) */}
      {activeTab === 'cart' && cartItems.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-[#1E1E1E] border-t border-zinc-800 px-6 py-5 flex-row justify-between items-center shadow-2xl">
          <View>
            <Text className="text-zinc-400 text-xs font-medium mb-1">Toplam Tutar</Text>
            <Text className="text-white font-black text-2xl">{totalPrice.toLocaleString('tr-TR')} ₺</Text>
          </View>
          <TouchableOpacity className="bg-[#FF6B00] px-8 py-4 rounded-2xl shadow-lg shadow-orange-500/30">
            <Text className="text-white font-black text-lg tracking-wide">Satın Al</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};
