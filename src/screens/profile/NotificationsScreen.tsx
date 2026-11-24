import React, { useCallback, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { timeAgo } from '../../lib/format';
import { EmptyState, Header } from '../../components/ui';
import type { AppNotification } from '../../types';

const ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  outbid: { icon: 'trending-up', color: '#F59E0B' },
  auction_won: { icon: 'trophy', color: '#22C55E' },
  new_order: { icon: 'cash', color: '#22C55E' },
  order_shipped: { icon: 'cube', color: '#8B5CF6' },
  order_cancelled: { icon: 'close-circle', color: '#EF4444' },
  stream_live: { icon: 'radio', color: '#EF4444' },
  seller_approved: { icon: 'checkmark-circle', color: '#FF6B00' },
  seller_rejected: { icon: 'close-circle', color: '#EF4444' },
  referral: { icon: 'gift', color: '#A78BFA' },
};

export const NotificationsScreen = ({ navigation }: any) => {
  const uid = useAuthStore((s) => s.user?.id);
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(100);
    setItems((data as AppNotification[]) ?? []);
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', uid).is('read_at', null);
  }, [uid]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = (n: AppNotification) => {
    if (n.data?.stream_id && (n.type === 'stream_live' || n.type === 'outbid')) navigation.navigate('LiveRoom', { streamId: n.data.stream_id });
    else if (n.type === 'new_order') navigation.navigate('SellerOrders');
    else if (n.data?.order_id) navigation.navigate('MainTabs', { screen: 'Activities' });
    else if (n.type === 'seller_approved') navigation.navigate('MainTabs', { screen: 'Live' });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]">
      <Header title="Bildirimler" />
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="Bildirim yok" subtitle="Teklif, sipariş ve yayın bildirimlerin burada görünür." />}
        renderItem={({ item }) => {
          const ic = ICONS[item.type] ?? { icon: 'notifications', color: '#9CA3AF' };
          return (
            <TouchableOpacity onPress={() => open(item)} className={`flex-row p-3 rounded-2xl mb-2 ${item.read_at ? 'bg-[#141414]' : 'bg-[#1E1E1E] border border-[#FF6B00]/30'}`}>
              <View style={{ backgroundColor: ic.color + '22' }} className="w-10 h-10 rounded-full items-center justify-center mr-3">
                <Ionicons name={ic.icon} size={20} color={ic.color} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold">{item.title}</Text>
                {item.body ? <Text className="text-zinc-400 text-sm mt-0.5">{item.body}</Text> : null}
                <Text className="text-zinc-600 text-xs mt-1">{timeAgo(item.created_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
};
