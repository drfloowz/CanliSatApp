import React, { useCallback, useState } from 'react';
import { Alert, FlatList, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { showError } from '../../lib/api';
import { Button, EmptyState, Field, Header } from '../../components/ui';
import type { Address } from '../../types';

export const AddressesScreen = ({ navigation }: any) => {
  const uid = useAuthStore((s) => s.user?.id);
  const [items, setItems] = useState<Address[]>([]);

  const load = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase.from('addresses').select('*').eq('user_id', uid).order('is_default', { ascending: false }).order('created_at');
    setItems((data as Address[]) ?? []);
  }, [uid]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = (a: Address) =>
    Alert.alert('Adresi sil', a.title, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await supabase.from('addresses').delete().eq('id', a.id); load(); } },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]">
      <Header title="Adreslerim" />
      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<EmptyState icon="location-outline" title="Kayıtlı adresin yok" subtitle="Mezatlara katılmak ve sipariş verebilmek için bir teslimat adresi ekle." />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('AddressForm', { address: item })} className="bg-[#1A1A1A] rounded-2xl p-4 mb-2 flex-row">
            <Ionicons name="location" size={22} color="#FF6B00" />
            <View className="flex-1 ml-3">
              <Text className="text-white font-bold">{item.title}{item.is_default ? '  · Varsayılan' : ''}</Text>
              <Text className="text-zinc-400 text-sm mt-1">{item.full_name} · {item.phone}</Text>
              <Text className="text-zinc-500 text-xs mt-1">{item.address_line}, {item.district} / {item.city}</Text>
            </View>
            <TouchableOpacity onPress={() => remove(item)}>
              <Ionicons name="trash-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListFooterComponent={<Button title="Yeni adres ekle" icon="add" className="mt-3" onPress={() => navigation.navigate('AddressForm')} />}
      />
    </SafeAreaView>
  );
};

export const AddressFormScreen = ({ navigation, route }: any) => {
  const editing: Address | undefined = route.params?.address;
  const { user, profile } = useAuthStore();
  const [title, setTitle] = useState(editing?.title ?? 'Ev');
  const [fullName, setFullName] = useState(editing?.full_name ?? profile?.full_name ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [city, setCity] = useState(editing?.city ?? '');
  const [district, setDistrict] = useState(editing?.district ?? '');
  const [line, setLine] = useState(editing?.address_line ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!fullName.trim() || phone.replace(/\D/g, '').length < 10 || !city.trim() || !district.trim() || line.trim().length < 10) {
      return Alert.alert('Eksik bilgi', 'Lütfen tüm alanları eksiksiz doldur.');
    }
    setSaving(true);
    const { count } = await supabase.from('addresses').select('id', { count: 'exact', head: true }).eq('user_id', user!.id);
    const payload = {
      user_id: user!.id,
      title: title.trim() || 'Adres',
      full_name: fullName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      district: district.trim(),
      address_line: line.trim(),
      is_default: editing?.is_default ?? !count,
    };
    const { error } = editing
      ? await supabase.from('addresses').update(payload).eq('id', editing.id)
      : await supabase.from('addresses').insert(payload);
    setSaving(false);
    if (error) return showError(error);
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]">
      <Header title={editing ? 'Adresi düzenle' : 'Yeni adres'} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
          <Field label="Adres başlığı" placeholder="Ev, İş..." value={title} onChangeText={setTitle} />
          <Field label="Ad Soyad" value={fullName} onChangeText={setFullName} />
          <Field label="Telefon" keyboardType="phone-pad" placeholder="05xx xxx xx xx" value={phone} onChangeText={setPhone} />
          <View className="flex-row">
            <View className="flex-1 mr-2"><Field label="İl" value={city} onChangeText={setCity} /></View>
            <View className="flex-1"><Field label="İlçe" value={district} onChangeText={setDistrict} /></View>
          </View>
          <Field label="Açık adres" multiline placeholder="Mahalle, sokak, bina no, daire" value={line} onChangeText={setLine} />
          <Button title="Kaydet" loading={saving} onPress={save} />
        </ScrollView>
    </SafeAreaView>
  );
};
