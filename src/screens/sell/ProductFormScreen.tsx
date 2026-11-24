import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { CATEGORIES, CONDITIONS } from '../../lib/constants';
import { pickAndUploadImage, showError } from '../../lib/api';
import { Button, Chip, Field, Header } from '../../components/ui';
import type { Product } from '../../types';

export const ProductFormScreen = ({ navigation, route }: any) => {
  const productId: string | undefined = route.params?.productId;
  const uid = useAuthStore((s) => s.user?.id)!;
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('new');
  const [startPrice, setStartPrice] = useState('');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>('active');

  useEffect(() => {
    if (!productId) return;
    supabase.from('products').select('*').eq('id', productId).single().then(({ data }) => {
      const p = data as Product;
      if (!p) return;
      setImages(p.images ?? []);
      setTitle(p.title);
      setDescription(p.description ?? '');
      setCategory(p.category ?? '');
      setCondition(p.condition ?? 'new');
      setStartPrice(p.starting_price ? String(Number(p.starting_price)) : '');
      setBuyNowPrice(p.buy_now_price ? String(Number(p.buy_now_price)) : '');
      setQuantity(String(p.quantity));
      setStatus(p.status);
    });
  }, [productId]);

  const addImage = async () => {
    if (images.length >= 5) return Alert.alert('En fazla 5 fotoğraf');
    setUploading(true);
    try {
      const url = await pickAndUploadImage(uid, 'products', [1, 1]);
      if (url) setImages((prev) => [...prev, url]);
    } catch (e) {
      showError(e);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (title.trim().length < 3) return Alert.alert('Eksik bilgi', 'Ürün adı en az 3 karakter olmalı.');
    if (!category) return Alert.alert('Eksik bilgi', 'Kategori seç.');
    if (images.length === 0) return Alert.alert('Eksik bilgi', 'En az 1 fotoğraf ekle.');
    const sp = Number(startPrice || 0);
    const bn = buyNowPrice ? Number(buyNowPrice) : null;
    if (!sp && !bn) return Alert.alert('Eksik bilgi', 'Mezat başlangıç fiyatı veya hemen al fiyatı girmelisin.');
    const qty = Math.max(1, Number(quantity || 1));

    setSaving(true);
    const payload = {
      seller_id: uid,
      title: title.trim(),
      description: description.trim() || null,
      category,
      condition,
      images,
      image_url: images[0],
      starting_price: sp || 1,
      buy_now_price: bn,
      quantity: qty,
      updated_at: new Date().toISOString(),
    };
    const { error } = productId
      ? await supabase.from('products').update({ ...payload, status: status === 'sold' ? 'active' : status }).eq('id', productId)
      : await supabase.from('products').insert({ ...payload, status: 'active' });
    setSaving(false);
    if (error) return showError(error);
    navigation.goBack();
  };

  const archive = () =>
    Alert.alert('Ürünü kaldır', 'Ürün mağazandan kaldırılacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('products').update({ status: 'archived' }).eq('id', productId!);
          if (error) return showError(error);
          navigation.goBack();
        },
      },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]">
      <Header title={productId ? 'Ürünü düzenle' : 'Ürün ekle'} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
          {status === 'in_auction' && (
            <View className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-3 mb-4">
              <Text className="text-amber-400 font-semibold">Bu ürün şu an mezatta, mezat bitene kadar düzenlenemez.</Text>
            </View>
          )}
          <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Fotoğraflar ({images.length}/5)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            {images.map((uri, i) => (
              <View key={uri} className="w-24 h-24 rounded-2xl overflow-hidden mr-2 bg-[#1A1A1A]">
                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                <TouchableOpacity onPress={() => setImages(images.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 items-center justify-center">
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
                {i === 0 && (
                  <View className="absolute bottom-0 left-0 right-0 bg-[#FF6B00] py-0.5">
                    <Text className="text-white text-[10px] font-bold text-center">KAPAK</Text>
                  </View>
                )}
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity onPress={addImage} disabled={uploading} className="w-24 h-24 rounded-2xl border border-dashed border-[#3A3A3A] bg-[#1A1A1A] items-center justify-center">
                <Ionicons name={uploading ? 'cloud-upload-outline' : 'camera-outline'} size={26} color="#9CA3AF" />
                <Text className="text-zinc-500 text-[11px] mt-1">{uploading ? 'Yükleniyor' : 'Ekle'}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <Field label="Ürün adı" placeholder="Örn: Seiko 5 Otomatik Erkek Saat" value={title} onChangeText={setTitle} maxLength={90} />
          <Field label="Açıklama" placeholder="Ölçü, renk, kusur, kutu/fatura durumu..." multiline value={description} onChangeText={setDescription} />

          <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Kategori</Text>
          <View className="flex-row flex-wrap mb-3">
            {CATEGORIES.map((c) => (
              <View key={c.key} className="mb-2">
                <Chip label={c.label} active={category === c.key} onPress={() => setCategory(c.key)} />
              </View>
            ))}
          </View>
          <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Durum</Text>
          <View className="flex-row flex-wrap mb-4">
            {CONDITIONS.map((c) => (
              <View key={c.key} className="mb-2">
                <Chip label={c.label} active={condition === c.key} onPress={() => setCondition(c.key)} />
              </View>
            ))}
          </View>

          <View className="flex-row">
            <View className="flex-1 mr-2">
              <Field label="Mezat başlangıç ₺" placeholder="1" keyboardType="number-pad" value={startPrice} onChangeText={(t) => setStartPrice(t.replace(/[^0-9]/g, ''))} />
            </View>
            <View className="flex-1">
              <Field label="Hemen al ₺" placeholder="Opsiyonel" keyboardType="number-pad" value={buyNowPrice} onChangeText={(t) => setBuyNowPrice(t.replace(/[^0-9]/g, ''))} />
            </View>
          </View>
          <Field label="Stok adedi" keyboardType="number-pad" value={quantity} onChangeText={(t) => setQuantity(t.replace(/[^0-9]/g, ''))} />
          <Text className="text-zinc-500 text-xs mb-5 leading-5">
            “Hemen al” fiyatı girersen ürün mağazanda ve Keşfet’te doğrudan satın alınabilir. Mezat fiyatı canlı yayında kullanılır.
          </Text>

          <Button title="Kaydet" loading={saving} disabled={status === 'in_auction'} onPress={save} />
          {productId && status !== 'in_auction' && <Button title="Ürünü kaldır" variant="danger" className="mt-3" onPress={archive} />}
        </ScrollView>
    </SafeAreaView>
  );
};
