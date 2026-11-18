// API handlers in the web-standard `(Request) => Response` shape. Each is re-exported
// as GET from src/app/api/<name>/route.ts.

import { getNews, getPapers, getStatus, getTools } from '../lib/feeds';
import { queryNews, queryPapers, queryTools, searchAll, type NewsSort, type PaperView, type ToolView } from '../lib/query';
import { TOOL_CATEGORIES, TOPICS, type Pricing, type ToolCategory, type Topic } from '../lib/types';

type Handler = (req: Request) => Promise<Response>;

function json(body: unknown, init: { status?: number; maxAge?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': init.maxAge ? `public, max-age=${init.maxAge}, stale-while-revalidate=${init.maxAge * 5}` : 'no-store',
    },
  });
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** Feed loaders never throw (they fall back to sample data), but guard anyway. */
function safe(handler: Handler): Handler {
  return async (req) => {
    try {
      return await handler(req);
    } catch (err) {
      console.error('[api]', new URL(req.url).pathname, err);
      return json({ error: 'Something went wrong loading this feed.' }, { status: 500 });
    }
  };
}

export const news: Handler = safe(async (req) => {
  const p = new URL(req.url).searchParams;
  const feed = await getNews();
  const items = queryNews(feed.items, {
    topic: oneOf<Topic>(p.get('topic'), TOPICS),
    sort: oneOf<NewsSort>(p.get('sort'), ['newest', 'discussed']) ?? 'newest',
  });
  return json({ items, meta: feed.meta }, { maxAge: 60 });
});

export const tools: Handler = safe(async (req) => {
  const p = new URL(req.url).searchParams;
  const feed = await getTools();
  // Without a `view` param the whole directory is returned so the client can filter locally.
  const view = oneOf<ToolView>(p.get('view'), ['popular', 'new']);
  const items = view
    ? queryTools(feed.items, {
        view,
        category: oneOf<ToolCategory>(p.get('category'), TOOL_CATEGORIES),
        pricing: oneOf<Pricing>(p.get('pricing'), ['free', 'freemium', 'paid', 'unknown']),
        q: p.get('q') ?? '',
      })
    : feed.items;
  return json({ items, meta: feed.meta }, { maxAge: 60 });
});

export const papers: Handler = safe(async (req) => {
  const p = new URL(req.url).searchParams;
  const feed = await getPapers();
  const view = oneOf<PaperView>(p.get('view'), ['trending', 'latest']);
  const items = view ? queryPapers(feed.items, { view, signalOnly: p.get('signal') === '1' }) : feed.items;
  return json({ items, meta: feed.meta }, { maxAge: 60 });
});

export const search: Handler = safe(async (req) => {
  const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 100);
  const [n, t, p] = await Promise.all([getNews(), getTools(), getPapers()]);
  return json(searchAll(q, { news: n.items, tools: t.items, papers: p.items }), { maxAge: 30 });
});

export const status: Handler = safe(async () => json(await getStatus(), { maxAge: 30 }));

export const routes: Record<string, Handler> = {
  '/api/news': news,
  '/api/tools': tools,
  '/api/papers': papers,
  '/api/search': search,
  '/api/status': status,
};
