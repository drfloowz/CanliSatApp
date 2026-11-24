import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { rpc, showError } from '../../lib/api';
import { Avatar } from '../../components/ui';

type Message = { id: string; conversation_id: string; sender_id: string; body: string; read_at: string | null; created_at: string };
type Other = { id: string; username: string | null; avatar_url: string | null };

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Bugün';
  if (d.toDateString() === y.toDateString()) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
};

/**
 * Parametreler: { conversationId?, other? } veya { userId } (sohbet yoksa oluşturulur)
 */
export const ChatScreen = ({ navigation, route }: any) => {
  const uid = useAuthStore((s) => s.user?.id);
  const [conversationId, setConversationId] = useState<string | null>(route.params?.conversationId ?? null);
  const [other, setOther] = useState<Other | null>(route.params?.other ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sohbeti hazırla
  useEffect(() => {
    (async () => {
      try {
        let convId = conversationId;
        const otherId: string | undefined = route.params?.userId ?? other?.id;
        if (!convId && otherId) {
          const conv = await rpc<any>('start_conversation', { p_other: otherId });
          convId = conv.id;
          setConversationId(conv.id);
        }
        if (!other && otherId) {
          const { data } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', otherId).single();
          setOther(data as Other);
        }
        if (!other && !otherId && convId) {
          const { data: c } = await supabase.from('conversations').select('user_a, user_b').eq('id', convId).single();
          const oid = c?.user_a === uid ? c?.user_b : c?.user_a;
          const { data } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', oid).single();
          setOther(data as Other);
        }
        if (convId) {
          const { data } = await supabase
            .from('direct_messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(100);
          setMessages((data as Message[]) ?? []);
        }
      } catch (e) {
        showError(e);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = useCallback(async () => {
    if (!conversationId || !uid) return;
    await supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', conversationId).neq('sender_id', uid).is('read_at', null);
  }, [conversationId, uid]);

  useEffect(() => {
    if (!conversationId) return;
    markRead();
    const ch = supabase
      .channel(`dm-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` }, (p) => {
        const m = p.new as Message;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [m, ...prev]));
        if (m.sender_id !== uid) markRead();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` }, (p) => {
        const m = p.new as Message;
        setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, uid, markRead]);

  const send = async () => {
    const body = text.trim();
    if (!body || !conversationId || !uid || sending) return;
    setSending(true);
    setText('');
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({ conversation_id: conversationId, sender_id: uid, body: body.slice(0, 1000) })
      .select()
      .single();
    setSending(false);
    if (error) {
      setText(body);
      return showError(error, 'Mesaj gönderilemedi');
    }
    setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [data as Message, ...prev]));
  };

  // Gün ayraçları için: (liste ters sıralı) bir sonraki mesajla gün farklıysa ayraç göster
  const items = useMemo(() => messages, [messages]);

  return (
    <SafeAreaView className="flex-1 bg-[#0E0E0E]" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-3 h-14 border-b border-[#1F1F1F]">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center flex-1" onPress={() => other && navigation.navigate('SellerProfile', { userId: other.id })}>
          <Avatar uri={other?.avatar_url} name={other?.username} size={36} />
          <Text className="text-white font-bold text-base ml-2">@{other?.username ?? '...'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1" keyboardVerticalOffset={0}>
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#FF6B00" />
          </View>
        ) : (
          <FlatList
            data={items}
            inverted
            keyExtractor={(m) => m.id}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 12 }}
            ListEmptyComponent={
              <View style={{ transform: [{ scaleY: -1 }] }} className="items-center py-16">
                <Ionicons name="chatbubbles-outline" size={40} color="#4B5563" />
                <Text className="text-zinc-500 mt-3 text-center">Sohbeti başlat. Ürün, kargo veya fiyat hakkında soru sorabilirsin.</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const mine = item.sender_id === uid;
              const older = items[index + 1];
              const showDay = !older || new Date(older.created_at).toDateString() !== new Date(item.created_at).toDateString();
              return (
                <View>
                  {showDay && (
                    <Text className="text-zinc-500 text-xs text-center my-3">{dayLabel(item.created_at)}</Text>
                  )}
                  <View className={`max-w-[80%] mb-1.5 px-3.5 py-2 rounded-2xl ${mine ? 'self-end bg-[#FF6B00] rounded-br-md' : 'self-start bg-[#222] rounded-bl-md'}`}>
                    <Text className="text-white text-[15px] leading-5">{item.body}</Text>
                    <View className="flex-row items-center self-end mt-1">
                      <Text className={`text-[10px] ${mine ? 'text-white/75' : 'text-zinc-500'}`}>{timeLabel(item.created_at)}</Text>
                      {mine && <Ionicons name={item.read_at ? 'checkmark-done' : 'checkmark'} size={13} color="rgba(255,255,255,0.8)" style={{ marginLeft: 3 }} />}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View className="flex-row items-end px-3 py-2 border-t border-[#1F1F1F]">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Mesaj yaz..."
            placeholderTextColor="#6B7280"
            multiline
            maxLength={1000}
            className="flex-1 bg-[#1A1A1A] text-white rounded-3xl px-4 pt-3 pb-3 max-h-32 text-[15px]"
          />
          <TouchableOpacity
            onPress={send}
            disabled={!text.trim() || sending}
            className={`w-11 h-11 rounded-full items-center justify-center ml-2 ${text.trim() ? 'bg-[#FF6B00]' : 'bg-[#2A2A2A]'}`}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
