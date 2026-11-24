import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';

/** Okunmamış birebir mesaj sayısı (RLS sayesinde sadece kullanıcının sohbetleri sayılır) */
export const useUnreadMessages = () => {
  const uid = useAuthStore((s) => s.user?.id);
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!uid) return;
    const { count: c } = await supabase
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', uid)
      .is('read_at', null);
    setCount(c ?? 0);
  }, [uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`dm-count-${uid}-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, load]);

  return count;
};
