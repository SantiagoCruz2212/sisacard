import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/config/i18n';
import { queryClient } from '@/shared/config/query-client';
import { ErrorBoundary } from '@/shared/ui/error-boundary';
import { Toast } from '@/shared/ui/feedback';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toast />
        </QueryClientProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}
