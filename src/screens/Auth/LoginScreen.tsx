import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { Button, Field } from '../../components/ui';
import { errorMessage } from '../../lib/api';

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = async () => {
    if (!email.trim() || !password) return setError('E-posta ve şifre gerekli.');
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) setError(errorMessage(error));
  };

  const forgot = async () => {
    if (!email.trim()) return Alert.alert('Şifre sıfırlama', 'Önce e-posta adresinizi yazın.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    Alert.alert('Şifre sıfırlama', error ? errorMessage(error) : 'Sıfırlama bağlantısı e-postanıza gönderildi.');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
          <View className="items-center mb-10">
            <View className="w-20 h-20 rounded-3xl bg-[#1A1A1A] items-center justify-center mb-5">
              <Ionicons name="hammer" size={36} color="#FF6B00" />
            </View>
            <Text className="text-white text-4xl font-black italic">
              Canlı<Text className="text-[#FF6B00]">Sat</Text>
            </Text>
            <Text className="text-zinc-400 mt-2">Canlı mezatlara anında katıl</Text>
          </View>

          {error ? (
            <View className="bg-red-500/15 border border-red-500/40 rounded-2xl p-3 mb-4">
              <Text className="text-red-400 text-center font-semibold">{error}</Text>
            </View>
          ) : null}

          <Field label="E-posta" placeholder="ornek@email.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <View>
            <Field label="Şifre" placeholder="••••••••" secureTextEntry={!showPw} value={password} onChangeText={setPassword} onSubmitEditing={login} />
            <TouchableOpacity onPress={() => setShowPw(!showPw)} className="absolute right-4 top-[38px]">
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={forgot} className="self-end mb-6">
            <Text className="text-zinc-400 font-semibold">Şifremi unuttum</Text>
          </TouchableOpacity>

          <Button title="Giriş Yap" onPress={login} loading={loading} />

          <TouchableOpacity onPress={() => navigation.navigate('Register')} className="mt-8 items-center">
            <Text className="text-zinc-400">
              Hesabın yok mu? <Text className="text-[#FF6B00] font-bold">Kayıt ol</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
