import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../src/services/supabase';
import { useAuthStore } from '../../store/useAuthStore';

export const RegisterScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const setIsSigningUp = useAuthStore((state) => state.setIsSigningUp);

  const handleRegister = async () => {
    if (!email || !password) {
      setErrorMsg('Lütfen tüm alanları doldurun.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    setIsSigningUp(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        // Çıkış yaparak kullanıcının otomatik girişini önle
        await supabase.auth.signOut();
        Alert.alert(t('register.successTitle'), t('register.successMessage'));
        navigation.navigate('Login');
      }
    } finally {
      setIsSigningUp(false);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
      >
        <View className="items-center mb-8">
          <Text className="text-4xl font-extrabold text-white tracking-tight mb-2">{t('register.title')}</Text>
          <Text className="text-zinc-400 text-base">{t('register.subtitle')}</Text>
        </View>

        <View className="gap-5">
          {errorMsg ? (
            <View className="bg-red-500/20 p-3 rounded-xl border border-red-500/50">
              <Text className="text-red-400 text-sm text-center">{errorMsg}</Text>
            </View>
          ) : null}

          <View>
            <Text className="text-zinc-300 font-semibold mb-2 ml-1">{t('register.emailLabel')}</Text>
            <TextInput 
              className="w-full bg-zinc-900/80 text-white px-5 py-4 rounded-2xl border border-zinc-800 focus:border-zinc-500 focus:bg-zinc-800/80 transition-colors"
              placeholder={t('register.emailPlaceholder')}
              placeholderTextColor="#71717a"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View>
            <Text className="text-zinc-300 font-semibold mb-2 ml-1">{t('register.passwordLabel')}</Text>
            <TextInput 
              className="w-full bg-zinc-900/80 text-white px-5 py-4 rounded-2xl border border-zinc-800 focus:border-zinc-500 focus:bg-zinc-800/80 transition-colors"
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
            className={`w-full ${loading ? 'bg-yellow-400/50' : 'bg-yellow-400'} mt-2 py-4 rounded-2xl items-center shadow-lg shadow-yellow-500/20 active:opacity-80 flex-row justify-center`}
          >
            {loading ? (
              <ActivityIndicator color="#09090b" className="mr-2" />
            ) : null}
            <Text className="text-zinc-950 font-black text-lg tracking-wide">
              {loading ? 'Yükleniyor...' : t('register.button')}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-10">
          <Text className="text-zinc-400 text-sm">{t('register.hasAccount')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
            <Text className="text-yellow-400 font-bold text-sm">{t('register.loginLink')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
