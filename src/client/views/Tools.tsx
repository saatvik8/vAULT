'use client';

import { useEffect, useMemo, useState } from 'react';
import { queryTools, type ToolView } from '../../lib/query';
import { TOOL_CATEGORIES, type Feed, type Pricing, type Tool, type ToolCategory } from '../../lib/types';
import { useFeed } from '../api';
import { ToolCard } from '../components/cards';
import { Page } from '../components/Shell';
import { Chip, EmptyState, FeedBody, FeedNotice, PageHeader, ShowMore, Tabs, Updated, useNow } from '../components/ui';
import { setQuery, useLocation } from '../router';

const PAGE = 24;
const PRICINGS: Pricing[] = ['free', 'freemium', 'paid'];

export function ToolsPage() {
  const feed = useFeed<Feed<Tool>>('/api/tools');
  const { query } = useLocation();
  const now = useNow();

  const view: ToolView = query.get('view') === 'new' ? 'new' : 'popular';
  const category = (TOOL_CATEGORIES as readonly string[]).includes(query.get('category') ?? '') ? (query.get('category') as ToolCategory) : null;
  const pricing = (PRICINGS as string[]).includes(query.get('pricing') ?? '') ? (query.get('pricing') as Pricing) : null;
  const q = query.get('q') ?? '';
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [view, category, pricing, q]);

  const all = feed.data?.items ?? [];
  const items = useMemo(() => queryTools(all, { view, category, pricing, q }), [all, view, category, pricing, q]);
  const counts = useMemo(() => {
    const inView = queryTools(all, { view, pricing, q });
    const c = Object.fromEntries(TOOL_CATEGORIES.map((k) => [k, 0])) as Record<ToolCategory, number>;
    for (const t of inView) c[t.category]++;
    return { total: inView.length, by: c };
  }, [all, view, pricing, q]);

  const filtered = Boolean(category || pricing || q);
  const clear = () => setQuery({ category: null, pricing: null, q: null });

  return (
    <Page>
      <PageHeader eyebrow="03 · Tools" title="Tools" intro="A directory of AI tools: established products, and new launches as they appear on Show HN.">
        <Updated meta={feed.data?.meta} state={feed} />
      </PageHeader>

      <div className="flex flex-col gap-5 border-b border-line py-5 md:flex-row md:items-end md:justify-between">
        <Tabs
          label="View"
          value={view}
          onChange={(v) => setQuery({ view: v === 'popular' ? null : v, pricing: null })}
          options={[
            { value: 'popular', label: 'Popular' },
            { value: 'new', label: 'Newly added' },
          ]}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {view === 'popular' && (
            <div role="group" aria-label="Filter by pricing" className="flex gap-2">
              {PRICINGS.map((p) => (
                <Chip key={p} active={pricing === p} onClick={() => setQuery({ pricing: pricing === p ? null : p })}>
                  {p}
                </Chip>
              ))}
            </div>
          )}
          <label className="relative block">
            <span className="sr-only">Search tools</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQuery({ q: e.target.value })}
              placeholder="Filter tools…"
              className="h-9 w-full rounded-none border border-line bg-transparent px-4 text-sm text-ink placeholder:text-faint focus:border-faint sm:w-56"
            />
          </label>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[11rem_1fr] lg:gap-12">
        <nav aria-label="Categories" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-4 lg:sticky lg:top-20 lg:mx-0 lg:block lg:self-start lg:space-y-0.5 lg:overflow-visible lg:px-0 lg:py-8">
          <p className="label hidden pb-3 text-faint lg:block">Browse</p>
          {[null, ...TOOL_CATEGORIES].map((c) => {
            const active = category === c;
            const count = c ? counts.by[c] : counts.total;
            return (
              <button
                key={c ?? 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => setQuery({ category: c })}
                className={`label flex h-8 shrink-0 items-center justify-between gap-3 rounded-none border px-3 transition-colors duration-200 lg:h-9 lg:w-full lg:border-0 lg:border-l lg:px-4 ${
                  active ? 'border-ink bg-ink text-bg lg:border-accent lg:bg-transparent lg:text-accent' : 'border-line text-muted hover:text-ink'
                }`}
              >
                {c ?? 'All'}
                {feed.data && <span className={active ? 'opacity-70' : 'text-faint'}>{count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          <FeedBody state={feed} rows={5}>
            {(data) => (
              <>
                <FeedNotice meta={data.meta} hasSample={items.some((i) => i.sample)} />
                <p className="label mt-6 text-faint">
                  {view === 'popular'
                    ? 'Editor-curated list of established tools, in editorial order. Pricing is a snapshot; check the tool’s site.'
                    : 'AI launches from Show HN in the last 30 days, newest first. Pricing isn’t listed for launches.'}
                </p>
                {items.length === 0 ? (
                  <EmptyState
                    title={filtered ? 'No tools match' : 'No tools here yet'}
                    hint={filtered ? 'Nothing fits these filters. Clear them to see the whole directory.' : 'New launches will appear here as they are posted.'}
                  >
                    {filtered && (
                      <Chip active={false} onClick={clear}>
                        Clear filters
                      </Chip>
                    )}
                  </EmptyState>
                ) : (
                  <>
                    <p className="sr-only" role="status">
                      {items.length} tools
                    </p>
                    <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {items.slice(0, shown).map((tool, i) => (
                        <ToolCard key={tool.id} tool={tool} index={i % PAGE} now={now} />
                      ))}
                    </ul>
                    <ShowMore shown={shown} total={items.length} onMore={() => setShown((s) => s + PAGE)} />
                  </>
                )}
              </>
            )}
          </FeedBody>
        </div>
      </div>
    </Page>
  );
}
