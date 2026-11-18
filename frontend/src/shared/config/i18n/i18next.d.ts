import type { es } from '@/shared/config/i18n/es';

// Claves tipadas: t('clave.inexistente') es un error de compilación.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof es };
  }
}
