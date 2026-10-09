import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { streamService } from '../services/streamService';

type RootStackParamList = {
  LiveStreamRoom: { title: string; mode: 'auction' | 'showcase'; streamId?: string; isHost?: boolean };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'LiveStreamRoom'>;

export const SellScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [streamTitle, setStreamTitle] = useState('');
  const [streamMode, setStreamMode] = useState<'auction' | 'showcase'>('auction');
  const [isStarting, setIsStarting] = useState(false);

  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [isSeller, setIsSeller] = useState(false);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [activeStreamMode, setActiveStreamMode] = useState<'auction' | 'showcase'>('auction');

  // YENİ STATE'LER: Kategori ve Ürünler
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const categories = ['Sneaker', 'Giyim', 'Elektronik', 'Saat', 'Koleksiyon', 'Spor', 'Otomotiv', 'Sanat'];

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) return;

      try {
        // NOT: setLoading(true) komutunu buradan kaldırdık.
        // Böylece sekmeye her dönüşte ekranı temizleyip yükleme ikonunu göstermeyecek.
        // Veriler arka planda (kullanıcıya hissettirmeden) güncellenecek.

        // 3 farklı Supabase sorgusunu sırayla beklemek yerine aynı anda (paralel) başlatıyoruz:
        const [profileResponse, streamResponse, productsResponse] = await Promise.all([
          // 1. Satıcı Kontrolü
          supabase
            .from('profiles')
            .select('is_seller')
            .eq('id', user.id)
            .single(),

          // 2. Aktif Yayın Kontrolü
          supabase
            .from('live_streams')
            .select('id, mode')
            .eq('host_id', user.id)
            .eq('status', 'live')
            .maybeSingle(),

          // 3. Kullanıcının Ürünleri
          supabase
            .from('products')
            .select('*')
            .eq('seller_id', user.id)
        ]);

        // 1. İşlem Sonucu
        setIsSeller(!!profileResponse.data?.is_seller);

        // 2. İşlem Sonucu
        if (streamResponse.data) {
          setActiveStreamId(streamResponse.data.id);
          setActiveStreamMode((streamResponse.data.mode as 'auction' | 'showcase') || 'auction');
        } else {
          setActiveStreamId(null);
        }

        // 3. İşlem Sonucu
        if (!productsResponse.error && productsResponse.data) {
          setMyProducts(productsResponse.data);
        }

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        // İlk açılışta state true olduğu için yükleme ekranını kapatır.
        // Sonraki geçişlerde zaten false olacağı için ekran sabit kalır.
        setLoading(false);
      }
    };

    const unsubscribe = navigation.addListener('focus', () => {
      checkStatus();
    });

    checkStatus();

    return unsubscribe;
  }, [user, navigation]);

  const handleEndActiveStream = async () => {
    if (!activeStreamId) return;
    try {
      setLoading(true);
      await streamService.endLiveStream(activeStreamId);
      setActiveStreamId(null);
      Alert.alert('Başarılı', 'Önceki yayınınız sonlandırıldı.');
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Yayın sonlandırılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLive = async () => {
    if (!streamTitle.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen yayına başlamadan önce bir başlık girin.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Eksik Bilgi', 'Lütfen yayın kategorisini seçin.');
      return;
    }
    // Eğer Mezat modundaysa ürün seçimi zorunlu!
    if (streamMode === 'auction' && !selectedProductId) {
      Alert.alert('Eksik Bilgi', 'Açık artırma başlatmak için envanterinizden bir ürün seçmelisiniz.');
      return;
    }

    setIsStarting(true);
    try {
      // @ts-ignore - Backend servisine yeni parametreleri yolluyoruz
      const newStream = await streamService.startLiveStream({
        title: streamTitle,
        mode: streamMode,
        category: selectedCategory,
        product_id: selectedProductId || undefined
      });

      navigation.navigate('LiveStreamRoom', {
        streamId: newStream.id,
        title: streamTitle,
        mode: streamMode,
        isHost: true
      });
    } catch (error) {
      console.error("Error starting stream:", error);
      Alert.alert('Hata', 'Yayın başlatılamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsStarting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#121212] justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B00" />
      </SafeAreaView>
    );
  }

  if (!isSeller) {
    return (
      <SafeAreaView className="flex-1 bg-[#121212] justify-center items-center px-6">
        <View className="bg-zinc-900/50 p-8 rounded-full border border-zinc-800 mb-6">
          <Ionicons name="lock-closed" size={72} color="#FF6B00" />
        </View>

        <Text className="text-white text-3xl font-black mb-4 text-center">
          Erişim Kısıtlı
        </Text>

        <Text className="text-gray-400 text-center mb-8 text-base leading-6 px-4">
          Canlı yayın başlatabilmek ve mezat oluşturabilmek için hesabınızın satıcı yetkisine sahip olması gerekmektedir.
        </Text>

        <TouchableOpacity
          className="bg-[#FF6B00] w-full py-4 rounded-xl items-center shadow-lg shadow-orange-500/30"
          onPress={() => Alert.alert('Başvuru', 'Satıcı başvurusu işlemleri yakında eklenecektir.')}
        >
          <Text className="text-white font-bold text-lg">Satıcı Başvurusu Yap</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (activeStreamId) {
    // Aktif yayın UI (Kısaltıldı)
    return (
      <SafeAreaView className="flex-1 bg-[#121212] justify-center items-center px-6">
        <Text className="text-white mb-4">Devam Eden Yayın</Text>
        <TouchableOpacity
          className="bg-[#FF6B00] w-full py-4 rounded-2xl items-center mb-4"
          onPress={() => navigation.navigate('LiveStreamRoom', { streamId: activeStreamId, mode: activeStreamMode, isHost: true, title: "Canlı Satış Yayını" })}
        >
          <Text className="text-white font-black">Yayına Dön</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-red-600/10 border border-red-600/30 w-full py-4 rounded-2xl items-center" onPress={handleEndActiveStream}>
          <Text className="text-red-500 font-bold">Yayını Bitir</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#121212]">
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <Text className="text-white text-3xl font-black mb-8">Canlı Yayın Başlat</Text>

        {/* 1. BAŞLIK */}
        {/* 1. BAŞLIK */}
        <View className="mb-8">
          <Text className="text-gray-400 font-bold mb-2 ml-1">Yayın Başlığı</Text>
          <TextInput
            className="bg-zinc-900 border border-zinc-800 text-white px-4 h-14 rounded-xl text-base focus:border-[#FF6B00]"
            placeholder="Ne satıyorsunuz?"
            placeholderTextColor="#6b7280"
            value={streamTitle}
            onChangeText={setStreamTitle}
            maxLength={50}
            textAlignVertical="center"
          />
        </View>

        {/* 2. KATEGORİ SEÇİMİ */}
        <View className="mb-8">
          <Text className="text-gray-400 font-bold mb-3 ml-1">Kategori Seçimi</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                className={`mr-3 px-5 py-3 rounded-full border ${selectedCategory === cat ? 'bg-[#FF6B00] border-[#FF6B00]' : 'bg-zinc-900 border-zinc-800'}`}
              >
                <Text className={`font-bold ${selectedCategory === cat ? 'text-white' : 'text-zinc-400'}`}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>


        {/* 3. SATIŞ FORMATI (Eksik Buton Eklendi!) */}
        <View className="mb-10">
          <Text className="text-gray-400 font-bold mb-4 ml-1">Satış Formatı</Text>

          <TouchableOpacity
            onPress={() => setStreamMode('auction')}
            className={`p-4 rounded-xl border-2 mb-4 flex-row items-center ${streamMode === 'auction' ? 'border-[#FF6B00] bg-[#FF6B00]/10' : 'border-zinc-800 bg-zinc-900'}`}
          >
            <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${streamMode === 'auction' ? 'bg-[#FF6B00]/20' : 'bg-zinc-800'}`}>
              <Ionicons name="hammer" size={24} color={streamMode === 'auction' ? '#FF6B00' : '#9ca3af'} />
            </View>
            <View className="flex-1">
              <Text className={`text-lg font-bold ${streamMode === 'auction' ? 'text-white' : 'text-gray-300'}`}>Açık Artırma (Mezat)</Text>
              <Text className="text-gray-400 text-sm mt-1">Fiyat yükselerek artar, en yüksek teklifi veren kazanır.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStreamMode('showcase')}
            className={`p-4 rounded-xl border-2 flex-row items-center ${streamMode === 'showcase' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900'}`}
          >
            <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${streamMode === 'showcase' ? 'bg-blue-500/20' : 'bg-zinc-800'}`}>
              <Ionicons name="cart" size={24} color={streamMode === 'showcase' ? '#3b82f6' : '#9ca3af'} />
            </View>
            <View className="flex-1">
              <Text className={`text-lg font-bold ${streamMode === 'showcase' ? 'text-white' : 'text-gray-300'}`}>Ürün Tanıtımı</Text>
              <Text className="text-gray-400 text-sm mt-1">Sabit fiyatlı standart e-ticaret satışı.</Text>
            </View>
          </TouchableOpacity>
        </View>


        {/* 4. SATILACAK ÜRÜN SEÇİMİ */}
        <View className="mb-8">
          <Text className="text-gray-400 font-bold mb-3 ml-1">Satılacak Ürün (Envanter)</Text>
          {myProducts.length === 0 ? (
            <View className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 items-center">
              <Ionicons name="cube-outline" size={32} color="#6b7280" className="mb-2" />
              <Text className="text-gray-400 text-center">Envanterinizde hiç ürün bulunmuyor. Lütfen önce ürün ekleyin.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {myProducts.map(product => {
                const isSelected = selectedProductId === product.id;
                // Gerçek bir resim yoksa şık bir paket/kutu görseli gösteriyoruz
                const fallbackImage = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=500&q=80';

                return (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() => setSelectedProductId(product.id)}
                    className={`mr-4 w-36 bg-zinc-900 rounded-xl overflow-hidden border-2 ${isSelected ? 'border-[#FF6B00]' : 'border-zinc-800'}`}
                  >
                    <Image
                      source={{ uri: product.image_url ? product.image_url : fallbackImage }}
                      className="w-full h-32 bg-zinc-800"
                      resizeMode="cover"
                    />
                    <View className="p-3">
                      <Text className="text-white font-bold text-sm mb-1" numberOfLines={1}>{product.title}</Text>
                      <Text className="text-[#FF6B00] font-black text-xs">{product.starting_price} TL</Text>
                    </View>
                    {isSelected && (
                      <View className="absolute top-2 right-2 bg-[#FF6B00] rounded-full p-1 shadow-md shadow-black">
                        <Ionicons name="checkmark" size={14} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

      </ScrollView>

      {/* BAŞLAT BUTONU */}
      <View className="p-4 bg-[#121212] border-t border-zinc-900">
        <TouchableOpacity
          onPress={handleStartLive}
          disabled={isStarting}
          className={`rounded-xl p-4 flex-row items-center justify-center shadow-lg ${isStarting ? 'bg-orange-400' : 'bg-[#FF6B00] shadow-orange-500/30'}`}
        >
          {isStarting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="videocam" size={20} color="white" className="mr-2" />
              <Text className="text-white font-bold text-lg ml-2">Kamerayı Aç ve Yayına Geç</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
