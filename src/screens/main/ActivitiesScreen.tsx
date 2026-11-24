import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Image, RefreshControl, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { ORDER_STATUS_LABEL, formatTL, timeAgo } from '../../lib/format';
import { PRODUCT_SELECT, rpc, showError } from '../../lib/api';
import { Badge, Button, EmptyState, Tabs } from '../../components/ui';
import { ProductCard } from '../../components/cards';
import type { Order, Product } from '../../types';

type Tab = 'orders' | 'bids' | 'favorites';

type BidRow = {
  auction_id: string;
  my_max: number;
  product_title: string;
  product_image: string | null;
  current_price: number;
  status: string;
  winning: boolean;
  created_at: string;
};

export const ActivitiesScreen = ({ navigation }: any) => {
  const uid = useAuthStore((s) => s.user?.id);
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    if (tab === 'orders') {
      const { data } = await supabase
        .from('orders')
        .select('*, seller:profiles!orders_seller_id_fkey(id, username)')
        .eq('buyer_id', uid)
        .order('created_at', { ascending: false });
      setOrders((data as Order[]) ?? []);
    } else if (tab === 'bids') {
      const { data } = await supabase
        .from('bids')
        .select('auction_id, amount, created_at, auction:auctions(id, status, current_price, current_winner_id, product:products(title, images))')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(200);
      const map = new Map<string, BidRow>();
      (data ?? []).forEach((b: any) => {
        const prev = map.get(b.auction_id);
        if (prev) {
          prev.my_max = Math.max(prev.my_max, Number(b.amount));
          return;
        }
        map.set(b.auction_id, {
          auction_id: b.auction_id,
          my_max: Number(b.amount),
          product_title: b.auction?.product?.title ?? 'Ürün',
          product_image: b.auction?.product?.images?.[0] ?? null,
          current_price: Number(b.auction?.current_price ?? 0),
          status: b.auction?.status,
          winning: b.auction?.current_winner_id === uid,
          created_at: b.created_at,
        });
      });
      setBids([...map.values()]);
    } else {
      const { data } = await supabase
        .from('favorites')
        .select(`product:products(${PRODUCT_SELECT})`)
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      setFavorites(((data ?? []) as any[]).map((r) => r.product).filter(Boolean));
    }
  }, [uid, tab]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmDelivered = (o: Order) =>
    Alert.alert('Teslim aldın mı?', o.product_title, [
      { text: 'Hayır', style: 'cancel' },
      { text: 'Evet, teslim aldım', onPress: () => rpc('mark_order_delivered', { p_order_id: o.id }).then(load).catch(showError) },
    ]);

  const cardW = (width - 16 * 2 - 12) / 2;
  const refresh = <RefreshControl tintColor="#FF6B00" refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />;

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]" edges={['top']}>
      <Text className="text-white text-3xl font-black px-4 pt-2 pb-4">Aktivite</Text>
      <Tabs tabs={[{ key: 'orders', label: 'Siparişlerim' }, { key: 'bids', label: 'Tekliflerim' }, { key: 'favorites', label: 'Favorilerim' }]} value={tab} onChange={setTab} />

      {tab === 'orders' && (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          refreshControl={refresh}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<EmptyState icon="bag-outline" title="Henüz siparişin yok" subtitle="Canlı mezatlarda kazandığın ve satın aldığın ürünler burada görünür." action={<Button title="Yayınları keşfet" onPress={() => navigation.navigate('Home')} />} />}
          renderItem={({ item }) => {
            const st = ORDER_STATUS_LABEL[item.status];
            return (
              <View className="bg-[#1A1A1A] rounded-2xl p-3 mb-3">
                <View className="flex-row">
                  <View className="w-20 h-20 rounded-xl bg-[#262626] overflow-hidden mr-3">
                    {item.product_image ? <Image source={{ uri: item.product_image }} style={{ width: '100%', height: '100%' }} /> : null}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row justify-between items-start">
                      <Badge label={st.label} color={st.color} />
                      <Text className="text-zinc-500 text-xs">{timeAgo(item.created_at)}</Text>
                    </View>
                    <Text className="text-white font-bold mt-1.5" numberOfLines={1}>{item.product_title}</Text>
                    <Text className="text-[#FF6B00] font-black text-lg">{formatTL(item.amount)}</Text>
                    <Text className="text-zinc-500 text-xs">@{item.seller?.username} · {item.source === 'auction' ? 'Mezatta kazandın' : 'Hemen al'}</Text>
                  </View>
                </View>
                {item.status === 'awaiting_payment' && (
                  <Text className="text-amber-400/90 text-xs mt-3">Ödeme altyapısı çok yakında aktif olacak. Satıcı siparişini hazırlıyor.</Text>
                )}
                {item.tracking_number ? (
                  <View className="bg-[#111] rounded-xl p-3 mt-3">
                    <Text className="text-zinc-300 text-xs">{item.carrier} · Takip no: <Text className="font-bold text-white">{item.tracking_number}</Text></Text>
                  </View>
                ) : null}
                {item.status === 'shipped' && <Button small title="Teslim aldım" className="mt-3" onPress={() => confirmDelivered(item)} />}
              </View>
            );
          }}
        />
      )}

      {tab === 'bids' && (
        <FlatList
          data={bids}
          keyExtractor={(b) => b.auction_id}
          refreshControl={refresh}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<EmptyState icon="hammer-outline" title="Henüz teklif vermedin" subtitle="Canlı yayınlarda mezatlara katıl, teklif geçmişin burada görünür." />}
          renderItem={({ item }) => {
            const running = item.status === 'running';
            const label = running ? (item.winning ? 'Kazanıyorsun' : 'Geçildin') : item.winning && item.status === 'ended' ? 'Kazandın' : 'Kaybettin';
            const color = item.winning ? '#22C55E' : running ? '#F59E0B' : '#6B7280';
            return (
              <View className="flex-row bg-[#1A1A1A] rounded-2xl p-3 mb-2">
                <View className="w-16 h-16 rounded-xl bg-[#262626] overflow-hidden mr-3">
                  {item.product_image ? <Image source={{ uri: item.product_image }} style={{ width: '100%', height: '100%' }} /> : null}
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold" numberOfLines={1}>{item.product_title}</Text>
                  <Text className="text-zinc-400 text-xs mt-1">Teklifin: {formatTL(item.my_max)} · Son fiyat: {formatTL(item.current_price)}</Text>
                  <View className="mt-2"><Badge label={label} color={color} /></View>
                </View>
              </View>
            );
          }}
        />
      )}

      {tab === 'favorites' && (
        <FlatList
          data={favorites}
          key="fav-grid"
          numColumns={2}
          keyExtractor={(p) => p.id}
          refreshControl={refresh}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<EmptyState icon="heart-outline" title="Favori ürünün yok" subtitle="Beğendiğin ürünleri kalp ikonuyla kaydet." />}
          renderItem={({ item }) => <ProductCard product={item} width={cardW} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })} />}
        />
      )}
    </SafeAreaView>
  );
};
