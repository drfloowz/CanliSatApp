import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Product, Stream } from '../types';
import { Avatar } from './ui';
import { formatSchedule, formatTL } from '../lib/format';
import { categoryLabel } from '../lib/constants';

export const StreamCard = ({
  stream,
  onPress,
  width,
  reminded,
  onRemind,
}: {
  stream: Stream;
  onPress: () => void;
  width: number;
  reminded?: boolean;
  onRemind?: () => void;
}) => {
  const isLive = stream.status === 'live';
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ width }} className="mb-4">
      <View style={{ width, height: width * 1.35 }} className="rounded-2xl overflow-hidden bg-[#1A1A1A]">
        {stream.cover_url ? (
          <Image source={{ uri: stream.cover_url }} style={{ width: '100%', height: '100%' }} />
        ) : (
          // NativeWind className'i LinearGradient'e uygulanmıyor; hizalama style ile verilmeli
          <LinearGradient colors={['#2A1607', '#0E0E0E']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View className="w-16 h-16 rounded-full bg-[#FF6B00]/15 items-center justify-center mb-10">
              <Ionicons name="videocam" size={30} color="#FF6B00" />
            </View>
          </LinearGradient>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' }} />
        <View className="absolute top-2 left-2 right-2 flex-row justify-between">
          {isLive ? (
            <View className="bg-red-600 rounded-md px-2 py-1 flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-white mr-1" />
              <Text className="text-white text-[11px] font-extrabold">CANLI</Text>
            </View>
          ) : (
            <View className="bg-black/70 rounded-md px-2 py-1">
              <Text className="text-white text-[11px] font-bold">{formatSchedule(stream.scheduled_at)}</Text>
            </View>
          )}
          {isLive && (
            <View className="bg-black/60 rounded-md px-2 py-1 flex-row items-center">
              <Ionicons name="eye" size={11} color="#fff" />
              <Text className="text-white text-[11px] font-bold ml-1">{stream.viewer_count}</Text>
            </View>
          )}
        </View>
        <View className="absolute bottom-0 left-0 right-0 p-3">
          <View className="flex-row items-center mb-1.5">
            <Avatar uri={stream.host?.avatar_url} name={stream.host?.username} size={20} />
            <Text className="text-white text-xs font-semibold ml-1.5 flex-1" numberOfLines={1}>
              {stream.host?.username}
            </Text>
          </View>
          <Text className="text-white font-bold text-sm" numberOfLines={2}>
            {stream.title}
          </Text>
          {stream.category ? <Text className="text-[#FF6B00] text-xs font-bold mt-1">{categoryLabel(stream.category)}</Text> : null}
          {!isLive && onRemind ? (
            <TouchableOpacity
              onPress={onRemind}
              className={`mt-2 h-8 rounded-full items-center justify-center flex-row ${reminded ? 'bg-white/15' : 'bg-[#FF6B00]'}`}
            >
              <Ionicons name={reminded ? 'notifications' : 'notifications-outline'} size={14} color="#fff" />
              <Text className="text-white text-xs font-bold ml-1">{reminded ? 'Hatırlatılacak' : 'Hatırlat'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const ProductCard = ({ product, onPress, width }: { product: Product; onPress: () => void; width: number }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ width }} className="mb-4">
    <View style={{ width, height: width }} className="rounded-2xl overflow-hidden bg-[#1A1A1A]">
      {product.images?.[0] ? (
        <Image source={{ uri: product.images[0] }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="image-outline" size={32} color="#4B5563" />
        </View>
      )}
      {product.status === 'in_auction' && (
        <View className="absolute top-2 left-2 bg-red-600 rounded-md px-2 py-1">
          <Text className="text-white text-[10px] font-extrabold">MEZATTA</Text>
        </View>
      )}
      {product.status === 'sold' && (
        <View className="absolute inset-0 bg-black/60 items-center justify-center">
          <Text className="text-white font-extrabold">SATILDI</Text>
        </View>
      )}
    </View>
    <Text className="text-white font-semibold text-sm mt-2" numberOfLines={1}>
      {product.title}
    </Text>
    {product.seller?.username ? <Text className="text-zinc-500 text-xs">@{product.seller.username}</Text> : null}
    <Text className="text-[#FF6B00] font-extrabold text-base mt-0.5">
      {product.buy_now_price ? formatTL(product.buy_now_price) : `Mezat · ${formatTL(product.starting_price)}`}
    </Text>
  </TouchableOpacity>
);
