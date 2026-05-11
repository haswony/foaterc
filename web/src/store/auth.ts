import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'SUPER_ADMIN' | 'STORE_OWNER' | 'STAFF';
export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  storeId: string | null;
};

type State = {
  token: string | null;
  user: User | null;
  // For SUPER_ADMIN, this lets them pick a store to scope into.
  activeStoreId: string | null;
  setAuth: (token: string, user: User) => void;
  setActiveStoreId: (id: string | null) => void;
  logout: () => void;
};

export const useAuthStore = create<State>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      activeStoreId: null,
      setAuth: (token, user) =>
        set({ token, user, activeStoreId: user.storeId ?? null }),
      setActiveStoreId: (id) => set({ activeStoreId: id }),
      logout: () => set({ token: null, user: null, activeStoreId: null }),
    }),
    { name: 'auth-store' },
  ),
);
