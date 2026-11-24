import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { CATEGORIES, PROMOS } from '../../lib/constants';
import { STREAM_SELECT, showError } from '../../lib/api';
import { Chip, EmptyState, Section } from '../../components/ui';
import { StreamCard } from '../../components/cards';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import type { Stream } from '../../types';

export const HomeScreen = ({ navigation }: any) => {
  const { width } = useWindowDimensions();
  const uid = useAuthStore((s) => s.user?.id);
  const unread = useUnreadCount();
  const [filter, setFilter] = useState<string>('all');
  const [live, setLive] = useState<Stream[]>([]);
  const [upcoming, setUpcoming] = useState<Stream[]>([]);
  const [reminders, setReminders] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    const [liveRes, upRes, remRes, folRes] = await Promise.all([
      supabase.from('live_streams').select(STREAM_SELECT).eq('status', 'live').order('viewer_count', { ascending: false }).limit(50),
      supabase.from('live_streams').select(STREAM_SELECT).eq('status', 'scheduled').gte('scheduled_at', new Date(Date.now() - 3600e3).toISOString()).order('scheduled_at').limit(20),
      supabase.from('stream_reminders').select('stream_id').eq('user_id', uid),
      supabase.from('followers').select('following_id').eq('follower_id', uid),
    ]);
    setLive((liveRes.data as Stream[]) ?? []);
    setUpcoming((upRes.data as Stream[]) ?? []);
    setReminders(new Set((remRes.data ?? []).map((r: any) => r.stream_id)));
    setFollowing((folRes.data ?? []).map((r: any) => r.following_id));
  }, [uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    // Yayın değişikliklerinde listeyi yenile (sık güncellemeleri 2 sn'de bir topla)
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ch = supabase
      .channel('home-streams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => {
        if (timer) return;
        timer = setTimeout(() => { timer = null; load(); }, 2000);
      })
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [load]);

  const toggleReminder = async (s: Stream) => {
    if (!uid) return;
    const has = reminders.has(s.id);
    const next = new Set(reminders);
    has ? next.delete(s.id) : next.add(s.id);
    setReminders(next);
    const { error } = has
      ? await supabase.from('stream_reminders').delete().eq('user_id', uid).eq('stream_id', s.id)
      : await supabase.from('stream_reminders').insert({ user_id: uid, stream_id: s.id });
    if (error) { showError(error); load(); }
  };

  const applyFilter = (list: Stream[]) =>
    filter === 'all' ? list : filter === 'following' ? list.filter((s) => following.includes(s.host_id)) : list.filter((s) => s.category === filter);

  const cardW = (width - 16 * 2 - 12) / 2;
  const liveList = applyFilter(live);
  const upList = applyFilter(upcoming);

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 h-14">
        <Text className="text-white text-2xl font-black italic">
          Canlı<Text className="text-[#FF6B00]">Sat</Text>
        </Text>
        <View className="flex-row">
          <TouchableOpacity onPress={() => navigation.navigate('Discover')} className="w-10 h-10 items-center justify-center">
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} className="w-10 h-10 items-center justify-center">
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {unread > 0 && (
              <View className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FF6B00] items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView refreshControl={<RefreshControl tintColor="#FF6B00" refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <FlatList
          horizontal
          data={PROMOS}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          snapToInterval={width * 0.82 + 12}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
          renderItem={({ item }) => (
            <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: width * 0.82, height: 140, borderRadius: 20, marginRight: 12, padding: 18, justifyContent: 'space-between' }}>
              <View className="bg-white/20 self-start px-2 py-1 rounded-md">
                <Text className="text-white text-[11px] font-extrabold">{item.tag}</Text>
              </View>
              <View>
                <Text className="text-white text-2xl font-black">{item.title}</Text>
                <Text className="text-white/85 mt-1">{item.subtitle}</Text>
              </View>
            </LinearGradient>
          )}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Chip label="Tümü" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Takip ettiklerim" active={filter === 'following'} onPress={() => setFilter('following')} />
          {CATEGORIES.map((c) => (
            <Chip key={c.key} label={c.label} active={filter === c.key} onPress={() => setFilter(c.key)} />
          ))}
        </ScrollView>

        <Section title="🔴 Şu an canlı" />
        {liveList.length === 0 ? (
          <EmptyState icon="videocam-off-outline" title="Şu an aktif yayın yok" subtitle="Yaklaşan yayınlar için hatırlatma kur, başladığında haber verelim." />
        ) : (
          <View className="flex-row flex-wrap justify-between px-4">
            {liveList.map((s) => (
              <StreamCard key={s.id} stream={s} width={cardW} onPress={() => navigation.navigate('LiveRoom', { streamId: s.id })} />
            ))}
          </View>
        )}

        {upList.length > 0 && (
          <>
            <Section title="Yaklaşan yayınlar" style={{ marginTop: 8 }} />
            <FlatList
              horizontal
              data={upList}
              keyExtractor={(s) => s.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={({ item }) => (
                <StreamCard
                  stream={item}
                  width={cardW * 0.9}
                  onPress={() => navigation.navigate('SellerProfile', { userId: item.host_id })}
                  reminded={reminders.has(item.id)}
                  onRemind={item.host_id === uid ? undefined : () => toggleReminder(item)}
                />
              )}
            />
          </>
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
};
