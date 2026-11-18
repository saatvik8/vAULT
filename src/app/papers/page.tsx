import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageFallback } from '@/client/components/Shell';
import { PapersPage } from '@/client/views/Papers';

export const metadata: Metadata = { title: 'Papers' };

// The view reads filters from the query string, so it renders inside Suspense.
export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <PapersPage />
    </Suspense>
  );
}
