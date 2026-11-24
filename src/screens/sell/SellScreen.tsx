import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { CATEGORIES } from '../../lib/constants';
import { formatSchedule, formatTL } from '../../lib/format';
import { rpc, showError } from '../../lib/api';
import { Button, Chip, Field, Loading } from '../../components/ui';
import type { SellerApplication, Stream } from '../../types';

export const SellScreen = ({ navigation }: any) => {
  const { profile, refreshProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      refreshProfile().finally(() => setLoading(false));
    }, [refreshProfile]),
  );

  if (loading && !profile) return <Loading />;
  return profile?.is_seller ? <SellerPanel navigation={navigation} /> : <SellerApply />;
};

// ---------------- Satıcı başvurusu ----------------
const SellerApply = () => {
  const uid = useAuthStore((s) => s.user?.id);
  const [app, setApp] = useState<SellerApplication | null | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase.from('seller_applications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setApp((data as SellerApplication) ?? null);
  }, [uid]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    if (storeName.trim().length < 2 || !category || phone.replace(/\D/g, '').length < 10) {
      return Alert.alert('Eksik bilgi', 'Mağaza adı, kategori ve geçerli bir telefon numarası gerekli.');
    }
    setSaving(true);
    const { error } = await supabase.from('seller_applications').insert({
      user_id: uid,
      store_name: storeName.trim(),
      category,
      phone: phone.trim(),
      instagram: instagram.trim().replace(/^@/, '') || null,
      description: description.trim() || null,
    });
    setSaving(false);
    if (error) return showError(error);
    setShowForm(false);
    load();
  };

  if (app === undefined) return <Loading />;

  if (!showForm) {
    const pending = app?.status === 'pending';
    const rejected = app?.status === 'rejected';
    return (
      <SafeAreaView className="flex-1 bg-[#0E0E0E] items-center justify-center px-8">
        <View className="w-28 h-28 rounded-full bg-[#1A1A1A] items-center justify-center mb-6 border border-[#2A2A2A]">
          <Ionicons name={pending ? 'hourglass-outline' : rejected ? 'close-circle-outline' : 'lock-closed'} size={52} color="#FF6B00" />
        </View>
        <Text className="text-white text-2xl font-black text-center">
          {pending ? 'Başvurun inceleniyor' : rejected ? 'Başvurun onaylanmadı' : 'CanlıSat’ta satıcı ol'}
        </Text>
        <Text className="text-zinc-400 text-center mt-3 leading-6">
          {pending
            ? 'Başvurunu aldık. Onaylandığında bildirim göndereceğiz; ardından canlı yayın açıp mezat başlatabilirsin.'
            : rejected
            ? app?.admin_note || 'Bilgilerini güncelleyerek yeniden başvurabilirsin.'
            : 'Canlı yayın açmak, mezat başlatmak ve mağazanda ürün satmak için satıcı başvurusu yap.'}
        </Text>
        {!pending && <Button title={rejected ? 'Yeniden başvur' : 'Satıcı başvurusu yap'} className="w-full mt-8" onPress={() => setShowForm(true)} />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => setShowForm(false)} className="mb-4">
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-black mb-6">Satıcı başvurusu</Text>
          <Field label="Mağaza adı" placeholder="Örn: Vintage Saat Dünyası" value={storeName} onChangeText={setStoreName} />
          <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Ana kategori</Text>
          <View className="flex-row flex-wrap mb-4">
            {CATEGORIES.map((c) => (
              <View key={c.key} className="mb-2">
                <Chip label={c.label} active={category === c.key} onPress={() => setCategory(c.key)} />
              </View>
            ))}
          </View>
          <Field label="Telefon" placeholder="05xx xxx xx xx" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Field label="Instagram (isteğe bağlı)" placeholder="@magazaadi" autoCapitalize="none" value={instagram} onChangeText={setInstagram} />
          <Field label="Ne satıyorsun?" placeholder="Kısaca ürünlerinden ve deneyiminden bahset" multiline value={description} onChangeText={setDescription} />
          <Button title="Başvuruyu gönder" loading={saving} onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ---------------- Satıcı paneli ----------------
const SellerPanel = ({ navigation }: any) => {
  const uid = useAuthStore((s) => s.user?.id);
  const [live, setLive] = useState<Stream | null>(null);
  const [scheduled, setScheduled] = useState<Stream[]>([]);
  const [stats, setStats] = useState({ revenue: 0, toShip: 0, products: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    const [liveRes, schRes, ordRes, prodRes] = await Promise.all([
      supabase.from('live_streams').select('*').eq('host_id', uid).eq('status', 'live').maybeSingle(),
      supabase.from('live_streams').select('*').eq('host_id', uid).eq('status', 'scheduled').order('scheduled_at'),
      supabase.from('orders').select('amount, status').eq('seller_id', uid).neq('status', 'cancelled'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', uid).in('status', ['active', 'in_auction']),
    ]);
    setLive((liveRes.data as Stream) ?? null);
    setScheduled((schRes.data as Stream[]) ?? []);
    const orders = ordRes.data ?? [];
    setStats({
      revenue: orders.reduce((s: number, o: any) => s + Number(o.amount), 0),
      toShip: orders.filter((o: any) => o.status === 'awaiting_payment' || o.status === 'paid').length,
      products: prodRes.count ?? 0,
    });
  }, [uid]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goLive = async (s: Stream) => {
    setBusy(s.id);
    try {
      await rpc('go_live', { p_stream_id: s.id });
      navigation.navigate('LiveRoom', { streamId: s.id });
    } catch (e) {
      showError(e);
    } finally {
      setBusy(null);
    }
  };

  const cancelScheduled = (s: Stream) =>
    Alert.alert('Yayını iptal et', s.title, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'İptal et', style: 'destructive', onPress: () => rpc('end_stream', { p_stream_id: s.id }).then(load).catch(showError) },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl tintColor="#FF6B00" refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <Text className="text-white text-2xl font-black">Satıcı paneli</Text>
        <Text className="text-zinc-400 mb-5">Hoş geldin, bugünkü performansına göz at.</Text>

        {live ? (
          <TouchableOpacity onPress={() => navigation.navigate('LiveRoom', { streamId: live.id })} className="bg-red-600 rounded-2xl p-4 mb-4 flex-row items-center">
            <Ionicons name="radio" size={26} color="#fff" />
            <View className="flex-1 ml-3">
              <Text className="text-white font-black">Şu an canlıdasın</Text>
              <Text className="text-white/80" numberOfLines={1}>{live.title}</Text>
            </View>
            <Text className="text-white font-bold">Yayına dön ›</Text>
          </TouchableOpacity>
        ) : (
          <Button title="Canlı yayın başlat" icon="radio" className="mb-3" onPress={() => navigation.navigate('StreamForm', { mode: 'now' })} />
        )}
        <Button title="Yayın planla" icon="calendar-outline" variant="secondary" className="mb-5" onPress={() => navigation.navigate('StreamForm', { mode: 'schedule' })} />

        <View className="flex-row mb-3">
          <View className="flex-1 bg-[#1A1A1A] rounded-2xl p-4 mr-2">
            <Text className="text-zinc-400 text-xs">Toplam satış</Text>
            <Text className="text-white font-black text-xl mt-1">{formatTL(stats.revenue)}</Text>
          </View>
          <View className="flex-1 bg-[#1A1A1A] rounded-2xl p-4">
            <Text className="text-zinc-400 text-xs">Kargolanacak</Text>
            <Text className="text-[#FF6B00] font-black text-xl mt-1">{stats.toShip}</Text>
          </View>
        </View>

        <View className="bg-[#1A1A1A] rounded-2xl mb-5 overflow-hidden">
          {[
            { icon: 'pricetags-outline', label: 'Ürünlerim', sub: `${stats.products} aktif ürün`, to: 'MyProducts' },
            { icon: 'add-circle-outline', label: 'Ürün ekle', sub: 'Mezat veya hemen al', to: 'ProductForm' },
            { icon: 'cube-outline', label: 'Siparişler', sub: 'Kargo bilgisi gir', to: 'SellerOrders' },
            { icon: 'storefront-outline', label: 'Mağazamı gör', sub: 'Alıcıların gördüğü sayfa', to: 'SellerProfile', params: { userId: uid } },
          ].map((r, i) => (
            <TouchableOpacity key={r.label} onPress={() => navigation.navigate(r.to, r.params)} className={`flex-row items-center p-4 ${i ? 'border-t border-[#262626]' : ''}`}>
              <Ionicons name={r.icon as any} size={22} color="#FF6B00" />
              <View className="flex-1 ml-3">
                <Text className="text-white font-semibold">{r.label}</Text>
                <Text className="text-zinc-500 text-xs">{r.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#6B7280" />
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-white font-extrabold text-lg mb-3">Planlanan yayınlar</Text>
        {scheduled.length === 0 ? (
          <Text className="text-zinc-500 mb-4">Planlanmış yayının yok. Yayın planlamak, takipçilerinin hatırlatma kurmasını sağlar.</Text>
        ) : (
          scheduled.map((s) => (
            <View key={s.id} className="bg-[#1A1A1A] rounded-2xl p-4 mb-2 border-l-4 border-[#FF6B00]">
              <Text className="text-zinc-400 text-xs">{formatSchedule(s.scheduled_at)}</Text>
              <Text className="text-white font-bold mt-1">{s.title}</Text>
              <View className="flex-row mt-3">
                <Button small title="Şimdi başlat" icon="radio" loading={busy === s.id} onPress={() => goLive(s)} className="mr-2" />
                <Button small title="İptal" variant="secondary" onPress={() => cancelScheduled(s)} />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
