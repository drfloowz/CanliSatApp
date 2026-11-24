import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { PRODUCT_SELECT, STREAM_SELECT } from '../../lib/api';
import { Avatar, Button, EmptyState, Header, Loading, Tabs } from '../../components/ui';
import { ProductCard, StreamCard } from '../../components/cards';
import type { Product, Profile, Stream } from '../../types';

export const SellerProfileScreen = ({ navigation, route }: any) => {
  const userId: string = route.params?.userId;
  const { width } = useWindowDimensions();
  const uid = useAuthStore((s) => s.user?.id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<'shop' | 'streams'>('shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [sold, setSold] = useState(0);
  const [reminders, setReminders] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const [p, prods, strs, fol, fing, me, soldRes, rem] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('products').select(PRODUCT_SELECT).eq('seller_id', userId).in('status', ['active', 'in_auction']).order('created_at', { ascending: false }),
      supabase.from('live_streams').select(STREAM_SELECT).eq('host_id', userId).in('status', ['live', 'scheduled']).order('status').order('scheduled_at'),
      supabase.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('followers').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
      uid ? supabase.from('followers').select('id').eq('follower_id', uid).eq('following_id', userId).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', userId).eq('status', 'sold'),
      uid ? supabase.from('stream_reminders').select('stream_id').eq('user_id', uid) : Promise.resolve({ data: [] }),
    ]);
    setProfile(p.data as Profile);
    setProducts((prods.data as Product[]) ?? []);
    setStreams((strs.data as Stream[]) ?? []);
    setFollowers(fol.count ?? 0);
    setFollowingCount(fing.count ?? 0);
    setIsFollowing(!!(me as any).data);
    setSold(soldRes.count ?? 0);
    setReminders(new Set(((rem as any).data ?? []).map((r: any) => r.stream_id)));
  }, [userId, uid]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleFollow = async () => {
    if (!uid) return;
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowers((c) => c + (next ? 1 : -1));
    const { error } = next
      ? await supabase.from('followers').insert({ follower_id: uid, following_id: userId })
      : await supabase.from('followers').delete().eq('follower_id', uid).eq('following_id', userId);
    if (error) load();
  };

  const toggleReminder = async (s: Stream) => {
    if (!uid) return;
    const has = reminders.has(s.id);
    const next = new Set(reminders);
    has ? next.delete(s.id) : next.add(s.id);
    setReminders(next);
    has
      ? await supabase.from('stream_reminders').delete().eq('user_id', uid).eq('stream_id', s.id)
      : await supabase.from('stream_reminders').insert({ user_id: uid, stream_id: s.id });
  };

  const menu = () =>
    Alert.alert('Seçenekler', undefined, [
      {
        text: 'Kullanıcıyı şikâyet et',
        onPress: async () => {
          await supabase.from('reports').insert({ reporter_id: uid, target_type: 'user', target_id: userId, reason: 'Kullanıcı şikâyeti' });
          Alert.alert('Teşekkürler', 'Şikâyetin incelemeye alındı.');
        },
      },
      {
        text: 'Engelle',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('blocks').insert({ blocker_id: uid, blocked_id: userId });
          await supabase.from('followers').delete().eq('follower_id', uid).eq('following_id', userId);
          Alert.alert('Engellendi', 'Bu kullanıcı artık yayınlarında yorum yapamaz ve teklif veremez.');
        },
      },
      { text: 'İptal', style: 'cancel' },
    ]);

  if (!profile) return <Loading />;
  const mine = uid === userId;
  const cardW = (width - 16 * 2 - 12) / 2;

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]">
      <Header
        title={`@${profile.username}`}
        right={!mine ? <TouchableOpacity onPress={menu}><Ionicons name="ellipsis-horizontal" size={22} color="#fff" /></TouchableOpacity> : undefined}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="items-center px-6 pt-2 pb-5">
          <Avatar uri={profile.avatar_url} name={profile.username} size={88} />
          <Text className="text-white text-xl font-black mt-3">{profile.full_name || profile.username}</Text>
          {profile.is_seller && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="checkmark-circle" size={14} color="#FF6B00" />
              <Text className="text-[#FF6B00] text-xs font-bold ml-1">Onaylı satıcı</Text>
            </View>
          )}
          {profile.bio ? <Text className="text-zinc-400 text-center mt-2">{profile.bio}</Text> : null}
          <View className="flex-row mt-4">
            <Stat value={followers} label="Takipçi" />
            <Stat value={followingCount} label="Takip" />
            <Stat value={sold} label="Satış" />
          </View>
          {!mine && (
            <View className="flex-row w-full mt-5">
              <Button title={isFollowing ? 'Takip ediliyor' : 'Takip et'} variant={isFollowing ? 'secondary' : 'primary'} className="flex-1 mr-2" onPress={toggleFollow} />
              <Button title="Mesaj gönder" icon="chatbubble-ellipses-outline" variant="secondary" className="flex-1" onPress={() => navigation.navigate('Chat', { userId })} />
            </View>
          )}
        </View>

        <Tabs tabs={[{ key: 'shop', label: `Mağaza (${products.length})` }, { key: 'streams', label: `Yayınlar (${streams.length})` }]} value={tab} onChange={setTab} />

        <View className="px-4 pt-4">
          {tab === 'shop' ? (
            products.length === 0 ? (
              <EmptyState icon="storefront-outline" title="Mağazada ürün yok" />
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {products.map((p) => <ProductCard key={p.id} product={p} width={cardW} onPress={() => navigation.navigate('ProductDetail', { productId: p.id })} />)}
              </View>
            )
          ) : streams.length === 0 ? (
            <EmptyState icon="radio-outline" title="Planlanmış yayın yok" subtitle="Takip et, yayın açtığında haber verelim." />
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {streams.map((s) => (
                <StreamCard
                  key={s.id}
                  stream={s}
                  width={cardW}
                  reminded={reminders.has(s.id)}
                  onRemind={mine ? undefined : () => toggleReminder(s)}
                  onPress={() => s.status === 'live' && navigation.navigate('LiveRoom', { streamId: s.id })}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const Stat = ({ value, label }: { value: number; label: string }) => (
  <View className="items-center px-6">
    <Text className="text-white font-black text-lg">{value}</Text>
    <Text className="text-zinc-500 text-xs">{label}</Text>
  </View>
);
