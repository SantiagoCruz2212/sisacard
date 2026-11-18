import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginView } from '@/features/auth/views/login-view';
import { RegisterView } from '@/features/auth/views/register-view';
import { CharacterView } from '@/features/character/views/character-view';
import { LeaderboardView } from '@/features/leaderboard/views/leaderboard-view';
import { ProfileView } from '@/features/profile/views/profile-view';
import { AuthenticatedLayout } from '@/app/routes/authenticated-layout';
import { AuthGuard, GuestGuard } from '@/app/routes/guards';
import { LobbyRoute } from '@/app/routes/lobby-route';
import { RoomRoute } from '@/app/routes/room-route';

export const router = createBrowserRouter([
  {
    element: <GuestGuard />,
    children: [
      { path: '/login', element: <LoginView /> },
      { path: '/register', element: <RegisterView /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AuthenticatedLayout />,
        children: [
          { path: '/', element: <LobbyRoute /> },
          { path: '/profile', element: <ProfileView /> },
          { path: '/leaderboard', element: <LeaderboardView /> },
          { path: '/character', element: <CharacterView /> },
          { path: '/room', element: <RoomRoute /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
