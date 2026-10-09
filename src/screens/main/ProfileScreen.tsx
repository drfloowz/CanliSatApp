import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigation, NavigationProp } from '@react-navigation/native';

export const ProfileScreen = () => {
  const { user } = useAuthStore();
  const navigation = useNavigation<NavigationProp<any>>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);


  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setProfile(data);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = navigation.addListener('focus', () => {
      fetchProfile();
    });

    fetchProfile();
    return unsubscribe;
  }, [user, navigation]);

  const handleLogout = async () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          // State will be handled by the global auth listener (onAuthStateChange)
        }
      }
    ]);
  };

  const displayName = profile?.full_name || profile?.display_name || user?.user_metadata?.full_name || 'Kullanıcı';
  const username = profile?.username || user?.email?.split('@')[0] || 'kullanici';

  if (loading && !profile) {
    return (
      <SafeAreaView className="flex-1 bg-[#121212] justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B00" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#121212]" edges={['top']}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Onboarding')}
        className="bg-red-600 mx-4 my-4 p-4 rounded-2xl items-center"
      >
        <Text className="text-white font-bold text-lg">🚀 TEST: Onboarding Ekranı</Text>
      </TouchableOpacity>
      {/* Top Header */}
      <View className="px-6 py-4 flex-row justify-between items-center">
        <Text className="text-white text-2xl font-black tracking-wide">Profilim</Text>
        <TouchableOpacity className="w-10 h-10 bg-[#1E1E1E] rounded-full items-center justify-center border border-zinc-800">
          <Ionicons name="notifications-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* 1. Identity Section */}
        <View className="px-6 items-center mt-2 mb-6">
          <View className="relative">
            <Image
              source={{ uri: profile?.avatar_url || 'https://ui-avatars.com/api/?name=' + displayName + '&background=FF6B00&color=fff&size=256' }}
              className="w-24 h-24 rounded-full border-4 border-[#1E1E1E]"
            />
            <TouchableOpacity
              className="absolute bottom-0 right-0 bg-[#FF6B00] w-8 h-8 rounded-full items-center justify-center border-2 border-[#121212]"
              onPress={() => Alert.alert('Profil Fotoğrafı', 'Galeri açılarak fotoğraf güncelleme işlemi yapılacak.')}
            >
              <Ionicons name="camera" size={14} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-white text-xl font-bold mt-4">{displayName}</Text>
          <Text className="text-zinc-500 text-sm mt-1">@{username}</Text>
          <View className="bg-zinc-800 px-3 py-1 rounded-full mt-2 flex-row items-center">
            <Ionicons name="shield-checkmark" size={12} color="#10b981" />
            <Text className="text-zinc-300 text-xs font-bold ml-1">Onaylı Alıcı</Text>
          </View>

          <View className="flex-row mt-4 gap-8">
            <View className="items-center">
              <Text className="text-white font-black text-lg">{profile?.followers_count || 0}</Text>
              <Text className="text-zinc-500 text-xs">Takipçi</Text>
            </View>
            <View className="w-[1px] h-full bg-zinc-800" />
            <View className="items-center">
              <Text className="text-white font-black text-lg">{profile?.following_count || 0}</Text>
              <Text className="text-zinc-500 text-xs">Takip</Text>
            </View>
          </View>
        </View>

        {/* 2. Wallet Card */}
        <View className="px-6 mb-6">
          <View className="bg-gradient-to-r from-zinc-900 to-[#1a1a1a] p-5 rounded-3xl border border-zinc-800 flex-row justify-between items-center shadow-lg shadow-black/50">
            <View>
              <Text className="text-zinc-400 text-sm mb-1 flex-row items-center">
                <Ionicons name="wallet-outline" size={14} color="#a1a1aa" /> Cüzdan Bakiyesi
              </Text>
              <Text className="text-white text-3xl font-black tracking-tight">
                ₺{profile?.balance?.toFixed(2) || '0.00'}
              </Text>
            </View>
            <TouchableOpacity className="bg-[#FF6B00] px-4 py-3 rounded-2xl flex-row items-center">
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text className="text-white font-bold ml-2">Yükle</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Orders, Coupons & Quick Actions */}
        <View className="px-6 mb-6 flex-row flex-wrap justify-between gap-y-3">
          <TouchableOpacity className="bg-[#1E1E1E] w-[48%] py-4 rounded-2xl items-center border border-zinc-800/50">
            <Ionicons name="cube-outline" size={24} color="#3b82f6" />
            <Text className="text-zinc-300 text-xs font-medium mt-2">Siparişlerim</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-[#1E1E1E] w-[48%] py-4 rounded-2xl items-center border border-zinc-800/50">
            <Ionicons name="hammer-outline" size={24} color="#f59e0b" />
            <Text className="text-zinc-300 text-xs font-medium mt-2">Kazandıklarım</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-[#1E1E1E] w-[48%] py-4 rounded-2xl items-center border border-zinc-800/50">
            <Ionicons name="ticket-outline" size={24} color="#ef4444" />
            <Text className="text-zinc-300 text-xs font-medium mt-2">Kuponlarım</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-[#1E1E1E] w-[48%] py-4 rounded-2xl items-center border border-zinc-800/50">
            <Ionicons name="card-outline" size={24} color="#10b981" />
            <Text className="text-zinc-300 text-xs font-medium mt-2">Kayıtlı Kartlar</Text>
          </TouchableOpacity>
        </View>

        {/* Invite & Earn Banner */}
        <View className="px-6 mb-8">
          <TouchableOpacity className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 p-4 rounded-3xl border border-blue-500/30 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="bg-blue-500/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Ionicons name="gift" size={20} color="#60a5fa" />
              </View>
              <View>
                <Text className="text-white font-bold text-base">Davet Et, 50₺ Kazan</Text>
                <Text className="text-blue-300 text-xs mt-0.5">Arkadaşlarını CanlıSat'a çağır</Text>
              </View>
            </View>
            <View className="bg-blue-600 px-3 py-1.5 rounded-full">
              <Text className="text-white font-bold text-xs">Paylaş</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. Seller Dynamic Section */}
        <View className="px-6 mb-8">
          {profile?.is_seller ? (
            <TouchableOpacity
              className="bg-orange-500/10 p-5 rounded-3xl border border-orange-500/30 flex-row items-center justify-between"
              onPress={() => Alert.alert('Satıcı Paneli', 'Yakında eklenecek!')}
            >
              <View className="flex-row items-center">
                <View className="bg-orange-500/20 w-12 h-12 rounded-full items-center justify-center mr-4">
                  <Ionicons name="storefront" size={24} color="#FF6B00" />
                </View>
                <View>
                  <Text className="text-white font-bold text-lg">Satıcı Paneli</Text>
                  <Text className="text-orange-400 text-xs">Mağazanı ve yayınlarını yönet</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FF6B00" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="bg-[#1E1E1E] p-5 rounded-3xl border border-zinc-700 flex-row items-center justify-between"
              onPress={() => Alert.alert('Satıcı Ol', 'Başvuru formu yakında eklenecek!')}
            >
              <View className="flex-row items-center flex-1 pr-4">
                <View className="bg-zinc-800 w-12 h-12 rounded-full items-center justify-center mr-4">
                  <Ionicons name="rocket-outline" size={24} color="#a1a1aa" />
                </View>
                <View>
                  <Text className="text-white font-bold text-lg">CanlıSat'ta Satıcı Ol</Text>
                  <Text className="text-zinc-400 text-xs">Kendi ürünlerini canlı yayında sat</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#a1a1aa" />
            </TouchableOpacity>
          )}
        </View>

        {/* 5. Settings List */}
        <View className="px-6 mb-6">
          <Text className="text-zinc-500 font-bold mb-4 ml-2">HESAP AYARLARI</Text>
          <View className="bg-[#1E1E1E] rounded-3xl overflow-hidden border border-zinc-800">

            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-zinc-800/50">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-black/30 rounded-full items-center justify-center mr-3">
                  <Ionicons name="person-outline" size={18} color="#a1a1aa" />
                </View>
                <Text className="text-white font-medium">Hesap Bilgilerim</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#52525b" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-zinc-800/50">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-black/30 rounded-full items-center justify-center mr-3">
                  <Ionicons name="location-outline" size={18} color="#a1a1aa" />
                </View>
                <Text className="text-white font-medium">Adreslerim</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#52525b" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-zinc-800/50">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-black/30 rounded-full items-center justify-center mr-3">
                  <Ionicons name="options-outline" size={18} color="#a1a1aa" />
                </View>
                <Text className="text-white font-medium">Uygulama Ayarları</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#52525b" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-black/30 rounded-full items-center justify-center mr-3">
                  <Ionicons name="help-buoy-outline" size={18} color="#a1a1aa" />
                </View>
                <Text className="text-white font-medium">Yardım Merkezi</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#52525b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <View className="px-6 mt-4">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex-row items-center justify-center"
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text className="text-red-500 font-bold ml-2">Çıkış Yap</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};
