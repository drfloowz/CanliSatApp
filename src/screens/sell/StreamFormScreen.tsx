import React, { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { CATEGORIES } from '../../lib/constants';
import { pickAndUploadImage, rpc, showError } from '../../lib/api';
import { Button, Chip, Field, Header } from '../../components/ui';
import type { Stream } from '../../types';

const HOURS = [10, 12, 14, 16, 18, 19, 20, 21, 22, 23];

export const StreamFormScreen = ({ navigation, route }: any) => {
  const mode: 'now' | 'schedule' = route.params?.mode ?? 'now';
  const uid = useAuthStore((s) => s.user?.id)!;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [hour, setHour] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return { i, label: i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' }) };
      }),
    [],
  );

  const scheduledAt = () => {
    if (hour === null) return null;
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

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
    let when: Date | null = null;
    if (mode === 'schedule') {
      when = scheduledAt();
      if (!when || when.getTime() < Date.now() + 5 * 60e3) return showError(new Error('İleri bir tarih ve saat seç'));
    }
    setSaving(true);
    try {
      const s = await rpc<Stream>('create_stream', {
        p_title: title.trim(),
        p_category: category,
        p_description: description.trim() || null,
        p_cover_url: cover,
        p_scheduled_at: when ? when.toISOString() : null,
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
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
            <>
              <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Gün</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {days.map((d) => (
                  <Chip key={d.i} label={d.label} active={dayOffset === d.i} onPress={() => setDayOffset(d.i)} />
                ))}
              </ScrollView>
              <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Saat</Text>
              <View className="flex-row flex-wrap mb-6">
                {HOURS.map((h) => (
                  <View key={h} className="mb-2">
                    <Chip label={`${h}:00`} active={hour === h} onPress={() => setHour(h)} />
                  </View>
                ))}
              </View>
            </>
          )}

          <Button title={mode === 'now' ? 'Yayını başlat' : 'Yayını planla'} icon={mode === 'now' ? 'radio' : 'calendar'} loading={saving} onPress={submit} />
          {mode === 'now' && <Text className="text-zinc-500 text-xs text-center mt-3">Takipçilerine yayına başladığın bildirilecek.</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
