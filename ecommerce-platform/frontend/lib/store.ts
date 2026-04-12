/**
 * Zustand global store — auth state + cart state
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, Cart, UserProfile } from '../../shared/types';
import { tokenStorage } from './api';

// ── Auth Store ────────────────────────────────────────────────
interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setAuth: (tokens: AuthTokens, profile?: UserProfile) => void;
  setProfile: (profile: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isAdmin: false,
      setAuth: (tokens, profile) => {
        tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
        set({
          tokens,
          user: profile ?? null,
          isAuthenticated: true,
          isAdmin: tokens.role === 'ADMIN',
        });
      },
      setProfile: (profile) => set({ user: profile }),
      logout: () => {
        tokenStorage.clear();
        set({ user: null, tokens: null, isAuthenticated: false, isAdmin: false });
      },
    }),
    {
      name: 'auth-store',
      partialize: (s) => ({ tokens: s.tokens, user: s.user }),
    },
  ),
);

// ── Cart Store ────────────────────────────────────────────────
interface CartState {
  cart: Cart | null;
  isOpen: boolean;
  setCart: (cart: Cart | null) => void;
  openCart: () => void;
  closeCart: () => void;
}

export const useCartStore = create<CartState>()((set) => ({
  cart: null,
  isOpen: false,
  setCart: (cart) => set({ cart }),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
}));

// ── UI Store ─────────────────────────────────────────────────
interface UIState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
