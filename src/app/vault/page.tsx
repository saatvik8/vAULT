import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageFallback } from '@/client/components/Shell';
import { VaultPage } from '@/client/views/Vault';

export const metadata: Metadata = { title: 'My Vault' };

// The view reads filters from the query string, so it renders inside Suspense.
export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <VaultPage />
    </Suspense>
  );
}
