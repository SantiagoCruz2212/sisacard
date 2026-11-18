import { registerApi } from '@/features/auth/apis/auth-api';
import { useAuthSubmit } from '@/features/auth/hooks/use-auth-submit';

export const useRegister = () => useAuthSubmit(registerApi);
