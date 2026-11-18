'use client';

import { useEffect, useMemo, useState } from 'react';
import { queryNews, type NewsSort } from '../../lib/query';
import { TOPICS, type Feed, type NewsItem, type Topic } from '../../lib/types';
import { useFeed } from '../api';
import { NewsRow } from '../components/cards';
import { Page } from '../components/Shell';
import { Chip, EmptyState, FeedBody, FeedNotice, PageHeader, ShowMore, Updated, useNow } from '../components/ui';
import { setQuery, useLocation } from '../router';

const PAGE = 30;

export function NewsPage() {
  const feed = useFeed<Feed<NewsItem>>('/api/news');
  const { query } = useLocation();
  const now = useNow();
  const topic = (TOPICS as readonly string[]).includes(query.get('topic') ?? '') ? (query.get('topic') as Topic) : null;
  const sort: NewsSort = query.get('sort') === 'discussed' ? 'discussed' : 'newest';
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [topic, sort]);

  const items = useMemo(() => (feed.data ? queryNews(feed.data.items, { topic, sort }) : []), [feed.data, topic, sort]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(TOPICS.map((t) => [t, 0])) as Record<Topic, number>;
    for (const n of feed.data?.items ?? []) for (const t of n.topics) c[t]++;
    return c;
  }, [feed.data]);

  return (
    <Page>
      <PageHeader eyebrow="02 · News" title="News" intro="The latest from AI labs and tech publications, plus Hacker News stories about AI. Every headline links to its source.">
        <Updated meta={feed.data?.meta} state={feed} />
      </PageHeader>

      <div className="sticky top-14 z-30 -mx-5 flex flex-col gap-3 border-b border-line bg-bg/90 px-5 py-3 backdrop-blur-md md:-mx-10 md:flex-row md:items-center md:justify-between md:px-10">
        <div role="group" aria-label="Filter by topic" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
          <Chip active={!topic} onClick={() => setQuery({ topic: null })} count={feed.data?.items.length}>
            All
          </Chip>
          {TOPICS.map((t) => (
            <Chip key={t} active={topic === t} onClick={() => setQuery({ topic: topic === t ? null : t })} count={feed.data ? counts[t] : undefined}>
              {t}
            </Chip>
          ))}
        </div>
        <div role="group" aria-label="Sort" className="flex items-center gap-2">
          <span className="label text-faint">Sort</span>
          <Chip active={sort === 'newest'} onClick={() => setQuery({ sort: null })}>
            Newest
          </Chip>
          <Chip active={sort === 'discussed'} onClick={() => setQuery({ sort: 'discussed' })}>
            Most discussed
          </Chip>
        </div>
      </div>

      <FeedBody state={feed} rows={8}>
        {(data) => (
          <>
            <FeedNotice meta={data.meta} hasSample={data.items.some((i) => i.sample)} />
            {sort === 'discussed' && items.length > 0 && (
              <p className="label mt-6 text-faint">Ranked by Hacker News points and comments. Stories not discussed there follow, newest first.</p>
            )}
            {items.length === 0 ? (
              <EmptyState title="Nothing under this topic" hint="No recent stories match this filter. Try another topic or view everything.">
                <Chip active={false} onClick={() => setQuery({ topic: null })}>
                  Show all news
                </Chip>
              </EmptyState>
            ) : (
              <>
                <p className="sr-only" role="status">
                  {items.length} stories
                </p>
                <ul>
                  {items.slice(0, shown).map((item, i) => (
                    <NewsRow key={item.id} item={item} index={i % PAGE} now={now} />
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
