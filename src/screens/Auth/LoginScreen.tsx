import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../../src/services/authService';

export const LoginScreen = ({ navigation }: any) => {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Lütfen e-posta ve şifrenizi girin.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await authService.login(email, password);
      // Navigation is handled by auth listener in useAuthStore
    } catch (error: any) {
      setErrorMsg(error.message || 'Giriş başarısız oldu. Bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'tr' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#121212]" edges={['top', 'bottom']}>
      <TouchableOpacity 
        onPress={toggleLanguage}
        className="absolute top-12 right-6 bg-[#1E1E1E] px-4 py-2 rounded-full border border-zinc-700 flex-row items-center gap-1 z-10"
      >
        <Ionicons name="language" size={16} color="#FF6B00" />
        <Text className="text-zinc-300 font-semibold text-xs">{t('common.switchLanguage')}</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
      >
        <View className="items-center mb-10">
          <Text className="text-4xl font-extrabold text-white tracking-tight mb-2">{t('login.title')}</Text>
          <Text className="text-zinc-400 text-base">{t('login.subtitle')}</Text>
        </View>

        <View className="gap-6">
          {errorMsg ? (
            <View className="bg-red-500/20 p-4 rounded-2xl border border-red-500/50">
              <Text className="text-red-400 text-sm font-semibold text-center">{errorMsg}</Text>
            </View>
          ) : null}

          <View>
            <Text className="text-zinc-300 font-bold mb-2 ml-1">{t('login.emailLabel')}</Text>
            <TextInput 
              className="w-full bg-[#1E1E1E] text-white px-5 py-4 rounded-2xl border border-transparent focus:border-[#FF6B00] transition-colors font-medium"
              placeholder={t('login.emailPlaceholder')}
              placeholderTextColor="#71717a"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View>
            <Text className="text-zinc-300 font-bold mb-2 ml-1">{t('login.passwordLabel')}</Text>
            <TextInput 
              className="w-full bg-[#1E1E1E] text-white px-5 py-4 rounded-2xl border border-transparent focus:border-[#FF6B00] transition-colors font-medium"
              placeholder={t('login.passwordPlaceholder')}
              placeholderTextColor="#71717a"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity 
            onPress={handleLogin}
            disabled={loading}
            className={`w-full ${loading ? 'opacity-70' : 'opacity-100'} bg-[#FF6B00] mt-4 py-4 rounded-2xl items-center shadow-lg shadow-orange-500/30 active:opacity-80 flex-row justify-center`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" className="mr-2" />
            ) : null}
            <Text className="text-white font-black text-lg tracking-wide">
              {loading ? 'Yükleniyor...' : t('login.button')}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-10">
          <Text className="text-zinc-400 text-sm font-medium">{t('login.noAccount')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={loading}>
            <Text className="text-[#FF6B00] font-bold text-sm ml-1">{t('login.registerLink')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
