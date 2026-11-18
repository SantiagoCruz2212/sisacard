import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCharacterEditor } from '@/features/character/hooks/use-character-editor';
import { useSessionStore } from '@/shared/lib/session-store';
import { DEFAULT_HUMAN, type Avatar } from '@/shared/models/avatar';

let stored: Avatar = { ...DEFAULT_HUMAN, sex: 'male', beard: 'goatee', hat: 'crown' };

vi.mock('@/features/character/apis/character-api', () => ({
  fetchMyAvatar: () => Promise.resolve(stored),
  saveMyAvatar: (a: Avatar) => Promise.resolve(a),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

async function load() {
  const hook = renderHook(() => useCharacterEditor(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe('useCharacterEditor', () => {
  beforeEach(() => {
    useSessionStore.setState({ token: 't', user: { id: 'u1', username: 'Santi' } });
    stored = { ...DEFAULT_HUMAN, sex: 'male', beard: 'goatee', hat: 'crown' };
  });

  it('carga el personaje guardado y no hay cambios pendientes', async () => {
    const { result } = await load();
    expect(result.current.sex).toBe('male');
    expect(result.current.human?.beard).toBe('goatee');
    expect(result.current.isDirty).toBe(false);
  });

  it('editar un rasgo marca el personaje como modificado', async () => {
    const { result } = await load();
    act(() => result.current.change('hair', 'afro'));
    expect(result.current.human?.hair).toBe('afro');
    expect(result.current.isDirty).toBe(true);
  });

  it('al elegir no binario solo queda un vehículo (sin cuerpo humano)', async () => {
    const { result } = await load();
    act(() => result.current.setSex('nonbinary'));
    expect(result.current.human).toBeNull();
    expect(result.current.vehicle).toBe('apache');
    expect(result.current.draft).toEqual({ sex: 'nonbinary', vehicle: 'apache' });
    act(() => result.current.setVehicle('motorcycle'));
    expect(result.current.draft).toEqual({ sex: 'nonbinary', vehicle: 'motorcycle' });
  });

  it('al volver de no binario se recupera el personaje humano que se tenía', async () => {
    const { result } = await load();
    act(() => result.current.change('hair', 'mohawk'));
    act(() => result.current.setSex('nonbinary'));
    act(() => result.current.setSex('male'));
    expect(result.current.human).toMatchObject({ sex: 'male', hair: 'mohawk', beard: 'goatee', hat: 'crown' });
  });

  it('pasar a mujer quita la barba', async () => {
    const { result } = await load();
    act(() => result.current.setSex('female'));
    expect(result.current.human).toMatchObject({ sex: 'female', beard: 'none', hat: 'crown' });
  });

  it('si el personaje guardado ya es un vehículo, se abre en modo vehículo', async () => {
    stored = { sex: 'nonbinary', vehicle: 'motorcycle' };
    const { result } = await load();
    expect(result.current.vehicle).toBe('motorcycle');
    expect(result.current.human).toBeNull();
  });
});
