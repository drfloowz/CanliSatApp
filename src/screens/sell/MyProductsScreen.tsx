import React, { useCallback, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { formatTL } from '../../lib/format';
import { Badge, Button, EmptyState, Header, Tabs } from '../../components/ui';
import type { Product } from '../../types';

const STATUS: Record<string, { label: string; color: string }> = {
  active: { label: 'Satışta', color: '#22C55E' },
  in_auction: { label: 'Mezatta', color: '#EF4444' },
  sold: { label: 'Satıldı', color: '#9CA3AF' },
  archived: { label: 'Kaldırıldı', color: '#6B7280' },
};

export const MyProductsScreen = ({ navigation }: any) => {
  const uid = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<'active' | 'sold'>('active');
  const [items, setItems] = useState<Product[]>([]);

  const load = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', uid)
      .in('status', tab === 'active' ? ['active', 'in_auction'] : ['sold', 'archived'])
      .order('created_at', { ascending: false });
    setItems((data as Product[]) ?? []);
  }, [uid, tab]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]">
      <Header
        title="Ürünlerim"
        right={
          <TouchableOpacity onPress={() => navigation.navigate('ProductForm')} className="w-10 h-10 rounded-full bg-[#FF6B00] items-center justify-center">
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />
      <Tabs tabs={[{ key: 'active', label: 'Aktif' }, { key: 'sold', label: 'Satılan / Kaldırılan' }]} value={tab} onChange={setTab} />
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <EmptyState icon="pricetags-outline" title="Ürün yok" subtitle="Canlı yayında mezata çıkarmak veya mağazanda satmak için ürün ekle." action={tab === 'active' ? <Button title="Ürün ekle" icon="add" onPress={() => navigation.navigate('ProductForm')} /> : undefined} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('ProductForm', { productId: item.id })} className="flex-row bg-[#1A1A1A] rounded-2xl p-3 mb-2">
            <View className="w-20 h-20 rounded-xl bg-[#262626] overflow-hidden mr-3">
              {item.images?.[0] ? <Image source={{ uri: item.images[0] }} style={{ width: '100%', height: '100%' }} /> : null}
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold" numberOfLines={1}>{item.title}</Text>
              <Text className="text-zinc-400 text-xs mt-1">
                Mezat: {formatTL(item.starting_price)}
                {item.buy_now_price ? `  ·  Hemen al: ${formatTL(item.buy_now_price)}` : ''}
              </Text>
              <Text className="text-zinc-500 text-xs mt-0.5">Stok: {item.quantity}</Text>
              <View className="mt-2">
                <Badge label={STATUS[item.status]?.label ?? item.status} color={STATUS[item.status]?.color ?? '#9CA3AF'} />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};
