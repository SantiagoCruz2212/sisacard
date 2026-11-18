import { loginApi } from '@/features/auth/apis/auth-api';
import { useAuthSubmit } from '@/features/auth/hooks/use-auth-submit';

export const useLogin = () => useAuthSubmit(loginApi);
