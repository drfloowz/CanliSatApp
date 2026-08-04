import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { streamService } from '../../services/streamService';

export const LiveSetupScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [isSeller, setIsSeller] = useState(false);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) return;
      try {
        setLoading(true);
        // 1. Fetch seller status
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_seller')
          .eq('id', user.id)
          .single();
        
        if (!profileError) {
          setIsSeller(!!profileData?.is_seller);
        }

        // 2. Fetch active stream for this host
        const { data: streamData, error: streamError } = await supabase
          .from('live_streams')
          .select('id')
          .eq('host_id', user.id)
          .eq('status', 'live')
          .maybeSingle();

        if (streamData) {
          setActiveStreamId(streamData.id);
        } else {
          setActiveStreamId(null);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    // Check status on mount AND when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      checkStatus();
    });

    checkStatus();

    return unsubscribe;
  }, [user, navigation]);

  const handleStartStream = async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Lütfen yayın başlığını girin.');
      return;
    }
    
    setIsStarting(true);
    
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .insert([
          {
            host_id: user?.id,
            title: title.trim(),
            status: 'live',
          }
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      navigation.navigate('BroadcastRoom', { streamId: data.id });
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Yayın başlatılamadı.');
    } finally {
      setIsStarting(false);
    }
  };

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
        <View className="items-center mb-8 bg-[#1E1E1E] p-8 rounded-3xl w-full border border-zinc-800 shadow-xl shadow-black">
          <View className="bg-zinc-800/50 p-4 rounded-full mb-6">
            <Ionicons name="lock-closed" size={48} color="#FF6B00" />
          </View>
          <Text className="text-white text-2xl font-extrabold text-center mb-3">Erişim Engellendi</Text>
          <Text className="text-zinc-400 text-center text-base mb-8 leading-6">
            Sadece onaylı satıcılar canlı yayın başlatabilir. Topluluğumuza katılıp satış yapmak ister misiniz?
          </Text>
          <TouchableOpacity className="bg-[#FF6B00] w-full py-4 rounded-2xl items-center shadow-lg shadow-orange-500/30">
            <Text className="text-white font-black text-lg">Satıcı Başvurusu Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (activeStreamId) {
    return (
      <SafeAreaView className="flex-1 bg-[#121212] justify-center items-center px-6">
        <View className="items-center mb-8 bg-[#1E1E1E] p-8 rounded-3xl w-full border border-zinc-800 shadow-xl shadow-black">
          <View className="bg-[#FF6B00]/20 p-4 rounded-full mb-6">
            <Ionicons name="radio" size={48} color="#FF6B00" />
          </View>
          <Text className="text-white text-2xl font-extrabold text-center mb-3">Devam Eden Yayın</Text>
          <Text className="text-zinc-400 text-center text-base mb-8 leading-6">
            Zaten aktif bir yayınınız bulunuyor. Yayına dönebilir veya sonlandırabilirsiniz.
          </Text>
          
          <TouchableOpacity 
            className="bg-[#FF6B00] w-full py-4 rounded-2xl items-center shadow-lg shadow-orange-500/30 mb-4"
            onPress={() => navigation.navigate('BroadcastRoom', { streamId: activeStreamId })}
          >
            <Text className="text-white font-black text-lg">Yayına Dön (Resume)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="bg-red-600/10 border border-red-600/30 w-full py-4 rounded-2xl items-center"
            onPress={handleEndActiveStream}
          >
            <Text className="text-red-500 font-bold text-lg">Yayını Bitir (End)</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#121212]" edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 px-6 justify-center"
      >
        <View className="mb-10 items-center">
          <View className="bg-[#FF6B00]/20 p-4 rounded-full mb-4">
            <Ionicons name="radio" size={40} color="#FF6B00" />
          </View>
          <Text className="text-3xl font-extrabold text-white mb-2">Canlı Yayın Başlat</Text>
          <Text className="text-zinc-400">Takipçilerinle etkileşime geç ve satış yap</Text>
        </View>

        <View className="gap-5">
          <View>
            <Text className="text-zinc-300 font-bold mb-2 ml-1">Yayın Başlığı *</Text>
            <TextInput 
              className="w-full bg-[#1E1E1E] text-white px-5 py-4 rounded-2xl border border-transparent focus:border-[#FF6B00] transition-colors font-medium"
              placeholder="Örn: Büyük Yaz İndirimi!"
              placeholderTextColor="#71717a"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View>
            <Text className="text-zinc-300 font-bold mb-2 ml-1">Kapak Görseli URL (Opsiyonel)</Text>
            <TextInput 
              className="w-full bg-[#1E1E1E] text-white px-5 py-4 rounded-2xl border border-transparent focus:border-[#FF6B00] transition-colors font-medium"
              placeholder="https://example.com/image.jpg"
              placeholderTextColor="#71717a"
              keyboardType="url"
              autoCapitalize="none"
              value={coverUrl}
              onChangeText={setCoverUrl}
            />
          </View>

          <TouchableOpacity 
            onPress={handleStartStream}
            disabled={isStarting}
            className={`w-full ${isStarting ? 'opacity-70' : 'opacity-100'} bg-[#FF6B00] mt-4 py-4 rounded-2xl items-center shadow-lg shadow-orange-500/30 flex-row justify-center`}
          >
            {isStarting && <ActivityIndicator color="#fff" className="mr-2" />}
            <Text className="text-white font-black text-lg tracking-wide">
              {isStarting ? 'Başlatılıyor...' : 'Yayını Başlat'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
