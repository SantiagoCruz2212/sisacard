import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppUser } from '@/shared/models/realtime';

interface SessionState {
  token: string | null;
  user: AppUser | null;
  setSession: (session: { token: string; user: AppUser }) => void;
  clear: () => void;
}

/** Sesión del usuario. Vive en shared porque la usan varios features (guard, header, realtime, http). */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: ({ token, user }) => set({ token, user }),
      clear: () => set({ token: null, user: null }),
    }),
    { name: 'sisacard-session', partialize: (s) => ({ token: s.token, user: s.user }) },
  ),
);
