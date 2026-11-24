import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { ORDER_STATUS_LABEL, formatTL, timeAgo } from '../../lib/format';
import { CARRIERS } from '../../lib/constants';
import { rpc, showError } from '../../lib/api';
import { Badge, Button, Chip, EmptyState, Field, Header, Tabs } from '../../components/ui';
import type { Order } from '../../types';

export const SellerOrdersScreen = () => {
  const uid = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipping, setShipping] = useState<Order | null>(null);
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [tracking, setTracking] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase
      .from('orders')
      .select('*, buyer:profiles!orders_buyer_id_fkey(id, username)')
      .eq('seller_id', uid)
      .in('status', tab === 'open' ? ['awaiting_payment', 'paid'] : ['shipped', 'delivered', 'cancelled'])
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
  }, [uid, tab]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ship = async () => {
    if (!shipping || tracking.trim().length < 5) return Alert.alert('Takip numarası gerekli');
    setSaving(true);
    try {
      await rpc('mark_order_shipped', { p_order_id: shipping.id, p_carrier: carrier, p_tracking: tracking.trim() });
      setShipping(null);
      setTracking('');
      load();
    } catch (e) {
      showError(e);
    } finally {
      setSaving(false);
    }
  };

  const cancel = (o: Order) =>
    Alert.alert('Siparişi iptal et', 'Ürün tekrar satışa açılacak ve alıcıya bildirim gidecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'İptal et', style: 'destructive', onPress: () => rpc('cancel_order', { p_order_id: o.id }).then(load).catch(showError) },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]">
      <Header title="Siparişler" />
      <Tabs tabs={[{ key: 'open', label: 'Kargolanacak' }, { key: 'done', label: 'Tamamlanan' }]} value={tab} onChange={setTab} />
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<EmptyState icon="cube-outline" title="Sipariş yok" subtitle="Mezatta veya mağazanda satılan ürünler burada görünür." />}
        renderItem={({ item }) => {
          const st = ORDER_STATUS_LABEL[item.status];
          const a = item.shipping_address;
          return (
            <View className="bg-[#1A1A1A] rounded-2xl p-4 mb-3">
              <View className="flex-row">
                <View className="w-16 h-16 rounded-xl bg-[#262626] overflow-hidden mr-3">
                  {item.product_image ? <Image source={{ uri: item.product_image }} style={{ width: '100%', height: '100%' }} /> : null}
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold" numberOfLines={1}>{item.product_title}</Text>
                  <Text className="text-[#FF6B00] font-black">{formatTL(item.amount)}</Text>
                  <Text className="text-zinc-500 text-xs">@{item.buyer?.username} · {item.source === 'auction' ? 'Mezat' : 'Hemen al'} · {timeAgo(item.created_at)}</Text>
                </View>
              </View>
              <View className="mt-3"><Badge label={st.label} color={st.color} /></View>
              {a ? (
                <View className="bg-[#111] rounded-xl p-3 mt-3">
                  <Text className="text-zinc-300 font-semibold">{a.full_name} · {a.phone}</Text>
                  <Text className="text-zinc-400 text-xs mt-1">{a.address_line}, {a.district} / {a.city}</Text>
                </View>
              ) : (
                <Text className="text-amber-400 text-xs mt-3">Alıcı adres eklememiş.</Text>
              )}
              {item.tracking_number ? <Text className="text-zinc-400 text-xs mt-2">{item.carrier}: {item.tracking_number}</Text> : null}
              {tab === 'open' && (
                <View className="flex-row mt-3">
                  <Button small title="Kargoya verdim" icon="cube" className="mr-2" onPress={() => setShipping(item)} />
                  {item.status === 'awaiting_payment' && <Button small title="İptal" variant="secondary" onPress={() => cancel(item)} />}
                </View>
              )}
            </View>
          );
        }}
      />

      <Modal visible={!!shipping} transparent animationType="slide" onRequestClose={() => setShipping(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#161616] rounded-t-3xl p-5 pb-10">
            <Text className="text-white font-black text-xl mb-4">Kargo bilgisi</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {CARRIERS.map((c) => <Chip key={c} label={c} active={carrier === c} onPress={() => setCarrier(c)} />)}
            </ScrollView>
            <Field label="Takip numarası" value={tracking} onChangeText={setTracking} autoCapitalize="characters" />
            <View className="flex-row">
              <Button title="Vazgeç" variant="secondary" className="flex-1 mr-2" onPress={() => setShipping(null)} />
              <Button title="Kaydet" className="flex-1" loading={saving} onPress={ship} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};
