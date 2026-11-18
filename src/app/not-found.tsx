import type { Metadata } from 'next';
import Link from 'next/link';
import { Page } from '@/client/components/Shell';
import { EmptyState } from '@/client/components/ui';

export const metadata: Metadata = { title: 'Not found' };

export default function NotFound() {
  return (
    <Page>
      <div className="py-24">
        <EmptyState title="Page not found" hint="That address doesn’t exist in Vault.">
          <Link href="/" className="label inline-flex h-9 items-center rounded-none bg-ink px-5 text-bg">
            Back to Today
          </Link>
        </EmptyState>
      </div>
    </Page>
  );
}
