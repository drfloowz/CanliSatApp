import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { streamService } from '../services/streamService';

export const BroadcastRoomScreen = ({ route, navigation }: any) => {
  const { streamId } = route.params || {};

  const handleEndStream = () => {
    Alert.alert(
      'Yayını Bitir',
      'Yayını bitirmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Bitir', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (streamId) {
                await streamService.endLiveStream(streamId);
              }
              navigation.navigate('MainTabs', { screen: 'Home' });
            } catch (error) {
              Alert.alert('Hata', 'Yayın sonlandırılamadı.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#121212] justify-center items-center px-6">
      <View className="absolute top-12 right-6 z-10 flex-row gap-4">
        {/* End Stream Button */}
        <TouchableOpacity 
          className="w-10 h-10 bg-red-600 rounded-lg items-center justify-center shadow-lg shadow-red-600/40"
          onPress={handleEndStream}
        >
          <Ionicons name="stop" size={20} color="white" />
        </TouchableOpacity>
        
        {/* Pause/Leave Button (Does not end stream) */}
        <TouchableOpacity 
          className="w-10 h-10 bg-[#1E1E1E] rounded-full items-center justify-center border border-zinc-800"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <Ionicons name="videocam" size={64} color="#FF6B00" className="mb-4" />
      <Text className="text-white text-3xl font-extrabold mb-2 text-center">Broadcast Room</Text>
      <Text className="text-zinc-400 text-center mb-6">
        Placeholder screen for stream ID: {streamId}
      </Text>
      
      <View className="bg-[#1E1E1E] px-6 py-3 rounded-full border border-zinc-800 flex-row items-center gap-2">
        <View className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse" />
        <Text className="text-[#FF6B00] font-bold tracking-widest">LIVE</Text>
      </View>
    </SafeAreaView>
  );
};
