import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, ScrollView, Share, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { PRODUCT_SELECT, errorMessage, rpc } from '../../lib/api';
import { CONDITION_LABEL, formatTL } from '../../lib/format';
import { categoryLabel } from '../../lib/constants';
import { Avatar, Button, Loading } from '../../components/ui';
import type { Product } from '../../types';

export const ProductDetailScreen = ({ navigation, route }: any) => {
  const productId: string = route.params?.productId;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.id);
  const [product, setProduct] = useState<Product | null>(null);
  const [fav, setFav] = useState(false);
  const [page, setPage] = useState(0);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    supabase.from('products').select(PRODUCT_SELECT).eq('id', productId).maybeSingle().then(({ data }) => setProduct(data as Product));
    if (uid) supabase.from('favorites').select('product_id').eq('user_id', uid).eq('product_id', productId).maybeSingle().then(({ data }) => setFav(!!data));
  }, [productId, uid]);

  const toggleFav = async () => {
    if (!uid) return;
    const next = !fav;
    setFav(next);
    const { error } = next
      ? await supabase.from('favorites').insert({ user_id: uid, product_id: productId })
      : await supabase.from('favorites').delete().eq('user_id', uid).eq('product_id', productId);
    if (error) setFav(!next);
  };

  const buy = () => {
    if (!product?.buy_now_price) return;
    Alert.alert('Satın al', `${product.title}\n${formatTL(product.buy_now_price)}\n\nSiparişin oluşturulacak. Ödeme adımı yakında uygulama içinden yapılacak.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          setBuying(true);
          try {
            await rpc('buy_now', { p_product_id: product.id });
            Alert.alert('Sipariş oluşturuldu 🎉', 'Siparişini Aktivite sekmesinde takip edebilirsin.', [
              { text: 'Tamam', onPress: () => navigation.navigate('MainTabs', { screen: 'Activities' }) },
            ]);
          } catch (e) {
            const msg = errorMessage(e);
            if (msg.includes('teslimat adresi')) {
              Alert.alert('Adres gerekli', msg, [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Adres ekle', onPress: () => navigation.navigate('AddressForm') },
              ]);
            } else Alert.alert('Satın alınamadı', msg);
          } finally {
            setBuying(false);
          }
        },
      },
    ]);
  };

  if (!product) return <Loading />;
  const mine = product.seller_id === uid;
  const images = product.images?.length ? product.images : [null];

  return (
    <View className="flex-1 bg-[#0E0E0E]">
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, height: width }} className="bg-[#1A1A1A] items-center justify-center">
                {item ? <Image source={{ uri: item }} style={{ width, height: width }} /> : <Ionicons name="image-outline" size={48} color="#4B5563" />}
              </View>
            )}
          />
          {images.length > 1 && (
            <View className="absolute bottom-3 self-center flex-row">
              {images.map((_, i) => <View key={i} className={`w-2 h-2 rounded-full mx-1 ${i === page ? 'bg-white' : 'bg-white/40'}`} />)}
            </View>
          )}
          <View style={{ top: insets.top + 6 }} className="absolute left-3 right-3 flex-row justify-between">
            <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-black/50 items-center justify-center">
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View className="flex-row">
              <TouchableOpacity onPress={() => Share.share({ message: `${product.title} — ${formatTL(product.buy_now_price ?? product.starting_price)} CanlıSat'ta!` })} className="w-10 h-10 rounded-full bg-black/50 items-center justify-center mr-2">
                <Ionicons name="share-outline" size={20} color="#fff" />
              </TouchableOpacity>
              {!mine && (
                <TouchableOpacity onPress={toggleFav} className="w-10 h-10 rounded-full bg-black/50 items-center justify-center">
                  <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? '#EF4444' : '#fff'} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View className="p-4">
          {product.status === 'in_auction' && (
            <View className="bg-red-600 self-start rounded-md px-2 py-1 mb-2">
              <Text className="text-white text-xs font-extrabold">ŞU AN CANLI MEZATTA</Text>
            </View>
          )}
          <Text className="text-white text-2xl font-black">{product.title}</Text>
          <Text className="text-[#FF6B00] text-3xl font-black mt-2">
            {product.buy_now_price ? formatTL(product.buy_now_price) : `Mezat · ${formatTL(product.starting_price)}`}
          </Text>
          <View className="flex-row flex-wrap mt-3">
            {product.category ? <Tag label={categoryLabel(product.category)} /> : null}
            <Tag label={CONDITION_LABEL[product.condition] ?? product.condition} />
            <Tag label={`Stok: ${product.quantity}`} />
          </View>

          {product.description ? (
            <>
              <Text className="text-white font-bold text-lg mt-6 mb-2">Açıklama</Text>
              <Text className="text-zinc-300 leading-6">{product.description}</Text>
            </>
          ) : null}

          <Text className="text-white font-bold text-lg mt-6 mb-2">Satıcı</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SellerProfile', { userId: product.seller_id })} className="flex-row items-center bg-[#1A1A1A] rounded-2xl p-3">
            <Avatar uri={product.seller?.avatar_url} name={product.seller?.username} size={44} />
            <Text className="text-white font-bold ml-3 flex-1">@{product.seller?.username}</Text>
            <Text className="text-[#FF6B00] font-semibold">Mağaza ›</Text>
          </TouchableOpacity>

          <View className="bg-[#1A1A1A] rounded-2xl p-4 mt-4 flex-row">
            <Ionicons name="shield-checkmark-outline" size={22} color="#22C55E" />
            <Text className="text-zinc-400 text-xs ml-3 flex-1 leading-5">
              Siparişinden sonra satıcı ürünü kargolar; kargo takip numarası Aktivite sekmesinde görünür. Sorun yaşarsan destek ekibimiz yardımcı olur.
            </Text>
          </View>
        </View>
      </ScrollView>

      {!mine && product.status === 'active' && product.buy_now_price ? (
        <View style={{ paddingBottom: insets.bottom + 10 }} className="absolute bottom-0 left-0 right-0 bg-[#141414] border-t border-[#262626] px-4 pt-3 flex-row items-center">
          <View className="flex-1">
            <Text className="text-zinc-400 text-xs">Toplam</Text>
            <Text className="text-white font-black text-xl">{formatTL(product.buy_now_price)}</Text>
          </View>
          <Button title="Hemen al" icon="flash" loading={buying} className="flex-1" onPress={buy} />
        </View>
      ) : null}
      {mine && (
        <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 bg-[#141414] px-4 pt-3">
          <Button title="Ürünü düzenle" variant="secondary" onPress={() => navigation.navigate('ProductForm', { productId: product.id })} />
        </SafeAreaView>
      )}
    </View>
  );
};

const Tag = ({ label }: { label: string }) => (
  <View className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-full px-3 py-1 mr-2 mb-2">
    <Text className="text-zinc-300 text-xs font-semibold">{label}</Text>
  </View>
);
