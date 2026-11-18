'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { discussion, queryPapers, queryTools } from '../../lib/query';
import type { Feed, NewsItem, Paper, Tool } from '../../lib/types';
import { useFeed, type FeedState } from '../api';
import { NewsBrief, PaperBrief, ToolBrief } from '../components/cards';
import { HeroArt } from '../components/art';
import { Page, useStatus } from '../components/Shell';
import { EmptyState, FeedBody, FeedNotice, useNow } from '../components/ui';
import { Link } from '../router';

/** Most-discussed stories from the last 36 hours, topped up with the newest. */
export function topStories(items: NewsItem[], count: number, now: number): NewsItem[] {
  const recent = items.filter((n) => now - Date.parse(n.publishedAt) < 36 * 3600_000 && discussion(n) > 0).sort((a, b) => discussion(b) - discussion(a));
  const picked = recent.slice(0, count);
  for (const item of items) {
    if (picked.length >= count) break;
    if (!picked.includes(item)) picked.push(item);
  }
  return picked;
}

function Section<T>({ number, title, href, linkLabel, state, rows, children }: { number: string; title: string; href: string; linkLabel: string; state: FeedState<Feed<T>>; rows: number; children: (feed: Feed<T>) => ReactNode }) {
  return (
    <section aria-labelledby={`today-${number}`}>
      <div className="flex items-baseline justify-between border-b border-ink pb-3">
        <h2 id={`today-${number}`} className="flex items-baseline gap-3">
          <span className="label text-accent" aria-hidden="true">
            {number}
          </span>
          <span className="display text-2xl">{title}</span>
        </h2>
        <Link href={href} className="label wipe text-muted hover:text-ink">
          {linkLabel} →
        </Link>
      </div>
      <FeedBody state={state} rows={rows}>
        {children}
      </FeedBody>
    </section>
  );
}

/** Every live source in a ruled strip under the hero, each with its current state. */
function SourceStrip() {
  const status = useStatus();
  const sources = (status.data?.sources ?? []).filter((s) => s.id !== 'curated');
  return (
    <div className="relative border-t border-line bg-bg/60 backdrop-blur-sm">
      <ul aria-label="Sources and their status" className="no-scrollbar mx-auto flex max-w-[1280px] overflow-x-auto md:px-5">
        <li className="label flex h-16 shrink-0 items-center border-r border-line px-5 text-faint">
          Sources{status.data ? ` ${status.data.ok}/${status.data.total}` : ''}
        </li>
        {sources.length === 0 && <li className="label flex h-16 items-center px-5 text-faint">{status.error ? 'Status unavailable' : 'Checking…'}</li>}
        {sources.map((s) => (
          <li key={`${s.area}-${s.id}`} className="label flex h-16 shrink-0 items-center gap-2 border-r border-line px-5 text-muted" title={s.ok ? `${s.count} items` : `Not responding: ${s.error ?? 'unknown error'}`}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${s.ok ? 'bg-ok' : 'bg-bad'}`} />
            {s.name}
            <span className="sr-only">{s.ok ? ': responding' : ': not responding'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TodayPage() {
  const news = useFeed<Feed<NewsItem>>('/api/news');
  const tools = useFeed<Feed<Tool>>('/api/tools');
  const papers = useFeed<Feed<Paper>>('/api/papers');
  const now = useNow();

  const stories = useMemo(() => (news.data ? topStories(news.data.items, 6, Date.now()) : []), [news.data]);
  const launches = useMemo(() => (tools.data ? queryTools(tools.data.items, { view: 'new' }).slice(0, 4) : []), [tools.data]);
  const trending = useMemo(() => {
    if (!papers.data) return [];
    const ranked = queryPapers(papers.data.items, { view: 'trending' });
    return (ranked.length ? ranked : queryPapers(papers.data.items, { view: 'latest' })).slice(0, 4);
  }, [papers.data]);

  // Set after mount so the server-rendered page doesn't guess the reader's date.
  const [today, setToday] = useState('\u00a0');
  useEffect(() => setToday(new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })), []);
  const sample = [news.data, tools.data, papers.data].some((f) => f?.items.some((i) => i.sample));
  const worstMeta = [news.data, papers.data, tools.data].find((f) => f && f.items.some((i) => i.sample))?.meta;

  return (
    <>
      {/* The hero is always dark, in both themes, so the artwork and type keep their contrast. */}
      <section data-theme="dark" aria-labelledby="hero-title" className="relative -mt-14 overflow-hidden bg-bg text-ink">
        <HeroArt />
        <div className="rise relative mx-auto flex min-h-[34rem] max-w-[1280px] flex-col justify-end px-5 pb-12 pt-32 md:min-h-[min(46rem,82vh)] md:px-10 md:pb-16">
          <p className="label text-accent">{today}</p>
          <h1 id="hero-title" className="display mt-5 max-w-3xl text-[2.125rem] leading-[1.08] sm:text-5xl md:text-6xl">
            The field, in a minute
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/75 md:text-lg">
            What happened, what’s new to try, and what’s worth reading in AI today. Save anything to your vault and come back to it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/news" className="inline-flex h-12 items-center bg-ink px-5 text-[0.9375rem] font-medium text-bg transition-opacity hover:opacity-85">
              Read the news
            </Link>
            <Link href="/tools" className="inline-flex h-12 items-center border border-ink/25 bg-bg/40 px-5 text-[0.9375rem] font-medium text-ink backdrop-blur-sm transition-colors hover:border-ink/60">
              Explore tools
            </Link>
          </div>
        </div>
        <SourceStrip />
      </section>

      <Page>
        {sample && worstMeta && <FeedNotice meta={worstMeta} hasSample />}
        <div className="h-14 md:h-20" />
  <div className="grid gap-x-14 gap-y-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Section number="01" title="What happened" href="/news" linkLabel="All news" state={news} rows={5}>
            {() =>
              stories.length ? (
                <ol>
                  {stories.map((item, i) => (
                    <NewsBrief key={item.id} item={item} index={i} now={now} />
                  ))}
                </ol>
              ) : (
                <EmptyState title="No stories yet" hint="Sources returned nothing recent. Try refreshing in a few minutes." />
              )
            }
          </Section>
        </div>

        <div className="space-y-14 lg:col-span-5">
          <Section number="02" title="New to try" href="/tools?view=new" linkLabel="All tools" state={tools} rows={3}>
            {() =>
              launches.length ? (
                <ul>
                  {launches.map((tool, i) => (
                    <ToolBrief key={tool.id} tool={tool} index={i} now={now} />
                  ))}
                </ul>
              ) : (
                <EmptyState title="No new launches" hint="Nothing new has surfaced in the last 30 days." />
              )
            }
          </Section>

          <Section number="03" title="Worth reading" href="/papers" linkLabel="All papers" state={papers} rows={3}>
            {() =>
              trending.length ? (
                <ul>
                  {trending.map((paper, i) => (
                    <PaperBrief key={paper.id} paper={paper} index={i} now={now} />
                  ))}
                </ul>
              ) : (
                <EmptyState title="No papers yet" hint="Sources returned nothing recent. Try refreshing in a few minutes." />
              )
            }
          </Section>
        </div>
      </div>
      </Page>
    </>
  );
}
