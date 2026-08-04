import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { authService } from '../../../src/services/authService';
import { useAuthStore } from '../../store/useAuthStore';

export const RegisterScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const setIsSigningUp = useAuthStore((state) => state.setIsSigningUp);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      setErrorMsg('Lütfen tüm alanları doldurun.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    setIsSigningUp(true);
    
    try {
      await authService.register(email, password, username);
      // Çıkış yaparak kullanıcının otomatik girişini önle
      await authService.logout();
      Alert.alert(t('register.successTitle'), t('register.successMessage'));
      navigation.navigate('Login');
    } catch (error: any) {
      setErrorMsg(error.message || 'Kayıt olurken bir hata oluştu.');
    } finally {
      setIsSigningUp(false);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#121212]" edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
      >
        <View className="items-center mb-10">
          <Text className="text-4xl font-extrabold text-white tracking-tight mb-2">{t('register.title')}</Text>
          <Text className="text-zinc-400 text-base">{t('register.subtitle')}</Text>
        </View>

        <View className="gap-6">
          {errorMsg ? (
            <View className="bg-red-500/20 p-4 rounded-2xl border border-red-500/50">
              <Text className="text-red-400 text-sm font-semibold text-center">{errorMsg}</Text>
            </View>
          ) : null}

          <View>
            <Text className="text-zinc-300 font-bold mb-2 ml-1">Kullanıcı Adı</Text>
            <TextInput 
              className="w-full bg-[#1E1E1E] text-white px-5 py-4 rounded-2xl border border-transparent focus:border-[#FF6B00] transition-colors font-medium"
              placeholder="Kullanıcı adınız"
              placeholderTextColor="#71717a"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View>
            <Text className="text-zinc-300 font-bold mb-2 ml-1">{t('register.emailLabel')}</Text>
            <TextInput 
              className="w-full bg-[#1E1E1E] text-white px-5 py-4 rounded-2xl border border-transparent focus:border-[#FF6B00] transition-colors font-medium"
              placeholder={t('register.emailPlaceholder')}
              placeholderTextColor="#71717a"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View>
            <Text className="text-zinc-300 font-bold mb-2 ml-1">{t('register.passwordLabel')}</Text>
            <TextInput 
              className="w-full bg-[#1E1E1E] text-white px-5 py-4 rounded-2xl border border-transparent focus:border-[#FF6B00] transition-colors font-medium"
              placeholder={t('register.passwordPlaceholder')}
              placeholderTextColor="#71717a"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity 
            onPress={handleRegister}
            disabled={loading}
            className={`w-full ${loading ? 'opacity-70' : 'opacity-100'} bg-[#FF6B00] mt-4 py-4 rounded-2xl items-center shadow-lg shadow-orange-500/30 active:opacity-80 flex-row justify-center`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" className="mr-2" />
            ) : null}
            <Text className="text-white font-black text-lg tracking-wide">
              {loading ? 'Yükleniyor...' : t('register.button')}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-10">
          <Text className="text-zinc-400 text-sm font-medium">{t('register.hasAccount')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
            <Text className="text-[#FF6B00] font-bold text-sm ml-1">{t('register.loginLink')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
