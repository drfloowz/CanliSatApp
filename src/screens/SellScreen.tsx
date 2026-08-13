import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

  const handleStartLive = async () => {
    // Boş başlık kontrolü eklendi
    if (!streamTitle.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen yayına başlamadan önce bir başlık girin.');
      return;
    }

    setIsStarting(true);
    try {
      // 1. Create stream in backend
      const newStream = await streamService.startLiveStream({
        title: streamTitle,
        mode: streamMode, 
      });

      // 2. Navigate to the room as HOST with the created stream's ID
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

  return (
    <SafeAreaView className="flex-1 bg-[#121212]">
      <ScrollView
        contentContainerStyle={{ padding: 24 }}
        keyboardShouldPersistTaps="handled" // Klavye UX'i için eklendi
      >
        <Text className="text-white text-3xl font-black mb-8">Canlı Yayın Başlat</Text>

        <View className="mb-8">
          <Text className="text-gray-400 font-bold mb-2 ml-1">Yayın Başlığı</Text>
          <TextInput
            className="bg-zinc-900 border border-zinc-800 text-white p-4 rounded-xl text-base"
            placeholder="Ne satıyorsunuz?"
            placeholderTextColor="#6b7280"
            value={streamTitle}
            onChangeText={setStreamTitle}
            maxLength={50} // Çok uzun başlıkları engellemek için
          />
        </View>

        <View className="mb-10">
          <Text className="text-gray-400 font-bold mb-4 ml-1">Satış Formatı</Text>

          <TouchableOpacity
            onPress={() => setStreamMode('auction')}
            className={`p-4 rounded-xl border-2 mb-4 flex-row items-center ${streamMode === 'auction' ? 'border-[#FF6B00] bg-[#FF6B00]/10' : 'border-zinc-800 bg-zinc-900'
              }`}
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
            className={`p-4 rounded-xl border-2 flex-row items-center ${streamMode === 'showcase' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900'
              }`}
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

      </ScrollView>

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