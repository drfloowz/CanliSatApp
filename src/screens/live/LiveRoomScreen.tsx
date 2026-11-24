import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RtcSurfaceView } from 'react-native-agora';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { PRODUCT_SELECT, STREAM_SELECT, errorMessage, rpc, showError } from '../../lib/api';
import { formatTL, nextBidAmount } from '../../lib/format';
import { AUCTION_DURATIONS } from '../../lib/constants';
import { Avatar, Button } from '../../components/ui';
import { useAgora } from './useAgora';
import type { Auction, ChatMessage, Product, Stream } from '../../types';

type SoldBanner = { title: string; price: number; winner: string | null; mine: boolean } | null;

export const LiveRoomScreen = ({ navigation, route }: any) => {
  const streamId: string = route.params?.streamId;
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuthStore();
  const uid = user?.id;

  const [stream, setStream] = useState<Stream | null>(null);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [auctionProduct, setAuctionProduct] = useState<Product | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewers, setViewers] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [now, setNow] = useState(Date.now());
  const [bidding, setBidding] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [sold, setSold] = useState<SoldBanner>(null);
  const usernames = useRef<Record<string, string>>({});
  const finalizing = useRef(false);
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);
  const productRef = useRef<Product | null>(null);
  productRef.current = auctionProduct;

  const isHost = !!stream && stream.host_id === uid;
  const agora = useAgora(stream?.id, isHost, stream?.status === 'live');

  // ---------- Veri yükleme ----------
  const resolveUsernames = useCallback(async (ids: string[]) => {
    const missing = [...new Set(ids)].filter((id) => !usernames.current[id]);
    if (!missing.length) return;
    const { data } = await supabase.from('profiles').select('id, username').in('id', missing);
    (data ?? []).forEach((p: any) => (usernames.current[p.id] = p.username ?? 'kullanici'));
  }, []);

  const loadAuction = useCallback(async (auctionId: string | null) => {
    if (!auctionId) {
      setAuction(null);
      setAuctionProduct(null);
      return;
    }
    const { data: a } = await supabase.from('auctions').select('*').eq('id', auctionId).maybeSingle();
    if (!a) return;
    setAuction(a as Auction);
    const { data: p } = await supabase.from('products').select('*').eq('id', a.product_id).maybeSingle();
    setAuctionProduct(p as Product);
    if (a.current_winner_id) await resolveUsernames([a.current_winner_id]);
  }, [resolveUsernames]);

  useEffect(() => {
    (async () => {
      const { data: s, error } = await supabase.from('live_streams').select(STREAM_SELECT).eq('id', streamId).maybeSingle();
      if (error || !s) {
        Alert.alert('Yayın bulunamadı');
        return navigation.goBack();
      }
      if (s.status !== 'live') {
        Alert.alert('Yayın sona erdi');
        return navigation.goBack();
      }
      setStream(s as Stream);
      await loadAuction(s.current_auction_id);
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(30);
      const list = ((msgs ?? []) as ChatMessage[]).reverse();
      await resolveUsernames(list.map((m) => m.user_id));
      setMessages(list);
      if (uid && s.host_id !== uid) {
        const { data: f } = await supabase.from('followers').select('id').eq('follower_id', uid).eq('following_id', s.host_id).maybeSingle();
        setIsFollowing(!!f);
      }
    })();
  }, [streamId, uid, navigation, loadAuction, resolveUsernames]);

  // ---------- Realtime ----------
  useEffect(() => {
    if (!stream?.id || !uid) return;
    const ch = supabase.channel(`stream:${stream.id}`, { config: { presence: { key: uid } } });
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `stream_id=eq.${stream.id}` }, async (payload) => {
      const m = payload.new as ChatMessage;
      await resolveUsernames([m.user_id]);
      setMessages((prev) => [...prev.slice(-40), m]);
    })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions', filter: `stream_id=eq.${stream.id}` }, async (payload) => {
        const a = payload.new as Auction;
        if (a.current_winner_id) await resolveUsernames([a.current_winner_id]);
        const p = productRef.current;
        if (a.status === 'running') {
          setAuction(a);
          if (!p || p.id !== a.product_id) loadAuction(a.id);
        } else if (a.status === 'ended') {
          setAuction(null);
          setAuctionProduct(null);
          if (a.current_winner_id) {
            setSold({ title: p?.title ?? 'Ürün', price: a.current_price, winner: usernames.current[a.current_winner_id] ?? null, mine: a.current_winner_id === uid });
            setTimeout(() => setSold(null), 5000);
          }
        } else {
          setAuction(null);
          setAuctionProduct(null);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${stream.id}` }, (payload) => {
        const s = payload.new as Stream;
        setStream((prev) => (prev ? { ...prev, ...s, host: prev.host } : prev));
        if (s.status === 'ended' && s.host_id !== uid) {
          Alert.alert('Yayın sona erdi', 'Satıcı yayını bitirdi. Kazandığın ürünleri Aktivite sekmesinde görebilirsin.');
          navigation.goBack();
        }
      })
      .on('presence', { event: 'sync' }, () => setViewers(Math.max(Object.keys(ch.presenceState()).length - 1, 0)))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await ch.track({ at: Date.now() });
      });
    return () => { supabase.removeChannel(ch); };
  }, [stream?.id, uid, navigation, loadAuction, resolveUsernames]);

  // ---------- Yayıncı sinyali (heartbeat) ----------
  const viewersRef = useRef(0);
  viewersRef.current = viewers;
  useEffect(() => {
    if (!isHost || !stream?.id) return;
    const beat = () => rpc('stream_heartbeat', { p_stream_id: stream.id, p_viewers: viewersRef.current }).catch(() => {});
    beat();
    const t = setInterval(beat, 20000);
    return () => clearInterval(t);
  }, [isHost, stream?.id]);

  // ---------- Geri sayım ----------
  useEffect(() => {
    if (!auction) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [auction]);

  const remaining = auction ? Math.max(0, Math.ceil((new Date(auction.ends_at).getTime() - now) / 1000)) : 0;

  useEffect(() => {
    if (!auction || remaining > 0 || finalizing.current) return;
    finalizing.current = true;
    rpc('finalize_auction', { p_auction_id: auction.id })
      .catch(() => {})
      .finally(() => setTimeout(() => (finalizing.current = false), 1500));
  }, [auction, remaining]);

  // ---------- Aksiyonlar ----------
  const nextBid = auction ? nextBidAmount(Number(auction.current_price), auction.bid_count) : 0;
  const iAmWinning = !!auction && auction.current_winner_id === uid;

  const handleBidError = (e: any) => {
    const msg = errorMessage(e);
    if (msg.includes('teslimat adresi')) {
      Alert.alert('Adres gerekli', 'Teklif verebilmek için önce teslimat adresi eklemelisin.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Adres ekle', onPress: () => navigation.navigate('AddressForm') },
      ]);
    } else Alert.alert('Teklif verilemedi', msg);
  };

  const placeBid = async (amount: number) => {
    if (!auction || bidding) return;
    setBidding(true);
    try {
      const a = await rpc<Auction>('place_bid', { p_auction_id: auction.id, p_amount: amount });
      setAuction(a);
      setCustomOpen(false);
      setCustomAmount('');
    } catch (e) {
      handleBidError(e);
    } finally {
      setBidding(false);
    }
  };

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || !uid || !stream) return;
    setChatInput('');
    const { error } = await supabase.from('chat_messages').insert({ stream_id: stream.id, user_id: uid, message: text.slice(0, 300) });
    if (error) showError(error, 'Mesaj gönderilemedi');
  };

  const toggleFollow = async () => {
    if (!uid || !stream) return;
    const next = !isFollowing;
    setIsFollowing(next);
    const { error } = next
      ? await supabase.from('followers').insert({ follower_id: uid, following_id: stream.host_id })
      : await supabase.from('followers').delete().eq('follower_id', uid).eq('following_id', stream.host_id);
    if (error) setIsFollowing(!next);
  };

  const close = () => {
    if (!isHost) return navigation.goBack();
    Alert.alert('Yayını bitir', 'Yayını sonlandırmak istiyor musun? Devam eden mezat sonuçlandırılır.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Bitir',
        style: 'destructive',
        onPress: async () => {
          try {
            await rpc('end_stream', { p_stream_id: stream!.id });
          } catch (e) {
            showError(e);
          }
          navigation.goBack();
        },
      },
    ]);
  };

  const togglePause = async (paused: boolean) => {
    if (!stream) return;
    agora.setPaused(paused);
    setStream((s) => (s ? { ...s, is_paused: paused } : s));
    try {
      await rpc('set_stream_paused', { p_stream_id: stream.id, p_paused: paused });
    } catch (e) {
      showError(e);
    }
  };

  const moreMenu = () => {
    if (!stream || !uid) return;
    Alert.alert('Seçenekler', undefined, [
      { text: 'Paylaş', onPress: () => Share.share({ message: `${stream.host?.username} şu an CanlıSat'ta canlı: ${stream.title}` }) },
      {
        text: 'Yayını şikâyet et',
        onPress: async () => {
          await supabase.from('reports').insert({ reporter_id: uid, target_type: 'stream', target_id: stream.id, reason: 'Kullanıcı şikâyeti' });
          Alert.alert('Teşekkürler', 'Şikâyetin incelemeye alındı.');
        },
      },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  if (!stream) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#FF6B00" size="large" />
      </View>
    );
  }

  const winnerName = auction?.current_winner_id ? usernames.current[auction.current_winner_id] : null;

  return (
    <View className="flex-1 bg-black">
      {/* Video */}
      <View style={StyleSheet.absoluteFill}>
        {/* Görüntü yalnızca gerçekten yayınlanıyorsa çizilir; aksi halde donmuş son kare yerine bilgi ekranı gösterilir */}
        {isHost && agora.ready && !agora.videoOff && !stream.is_paused ? (
          <RtcSurfaceView canvas={{ uid: 0, renderMode: agora.renderMode }} style={StyleSheet.absoluteFill} />
        ) : null}
        {!isHost && agora.remoteUid !== null && !stream.is_paused && agora.remoteVideo !== 'camera_off' ? (
          <RtcSurfaceView canvas={{ uid: agora.remoteUid, renderMode: agora.renderMode }} style={StyleSheet.absoluteFill} />
        ) : null}

        {agora.error ? (
          <StatusOverlay stream={stream} icon="warning-outline" title="Bağlantı sorunu" subtitle={agora.error} />
        ) : stream.is_paused ? (
          <StatusOverlay
            stream={stream}
            icon="pause"
            title={isHost ? 'Yayına ara verdin' : 'Yayına kısa bir ara verildi'}
            subtitle={isHost ? 'İzleyicilerin seni görmüyor ve duymuyor. Hazır olduğunda devam et.' : 'Satıcı birazdan geri dönecek, ayrılma 👋'}
            action={isHost ? <Button title="Yayına devam et" icon="play" onPress={() => togglePause(false)} /> : undefined}
          />
        ) : isHost && agora.videoOff ? (
          <StatusOverlay stream={stream} icon="videocam-off" title="Kameran kapalı" subtitle="İzleyiciler sadece sesini duyuyor." />
        ) : isHost && !agora.ready ? (
          <StatusOverlay stream={stream} loading title="Kamera açılıyor..." />
        ) : !isHost && agora.remoteVideo === 'camera_off' ? (
          <StatusOverlay stream={stream} icon="videocam-off" title="Satıcı kamerasını kapattı" subtitle="Görüntü birazdan geri gelecek." />
        ) : !isHost && agora.remoteUid === null ? (
          <StatusOverlay stream={stream} loading title="Yayına bağlanılıyor..." />
        ) : !isHost && agora.remoteVideo === 'waiting' ? (
          <StatusOverlay stream={stream} loading title="Görüntü yükleniyor..." />
        ) : !isHost && agora.remoteVideo === 'frozen' ? (
          <View className="absolute top-1/2 self-center bg-black/70 px-4 py-2 rounded-full flex-row items-center">
            <ActivityIndicator color="#FF6B00" size="small" />
            <Text className="text-white ml-2 font-semibold">Bağlantı zayıf...</Text>
          </View>
        ) : null}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} pointerEvents="box-none">
        {/* Üst bar */}
        <View style={{ paddingTop: insets.top + 6 }} className="px-3 flex-row items-start justify-between">
          <View>
            <TouchableOpacity
              onPress={() => !isHost && navigation.navigate('SellerProfile', { userId: stream.host_id })}
              className="bg-black/50 rounded-full flex-row items-center p-1 pr-2"
            >
              <Avatar uri={stream.host?.avatar_url} name={stream.host?.username} size={34} />
              <View className="mx-2 max-w-[130px]">
                <Text className="text-white font-bold text-sm" numberOfLines={1}>
                  {stream.host?.username}
                </Text>
                <Text className="text-zinc-300 text-[11px]" numberOfLines={1}>
                  {stream.title}
                </Text>
              </View>
              {!isHost && (
                <TouchableOpacity onPress={toggleFollow} className={`px-3 py-1.5 rounded-full ${isFollowing ? 'bg-white/20' : 'bg-[#FF6B00]'}`}>
                  <Text className="text-white text-xs font-bold">{isFollowing ? 'Takipte' : 'Takip et'}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            <View className="flex-row mt-2">
              <View className="bg-red-600 rounded-md px-2 py-1 mr-2 flex-row items-center">
                <View className="w-1.5 h-1.5 bg-white rounded-full mr-1" />
                <Text className="text-white text-[11px] font-extrabold">CANLI</Text>
              </View>
              <View className="bg-black/50 rounded-md px-2 py-1 flex-row items-center">
                <Ionicons name="eye" size={12} color="#fff" />
                <Text className="text-white text-[11px] font-bold ml-1">{viewers}</Text>
              </View>
            </View>
          </View>
          <View className="flex-row">
            {!isHost && (
              <TouchableOpacity onPress={moreMenu} className="w-10 h-10 bg-black/50 rounded-full items-center justify-center mr-2">
                <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={close} className={`h-10 rounded-full items-center justify-center ${isHost ? 'bg-red-600 px-4' : 'bg-black/50 w-10'}`}>
              {isHost ? <Text className="text-white font-bold">Bitir</Text> : <Ionicons name="close" size={22} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Yayıncı kontrolleri */}
        {isHost && (
          <View className="absolute right-3" style={{ top: insets.top + 64 }}>
            {[
              { icon: stream.is_paused ? 'play' : 'pause', label: stream.is_paused ? 'Devam' : 'Ara ver', on: () => togglePause(!stream.is_paused), active: !!stream.is_paused },
              { icon: 'camera-reverse-outline', label: 'Çevir', on: agora.switchCamera, active: false },
              { icon: agora.muted ? 'mic-off' : 'mic', label: 'Mikrofon', on: agora.toggleMic, active: agora.muted },
              { icon: agora.videoOff ? 'videocam-off' : 'videocam', label: 'Kamera', on: agora.toggleVideo, active: agora.videoOff },
            ].map((b) => (
              <TouchableOpacity key={b.label} onPress={b.on} disabled={!!stream.is_paused && b.label !== 'Devam'} className="items-center mb-2.5">
                <View className={`w-11 h-11 rounded-full items-center justify-center ${b.active ? 'bg-[#FF6B00]' : 'bg-black/50'}`}>
                  <Ionicons name={b.icon as any} size={20} color="#fff" />
                </View>
                <Text className="text-white text-[10px] font-semibold mt-1">{b.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View className="flex-1" pointerEvents="box-none" />

        {/* Sohbet */}
        <View className="px-3 max-h-[220px] w-[78%]" pointerEvents="box-none">
          <FlatList
            data={reversedMessages}
            keyExtractor={(m) => m.id}
            inverted
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) =>
              item.kind === 'system' ? (
                <View className="bg-[#FF6B00]/85 self-start rounded-xl px-3 py-1.5 mb-1.5">
                  <Text className="text-white text-[13px] font-bold">{item.message}</Text>
                </View>
              ) : (
                <View className="bg-black/40 self-start rounded-xl px-3 py-1.5 mb-1.5 max-w-full">
                  <Text className="text-[13px]">
                    <Text className={`font-bold ${item.user_id === stream.host_id ? 'text-[#FF6B00]' : 'text-zinc-300'}`}>
                      {usernames.current[item.user_id] ?? '...'}
                      {item.user_id === stream.host_id ? ' (satıcı)' : ''}{' '}
                    </Text>
                    <Text className="text-white">{item.message}</Text>
                  </Text>
                </View>
              )
            }
          />
        </View>

        {/* Sohbet girişi */}
        <View className="flex-row items-center px-3 mt-2">
          <View className="flex-1 h-11 bg-black/50 border border-white/15 rounded-full flex-row items-center px-4">
            <TextInput
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Bir şey yaz..."
              placeholderTextColor="#D1D5DB"
              className="flex-1 text-white"
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              maxLength={300}
            />
            <TouchableOpacity onPress={sendMessage}>
              <Ionicons name="send" size={18} color="#FF6B00" />
            </TouchableOpacity>
          </View>
          {!isHost && (
            <TouchableOpacity onPress={() => setShopOpen(true)} className="w-11 h-11 rounded-full bg-black/50 items-center justify-center ml-2">
              <Ionicons name="bag-handle-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Mezat çubuğu */}
        <View style={{ paddingBottom: insets.bottom + 8 }} className="bg-black/85 mt-3 rounded-t-3xl px-3 pt-3">
          {auction && auctionProduct ? (
            <View className="flex-row items-center">
              <View className="w-16 h-16 rounded-xl bg-[#1A1A1A] overflow-hidden mr-3">
                {auctionProduct.images?.[0] ? (
                  <Image source={{ uri: auctionProduct.images[0] }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons name="image-outline" size={22} color="#6B7280" />
                  </View>
                )}
              </View>
              <View className="flex-1 mr-2">
                <Text className="text-white font-bold" numberOfLines={1}>
                  {auctionProduct.title}
                </Text>
                <Text className="text-[#FF6B00] font-black text-xl">{formatTL(auction.current_price)}</Text>
                <Text className={`text-xs font-semibold ${iAmWinning ? 'text-green-400' : 'text-zinc-400'}`} numberOfLines={1}>
                  {auction.bid_count === 0 ? 'Başlangıç fiyatı' : iAmWinning ? 'Kazanıyorsun! 🏆' : `@${winnerName ?? '...'} önde`}
                </Text>
              </View>
              <View className="items-center mr-2">
                <Text className={`font-black text-2xl ${remaining <= 5 ? 'text-red-500' : 'text-white'}`}>{remaining}</Text>
                <Text className="text-zinc-500 text-[10px]">saniye</Text>
              </View>
            </View>
          ) : (
            <Text className="text-zinc-400 text-center py-2">
              {isHost ? 'Bir ürün seçip mezatı başlat 👇' : 'Satıcı sıradaki ürünü hazırlıyor...'}
            </Text>
          )}

          <View className="flex-row mt-3">
            {isHost ? (
              auction ? (
                <Button
                  title="Mezatı iptal et"
                  variant="danger"
                  className="flex-1"
                  onPress={() =>
                    Alert.alert('Mezatı iptal et', 'Teklifler geçersiz sayılacak.', [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: 'İptal et', style: 'destructive', onPress: () => rpc('cancel_auction', { p_auction_id: auction.id }).catch(showError) },
                    ])
                  }
                />
              ) : (
                <Button title="Mezat başlat" icon="hammer" className="flex-1" onPress={() => setStartOpen(true)} />
              )
            ) : auction ? (
              <>
                <TouchableOpacity onPress={() => { setCustomAmount(String(nextBid)); setCustomOpen(true); }} className="h-14 px-5 rounded-2xl bg-[#222] border border-[#333] items-center justify-center mr-2">
                  <Text className="text-white font-bold">Özel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={bidding || iAmWinning || remaining === 0}
                  onPress={() => placeBid(nextBid)}
                  className={`flex-1 h-14 rounded-2xl items-center justify-center flex-row ${iAmWinning ? 'bg-green-600' : 'bg-[#FF6B00]'} ${remaining === 0 ? 'opacity-50' : ''}`}
                >
                  {bidding ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-black text-lg">{iAmWinning ? 'En yüksek teklif sende' : `Teklif ver · ${formatTL(nextBid)}`}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* SATILDI banner */}
      {sold && (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View className={`px-8 py-6 rounded-3xl border-4 ${sold.mine ? 'bg-green-700/90 border-green-300' : 'bg-black/85 border-[#FF6B00]'}`}>
            <Text className="text-white font-black text-4xl text-center">{sold.mine ? 'KAZANDIN! 🎉' : 'SATILDI! 🔨'}</Text>
            <Text className="text-white text-center mt-2 font-semibold">{sold.title}</Text>
            <Text className="text-[#FFB27A] text-center text-2xl font-black mt-1">{formatTL(sold.price)}</Text>
            {!sold.mine && sold.winner ? <Text className="text-zinc-300 text-center mt-1">@{sold.winner}</Text> : null}
            {sold.mine ? <Text className="text-white/90 text-center mt-2 text-xs">Siparişin Aktivite sekmesinde</Text> : null}
          </View>
        </View>
      )}

      {/* Özel teklif */}
      <Modal visible={customOpen} transparent animationType="fade" onRequestClose={() => setCustomOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/70 justify-end">
          <View className="bg-[#161616] rounded-t-3xl p-5" style={{ paddingBottom: insets.bottom + 16 }}>
            <Text className="text-white font-black text-xl mb-1">Özel teklif</Text>
            <Text className="text-zinc-400 mb-4">En az {formatTL(nextBid)} teklif verebilirsin. Teklifler bağlayıcıdır.</Text>
            <View className="flex-row items-center bg-[#1F1F1F] rounded-2xl px-4 h-16 mb-4 border border-[#2A2A2A]">
              <Text className="text-[#FF6B00] text-2xl font-black mr-2">₺</Text>
              <TextInput value={customAmount} onChangeText={(t) => setCustomAmount(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" autoFocus className="flex-1 text-white text-2xl font-black" />
            </View>
            <View className="flex-row">
              <Button title="Vazgeç" variant="secondary" className="flex-1 mr-2" onPress={() => setCustomOpen(false)} />
              <Button title="Teklif ver" className="flex-1" loading={bidding} onPress={() => placeBid(Number(customAmount))} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {isHost && <StartAuctionSheet visible={startOpen} onClose={() => setStartOpen(false)} streamId={stream.id} sellerId={stream.host_id} navigation={navigation} />}
      {!isHost && <ShopSheet visible={shopOpen} onClose={() => setShopOpen(false)} sellerId={stream.host_id} navigation={navigation} />}
    </View>
  );
};

// ---------- Görüntü yokken gösterilen bilgi ekranı ----------
const StatusOverlay = ({
  stream,
  icon,
  title,
  subtitle,
  loading,
  action,
}: {
  stream: Stream;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  loading?: boolean;
  action?: React.ReactNode;
}) => (
  <View style={StyleSheet.absoluteFill} className="items-center justify-center px-10">
    {stream.cover_url ? (
      <Image source={{ uri: stream.cover_url }} style={StyleSheet.absoluteFill} blurRadius={30} />
    ) : null}
    <LinearGradient colors={['rgba(42,22,7,0.92)', 'rgba(8,8,8,0.97)']} style={StyleSheet.absoluteFill} />
    <View className="items-center">
      <View className="p-1 rounded-full border-2 border-[#FF6B00]">
        <Avatar uri={stream.host?.avatar_url} name={stream.host?.username} size={84} />
      </View>
      <View className="flex-row items-center bg-white/10 px-4 py-2 rounded-full mt-5">
        {loading ? <ActivityIndicator color="#FF6B00" size="small" /> : <Ionicons name={icon ?? 'pause'} size={16} color="#FF6B00" />}
        <Text className="text-white font-bold ml-2">{title}</Text>
      </View>
      {subtitle ? <Text className="text-zinc-400 text-center mt-3 leading-5">{subtitle}</Text> : null}
      {action ? <View className="mt-6 w-64">{action}</View> : null}
    </View>
  </View>
);

// ---------- Yayıncı: mezat başlatma ----------
const StartAuctionSheet = ({ visible, onClose, streamId, sellerId, navigation }: { visible: boolean; onClose: () => void; streamId: string; sellerId: string; navigation: any }) => {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    supabase
      .from('products')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('status', 'active')
      .gt('quantity', 0)
      .order('created_at', { ascending: false })
      .then(({ data }) => setProducts((data as Product[]) ?? []));
  }, [visible, sellerId]);

  const start = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await rpc('start_auction', { p_stream_id: streamId, p_product_id: selected.id, p_start_price: Number(price), p_duration_sec: duration });
      onClose();
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/60 justify-end">
        <View className="bg-[#161616] rounded-t-3xl pt-4 max-h-[80%]" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="flex-row items-center justify-between px-5 mb-3">
            <Text className="text-white font-black text-xl">{selected ? 'Mezat ayarları' : 'Ürün seç'}</Text>
            <TouchableOpacity onPress={selected ? () => setSelected(null) : onClose}>
              <Ionicons name={selected ? 'arrow-back' : 'close'} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          {!selected ? (
            <ScrollView className="px-5">
              {products.length === 0 ? (
                <View className="items-center py-10">
                  <Text className="text-zinc-400 mb-4">Mezata çıkarılabilecek ürünün yok.</Text>
                  <Button title="Ürün ekle" icon="add" onPress={() => { onClose(); navigation.navigate('ProductForm'); }} />
                </View>
              ) : (
                products.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => { setSelected(p); setPrice(String(Math.max(1, Number(p.starting_price ?? 1)))); }}
                    className="flex-row items-center bg-[#1F1F1F] rounded-2xl p-3 mb-2"
                  >
                    <View className="w-14 h-14 rounded-xl bg-[#2A2A2A] overflow-hidden mr-3">
                      {p.images?.[0] ? <Image source={{ uri: p.images[0] }} style={{ width: '100%', height: '100%' }} /> : null}
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-bold" numberOfLines={1}>{p.title}</Text>
                      <Text className="text-zinc-400 text-xs">Başlangıç: {formatTL(p.starting_price)} · Stok: {p.quantity}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                  </TouchableOpacity>
                ))
              )}
              <TouchableOpacity onPress={() => { onClose(); navigation.navigate('ProductForm'); }} className="py-4 items-center">
                <Text className="text-[#FF6B00] font-bold">+ Yeni ürün ekle</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View className="px-5">
              <Text className="text-white font-bold mb-4">{selected.title}</Text>
              <Text className="text-zinc-400 text-xs font-bold uppercase mb-2">Başlangıç fiyatı (₺)</Text>
              <TextInput value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" className="bg-[#1F1F1F] border border-[#2A2A2A] rounded-2xl h-14 px-4 text-white text-xl font-bold mb-4" />
              <Text className="text-zinc-400 text-xs font-bold uppercase mb-2">Süre</Text>
              <View className="flex-row mb-5">
                {AUCTION_DURATIONS.map((d) => (
                  <TouchableOpacity key={d} onPress={() => setDuration(d)} className={`flex-1 h-12 rounded-xl items-center justify-center mr-2 ${duration === d ? 'bg-[#FF6B00]' : 'bg-[#1F1F1F]'}`}>
                    <Text className="text-white font-bold">{d} sn</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className="text-zinc-500 text-xs mb-4">Son 10 saniyede gelen her teklif süreyi 10 saniyeye uzatır.</Text>
              <Button title="Mezatı başlat" icon="hammer" loading={loading} disabled={!Number(price)} onPress={start} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ---------- İzleyici: satıcının mağazası ----------
const ShopSheet = ({ visible, onClose, sellerId, navigation }: { visible: boolean; onClose: () => void; sellerId: string; navigation: any }) => {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    if (!visible) return;
    supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('seller_id', sellerId)
      .in('status', ['active', 'in_auction'])
      .order('created_at', { ascending: false })
      .then(({ data }) => setProducts((data as Product[]) ?? []));
  }, [visible, sellerId]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1 bg-black/50" />
      <View className="bg-[#161616] rounded-t-3xl pt-4 max-h-[65%]" style={{ paddingBottom: insets.bottom + 12 }}>
        <Text className="text-white font-black text-xl px-5 mb-3">Satıcının ürünleri</Text>
        <ScrollView className="px-5">
          {products.length === 0 ? <Text className="text-zinc-400 py-6 text-center">Henüz ürün yok.</Text> : null}
          {products.map((p) => (
            <TouchableOpacity key={p.id} onPress={() => { onClose(); navigation.navigate('ProductDetail', { productId: p.id }); }} className="flex-row items-center bg-[#1F1F1F] rounded-2xl p-3 mb-2">
              <View className="w-14 h-14 rounded-xl bg-[#2A2A2A] overflow-hidden mr-3">
                {p.images?.[0] ? <Image source={{ uri: p.images[0] }} style={{ width: '100%', height: '100%' }} /> : null}
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold" numberOfLines={1}>{p.title}</Text>
                <Text className="text-[#FF6B00] font-bold">
                  {p.status === 'in_auction' ? 'Şu an mezatta' : p.buy_now_price ? `Hemen al · ${formatTL(p.buy_now_price)}` : `Mezat · ${formatTL(p.starting_price)}`}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};
