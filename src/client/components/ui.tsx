'use client';

// Small shared building blocks: chips, tabs, save button, feed states, notices.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { timeAgo, fullDate } from '../../lib/text';
import type { FeedMeta } from '../../lib/types';
import type { FeedState } from '../api';
import { useVault } from '../vault/store';
import type { NewSavedItem } from '../vault/repository';

export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Stagger index for the rise-in animation, capped so long lists don't wait. */
export const stagger = (i: number) => ({ '--i': Math.min(i, 10) }) as CSSProperties;

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="kbd" aria-hidden="true">
      {children}
    </kbd>
  );
}

export function Chip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`label inline-flex h-8 shrink-0 items-center gap-2 rounded-none border px-3 transition-colors duration-200 ${
        active ? 'border-ink bg-ink text-bg' : 'border-line text-muted hover:border-faint hover:text-ink'
      }`}
    >
      {children}
      {count !== undefined && <span className={active ? 'opacity-70' : 'text-faint'}>{count}</span>}
    </button>
  );
}

export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-6">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`display relative pb-2 text-xl transition-colors duration-200 md:text-2xl ${
            o.value === value ? 'text-ink' : 'text-faint hover:text-muted'
          }`}
        >
          {o.label}
          <span
            aria-hidden="true"
            className={`absolute inset-x-0 bottom-0 h-px origin-left bg-accent transition-transform duration-300 ease-out-soft ${
              o.value === value ? 'scale-x-100' : 'scale-x-0'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function SampleTag() {
  return <span className="label rounded-none border border-accent/60 px-1.5 text-accent">Sample</span>;
}

/** Outbound link. Sample items have no URL and render as plain text. */
export function External({ href, children, className = '', label }: { href: string; children: ReactNode; className?: string; label?: string }) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={label}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function Time({ iso, now, className = '' }: { iso: string; now: number; className?: string }) {
  return (
    <time dateTime={iso} title={fullDate(iso)} className={className}>
      {timeAgo(iso, now)}
    </time>
  );
}

export function SaveButton({ item }: { item: NewSavedItem }) {
  const vault = useVault();
  const saved = vault.isSaved(item.kind, item.id);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove “${item.title}” from My Vault` : `Save “${item.title}” to My Vault`}
      onClick={() => vault.toggle(item)}
      className={`label inline-flex h-8 shrink-0 items-center gap-1.5 rounded-none border px-3 transition-colors duration-200 ${
        saved ? 'border-accent text-accent' : 'border-line text-muted hover:border-faint hover:text-ink'
      }`}
    >
      <span aria-hidden="true">{saved ? '✓' : '+'}</span>
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}

export function Signal({ points, comments, href, unit = 'points' }: { points?: number; comments?: number; href?: string; unit?: string }) {
  if (!points && !comments) return null;
  const body = (
    <>
      <span aria-hidden="true">▲ </span>
      {points ?? 0}
      <span className="sr-only"> {unit}</span>
      <span aria-hidden="true"> · </span>
      <span className="sr-only">, </span>
      {comments ?? 0} {comments === 1 ? 'comment' : 'comments'}
    </>
  );
  return href ? (
    <External href={href} className="label text-muted transition-colors hover:text-accent">
      {body}
    </External>
  ) : (
    <span className="label text-muted">{body}</span>
  );
}

export function PageHeader({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children?: ReactNode }) {
  return (
    <header className="rise border-b border-line pb-8 pt-12 md:pb-10 md:pt-20">
      <p className="label text-accent">{eyebrow}</p>
      <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="display text-4xl leading-none md:text-6xl">{title}</h1>
          <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-muted">{intro}</p>
        </div>
        {children}
      </div>
    </header>
  );
}

export function Updated({ meta, state }: { meta?: FeedMeta; state: Pick<FeedState<unknown>, 'refreshing' | 'reload' | 'loading'> }) {
  const now = useNow();
  return (
    <div className="flex shrink-0 items-center gap-3">
      <p className="label text-faint" aria-live="polite">
        {state.loading || state.refreshing ? 'Updating…' : meta ? `Updated ${timeAgo(meta.fetchedAt, now)}` : ''}
      </p>
      <button
        type="button"
        onClick={state.reload}
        className="label inline-flex h-8 items-center gap-2 rounded-none border border-line px-3 text-muted transition-colors hover:border-faint hover:text-ink"
      >
        Refresh <Kbd>R</Kbd>
      </button>
    </div>
  );
}

/** Tells the reader when what they see is placeholder data or when some sources failed. */
export function FeedNotice({ meta, hasSample }: { meta: FeedMeta; hasSample: boolean }) {
  const failed = meta.sources.filter((s) => !s.ok);
  if (!hasSample && failed.length === 0) return null;
  return (
    <div role="status" className={`mt-6 rounded-none border px-4 py-3 text-sm leading-relaxed ${hasSample ? 'border-accent/60 bg-accent/10' : 'border-line bg-surface'}`}>
      {hasSample ? (
        <p>
          <strong className="font-semibold text-accent">Sample data.</strong> Live sources couldn’t be reached, so items marked “Sample” are
          placeholders, not real stories, tools or papers.
        </p>
      ) : (
        <p className="text-muted">
          {failed.length} of {meta.sources.length} sources didn’t respond. Showing what loaded.
        </p>
      )}
      <details className="mt-1">
        <summary className="label inline-block text-muted underline decoration-line underline-offset-4 hover:text-ink">Source details</summary>
        <ul className="mt-2 space-y-1 text-[0.8125rem] text-muted">
          {meta.sources.map((s) => (
            <li key={s.id} className="flex gap-2">
              <span aria-hidden="true" className={s.ok ? 'text-ok' : 'text-bad'}>
                ●
              </span>
              <span>
                {s.name}: {s.ok ? `${s.count} items` : `failed (${s.error ?? 'unknown error'})`}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border-b border-line py-6" aria-hidden="true">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton mt-4 h-6 w-4/5" />
          <div className="skeleton mt-3 h-4 w-3/5" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="my-10 rounded-none border border-bad/50 px-6 py-10 text-center">
      <p className="label text-bad">Couldn’t load this feed</p>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">{message}</p>
      <button type="button" onClick={onRetry} className="label mt-6 inline-flex h-9 items-center rounded-none bg-ink px-5 text-bg transition-opacity hover:opacity-85">
        Try again
      </button>
    </div>
  );
}

export function EmptyState({ title, hint, children }: { title: string; hint: string; children?: ReactNode }) {
  return (
    <div className="my-10 rounded-none border border-dashed border-line px-6 py-14 text-center">
      <p className="display text-xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{hint}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

/** Standard wrapper: skeleton while loading, error with retry, otherwise the content. */
export function FeedBody<T>({ state, rows, children }: { state: FeedState<T>; rows?: number; children: (data: T) => ReactNode }) {
  if (state.loading) return <Skeleton rows={rows} />;
  if (!state.data) return <ErrorState message={state.error ?? 'Unknown error.'} onRetry={state.reload} />;
  return (
    <>
      {state.error && (
        <p role="status" className="mt-6 rounded-none border border-line bg-surface px-4 py-3 text-sm text-muted">
          Couldn’t refresh just now ({state.error}) Showing the last data loaded.
        </p>
      )}
      {children(state.data)}
    </>
  );
}

export function ShowMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (shown >= total) return null;
  return (
    <div className="py-10 text-center">
      <button type="button" onClick={onMore} className="label inline-flex h-10 items-center rounded-none border border-line px-6 text-muted transition-colors hover:border-faint hover:text-ink">
        Show more · {total - shown} left
      </button>
    </div>
  );
}
