import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ImageBackground, Dimensions, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';

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

export const HomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [coverInput, setCoverInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // 1. Fetch initial live streams
    const fetchLiveStreams = async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('status', 'live');
      
      if (data) {
        setLiveStreams(data);
      }
    };
    
    fetchLiveStreams();

    // 2. Subscribe to realtime updates for live_streams table
    const liveStreamsChannel = supabase.channel('live_streams_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, (payload: any) => {
        if (payload.eventType === 'UPDATE' && payload.new.status === 'ended') {
          setLiveStreams((prev) => prev.filter(stream => stream.id !== payload.new.id));
        } else {
          fetchLiveStreams();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(liveStreamsChannel);
    };
  }, []);

  const handleStartLive = async () => {
    if (!titleInput.trim()) {
      Alert.alert('Hata', 'Lütfen bir yayın başlığı girin.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Hata', 'Oturum bilgisi bulunamadı.');
      return;
    }

    setIsStarting(true);
    
    const roomId = 'live_' + Date.now().toString();

    const { error } = await supabase.from('live_streams').insert([{
      id: roomId,
      title: titleInput,
      cover_image: coverInput || 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?q=80&w=600&auto=format&fit=crop',
      host_id: user.id,
      status: 'live'
    }]);

    setIsStarting(false);

    if (error) {
      Alert.alert('Hata', 'Yayın başlatılamadı: ' + error.message);
    } else {
      setIsModalVisible(false);
      setTitleInput('');
      setCoverInput('');
      navigation.navigate('LiveStreamRoom', { streamId: roomId, isHost: true });
    }
  };

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

          {liveStreams.length === 0 ? (
            <View className="py-10 items-center justify-center">
              <Ionicons name="videocam-off-outline" size={48} color="#52525b" />
              <Text className="text-zinc-400 mt-4">Şu an aktif yayın bulunmuyor.</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {liveStreams.map((stream) => (
                <View key={stream.id} className="w-[48%] mb-4">
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('LiveStreamRoom', { streamId: stream.id, isHost: false })}
                  >
                    <View className="w-full aspect-[3/4] bg-zinc-800 rounded-2xl overflow-hidden shadow-lg border border-zinc-800/50">
                      <ImageBackground 
                        source={{ uri: stream.cover_image || `https://picsum.photos/seed/${stream.id}/400/600` }}
                        className="w-full h-full"
                        imageStyle={{ opacity: 0.9 }}
                      >
                        {/* Top Gradient for text readability */}
                        <LinearGradient
                          colors={['rgba(0,0,0,0.6)', 'transparent']}
                          className="absolute top-0 w-full h-20 z-0"
                        />
                        
                        {/* Bottom Gradient for text readability */}
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.8)']}
                          className="absolute bottom-0 w-full h-24 z-0"
                        />

                        {/* LIVE Badge (Top Left) */}
                        <View className="absolute top-2 left-2 bg-red-600 px-2 py-1 rounded flex-row items-center gap-1 z-10 shadow-sm shadow-black">
                          <View className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <Text className="text-white text-[10px] font-black uppercase tracking-widest">{t('home.live')}</Text>
                        </View>

                        {/* Viewers (Top Right) */}
                        <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded flex-row items-center gap-1 z-10 backdrop-blur-sm">
                          <Ionicons name="eye" size={10} color="white" />
                          <Text className="text-white text-[10px] font-bold">12</Text>
                        </View>

                        {/* Broadcaster Info (Bottom Left) */}
                        <View className="absolute bottom-2 left-2 right-2 flex-row items-center gap-2 z-10">
                          <View className="w-7 h-7 rounded-full bg-zinc-700 items-center justify-center border border-white/20 overflow-hidden shadow-md shadow-black">
                            <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${stream.host_id}` }} className="w-full h-full" />
                          </View>
                          <Text className="text-white font-bold text-xs flex-1 tracking-tight drop-shadow-md" numberOfLines={1}>
                            Satıcı
                          </Text>
                        </View>
                      </ImageBackground>
                    </View>
                    
                    {/* Title Below Image */}
                    <Text className="text-white font-semibold text-sm mt-2 px-1" numberOfLines={2}>
                      {stream.title}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB: Start Live Stream */}
      <TouchableOpacity 
        className="absolute bottom-6 right-5 bg-red-600 h-14 w-14 rounded-full items-center justify-center shadow-lg shadow-red-600/30 active:opacity-80"
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="videocam" size={24} color="white" />
      </TouchableOpacity>

      {/* Modal for Starting Stream */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <View className="flex-1 bg-black/80 justify-end">
            <View className="bg-[#1c1c1e] rounded-t-3xl p-6">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-white">Canlı Yayın Başlat</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)} className="p-2">
                  <Ionicons name="close" size={24} color="#a1a1aa" />
                </TouchableOpacity>
              </View>

              <Text className="text-zinc-400 mb-2 ml-1 text-xs uppercase tracking-wider font-bold">Yayın Başlığı <Text className="text-red-500">*</Text></Text>
              <TextInput
                className="bg-zinc-800 text-white p-4 rounded-xl mb-4 font-semibold text-base border border-zinc-700"
                placeholder="Örn: Koleksiyonluk Kart Satışı!"
                placeholderTextColor="#71717a"
                value={titleInput}
                onChangeText={setTitleInput}
              />

              <Text className="text-zinc-400 mb-2 ml-1 text-xs uppercase tracking-wider font-bold">Kapak Görseli URL (İsteğe Bağlı)</Text>
              <TextInput
                className="bg-zinc-800 text-white p-4 rounded-xl mb-6 font-semibold text-base border border-zinc-700"
                placeholder="https://..."
                placeholderTextColor="#71717a"
                value={coverInput}
                onChangeText={setCoverInput}
              />

              <TouchableOpacity 
                className="bg-red-600 p-4 rounded-xl items-center flex-row justify-center shadow-lg shadow-red-600/20"
                onPress={handleStartLive}
                disabled={isStarting}
              >
                {isStarting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="radio" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text className="text-white font-bold text-lg">Yayını Başlat</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
};
