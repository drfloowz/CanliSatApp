import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useColorScheme } from 'nativewind';

export const AccountScreen = () => {
  const { themeMode, setThemeMode } = useThemeStore();
  const { setColorScheme } = useColorScheme();
  const logout = useAuthStore((state) => state.logout);

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    setColorScheme(mode);
  };

  const menuItems = [
    { id: 1, title: 'Notifications' },
    { id: 2, title: 'Payments & Shipping' },
    { id: 3, title: 'Complete Seller Setup' },
    { id: 4, title: 'Settings' },
  ];

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      {/* Profile Header */}
      <View className="items-center mt-10 mb-6">
        <View className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center mb-4">
          <Text className="text-gray-500 dark:text-gray-400 text-3xl font-bold">U</Text>
        </View>
        <Text className="text-2xl font-bold text-black dark:text-white mb-2">User Name</Text>
        
        {/* Stats */}
        <View className="flex-row justify-center gap-8 mt-2">
          <View className="items-center">
            <Text className="text-lg font-bold text-black dark:text-white">0</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">Followers</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-black dark:text-white">0</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">Following</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View className="px-6 mb-8">
        {menuItems.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            className="py-4 border-b border-gray-100 dark:border-gray-800"
          >
            <Text className="text-black dark:text-white text-base">{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Theme Toggles */}
      <View className="px-6 mb-8">
        <Text className="text-gray-500 dark:text-gray-400 mb-4 font-medium uppercase text-xs">Appearance</Text>
        <View className="flex-row gap-4">
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${themeMode === 'light' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'}`}
            onPress={() => handleThemeChange('light')}
          >
            <Text className={`font-semibold ${themeMode === 'light' ? 'text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>Light</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${themeMode === 'dark' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'}`}
            onPress={() => handleThemeChange('dark')}
          >
            <Text className={`font-semibold ${themeMode === 'dark' ? 'text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>Dark</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${themeMode === 'system' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'}`}
            onPress={() => handleThemeChange('system')}
          >
            <Text className={`font-semibold ${themeMode === 'system' ? 'text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>System</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out Button */}
      <View className="px-6 mb-12">
        <TouchableOpacity 
          className="w-full bg-red-100 dark:bg-red-900/30 py-4 rounded-xl items-center"
          onPress={() => logout()}
        >
          <Text className="text-red-600 dark:text-red-400 font-bold text-base">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
