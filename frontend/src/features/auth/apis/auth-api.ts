import { http } from '@/shared/lib/http';
import type { AuthResponse, Credentials } from '@/features/auth/models/auth-schemas';

export const loginApi = (credentials: Credentials) =>
  http<AuthResponse>('/api/auth/login', { body: credentials, auth: false });

export const registerApi = (credentials: Credentials) =>
  http<AuthResponse>('/api/auth/register', { body: credentials, auth: false });
