import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LIVE_STREAMS = [
  { id: '1', broadcaster: 'PokemonKing', viewers: '1.2k', color: 'bg-red-500' },
  { id: '2', broadcaster: 'CardMaster', viewers: '850', color: 'bg-blue-500' },
  { id: '3', broadcaster: 'SneakerHead', viewers: '3.4k', color: 'bg-purple-500' },
  { id: '4', broadcaster: 'VintageToys', viewers: '420', color: 'bg-orange-500' },
];

export const HomeScreen = ({ navigation }: any) => {
  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-16 pb-4 flex-row justify-between items-center">
          <Text className="text-3xl font-bold text-black dark:text-white">Discover</Text>
          <TouchableOpacity 
            className="bg-red-500 px-4 py-2 rounded-full flex-row items-center gap-1"
            onPress={() => navigation.navigate('LiveStreamRoom', { streamId: 'test-room-123', isHost: true })}
          >
            <Ionicons name="videocam" size={16} color="white" />
            <Text className="text-white font-bold">Yayın Aç</Text>
          </TouchableOpacity>
        </View>

        {/* Live Now Section */}
        <View className="mt-4">
          <View className="flex-row items-center justify-between px-6 mb-4">
            <Text className="text-xl font-bold text-black dark:text-white">Live Now</Text>
            <TouchableOpacity>
              <Text className="text-blue-600 dark:text-blue-400 font-semibold">See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {LIVE_STREAMS.map((stream) => (
              <TouchableOpacity
                key={stream.id}
                activeOpacity={0.9}
                className="mx-2 w-40"
                onPress={() => navigation.navigate('LiveStreamRoom', { streamId: 'test-room-123', isHost: false })}
              >
                {/* Fake Cover Photo */}
                <View className={`w-full h-56 rounded-2xl ${stream.color} justify-between p-3`}>
                  {/* LIVE Badge */}
                  <View className="bg-red-600 self-start px-2 py-1 rounded-md">
                    <Text className="text-white text-xs font-bold uppercase tracking-wider">Live</Text>
                  </View>

                  {/* Viewers */}
                  <View className="bg-black/50 self-start px-2 py-1 rounded-md flex-row items-center gap-1">
                    <Ionicons name="eye" size={12} color="white" />
                    <Text className="text-white text-xs font-bold">{stream.viewers}</Text>
                  </View>
                </View>

                {/* Broadcaster Info */}
                <View className="mt-2 flex-row items-center gap-2">
                  <View className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center">
                    <Text className="text-xs font-bold text-gray-500 dark:text-gray-400">{stream.broadcaster[0]}</Text>
                  </View>
                  <Text className="text-black dark:text-white font-semibold text-sm flex-1" numberOfLines={1}>
                    {stream.broadcaster}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};
