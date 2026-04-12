import { create } from 'zustand';
import type { AuthTokens, Cart, UserProfile } from '../../shared/types';
import { tokenStorage } from './api';

interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  setAuth: (tokens: AuthTokens, profile?: UserProfile) => void;
  setProfile: (p: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  setAuth: async (tokens, profile) => {
    await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
    set({ tokens, user: profile ?? null, isAuthenticated: true });
  },
  setProfile: (user) => set({ user }),
  logout: async () => {
    await tokenStorage.clear();
    set({ user: null, tokens: null, isAuthenticated: false });
  },
}));

interface CartState {
  cart: Cart | null;
  setCart: (c: Cart | null) => void;
}

export const useCartStore = create<CartState>()((set) => ({
  cart: null,
  setCart: (cart) => set({ cart }),
}));
