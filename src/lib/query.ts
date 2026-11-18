// Pure filtering, sorting and search. Runs on the server (API params) and in the
// browser (instant filter changes without another request).

import type { NewsItem, Paper, Pricing, SearchResults, Tool, ToolCategory, Topic } from './types';

const time = (iso?: string) => (iso ? Date.parse(iso) || 0 : 0);
export const discussion = (n: { points?: number; comments?: number }) => (n.points ?? 0) + 2 * (n.comments ?? 0);

export type NewsSort = 'newest' | 'discussed';

export function queryNews(items: NewsItem[], opts: { topic?: Topic | null; sort?: NewsSort }): NewsItem[] {
  const filtered = opts.topic ? items.filter((n) => n.topics.includes(opts.topic!)) : [...items];
  return filtered.sort((a, b) =>
    opts.sort === 'discussed'
      ? discussion(b) - discussion(a) || time(b.publishedAt) - time(a.publishedAt)
      : time(b.publishedAt) - time(a.publishedAt),
  );
}

export type ToolView = 'popular' | 'new';

export function queryTools(
  items: Tool[],
  opts: { view?: ToolView; category?: ToolCategory | null; pricing?: Pricing | null; q?: string },
): Tool[] {
  const view = opts.view ?? 'popular';
  const tokens = tokenize(opts.q ?? '');
  const filtered = items.filter(
    (t) =>
      (view === 'new' ? t.origin === 'launch' : t.origin === 'curated') &&
      (!opts.category || t.category === opts.category) &&
      (!opts.pricing || t.pricing === opts.pricing) &&
      matches(`${t.name} ${t.tagline} ${t.category}`, tokens),
  );
  // Popular keeps the curated editorial order; New is newest first.
  return view === 'new' ? filtered.sort((a, b) => time(b.addedAt) - time(a.addedAt)) : filtered;
}

export type PaperView = 'trending' | 'latest';

export function queryPapers(items: Paper[], opts: { view?: PaperView; signalOnly?: boolean }): Paper[] {
  if ((opts.view ?? 'trending') === 'trending') {
    return items.filter((p) => (p.upvotes ?? 0) + (p.comments ?? 0) > 0).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
  const list = opts.signalOnly ? items.filter((p) => (p.upvotes ?? 0) > 0) : [...items];
  return list.sort((a, b) => time(b.publishedAt) - time(a.publishedAt));
}

export function tokenize(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean);
}

export function matches(haystack: string, tokens: string[]): boolean {
  const h = haystack.toLowerCase();
  return tokens.every((t) => h.includes(t));
}

function rank<T>(items: T[], tokens: string[], title: (t: T) => string, body: (t: T) => string, when: (t: T) => number, limit: number): T[] {
  return items
    .map((item) => {
      const tl = title(item).toLowerCase();
      if (!matches(`${tl} ${body(item)}`, tokens)) return null;
      const score = tokens.reduce((s, t) => s + (tl.includes(t) ? 3 : 1), 0);
      return { item, score };
    })
    .filter((x): x is { item: T; score: number } => x !== null)
    .sort((a, b) => b.score - a.score || when(b.item) - when(a.item))
    .slice(0, limit)
    .map((x) => x.item);
}

export function searchAll(q: string, data: { news: NewsItem[]; tools: Tool[]; papers: Paper[] }, limit = 6): SearchResults {
  const tokens = tokenize(q);
  if (tokens.length === 0) return { query: q, news: [], tools: [], papers: [] };
  return {
    query: q,
    news: rank(data.news, tokens, (n) => n.title, (n) => `${n.summary} ${n.source}`, (n) => time(n.publishedAt), limit),
    tools: rank(data.tools, tokens, (t) => t.name, (t) => `${t.tagline} ${t.category}`, (t) => time(t.addedAt), limit),
    papers: rank(data.papers, tokens, (p) => p.title, (p) => `${p.summary} ${p.authors.join(' ')}`, (p) => time(p.publishedAt), limit),
  };
}
