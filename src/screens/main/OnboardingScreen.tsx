import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

export const OnboardingScreen = () => {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [followedSellers, setFollowedSellers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchExistingCategories = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('user_categories')
          .select('category_name')
          .eq('user_id', user.id);
        
        if (!error && data) {
          setExistingCategories(data.map(d => d.category_name));
        }
      }
    };
    fetchExistingCategories();
  }, []);

  // Sahte Veriler
  const categories = ['Sneaker', 'Giyim', 'Elektronik', 'Saat', 'Koleksiyon', 'Spor', 'Otomotiv', 'Sanat'];
  const suggestedSellers = [
    { id: '11111111-1111-1111-1111-111111111111', username: '@gamestore', image: 'https://images.unsplash.com/photo-1542156822-6924d1a71ace?w=150&q=80', category: 'Elektronik' },
    { id: '22222222-2222-2222-2222-222222222222', username: '@sneakerhead', image: 'https://images.unsplash.com/photo-1512353087810-254cb9859f69?w=150&q=80', category: 'Sneaker' },
    { id: '33333333-3333-3333-3333-333333333333', username: '@vintageshop', image: 'https://images.unsplash.com/photo-1550614000-4b95d4ed79ea?w=150&q=80', category: 'Giyim' },
    { id: '44444444-4444-4444-4444-444444444444', username: '@luxurywatch', image: 'https://images.unsplash.com/photo-1508656264871-331b1ebf5819?w=150&q=80', category: 'Saat' },
  ];

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleFollow = (id: string) => {
    setFollowedSellers(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const isReady = followedSellers.length >= 3;

  const handleComplete = async () => {
    // Not: Eğer 2 adımlı sihirbaz kodunu kullanıyorsan burası `if (!isStep2Ready)` olmalı
    if (!isReady) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {

        // 1. Sadece KATEGORİLERİ veritabanına yazıyoruz
        const categoryData = selectedCategories.map(cat => ({
          user_id: user.id,
          category_name: cat
        }));

        if (categoryData.length > 0) {
          const { error: catError } = await supabase.from('user_categories').insert(categoryData);
          if (catError) console.error('Kategori kayıt hatası:', catError);
        }

        // 2. SATICI KAYDI ŞİMDİLİK İPTAL (YORUM SATIRINA ALINDI)
        // Gerçek kullanıcılar geldiğinde bu yorumları kaldıracağız.
        /*
        const followerData = followedSellers.map(sellerId => ({
          follower_id: user.id,
          following_id: sellerId
        }));

        if (followerData.length > 0) {
          const { error: folError } = await supabase.from('followers').insert(followerData);
          if (folError) console.error('Error inserting followers:', folError);
        }
        */
      }

      // Hata olsa da olmasa da kullanıcıyı içeri alıyoruz
      navigation.replace('MainTabs');

    } catch (error) {
      console.error('Onboarding completion error:', error);
      navigation.replace('MainTabs');
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View className="flex-row items-center px-6 pt-4 pb-2">
      {step === 2 && (
        <TouchableOpacity onPress={() => setStep(1)} className="mr-4 flex-row items-center">
          <Ionicons name="chevron-back" size={24} color="white" />
          <Text className="text-white font-bold ml-1 text-[13px]">Geri Dön</Text>
        </TouchableOpacity>
      )}
      <View className="flex-1 flex-row gap-2">
        <View className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-[#FF6B00]' : 'bg-zinc-800'}`} />
        <View className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-[#FF6B00]' : 'bg-zinc-800'}`} />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View className="flex-1 px-6">
      <Text className="text-white text-3xl font-black mt-6 mb-2 tracking-wide">Hoş Geldin!</Text>
      <Text className="text-zinc-400 text-sm mb-8 leading-5">Seni biraz tanıyalım, böylece sana en uygun mezatları ve yayıncıları önerebiliriz.</Text>

      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-white text-base font-bold">Kategorileri Seç</Text>
        <Text className={`text-xs font-bold ${selectedCategories.length >= 1 ? 'text-green-500' : 'text-[#FF6B00]'}`}>
          {selectedCategories.length >= 1 ? '✓ Tamam' : 'En az 1'}
        </Text>
      </View>
      <View className="flex-row flex-wrap mb-10">
        {categories.map(cat => {
          const isSelected = selectedCategories.includes(cat);
          const isAlreadySaved = existingCategories.includes(cat);
          
          if (isAlreadySaved) {
            return (
              <View
                key={cat}
                className="mr-3 mb-3 px-5 py-2.5 rounded-full border bg-[#1E1E1E] border-zinc-700 opacity-50"
              >
                <Text className="font-bold text-[13px] text-zinc-500">{cat} (Seçildi)</Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={cat}
              onPress={() => toggleCategory(cat)}
              className={`mr-3 mb-3 px-5 py-2.5 rounded-full border ${isSelected ? 'bg-[#FF6B00] border-[#FF6B00]' : 'bg-[#1E1E1E] border-zinc-700'}`}
            >
              <Text className={`font-bold text-[13px] ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View className="flex-1 px-6">
      <Text className="text-white text-3xl font-black mt-6 mb-2 tracking-wide">Harika Seçimler!</Text>
      <Text className="text-zinc-400 text-sm mb-8 leading-5">Şimdi, başlamak için en az 3 satıcıyı takip et.</Text>

      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-white text-base font-bold">Önerilen Satıcılar</Text>
        <Text className={`text-xs font-bold ${followedSellers.length >= 3 ? 'text-green-500' : 'text-[#FF6B00]'}`}>
          {followedSellers.length >= 3 ? '✓ Tamam' : `(${followedSellers.length}/3)`}
        </Text>
      </View>

      <View className="flex-row flex-wrap justify-between">
        {suggestedSellers.map(seller => {
          const isFollowed = followedSellers.includes(seller.id);
          const isRecommended = selectedCategories.includes(seller.category);
          return (
            <View key={seller.id} className="items-center bg-[#1E1E1E] border border-zinc-800 p-4 rounded-3xl mb-4" style={{ width: '48%' }}>
              {isRecommended && (
                <View className="absolute top-[-1] right-[-1] bg-[#FF6B00] px-2 py-1 rounded-bl-xl rounded-tr-3xl z-10">
                  <Text className="text-white text-[9px] font-black tracking-wider">ÖNERİLEN</Text>
                </View>
              )}
              <Image source={{ uri: seller.image }} className="w-16 h-16 rounded-full mb-3 border border-zinc-700" />
              <Text className="text-white font-bold text-[13px] mb-4" numberOfLines={1}>{seller.username}</Text>
              <TouchableOpacity
                onPress={() => toggleFollow(seller.id)}
                className={`w-full py-2 rounded-xl items-center ${isFollowed ? 'bg-zinc-800 border border-zinc-600' : 'bg-[#FF6B00]'}`}
              >
                <Text className={`font-bold text-[11px] ${isFollowed ? 'text-zinc-300' : 'text-white'}`}>
                  {isFollowed ? 'Takip Ediliyor' : 'Takip Et'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#121212]" edges={['top', 'bottom']}>
      {renderProgressBar()}
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {step === 1 ? renderStep1() : renderStep2()}
      </ScrollView>

      {/* Akıllı Alt Buton */}
      <View className="absolute bottom-8 left-6 right-6">
        {step === 1 ? (
          <TouchableOpacity
            disabled={selectedCategories.length < 1}
            onPress={() => setStep(2)}
            className={`py-4 rounded-2xl items-center flex-row justify-center ${selectedCategories.length >= 1 ? 'bg-[#FF6B00]' : 'bg-[#1E1E1E] border border-zinc-800'}`}
          >
            <Text className={`font-bold text-[15px] ${selectedCategories.length >= 1 ? 'text-white' : 'text-zinc-500'}`}>
              İleri ➔
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            disabled={!isReady || loading}
            onPress={handleComplete}
            className={`py-4 rounded-2xl items-center flex-row justify-center ${isReady ? 'bg-[#FF6B00]' : 'bg-[#1E1E1E] border border-zinc-800'}`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className={`font-bold text-[15px] ${isReady ? 'text-white' : 'text-zinc-500'}`}>
                {isReady ? 'Keşfetmeye Başla 🚀' : 'Devam Et'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};