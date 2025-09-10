'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import LoadingProvider, { useLoading } from './providers/LoadingProvider';
import { setGlobalLoadingFunctions } from '../utils/api';

function ApiConnector({ children }: { children: React.ReactNode }) {
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    setGlobalLoadingFunctions({ startLoading, stopLoading });
  }, [startLoading, stopLoading]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <ApiConnector>
          {children}
        </ApiConnector>
      </LoadingProvider>
    </QueryClientProvider>
  );
}

