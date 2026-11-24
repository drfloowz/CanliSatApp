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
import { Avatar } from '../../components/ui';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';

type Ion = keyof typeof Ionicons.glyphMap;

export const ProfileScreen = ({ navigation }: any) => {
  const { profile, user, refreshProfile, logout } = useAuthStore();
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [uploading, setUploading] = useState(false);
  const unread = useUnreadCount();
  const unreadMessages = useUnreadMessages();

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
      message: `CanlıSat'ta canlı mezatlara katıl! Kayıt olduktan sonra Profil > Davet kodu gir bölümüne ${profile?.referral_code} kodumu yaz, ilk alışverişinde ikimiz de kazanalım 🎁`,
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

  const goActivity = (tab: string) => navigation.navigate('Activities', { tab });

  const tiles: { icon: Ion; color: string; label: string; onPress: () => void }[] = [
    { icon: 'cube-outline', color: '#3B82F6', label: 'Siparişlerim', onPress: () => goActivity('orders') },
    { icon: 'hammer-outline', color: '#F59E0B', label: 'Tekliflerim', onPress: () => goActivity('bids') },
    { icon: 'heart-outline', color: '#EF4444', label: 'Favorilerim', onPress: () => goActivity('favorites') },
    { icon: 'chatbubbles-outline', color: '#22C55E', label: 'Mesajlarım', onPress: () => navigation.navigate('Inbox') },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {/* Üst ikonlar */}
        <View className="flex-row justify-end pt-1">
          <IconBadge icon="chatbubble-ellipses-outline" count={unreadMessages} onPress={() => navigation.navigate('Inbox')} />
          <IconBadge icon="notifications-outline" count={unread} onPress={() => navigation.navigate('Notifications')} />
        </View>

        {/* Kimlik */}
        <View className="items-center mt-1">
          <TouchableOpacity onPress={changeAvatar} disabled={uploading}>
            <View className="p-1 rounded-full border-2 border-[#2A2A2A]">
              <Avatar uri={profile?.avatar_url} name={profile?.full_name || profile?.username} size={92} />
            </View>
            <View className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#FF6B00] items-center justify-center border-2 border-[#0E0E0E]">
              <Ionicons name={uploading ? 'hourglass' : 'camera'} size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text className="text-white text-xl font-black mt-3">{profile?.full_name || profile?.username}</Text>
          <Text className="text-zinc-500">@{profile?.username}</Text>
          <View className="flex-row items-center bg-[#1A1A1A] px-3 py-1.5 rounded-full mt-2">
            <Ionicons name={profile?.is_seller ? 'storefront' : 'shield-checkmark'} size={13} color={profile?.is_seller ? '#FF6B00' : '#22C55E'} />
            <Text className="text-zinc-200 text-xs font-bold ml-1.5">{profile?.is_seller ? 'Onaylı Satıcı' : 'Alıcı'}</Text>
          </View>
          <View className="flex-row mt-4">
            <View className="items-center px-7">
              <Text className="text-white font-black text-lg">{counts.followers}</Text>
              <Text className="text-zinc-500 text-xs">Takipçi</Text>
            </View>
            <View className="w-px bg-[#2A2A2A]" />
            <View className="items-center px-7">
              <Text className="text-white font-black text-lg">{counts.following}</Text>
              <Text className="text-zinc-500 text-xs">Takip</Text>
            </View>
          </View>
        </View>

        {/* Kredi */}
        <View className="mt-6 bg-[#141414] rounded-3xl p-5 flex-row items-center border border-[#262626]">
          <View className="flex-1">
            <View className="flex-row items-center">
              <Ionicons name="wallet-outline" size={15} color="#9CA3AF" />
              <Text className="text-zinc-400 text-sm ml-1.5">CanlıSat Kredisi</Text>
            </View>
            <Text className="text-white text-3xl font-black mt-1">{formatTL(profile?.credits ?? 0)}</Text>
          </View>
          <TouchableOpacity onPress={invite} className="bg-[#FF6B00] rounded-2xl px-4 h-12 flex-row items-center shadow-lg shadow-orange-500/40">
            <Ionicons name="gift-outline" size={18} color="#fff" />
            <Text className="text-white font-bold ml-1.5">Kazan</Text>
          </TouchableOpacity>
        </View>

        {/* Kısayollar */}
        <View className="flex-row flex-wrap justify-between mt-4">
          {tiles.map((t) => (
            <TouchableOpacity key={t.label} onPress={t.onPress} className="w-[48.5%] bg-[#1A1A1A] rounded-2xl py-5 items-center mb-3">
              <Ionicons name={t.icon} size={26} color={t.color} />
              <Text className="text-zinc-200 font-semibold mt-2">{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Davet */}
        <TouchableOpacity onPress={invite} className="rounded-2xl p-4 flex-row items-center bg-[#0F1A2E] border border-[#1E3A8A]">
          <View className="w-11 h-11 rounded-full bg-[#1E3A8A]/60 items-center justify-center">
            <Ionicons name="gift" size={22} color="#60A5FA" />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-white font-bold">Davet Et, 50 ₺ Kazan</Text>
            <Text className="text-[#93C5FD] text-xs mt-0.5">Davet kodun: {profile?.referral_code}</Text>
          </View>
          <View className="bg-[#2563EB] rounded-full px-4 py-2">
            <Text className="text-white font-bold text-xs">Paylaş</Text>
          </View>
        </TouchableOpacity>

        {/* Satıcı */}
        <TouchableOpacity
          onPress={() => (profile?.is_seller ? navigation.navigate('Live') : navigation.navigate('Live'))}
          className="rounded-2xl p-4 flex-row items-center bg-[#1A1A1A] border border-[#2A2A2A] mt-3"
        >
          <View className="w-11 h-11 rounded-full bg-[#262626] items-center justify-center">
            <Ionicons name={profile?.is_seller ? 'storefront-outline' : 'rocket-outline'} size={22} color="#E5E7EB" />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-white font-bold">{profile?.is_seller ? 'Satıcı Paneli' : 'CanlıSat’ta Satıcı Ol'}</Text>
            <Text className="text-zinc-500 text-xs mt-0.5">{profile?.is_seller ? 'Yayınların, ürünlerin ve siparişlerin' : 'Kendi ürünlerini canlı yayında sat'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </TouchableOpacity>

        {/* Ayarlar */}
        <Text className="text-zinc-500 font-bold text-xs tracking-wider mt-7 mb-2 ml-1">HESAP AYARLARI</Text>
        <View className="bg-[#1A1A1A] rounded-2xl overflow-hidden">
          {profile?.is_admin && <Row icon="shield-outline" label="Yönetim Paneli" onPress={() => navigation.navigate('Admin')} />}
          <Row icon="person-outline" label="Hesap Bilgilerim" onPress={() => navigation.navigate('EditProfile')} />
          <Row icon="location-outline" label="Adreslerim" onPress={() => navigation.navigate('Addresses')} />
          <Row icon="ticket-outline" label="Davet Kodu Gir" onPress={enterCode} />
          <Row icon="help-buoy-outline" label="Yardım Merkezi" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
          <Row icon="document-text-outline" label="Koşullar ve Gizlilik" onPress={() => navigation.navigate('Legal')} last />
        </View>

        <TouchableOpacity
          onPress={() => Alert.alert('Çıkış yap', 'Emin misin?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Çıkış yap', style: 'destructive', onPress: logout }])}
          className="mt-6 h-14 rounded-2xl border border-red-500/40 bg-red-500/10 flex-row items-center justify-center"
        >
          <Ionicons name="log-out-outline" size={20} color="#F87171" />
          <Text className="text-red-400 font-bold ml-2">Çıkış Yap</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={deleteAccount} className="items-center mt-5">
          <Text className="text-zinc-600 text-xs underline">Hesabımı sil</Text>
        </TouchableOpacity>
        <Text className="text-zinc-700 text-xs text-center mt-3">CanlıSat v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const IconBadge = ({ icon, count, onPress }: { icon: Ion; count: number; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center ml-2">
    <Ionicons name={icon} size={20} color="#fff" />
    {count > 0 && (
      <View className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FF6B00] items-center justify-center">
        <Text className="text-white text-[10px] font-bold">{count > 9 ? '9+' : count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const Row = ({ icon, label, onPress, last }: { icon: Ion; label: string; onPress: () => void; last?: boolean }) => (
  <TouchableOpacity onPress={onPress} className={`flex-row items-center px-4 py-4 ${last ? '' : 'border-b border-[#232323]'}`}>
    <View className="w-9 h-9 rounded-full bg-[#262626] items-center justify-center mr-3">
      <Ionicons name={icon} size={18} color="#E5E7EB" />
    </View>
    <Text className="text-white text-base flex-1">{label}</Text>
    <Ionicons name="chevron-forward" size={18} color="#6B7280" />
  </TouchableOpacity>
);
