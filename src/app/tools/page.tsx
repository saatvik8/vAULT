import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageFallback } from '@/client/components/Shell';
import { ToolsPage } from '@/client/views/Tools';

export const metadata: Metadata = { title: 'Tools' };

// The view reads filters from the query string, so it renders inside Suspense.
export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <ToolsPage />
    </Suspense>
  );
}
