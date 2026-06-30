import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  isAuthenticated: boolean;
  isSigningUp: boolean;
  session: Session | null;
  role: string | null;
  user: User | null;
  setIsSigningUp: (value: boolean) => void;
  initialize: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isSigningUp: false,
  session: null,
  role: null,
  user: null,
  
  setIsSigningUp: (value) => set({ isSigningUp: value }),

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, isAuthenticated: !!session, user: session?.user || null });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      // Kayıt olma esnasındaysa otomatik girişi (state güncellemesini) engelle
      if (get().isSigningUp) return;
      set({ session, isAuthenticated: !!session, user: session?.user || null });
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
  },
}));

// Initialize the listener immediately
useAuthStore.getState().initialize();
