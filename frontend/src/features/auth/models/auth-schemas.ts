import { z } from 'zod';
import type { AppUser } from '@/shared/models/realtime';

// El mensaje de cada regla es una clave i18n (se traduce en la vista).
export const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, 'auth.errors.username')
    .max(16, 'auth.errors.username')
    .regex(/^[\p{L}\p{N}_-]+$/u, 'auth.errors.username'),
  pin: z.string().regex(/^\d{4}$/, 'auth.errors.pin'),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export interface AuthResponse {
  token: string;
  user: AppUser;
}
