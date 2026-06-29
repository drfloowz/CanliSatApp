import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FAKE_MESSAGES = [
  { id: '1', user: 'CardKing', text: 'How much for the Charizard?' },
  { id: '2', user: 'PokeCollector', text: 'I bid $45!' },
  { id: '3', user: 'AshK', text: 'Is it mint condition?' },
  { id: '4', user: 'TrainerRed', text: 'Looks great.' },
  { id: '5', user: 'Misty', text: 'Let\'s go!' },
];

export const LiveStreamRoomScreen = ({ navigation }: any) => {
  return (
    <View className="flex-1 bg-gray-900 relative">
      {/* 
        This black background represents the video player.
        Everything else is an overlay on top of it.
      */}

      {/* Top Overlay: Broadcaster Info & Close Button */}
      <SafeAreaView className="absolute top-0 w-full z-10 flex-row justify-between items-start px-4 pt-4">
        {/* Broadcaster Profile */}
        <View className="bg-black/40 rounded-full flex-row items-center p-1 pr-4">
          <View className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center mr-2">
            <Text className="text-white font-bold">PK</Text>
          </View>
          <View className="mr-3">
            <Text className="text-white font-bold text-sm">PokemonKing</Text>
            <View className="flex-row items-center">
              <Ionicons name="star" size={10} color="#fbbf24" />
              <Text className="text-white text-xs ml-1">4.7</Text>
            </View>
          </View>
          <TouchableOpacity className="bg-blue-600 px-3 py-1.5 rounded-full">
            <Text className="text-white text-xs font-bold">Follow</Text>
          </TouchableOpacity>
        </View>

        {/* Close Button */}
        <TouchableOpacity 
          className="w-10 h-10 bg-black/40 rounded-full items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Product & Bid Overlay (Absolute Bottom-Right, above the interaction bar) */}
      <View className="absolute bottom-24 right-4 z-10 w-44 bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-lg">
        {/* Product Image Placeholder */}
        <View className="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2 items-center justify-center">
          <Ionicons name="image-outline" size={32} color="#9ca3af" />
        </View>
        <Text className="text-black dark:text-white font-bold text-sm mb-1" numberOfLines={1}>
          Charizard Holo
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-xs mb-2">
          Current Bid: <Text className="font-bold text-black dark:text-white">$42</Text>
        </Text>
        
        <TouchableOpacity className="w-full bg-green-500 py-3 rounded-xl items-center shadow-sm">
          <Text className="text-white font-bold text-lg">Bid $45</Text>
        </TouchableOpacity>
        <Text className="text-center text-red-500 font-bold text-xs mt-2">Time: 00:05</Text>
      </View>

      {/* Chat Overlay (Absolute Bottom-Left, above the interaction bar) */}
      <View className="absolute bottom-24 left-4 z-10 w-2/3 h-1/3 justify-end">
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
        >
          {FAKE_MESSAGES.map((msg) => (
            <View key={msg.id} className="bg-black/30 self-start px-3 py-1.5 rounded-xl mb-2 flex-row flex-wrap">
              <Text className="text-white font-bold mr-1">{msg.user}:</Text>
              <Text className="text-white">{msg.text}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Bottom Interaction Bar */}
      <SafeAreaView className="absolute bottom-0 w-full z-20 flex-row items-center px-4 pb-2 bg-gradient-to-t from-black/80 to-transparent pt-4">
        <View className="flex-1 bg-black/40 rounded-full flex-row items-center px-4 py-3 mr-3 border border-white/20">
          <TextInput 
            className="flex-1 text-white text-base"
            placeholder="Say something..."
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        <TouchableOpacity className="w-12 h-12 bg-black/40 rounded-full items-center justify-center mr-2">
          <Ionicons name="wallet-outline" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity className="w-12 h-12 bg-black/40 rounded-full items-center justify-center">
          <Ionicons name="share-social-outline" size={24} color="white" />
        </TouchableOpacity>
      </SafeAreaView>

    </View>
  );
};
