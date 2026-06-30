import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  user: { email?: string; name?: string } | null;
  login: (userData?: { email?: string; name?: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false, // Default is false for testing
  user: null,
  login: (userData) => set({ isAuthenticated: true, user: userData || { name: 'TestUser', email: 'test@example.com' } }),
  logout: () => set({ isAuthenticated: false, user: null }),
}));
