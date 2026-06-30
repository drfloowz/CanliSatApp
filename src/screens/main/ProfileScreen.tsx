import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';

export const ProfileScreen = () => {
  const { t, i18n } = useTranslation();
  const logout = useAuthStore((state) => state.logout);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'tr' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950 justify-center items-center" edges={['top']}>
      <Text className="text-white text-2xl font-bold mb-6">{t('tabs.profile')}</Text>
      
      <View className="gap-4">
        <TouchableOpacity 
          onPress={toggleLanguage}
          className="bg-zinc-800 border border-zinc-700 px-8 py-4 rounded-2xl active:opacity-80 flex-row items-center justify-center gap-2"
        >
          <Ionicons name="language" size={20} color="#fbbf24" />
          <Text className="text-yellow-400 font-bold tracking-wide">{t('common.switchLanguage')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={logout}
          className="bg-zinc-800 border border-zinc-700 px-8 py-4 rounded-2xl active:opacity-80 flex-row items-center justify-center gap-2"
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text className="text-red-500 font-bold tracking-wide">Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
