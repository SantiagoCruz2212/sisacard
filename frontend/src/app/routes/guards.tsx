import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '@/shared/hooks/use-session';

/** Rutas privadas: sin sesión se redirige al login (navegación SPA, sin recarga). */
export function AuthGuard() {
  const { isAuthenticated } = useSession();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

/** Login y registro: si ya hay sesión se manda al lobby. */
export function GuestGuard() {
  const { isAuthenticated } = useSession();
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}
