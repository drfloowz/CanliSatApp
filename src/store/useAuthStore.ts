import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type { Profile } from '../types';

interface AuthState {
  ready: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  initialize: () => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

let initialized = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  ready: false,
  isAuthenticated: false,
  session: null,
  user: null,
  profile: null,

  initialize: () => {
    if (initialized) return;
    initialized = true;

    const apply = async (session: Session | null) => {
      set({ session, isAuthenticated: !!session, user: session?.user ?? null });
      if (session) await get().refreshProfile();
      else set({ profile: null });
      set({ ready: true });
    };

    supabase.auth.getSession().then(({ data: { session } }) => apply(session));
    supabase.auth.onAuthStateChange((_event, session) => {
      // onAuthStateChange içinde await yapılmamalı (supabase-js kilitlenmesi)
      setTimeout(() => apply(session), 0);
    });
  },

  refreshProfile: async () => {
    const uid = get().user?.id;
    if (!uid) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (data) set({ profile: data as Profile });
  },

  logout: async () => {
    await supabase.auth.signOut();
  },
}));

useAuthStore.getState().initialize();
