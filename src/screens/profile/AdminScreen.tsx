import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { categoryLabel } from '../../lib/constants';
import { timeAgo } from '../../lib/format';
import { rpc, showError } from '../../lib/api';
import { Button, EmptyState, Header, Tabs } from '../../components/ui';
import type { SellerApplication } from '../../types';

type Report = { id: string; target_type: string; target_id: string; reason: string; created_at: string; reporter_id: string };

export const AdminScreen = () => {
  const [tab, setTab] = useState<'apps' | 'reports'>('apps');
  const [apps, setApps] = useState<SellerApplication[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const load = useCallback(async () => {
    const [a, r] = await Promise.all([
      supabase.from('seller_applications').select('*, user:profiles!seller_applications_user_id_fkey(id, username)').eq('status', 'pending').order('created_at'),
      supabase.from('reports').select('*').eq('status', 'open').order('created_at', { ascending: false }),
    ]);
    setApps((a.data as SellerApplication[]) ?? []);
    setReports((r.data as Report[]) ?? []);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const review = (app: SellerApplication, approve: boolean) => {
    const run = async (note?: string) => {
      try {
        await rpc('review_seller_application', { p_application_id: app.id, p_approve: approve, p_note: note ?? null });
        load();
      } catch (e) {
        showError(e);
      }
    };
    if (approve) return Alert.alert('Onayla', `${app.store_name} satıcı olarak onaylansın mı?`, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Onayla', onPress: () => run() }]);
    Alert.prompt?.('Reddet', 'Kullanıcıya gösterilecek not (isteğe bağlı)', (note) => run(note));
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]">
      <Header title="Yönetim paneli" />
      <Tabs tabs={[{ key: 'apps', label: `Başvurular (${apps.length})` }, { key: 'reports', label: `Şikâyetler (${reports.length})` }]} value={tab} onChange={setTab} />
      {tab === 'apps' ? (
        <FlatList
          data={apps}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<EmptyState icon="checkmark-done-outline" title="Bekleyen başvuru yok" />}
          renderItem={({ item }) => (
            <View className="bg-[#1A1A1A] rounded-2xl p-4 mb-3">
              <Text className="text-white font-black text-lg">{item.store_name}</Text>
              <Text className="text-zinc-400 text-sm">@{item.user?.username} · {categoryLabel(item.category)} · {timeAgo(item.created_at)}</Text>
              <Text className="text-zinc-300 mt-2">📞 {item.phone}{item.instagram ? `   📷 @${item.instagram}` : ''}</Text>
              {item.description ? <Text className="text-zinc-400 mt-2">{item.description}</Text> : null}
              <View className="flex-row mt-4">
                <Button small title="Onayla" icon="checkmark" className="mr-2" onPress={() => review(item, true)} />
                <Button small title="Reddet" variant="danger" onPress={() => review(item, false)} />
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title="Açık şikâyet yok" />}
          renderItem={({ item }) => (
            <View className="bg-[#1A1A1A] rounded-2xl p-4 mb-2">
              <Text className="text-white font-bold">{item.target_type} · {item.reason}</Text>
              <Text className="text-zinc-500 text-xs mt-1">{item.target_id}</Text>
              <Text className="text-zinc-600 text-xs mt-1">{timeAgo(item.created_at)}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};
