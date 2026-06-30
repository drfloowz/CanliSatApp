import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export const DiscoverScreen = () => {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-zinc-950 justify-center items-center" edges={['top']}>
      <Text className="text-white text-2xl font-bold">{t('tabs.discover')}</Text>
    </SafeAreaView>
  );
};
