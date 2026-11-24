import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';

/** Supabase/Postgres hata mesajını kullanıcıya gösterilecek Türkçe metne çevirir */
export const errorMessage = (e: any): string => {
  const msg: string = e?.message || e?.error_description || String(e ?? 'Bilinmeyen hata');
  if (msg.includes('ADRES_GEREKLI')) return 'Önce bir teslimat adresi eklemelisiniz.';
  if (msg.includes('Invalid login credentials')) return 'E-posta veya şifre hatalı.';
  if (msg.includes('User already registered')) return 'Bu e-posta ile zaten bir hesap var.';
  if (msg.includes('Email not confirmed')) return 'E-posta adresinizi onaylamanız gerekiyor. Gelen kutunuzu kontrol edin.';
  if (msg.includes('Password should be')) return 'Şifre en az 6 karakter olmalı.';
  if (msg.includes('duplicate key') && msg.includes('username')) return 'Bu kullanıcı adı alınmış.';
  if (msg.includes('profiles_username_format')) return 'Kullanıcı adı 3-24 karakter; küçük harf, rakam, _ ve . içerebilir.';
  if (msg.includes('Network request failed')) return 'İnternet bağlantınızı kontrol edin.';
  return msg;
};

export const showError = (e: any, title = 'Hata') => Alert.alert(title, errorMessage(e));

export async function rpc<T = any>(fn: string, args?: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

/** Galeriden görsel seçer, kullanıcının klasörüne yükler ve herkese açık URL döner */
export async function pickAndUploadImage(userId: string, folder: string, aspect?: [number, number]): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('İzin gerekli', 'Fotoğraf seçmek için galeri izni vermelisiniz.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: !!aspect,
    aspect,
    quality: 0.7,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]?.base64) return null;
  return uploadBase64(userId, folder, result.assets[0].base64, result.assets[0].mimeType);
}

export async function uploadBase64(userId: string, folder: string, base64: string, mimeType?: string | null) {
  const contentType = mimeType || 'image/jpeg';
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, decode(base64), { contentType, upsert: false });
  if (error) throw error;
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

export const STREAM_SELECT = '*, host:profiles!live_streams_host_id_fkey(id, username, avatar_url, full_name)';
export const PRODUCT_SELECT = '*, seller:profiles!products_seller_id_fkey(id, username, avatar_url)';
