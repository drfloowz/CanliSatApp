import React, { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { CATEGORIES } from '../../lib/constants';
import { pickAndUploadImage, rpc, showError } from '../../lib/api';
import { Button, Chip, Field, Header } from '../../components/ui';
import { formatSchedule } from '../../lib/format';
import type { Stream } from '../../types';

const defaultScheduleDate = () => {
  const d = new Date(Date.now() + 60 * 60e3);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return d;
};

export const StreamFormScreen = ({ navigation, route }: any) => {
  const mode: 'now' | 'schedule' = route.params?.mode ?? 'now';
  const uid = useAuthStore((s) => s.user?.id)!;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [when, setWhen] = useState<Date>(defaultScheduleDate);
  const [saving, setSaving] = useState(false);

  const pickCover = async () => {
    setUploading(true);
    try {
      const url = await pickAndUploadImage(uid, 'covers', [3, 4]);
      if (url) setCover(url);
    } catch (e) {
      showError(e);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (title.trim().length < 3) return showError(new Error('Başlık en az 3 karakter olmalı'));
    if (!category) return showError(new Error('Kategori seç'));
    if (mode === 'schedule' && when.getTime() < Date.now() + 5 * 60e3) {
      return showError(new Error('Yayın en az 5 dakika sonrası için planlanabilir'));
    }
    setSaving(true);
    try {
      const s = await rpc<Stream>('create_stream', {
        p_title: title.trim(),
        p_category: category,
        p_description: description.trim() || null,
        p_cover_url: cover,
        p_scheduled_at: mode === 'schedule' ? when.toISOString() : null,
      });
      if (mode === 'now') navigation.replace('LiveRoom', { streamId: s.id });
      else navigation.goBack();
    } catch (e) {
      showError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]">
      <Header title={mode === 'now' ? 'Canlı yayın başlat' : 'Yayın planla'} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
          <TouchableOpacity onPress={pickCover} className="self-center w-36 h-48 rounded-2xl bg-[#1A1A1A] border border-dashed border-[#3A3A3A] items-center justify-center mb-5 overflow-hidden">
            {cover ? (
              <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <>
                <Ionicons name={uploading ? 'cloud-upload-outline' : 'image-outline'} size={30} color="#9CA3AF" />
                <Text className="text-zinc-400 text-xs mt-2 text-center px-2">{uploading ? 'Yükleniyor...' : 'Kapak görseli\n(isteğe bağlı)'}</Text>
              </>
            )}
          </TouchableOpacity>

          <Field label="Yayın başlığı" placeholder="Örn: Vintage saatler 1 ₺’den başlıyor!" value={title} onChangeText={setTitle} maxLength={80} />
          <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Kategori</Text>
          <View className="flex-row flex-wrap mb-4">
            {CATEGORIES.map((c) => (
              <View key={c.key} className="mb-2">
                <Chip label={c.label} active={category === c.key} onPress={() => setCategory(c.key)} />
              </View>
            ))}
          </View>
          <Field label="Açıklama (isteğe bağlı)" placeholder="Bu yayında neler var?" multiline value={description} onChangeText={setDescription} />

          {mode === 'schedule' && (
            <View className="mb-6">
              <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Yayın tarihi ve saati</Text>
              <View className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
                <View className="flex-row items-center justify-center pt-4">
                  <Ionicons name="calendar" size={18} color="#FF6B00" />
                  <Text className="text-white font-bold text-lg ml-2">{formatSchedule(when.toISOString())}</Text>
                </View>
                <DateTimePicker
                  value={when}
                  mode="datetime"
                  display="spinner"
                  locale="tr-TR"
                  minuteInterval={5}
                  minimumDate={new Date(Date.now() + 5 * 60e3)}
                  maximumDate={new Date(Date.now() + 60 * 24 * 3600e3)}
                  themeVariant="dark"
                  textColor="#FFFFFF"
                  onChange={(_, d) => d && setWhen(d)}
                />
              </View>
            </View>
          )}

          <Button title={mode === 'now' ? 'Yayını başlat' : 'Yayını planla'} icon={mode === 'now' ? 'radio' : 'calendar'} loading={saving} onPress={submit} />
          {mode === 'now' && <Text className="text-zinc-500 text-xs text-center mt-3">Takipçilerine yayına başladığın bildirilecek.</Text>}
        </ScrollView>
    </SafeAreaView>
  );
};
