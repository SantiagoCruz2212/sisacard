import { useSessionStore } from '@/shared/lib/session-store';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Cliente HTTP único. Todas las peticiones pasan por el api-gateway (mismo origen). */
export async function http<T>(path: string, options: { body?: unknown; auth?: boolean; method?: 'GET' | 'POST' | 'PUT' } = {}): Promise<T> {
  const { token } = useSessionStore.getState();
  const res = await fetch(path, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.auth !== false && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    // Sesión vencida o inválida: se limpia y el guard redirige al login.
    if (res.status === 401 && options.auth !== false) useSessionStore.getState().clear();
    throw new ApiError(data.error ?? 'Error de red', res.status);
  }
  return data;
}
