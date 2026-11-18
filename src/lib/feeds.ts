// The single entry point the API uses to read data. Each feed is cached; when every
// live source failed the result is cached only briefly so recovery is quick.

import { cached } from './cache';
import { loadNews } from './sources/news';
import { loadPapers } from './sources/papers';
import { loadTools } from './sources/tools';
import type { Feed, NewsItem, Paper, StatusReport, Tool } from './types';

const MIN = 60_000;
const ttl = (healthy: number) => (feed: Feed<unknown>) => (feed.meta.mode === 'live' ? healthy : feed.meta.mode === 'partial' ? 5 * MIN : MIN);

export const getNews = (): Promise<Feed<NewsItem>> => cached('news', ttl(10 * MIN), loadNews);
export const getTools = (): Promise<Feed<Tool>> => cached('tools', ttl(30 * MIN), loadTools);
export const getPapers = (): Promise<Feed<Paper>> => cached('papers', ttl(30 * MIN), () => loadPapers());

export async function getStatus(): Promise<StatusReport> {
  const [news, tools, papers] = await Promise.all([getNews(), getTools(), getPapers()]);
  const sources = [
    ...news.meta.sources.map((s) => ({ ...s, area: 'news' as const })),
    ...tools.meta.sources.map((s) => ({ ...s, area: 'tools' as const })),
    ...papers.meta.sources.map((s) => ({ ...s, area: 'papers' as const })),
  ];
  const live = sources.filter((s) => s.id !== 'curated');
  const ok = live.filter((s) => s.ok).length;
  return {
    mode: ok === live.length ? 'live' : ok === 0 ? 'sample' : 'partial',
    checkedAt: new Date().toISOString(),
    ok,
    total: live.length,
    sources,
  };
}
