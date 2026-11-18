import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/shared/lib/session-store';
import { credentialsSchema, type AuthResponse, type Credentials } from '@/features/auth/models/auth-schemas';

/** Formulario (RHF + Zod) + mutación + guardado de sesión. Lo comparten login y registro. */
export function useAuthSubmit(request: (credentials: Credentials) => Promise<AuthResponse>) {
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    mode: 'onChange',
    defaultValues: { username: '', pin: '' },
  });
  const mutation = useMutation({
    mutationFn: request,
    onSuccess: (response) => {
      setSession(response);
      navigate('/', { replace: true });
    },
  });
  return {
    form,
    submit: form.handleSubmit((values) => mutation.mutate(values)),
    error: mutation.error?.message,
    isPending: mutation.isPending,
  };
}
