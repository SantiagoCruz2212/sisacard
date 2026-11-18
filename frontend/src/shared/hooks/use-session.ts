import { useSessionStore } from '@/shared/lib/session-store';

export function useSession() {
  const user = useSessionStore((s) => s.user);
  const token = useSessionStore((s) => s.token);
  const clear = useSessionStore((s) => s.clear);
  return { user, token, isAuthenticated: Boolean(token && user), logout: clear };
}
