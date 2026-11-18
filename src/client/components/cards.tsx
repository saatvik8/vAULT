'use client';

// Feed rows for news, tools and papers. Each has a full and a compact form.

import type { NewsItem, Paper, Tool } from '../../lib/types';
import { External, SampleTag, SaveButton, Signal, Time, stagger } from './ui';

const PRICING_LABEL = { free: 'Free', freemium: 'Freemium', paid: 'Paid', unknown: 'Pricing n/a' } as const;

const titleLink = 'transition-colors duration-200 hover:text-accent';
const arrow = (
  <>
    {'\u00a0'}
  <span aria-hidden="true" className="inline-block text-[0.7em] text-faint transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent">
    ↗
  </span>
  </>
);

export function authorsLine(authors: string[], max = 3): string {
  if (authors.length === 0) return 'Authors not listed';
  return authors.length > max ? `${authors.slice(0, max).join(', ')} +${authors.length - max} more` : authors.join(', ');
}

/* ── News ─────────────────────────────────────────────────────────────── */

export function NewsRow({ item, index, now }: { item: NewsItem; index: number; now: number }) {
  return (
    <li className="rise border-b border-line py-6 md:grid md:grid-cols-[10rem_1fr_auto] md:gap-8" style={stagger(index)}>
      <p className="label flex items-center gap-2 text-muted md:flex-col md:items-start md:gap-1 md:pt-1.5">
        <span className="text-ink">{item.source}</span>
        <span aria-hidden="true" className="md:hidden">
          ·
        </span>
        <Time iso={item.publishedAt} now={now} className="text-faint" />
      </p>
      <div className="mt-2 min-w-0 md:mt-0">
        <h3 className="text-lg font-medium leading-snug tracking-tight md:text-xl">
          <External href={item.url} className={`group ${titleLink}`}>
            {item.title}
            {item.url && arrow}
          </External>
        </h3>
        {item.summary && <p className="mt-2 line-clamp-2 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">{item.summary}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {item.sample && <SampleTag />}
          {item.topics.map((t) => (
            <span key={t} className="label text-faint">
              #{t}
            </span>
          ))}
          <Signal points={item.points} comments={item.comments} href={item.discussionUrl} />
        </div>
      </div>
      <div className="mt-4 md:mt-1">
        <SaveButton item={{ kind: 'news', id: item.id, title: item.title, url: item.url, subtitle: item.source }} />
      </div>
    </li>
  );
}

export function NewsBrief({ item, index, now }: { item: NewsItem; index: number; now: number }) {
  return (
    <li className="rise grid grid-cols-[2rem_1fr] gap-x-3 border-b border-line py-5" style={stagger(index)}>
      <span className="label pt-1.5 text-faint" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0">
        <h3 className="text-[1.0625rem] font-medium leading-snug tracking-tight md:text-lg">
          <External href={item.url} className={`group ${titleLink}`}>
            {item.title}
            {item.url && arrow}
          </External>
        </h3>
        <p className="label mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
          {item.sample && <SampleTag />}
          <span>{item.source}</span>
          <Time iso={item.publishedAt} now={now} className="text-faint" />
          <Signal points={item.points} comments={item.comments} href={item.discussionUrl} />
        </p>
      </div>
    </li>
  );
}

/* ── Tools ────────────────────────────────────────────────────────────── */

export function ToolCard({ tool, index, now }: { tool: Tool; index: number; now: number }) {
  return (
    <li className="rise group/card flex flex-col border border-line bg-surface/40 p-5 transition-colors duration-300 hover:border-faint hover:bg-surface" style={stagger(index)}>
      <div className="flex items-center justify-between gap-3">
        <span className="label text-accent">{tool.category}</span>
        <span className="label text-faint">{PRICING_LABEL[tool.pricing]}</span>
      </div>
      <h3 className="mt-5 text-xl font-medium leading-tight tracking-tight">
        <External href={tool.url} className={`group ${titleLink}`}>
          {tool.name}
          {tool.url && arrow}
        </External>
      </h3>
      <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-muted">{tool.tagline}</p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="label flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-faint">
          {tool.sample && <SampleTag />}
          {tool.origin === 'launch' ? (
            <>
              {tool.addedAt && <Time iso={tool.addedAt} now={now} />}
              <Signal points={tool.points} comments={tool.comments} href={tool.discussionUrl} />
            </>
          ) : (
            <span>Established</span>
          )}
        </p>
        <SaveButton item={{ kind: 'tool', id: tool.id, title: tool.name, url: tool.url, subtitle: tool.tagline }} />
      </div>
    </li>
  );
}

export function ToolBrief({ tool, index, now }: { tool: Tool; index: number; now: number }) {
  return (
    <li className="rise border-b border-line py-4" style={stagger(index)}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="min-w-0 text-[1.0625rem] font-medium leading-snug tracking-tight">
          <External href={tool.url} className={`group ${titleLink}`}>
            {tool.name}
            {tool.url && arrow}
          </External>
        </h3>
        <span className="label shrink-0 text-accent">{tool.category}</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted">{tool.tagline}</p>
      <p className="label mt-2 flex flex-wrap items-center gap-x-3 text-faint">
        {tool.sample && <SampleTag />}
        {tool.addedAt && <Time iso={tool.addedAt} now={now} />}
        <Signal points={tool.points} comments={tool.comments} href={tool.discussionUrl} />
      </p>
    </li>
  );
}

/* ── Papers ───────────────────────────────────────────────────────────── */

export function PaperRow({ paper, index, now, rank }: { paper: Paper; index: number; now: number; rank?: number }) {
  return (
    <li className="rise border-b border-line py-7 md:grid md:grid-cols-[10rem_1fr_auto] md:gap-8" style={stagger(index)}>
      <div className="label flex flex-wrap items-center gap-x-3 gap-y-1 text-muted md:flex-col md:items-start md:pt-1.5">
        {rank !== undefined && <span className="text-accent">No. {String(rank).padStart(2, '0')}</span>}
        <Time iso={paper.publishedAt} now={now} className="text-ink" />
        {paper.categories.length > 0 && <span className="text-faint">{paper.categories.slice(0, 2).join(' · ')}</span>}
      </div>
      <div className="mt-2 min-w-0 md:mt-0">
        <h3 className="text-lg font-medium leading-snug tracking-tight md:text-xl">
          <External href={paper.absUrl} className={`group ${titleLink}`}>
            {paper.title}
            {paper.absUrl && arrow}
          </External>
        </h3>
        <p className="mt-1.5 text-sm text-muted">{authorsLine(paper.authors)}</p>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink/90">
          <span className="label mr-2 text-faint">{paper.summaryKind === 'provided' ? 'Summary' : 'Abstract excerpt'}</span>
          {paper.summary}
        </p>
        {paper.abstract && paper.abstract !== paper.summary && (
          <details className="group/abs mt-2 max-w-2xl">
            <summary className="label inline-block text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink">
              <span className="group-open/abs:hidden">Read full abstract</span>
              <span className="hidden group-open/abs:inline">Hide abstract</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted">{paper.abstract}</p>
          </details>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {paper.sample && <SampleTag />}
          {(paper.upvotes ?? 0) > 0 && (
            <span className="label text-accent">
              <span aria-hidden="true">▲ </span>
              {paper.upvotes} upvotes{paper.comments ? ` · ${paper.comments} comments` : ''}
            </span>
          )}
          {paper.absUrl && (
            <External href={paper.absUrl} className="label wipe text-muted hover:text-ink" label={`Abstract of ${paper.title}`}>
              Abstract ↗
            </External>
          )}
          {paper.pdfUrl && (
            <External href={paper.pdfUrl} className="label wipe text-muted hover:text-ink" label={`PDF of ${paper.title}`}>
              PDF ↗
            </External>
          )}
        </div>
      </div>
      <div className="mt-4 md:mt-1">
        <SaveButton item={{ kind: 'paper', id: paper.id, title: paper.title, url: paper.absUrl, subtitle: authorsLine(paper.authors) }} />
      </div>
    </li>
  );
}

export function PaperBrief({ paper, index, now }: { paper: Paper; index: number; now: number }) {
  return (
    <li className="rise border-b border-line py-4" style={stagger(index)}>
      <h3 className="text-[1.0625rem] font-medium leading-snug tracking-tight">
        <External href={paper.absUrl} className={`group ${titleLink}`}>
          {paper.title}
          {paper.absUrl && arrow}
        </External>
      </h3>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{paper.summary}</p>
      <p className="label mt-2 flex flex-wrap items-center gap-x-3 text-faint">
        {paper.sample && <SampleTag />}
        {(paper.upvotes ?? 0) > 0 && (
          <span className="text-accent">
            <span aria-hidden="true">▲ </span>
            {paper.upvotes}
            <span className="sr-only"> upvotes</span>
          </span>
        )}
        <Time iso={paper.publishedAt} now={now} />
        {paper.pdfUrl && (
          <External href={paper.pdfUrl} className="wipe hover:text-ink" label={`PDF of ${paper.title}`}>
            PDF ↗
          </External>
        )}
      </p>
    </li>
  );
}
