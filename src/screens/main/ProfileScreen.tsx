import React, { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { formatTL } from '../../lib/format';
import { SUPPORT_EMAIL } from '../../lib/constants';
import { pickAndUploadImage, rpc, showError } from '../../lib/api';
import { Avatar, ListRow } from '../../components/ui';

export const ProfileScreen = ({ navigation }: any) => {
  const { profile, user, refreshProfile, logout } = useAuthStore();
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [uploading, setUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      if (!user) return;
      Promise.all([
        supabase.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('followers').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
      ]).then(([a, b]) => setCounts({ followers: a.count ?? 0, following: b.count ?? 0 }));
    }, [user, refreshProfile]),
  );

  const changeAvatar = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const url = await pickAndUploadImage(user.id, 'avatars', [1, 1]);
      if (url) {
        const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
        if (error) throw error;
        await refreshProfile();
      }
    } catch (e) {
      showError(e);
    } finally {
      setUploading(false);
    }
  };

  const invite = () =>
    Share.share({
      message: `CanlıSat'ta canlı mezatlara katıl! Kayıt olduktan sonra Profil > Davet kodu bölümüne ${profile?.referral_code} kodumu gir, ilk alışverişinde ikimiz de kazanalım 🎁`,
    });

  const enterCode = () =>
    Alert.prompt?.('Davet kodu', 'Seni davet eden arkadaşının kodunu gir', async (code) => {
      if (!code) return;
      try {
        await rpc('apply_referral_code', { p_code: code });
        Alert.alert('Teşekkürler 🎁', 'Davet kodu kaydedildi.');
      } catch (e) {
        showError(e);
      }
    });

  const deleteAccount = () =>
    Alert.alert('Hesabı sil', 'Hesabın ve tüm verilerin kalıcı olarak silinecek. Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Hesabımı sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await rpc('delete_my_account');
            await logout();
          } catch (e) {
            showError(e);
          }
        },
      },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-row items-center justify-between px-4 pt-2">
          <Text className="text-white text-3xl font-black">Profilim</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center">
            <Ionicons name="notifications-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View className="items-center mt-4">
          <TouchableOpacity onPress={changeAvatar} disabled={uploading}>
            <Avatar uri={profile?.avatar_url} name={profile?.full_name || profile?.username} size={96} />
            <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#FF6B00] items-center justify-center border-2 border-[#0E0E0E]">
              <Ionicons name={uploading ? 'hourglass' : 'camera'} size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text className="text-white text-xl font-black mt-3">{profile?.full_name || profile?.username}</Text>
          <Text className="text-zinc-500">@{profile?.username}</Text>
          {profile?.is_seller && (
            <View className="flex-row items-center bg-[#FF6B00]/15 px-3 py-1 rounded-full mt-2">
              <Ionicons name="checkmark-circle" size={14} color="#FF6B00" />
              <Text className="text-[#FF6B00] text-xs font-bold ml-1">Onaylı satıcı</Text>
            </View>
          )}
          <View className="flex-row mt-4">
            <View className="items-center px-6">
              <Text className="text-white font-black text-lg">{counts.followers}</Text>
              <Text className="text-zinc-500 text-xs">Takipçi</Text>
            </View>
            <View className="w-px bg-[#2A2A2A]" />
            <View className="items-center px-6">
              <Text className="text-white font-black text-lg">{counts.following}</Text>
              <Text className="text-zinc-500 text-xs">Takip</Text>
            </View>
          </View>
        </View>

        <View className="mx-4 mt-6 bg-[#1A1A1A] rounded-2xl p-4 flex-row items-center border border-[#2A2A2A]">
          <View className="flex-1">
            <Text className="text-zinc-400 text-xs">CanlıSat kredisi</Text>
            <Text className="text-white text-2xl font-black mt-1">{formatTL(profile?.credits ?? 0)}</Text>
            <Text className="text-zinc-500 text-[11px] mt-1">Kampanya ve davetlerden kazanılır, alışverişte kullanılır.</Text>
          </View>
        </View>

        <TouchableOpacity onPress={invite} className="mx-4 mt-3 rounded-2xl p-4 flex-row items-center bg-[#7C3AED]/15 border border-[#7C3AED]/40">
          <Ionicons name="gift" size={26} color="#A78BFA" />
          <View className="flex-1 ml-3">
            <Text className="text-white font-bold">Davet et, 50 ₺ kazan</Text>
            <Text className="text-[#C4B5FD] text-xs">Davet kodun: {profile?.referral_code}</Text>
          </View>
          <Text className="text-white font-bold">Paylaş</Text>
        </TouchableOpacity>

        <View className="mx-4 mt-5 bg-[#1A1A1A] rounded-2xl overflow-hidden">
          {profile?.is_seller ? (
            <ListRow icon="storefront-outline" label="Mağazam" sub="Alıcıların gördüğü sayfa" onPress={() => navigation.navigate('SellerProfile', { userId: user?.id })} />
          ) : (
            <ListRow icon="rocket-outline" label="CanlıSat’ta satıcı ol" sub="Ürünlerini canlı yayında sat" onPress={() => navigation.navigate('Live')} />
          )}
          {profile?.is_admin && <ListRow icon="shield-outline" label="Yönetim paneli" sub="Başvurular ve şikâyetler" onPress={() => navigation.navigate('Admin')} />}
          <ListRow icon="person-outline" label="Hesap bilgilerim" onPress={() => navigation.navigate('EditProfile')} />
          <ListRow icon="location-outline" label="Adreslerim" onPress={() => navigation.navigate('Addresses')} />
          <ListRow icon="ticket-outline" label="Davet kodu gir" onPress={enterCode} />
        </View>

        <View className="mx-4 mt-5 bg-[#1A1A1A] rounded-2xl overflow-hidden">
          <ListRow icon="help-circle-outline" label="Yardım ve destek" sub={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
          <ListRow icon="document-text-outline" label="Kullanım koşulları ve gizlilik" onPress={() => navigation.navigate('Legal')} />
          <ListRow icon="log-out-outline" label="Çıkış yap" danger onPress={() => Alert.alert('Çıkış yap', 'Emin misin?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Çıkış yap', style: 'destructive', onPress: logout }])} />
          <ListRow icon="trash-outline" label="Hesabımı sil" danger onPress={deleteAccount} />
        </View>
        <Text className="text-zinc-600 text-xs text-center mt-6">CanlıSat v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};
