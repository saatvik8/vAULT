'use client';

import { useEffect, useMemo, useState } from 'react';
import { queryPapers, type PaperView } from '../../lib/query';
import type { Feed, Paper } from '../../lib/types';
import { useFeed } from '../api';
import { PaperRow } from '../components/cards';
import { Page } from '../components/Shell';
import { Chip, EmptyState, FeedBody, FeedNotice, PageHeader, ShowMore, Tabs, Updated, useNow } from '../components/ui';
import { setQuery, useLocation } from '../router';

const PAGE = 20;

export function PapersPage() {
  const feed = useFeed<Feed<Paper>>('/api/papers');
  const { query } = useLocation();
  const now = useNow();
  const view: PaperView = query.get('view') === 'latest' ? 'latest' : 'trending';
  const signalOnly = query.get('signal') === '1';
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [view, signalOnly]);

  const items = useMemo(() => (feed.data ? queryPapers(feed.data.items, { view, signalOnly }) : []), [feed.data, view, signalOnly]);

  return (
    <Page>
      <PageHeader eyebrow="04 · Papers" title="Papers" intro="Research worth your time: ranked by community signal rather than every new submission. From Hugging Face Papers and arXiv.">
        <Updated meta={feed.data?.meta} state={feed} />
      </PageHeader>

      <div className="flex flex-col gap-4 border-b border-line py-5 sm:flex-row sm:items-end sm:justify-between">
        <Tabs
          label="View"
          value={view}
          onChange={(v) => setQuery({ view: v === 'trending' ? null : v, signal: null })}
          options={[
            { value: 'trending', label: 'Trending' },
            { value: 'latest', label: 'Latest' },
          ]}
        />
        {view === 'latest' && (
          <Chip active={signalOnly} onClick={() => setQuery({ signal: signalOnly ? null : '1' })}>
            With community signal only
          </Chip>
        )}
      </div>

      <FeedBody state={feed} rows={6}>
        {(data) => (
          <>
            <FeedNotice meta={data.meta} hasSample={data.items.some((i) => i.sample)} />
            <p className="label mt-6 text-faint">
              {view === 'trending'
                ? 'Ranked by Hugging Face upvotes and comments, weighted towards recent papers.'
                : 'Newest submissions in cs.AI, cs.LG, cs.CL and cs.CV. Papers the community has upvoted are marked.'}
            </p>
            {items.length === 0 ? (
              <EmptyState
                title={view === 'trending' ? 'No trending papers right now' : 'No papers match'}
                hint={
                  view === 'trending'
                    ? 'Community signal isn’t available at the moment. The Latest view still lists new submissions.'
                    : 'No recent submissions have community upvotes yet. Turn the filter off to see everything.'
                }
              >
                {view === 'trending' ? (
                  <Chip active={false} onClick={() => setQuery({ view: 'latest' })}>
                    Go to Latest
                  </Chip>
                ) : (
                  <Chip active={false} onClick={() => setQuery({ signal: null })}>
                    Show all latest
                  </Chip>
                )}
              </EmptyState>
            ) : (
              <>
                <p className="sr-only" role="status">
                  {items.length} papers
                </p>
                <ul>
                  {items.slice(0, shown).map((paper, i) => (
                    <PaperRow key={paper.id} paper={paper} index={i % PAGE} now={now} rank={view === 'trending' ? i + 1 : undefined} />
                  ))}
                </ul>
                <ShowMore shown={shown} total={items.length} onMore={() => setShown((s) => s + PAGE)} />
              </>
            )}
          </>
        )}
      </FeedBody>
    </Page>
  );
}
