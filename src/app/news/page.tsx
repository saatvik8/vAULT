import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageFallback } from '@/client/components/Shell';
import { NewsPage } from '@/client/views/News';

export const metadata: Metadata = { title: 'News' };

// The view reads filters from the query string, so it renders inside Suspense.
export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <NewsPage />
    </Suspense>
  );
}
