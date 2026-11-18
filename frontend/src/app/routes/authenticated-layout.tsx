import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useConnected, useCurrentRoom } from '@/shared/hooks/use-realtime';
import { useSession } from '@/shared/hooks/use-session';
import { installAudioUnlock } from '@/shared/lib/sound-effects';
import { connectRealtime, disconnectRealtime } from '@/shared/lib/realtime/socket-client';
import { ConnectionBanner } from '@/shared/ui/feedback';

/** Mantiene el WebSocket abierto mientras haya sesión y lleva a la sala cuando el jugador entra a una. */
export function AuthenticatedLayout() {
  const { token } = useSession();
  const connected = useConnected();
  const room = useCurrentRoom();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!token) return;
    connectRealtime(token);
    return disconnectRealtime;
  }, [token]);

  // El navegador solo deja sonar la campana después de la primera interacción.
  useEffect(() => installAudioUnlock(), []);

  useEffect(() => {
    if (room && pathname !== '/room') navigate('/room', { replace: true });
    if (!room && pathname === '/room') navigate('/', { replace: true });
  }, [room, pathname, navigate]);

  return (
    <>
      <ConnectionBanner connected={connected} />
      <Outlet />
    </>
  );
}
