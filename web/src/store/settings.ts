import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type StoreInfo = {
  id: string;
  name: string;
  currency: string;
  phone?: string | null;
  address?: string | null;
};

type State = {
  store: StoreInfo | null;
  // For SUPER_ADMIN viewing all-stores aggregated view, default currency to display
  defaultCurrency: string;
  setStore: (s: StoreInfo | null) => void;
  setDefaultCurrency: (c: string) => void;
};

export const useSettings = create<State>()(
  persist(
    (set) => ({
      store: null,
      defaultCurrency: 'IQD',
      setStore: (store) => set({ store }),
      setDefaultCurrency: (defaultCurrency) => set({ defaultCurrency }),
    }),
    { name: 'settings-store' },
  ),
);

export function useCurrency(): string {
  return useSettings((s) => s.store?.currency || s.defaultCurrency || 'IQD');
}
