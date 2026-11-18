import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PrivacyState {
  /** Oculta tus cartas (UNO) y tu palabra y rol (Impostor). Solo afecta a tu pantalla. */
  hidden: boolean;
  toggle: () => void;
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({ hidden: false, toggle: () => set((s) => ({ hidden: !s.hidden })) }),
    { name: 'sisacard-privacy' },
  ),
);
