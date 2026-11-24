import React, { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { showError } from '../../lib/api';
import { Button, Field, Header } from '../../components/ui';

export const EditProfileScreen = ({ navigation }: any) => {
  const { profile, user, refreshProfile } = useAuthStore();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const uname = username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,24}$/.test(uname)) return showError(new Error('Kullanıcı adı 3-24 karakter; küçük harf, rakam, _ ve . içerebilir.'));
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null, username: uname, bio: bio.trim() || null })
      .eq('id', user!.id);
    setSaving(false);
    if (error) return showError(error);
    await refreshProfile();
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]">
      <Header title="Hesap bilgilerim" />
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
          <Field label="Ad Soyad" value={fullName} onChangeText={setFullName} />
          <Field label="Kullanıcı adı" autoCapitalize="none" value={username} onChangeText={setUsername} />
          <Field label="Hakkımda" multiline maxLength={160} placeholder="Kendinden veya mağazandan kısaca bahset" value={bio} onChangeText={setBio} />
          <Text className="text-zinc-500 text-xs mb-6">E-posta: {user?.email}</Text>
          <Button title="Kaydet" loading={saving} onPress={save} />
        </ScrollView>
    </SafeAreaView>
  );
};
