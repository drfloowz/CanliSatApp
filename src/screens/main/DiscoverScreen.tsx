import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { CATEGORIES } from '../../lib/constants';
import { PRODUCT_SELECT, STREAM_SELECT } from '../../lib/api';
import { Avatar, EmptyState } from '../../components/ui';
import { ProductCard, StreamCard } from '../../components/cards';
import type { Product, Profile, Stream } from '../../types';

type Mode = 'products' | 'streams' | 'sellers';

export const DiscoverScreen = ({ navigation }: any) => {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('products');
  const [category, setCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [sellers, setSellers] = useState<Profile[]>([]);

  const search = useCallback(async () => {
    const q = query.trim().replace(/[%,()]/g, ' ');
    if (mode === 'products') {
      let req = supabase.from('products').select(PRODUCT_SELECT).in('status', ['active', 'in_auction']).order('created_at', { ascending: false }).limit(60);
      if (category) req = req.eq('category', category);
      if (q) req = req.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      const { data } = await req;
      setProducts((data as Product[]) ?? []);
    } else if (mode === 'streams') {
      let req = supabase.from('live_streams').select(STREAM_SELECT).in('status', ['live', 'scheduled']).order('status').order('viewer_count', { ascending: false }).limit(40);
      if (category) req = req.eq('category', category);
      if (q) req = req.ilike('title', `%${q}%`);
      const { data } = await req;
      setStreams((data as Stream[]) ?? []);
    } else {
      let req = supabase.from('profiles').select('*').eq('is_seller', true).limit(40);
      if (q) req = req.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`);
      const { data } = await req;
      setSellers((data as Profile[]) ?? []);
    }
  }, [query, mode, category]);

  useEffect(() => {
    const t = setTimeout(search, 300);
    return () => clearTimeout(t);
  }, [search]);

  const cardW = (width - 16 * 2 - 12) / 2;

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]" edges={['top']}>
      <View className="px-4 pt-2">
        <Text className="text-white text-3xl font-black mb-3">Keşfet</Text>
        <View className="flex-row items-center bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl px-4 h-12">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ürün, yayın veya satıcı ara..."
            placeholderTextColor="#6B7280"
            className="flex-1 text-white ml-2"
            returnKeyType="search"
            autoCorrect={false}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View className="flex-row mt-3">
          {([
            ['products', 'Ürünler', 'pricetag-outline'],
            ['streams', 'Yayınlar', 'radio-outline'],
            ['sellers', 'Satıcılar', 'storefront-outline'],
          ] as const).map(([k, label, icon]) => (
            <TouchableOpacity key={k} onPress={() => setMode(k)} className={`flex-row items-center px-4 h-10 rounded-full mr-2 ${mode === k ? 'bg-[#FF6B00]' : 'bg-[#1A1A1A]'}`}>
              <Ionicons name={icon} size={15} color="#fff" />
              <Text className="text-white font-semibold ml-1.5">{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {mode !== 'sellers' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <TouchableOpacity key={c.key} onPress={() => setCategory(active ? null : c.key)} className={`w-20 h-20 rounded-2xl mr-2 items-center justify-center border ${active ? 'bg-[#FF6B00]/15 border-[#FF6B00]' : 'bg-[#1A1A1A] border-[#2A2A2A]'}`}>
                  <Ionicons name={c.icon} size={24} color="#FF6B00" />
                  <Text className="text-white text-xs font-semibold mt-1.5">{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {mode === 'products' && (
          products.length === 0 ? (
            <EmptyState icon="pricetag-outline" title="Ürün bulunamadı" subtitle="Farklı bir arama veya kategori dene." />
          ) : (
            <View className="flex-row flex-wrap justify-between px-4">
              {products.map((p) => <ProductCard key={p.id} product={p} width={cardW} onPress={() => navigation.navigate('ProductDetail', { productId: p.id })} />)}
            </View>
          )
        )}

        {mode === 'streams' && (
          streams.length === 0 ? (
            <EmptyState icon="radio-outline" title="Yayın bulunamadı" />
          ) : (
            <View className="flex-row flex-wrap justify-between px-4">
              {streams.map((s) => (
                <StreamCard
                  key={s.id}
                  stream={s}
                  width={cardW}
                  onPress={() => (s.status === 'live' ? navigation.navigate('LiveRoom', { streamId: s.id }) : navigation.navigate('SellerProfile', { userId: s.host_id }))}
                />
              ))}
            </View>
          )
        )}

        {mode === 'sellers' && (
          <View className="px-4 pt-4">
            {sellers.length === 0 ? <EmptyState icon="storefront-outline" title="Satıcı bulunamadı" /> : null}
            {sellers.map((s) => (
              <TouchableOpacity key={s.id} onPress={() => navigation.navigate('SellerProfile', { userId: s.id })} className="flex-row items-center bg-[#1A1A1A] rounded-2xl p-3 mb-2">
                <Avatar uri={s.avatar_url} name={s.username} size={48} />
                <View className="flex-1 ml-3">
                  <Text className="text-white font-bold">{s.full_name || s.username}</Text>
                  <Text className="text-zinc-500 text-xs">@{s.username}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
