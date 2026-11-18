// Hacker News via the public Algolia search API (no key required).
// Docs: https://hn.algolia.com/api

import { fetchJson } from '../http';

export interface HnHit {
  objectID: string;
  title?: string | null;
  url?: string | null;
  points?: number | null;
  num_comments?: number | null;
  created_at?: string;
  story_text?: string | null;
}

interface HnResponse {
  hits?: HnHit[];
}

export const hnItemUrl = (id: string) => `https://news.ycombinator.com/item?id=${id}`;

/**
 * Algolia ANDs the words of a query, so "any of these terms" needs one request per
 * term. Results are merged and de-duplicated by story id.
 */
export async function searchHn(opts: {
  tag: 'story' | 'show_hn';
  terms: string[];
  minPoints: number;
  sinceDays: number;
  perTerm?: number;
}): Promise<HnHit[]> {
  const since = Math.floor(Date.now() / 1000) - opts.sinceDays * 86400;
  const results = await Promise.allSettled(
    opts.terms.map((term) =>
      fetchJson<HnResponse>(
        'https://hn.algolia.com/api/v1/search_by_date?' +
          new URLSearchParams({
            tags: opts.tag,
            query: term,
            numericFilters: `points>${opts.minPoints},created_at_i>${since}`,
            hitsPerPage: String(opts.perTerm ?? 40),
          }),
      ),
    ),
  );
  const ok = results.filter((r): r is PromiseFulfilledResult<HnResponse> => r.status === 'fulfilled');
  if (ok.length === 0) throw (results[0] as PromiseRejectedResult).reason;

  const byId = new Map<string, HnHit>();
  for (const r of ok) for (const hit of r.value.hits ?? []) if (hit?.objectID) byId.set(hit.objectID, hit);
  return [...byId.values()];
}
