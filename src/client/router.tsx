'use client';

// Navigation helpers on top of next/navigation, so views share one small API.

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export { default as Link } from 'next/link';

/** Current path and query. Components that call this must render inside <Suspense>. */
export function useLocation(): { path: string; query: URLSearchParams } {
  const path = usePathname();
  const query = useSearchParams();
  return { path, query: new URLSearchParams(query.toString()) };
}

export function useNavigate(): (href: string) => void {
  const router = useRouter();
  return (href) => router.push(href);
}

/**
 * Update query parameters in place (filters, tabs). `null` or '' removes a key.
 * Uses the History API, which Next keeps in sync with useSearchParams, so filter
 * changes are instant and never hit the server.
 */
export function setQuery(patch: Record<string, string | null>): void {
  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === '') params.delete(k);
    else params.set(k, v);
  }
  const qs = params.toString();
  window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
}
