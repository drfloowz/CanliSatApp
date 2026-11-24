import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { timeAgo } from '../../lib/format';
import { Avatar, EmptyState, Header } from '../../components/ui';

type Row = {
  id: string;
  other: { id: string; username: string | null; avatar_url: string | null };
  last_message: string | null;
  last_message_at: string;
  last_sender_id: string | null;
  unread: number;
};

export const InboxScreen = ({ navigation }: any) => {
  const uid = useAuthStore((s) => s.user?.id);
  const [rows, setRows] = useState<Row[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase
      .from('conversations')
      .select(
        'id, last_message, last_message_at, last_sender_id, user_a, user_b, a:profiles!conversations_user_a_fkey(id, username, avatar_url), b:profiles!conversations_user_b_fkey(id, username, avatar_url)',
      )
      .or(`user_a.eq.${uid},user_b.eq.${uid}`)
      .not('last_message', 'is', null)
      .order('last_message_at', { ascending: false });
    const convs = (data ?? []) as any[];
    const { data: unread } = await supabase
      .from('direct_messages')
      .select('conversation_id')
      .in('conversation_id', convs.map((c) => c.id))
      .neq('sender_id', uid)
      .is('read_at', null);
    const counts: Record<string, number> = {};
    (unread ?? []).forEach((m: any) => (counts[m.conversation_id] = (counts[m.conversation_id] ?? 0) + 1));
    setRows(
      convs.map((c) => ({
        id: c.id,
        other: c.user_a === uid ? c.b : c.a,
        last_message: c.last_message,
        last_message_at: c.last_message_at,
        last_sender_id: c.last_sender_id,
        unread: counts[c.id] ?? 0,
      })),
    );
  }, [uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`inbox-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, load]);

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]">
      <Header title="Mesajlar" />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        refreshControl={<RefreshControl tintColor="#FF6B00" refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        contentContainerStyle={{ paddingVertical: 8 }}
        ListEmptyComponent={
          <EmptyState icon="chatbubbles-outline" title="Henüz mesajın yok" subtitle="Satıcı profillerindeki “Mesaj gönder” butonuyla sohbet başlatabilirsin." />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Chat', { conversationId: item.id, other: item.other })}
            className="flex-row items-center px-4 py-3"
          >
            <Avatar uri={item.other?.avatar_url} name={item.other?.username} size={52} />
            <View className="flex-1 ml-3 border-b border-[#1F1F1F] pb-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-white font-bold text-base">@{item.other?.username}</Text>
                <Text className={`text-xs ${item.unread ? 'text-[#FF6B00] font-bold' : 'text-zinc-500'}`}>{timeAgo(item.last_message_at)}</Text>
              </View>
              <View className="flex-row justify-between items-center mt-1">
                <Text className={`flex-1 mr-3 ${item.unread ? 'text-white font-semibold' : 'text-zinc-400'}`} numberOfLines={1}>
                  {item.last_sender_id === uid ? 'Sen: ' : ''}
                  {item.last_message}
                </Text>
                {item.unread > 0 && (
                  <View className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#FF6B00] items-center justify-center">
                    <Text className="text-white text-[11px] font-bold">{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};
