import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';

export const AccountScreen = () => {
  const { themeMode, setThemeMode } = useThemeStore();

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
      <Text className="text-black dark:text-white text-xl font-bold mb-8">Account Screen</Text>
      
      <Text className="text-gray-500 dark:text-gray-400 mb-4">Current Theme: {themeMode}</Text>
      
      <View className="flex-row gap-4">
        <TouchableOpacity 
          className="bg-blue-500 px-4 py-2 rounded-lg"
          onPress={() => setThemeMode('light')}
        >
          <Text className="text-white font-semibold">Light</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700"
          onPress={() => setThemeMode('dark')}
        >
          <Text className="text-white font-semibold">Dark</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="bg-green-600 px-4 py-2 rounded-lg"
          onPress={() => setThemeMode('system')}
        >
          <Text className="text-white font-semibold">System</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
