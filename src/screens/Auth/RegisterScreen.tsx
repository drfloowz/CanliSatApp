import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { Button, Field } from '../../components/ui';
import { errorMessage } from '../../lib/api';

export const RegisterScreen = ({ navigation }: any) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const register = async () => {
    const uname = username.trim().toLowerCase();
    if (!fullName.trim() || !uname || !email.trim() || !password) return setError('Lütfen tüm alanları doldurun.');
    if (!/^[a-z0-9_.]{3,24}$/.test(uname)) return setError('Kullanıcı adı 3-24 karakter; küçük harf, rakam, _ ve . içerebilir.');
    if (password.length < 6) return setError('Şifre en az 6 karakter olmalı.');
    if (!accepted) return setError('Devam etmek için kullanım koşullarını kabul etmelisiniz.');

    setLoading(true);
    setError('');
    const { data: taken } = await supabase.from('profiles').select('id').eq('username', uname).maybeSingle();
    if (taken) {
      setLoading(false);
      return setError('Bu kullanıcı adı alınmış.');
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { username: uname, full_name: fullName.trim() } },
    });
    setLoading(false);
    if (error) return setError(errorMessage(error));
    if (!data.session) {
      Alert.alert('Neredeyse bitti', 'E-posta adresine bir onay bağlantısı gönderdik. Onayladıktan sonra giriş yapabilirsin.');
      navigation.navigate('Login');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 12 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mb-6">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-3xl font-black">Yeni hesap oluştur</Text>
          <Text className="text-zinc-400 mt-2 mb-8">Canlı mezatlara katılmak için hemen üye ol.</Text>

          {error ? (
            <View className="bg-red-500/15 border border-red-500/40 rounded-2xl p-3 mb-4">
              <Text className="text-red-400 text-center font-semibold">{error}</Text>
            </View>
          ) : null}

          <Field label="Ad Soyad" placeholder="Adınız Soyadınız" value={fullName} onChangeText={setFullName} />
          <Field label="Kullanıcı adı" placeholder="ornek_kullanici" autoCapitalize="none" value={username} onChangeText={setUsername} />
          <Field label="E-posta" placeholder="ornek@email.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Field label="Şifre" placeholder="En az 6 karakter" secureTextEntry value={password} onChangeText={setPassword} />

          <TouchableOpacity onPress={() => setAccepted(!accepted)} className="flex-row items-start mb-6">
            <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={22} color={accepted ? '#FF6B00' : '#6B7280'} />
            <Text className="text-zinc-400 ml-2 flex-1 leading-5">
              Kullanım Koşulları’nı ve Gizlilik Politikası’nı okudum, kabul ediyorum. Mezatta verdiğim tekliflerin bağlayıcı olduğunu biliyorum.
            </Text>
          </TouchableOpacity>

          <Button title="Kayıt Ol" onPress={register} loading={loading} />
          <TouchableOpacity onPress={() => navigation.navigate('Login')} className="mt-8 items-center">
            <Text className="text-zinc-400">
              Zaten hesabın var mı? <Text className="text-[#FF6B00] font-bold">Giriş yap</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
