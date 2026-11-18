'use client';

// Page chrome: boxed top navigation, clock, status badge, account, mobile menu, footer.

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { StatusReport } from '../../lib/types';
import { useFeed } from '../api';
import { useAuth } from '../auth';
import { Link } from '../router';
import { useVault } from '../vault/store';
import { Kbd, Skeleton, useNow } from './ui';

export const NAV = [
  { href: '/', label: 'Today', key: '1' },
  { href: '/news', label: 'News', key: '2' },
  { href: '/tools', label: 'Tools', key: '3' },
  { href: '/papers', label: 'Papers', key: '4' },
  { href: '/vault', label: 'My Vault', key: '5' },
] as const;

/** Shared look for the bordered cells in the header. */
const cell = 'h-9 items-center gap-2 border border-line bg-surface/80 px-3 text-sm text-muted transition-colors duration-200 hover:border-faint hover:text-ink';

export function Mark({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" strokeWidth="1.6">
      <rect x="1.5" y="1.5" width="17" height="17" className="stroke-current" />
      <circle cx="10" cy="10" r="4" className="stroke-accent" />
      <path d="M10 10L15 5" className="stroke-accent" />
    </svg>
  );
}

function Clock() {
  const now = useNow(1000);
  // Rendered after mount: the server doesn't know the reader's time zone.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <p className="label tabular-nums text-faint">--:--</p>;
  const date = new Date(now);
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  const zone = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? '';
  return (
    <p className="label tabular-nums text-muted" title="Your local time">
      <time dateTime={date.toISOString().slice(0, 16)}>{time}</time> <span className="text-faint">[{zone}]</span>
    </p>
  );
}

const STATUS_COPY = {
  live: { label: 'Live', dot: 'bg-ok', text: 'All sources responding' },
  partial: { label: 'Partial', dot: 'bg-accent', text: 'Some sources are not responding' },
  sample: { label: 'Sample data', dot: 'bg-bad', text: 'Live sources unreachable; showing labelled placeholders' },
} as const;

export function useStatus() {
  const status = useFeed<StatusReport>('/api/status');
  const { reload } = status;
  useEffect(() => {
    const id = window.setInterval(reload, 120_000);
    return () => window.clearInterval(id);
  }, [reload]);
  return status;
}

export function StatusBadge() {
  const status = useStatus();
  if (!status.data) {
    return (
      <span className="label inline-flex h-9 items-center gap-2 border border-line px-3 text-faint">
        <span className="h-1.5 w-1.5 rounded-full bg-faint" aria-hidden="true" />
        {status.error ? 'Offline' : 'Checking'}
      </span>
    );
  }
  const copy = STATUS_COPY[status.data.mode];
  return (
    <span className="label inline-flex h-9 items-center gap-2 border border-line bg-surface/80 px-3 text-muted" title={`${copy.text} (${status.data.ok}/${status.data.total})`}>
      <span className={`pulse-dot h-1.5 w-1.5 rounded-full ${copy.dot}`} aria-hidden="true" />
      <span className="sr-only">Data status: </span>
      {copy.label}
      <span className="text-faint">
        {status.data.ok}/{status.data.total}
      </span>
    </span>
  );
}

function Wordmark() {
  return (
    <Link href="/" aria-label="Vault, home" className="inline-flex h-9 items-center gap-2 border border-line bg-surface/80 px-3 text-ink transition-colors duration-200 hover:border-faint">
      <Mark />
      <span className="display text-base leading-none">Vault</span>
    </Link>
  );
}

/** Log in link for guests; account menu for signed-in users. */
function Account() {
  const { user, loading, logout } = useAuth();
  if (loading) return null;
  if (!user) {
    return (
      <Link href="/login" className={`hidden md:inline-flex ${cell}`}>
        Log in
      </Link>
    );
  }
  return (
    <details className="group/acct relative hidden md:block">
      <summary className={`inline-flex ${cell}`} aria-label={`Account: ${user.email}`}>
        <span className="grid h-5 w-5 place-items-center bg-ink text-[0.6875rem] font-semibold uppercase text-bg" aria-hidden="true">
          {user.email[0]}
        </span>
        <span aria-hidden="true" className="text-faint transition-transform duration-200 group-open/acct:rotate-180">
          ▾
        </span>
      </summary>
      <div className="pop absolute right-0 top-11 z-50 w-64 border border-line bg-bg p-4 shadow-2xl shadow-black/50">
        <p className="label text-faint">Signed in as</p>
        <p className="mt-1 truncate text-sm text-ink">{user.email}</p>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">Your vault is saved to this account.</p>
        <button type="button" onClick={() => void logout()} className="label mt-4 h-9 w-full border border-line text-muted transition-colors hover:border-faint hover:text-ink">
          Log out
        </button>
      </div>
    </details>
  );
}

function MobileMenu({ open, onClose, onSearch, onTheme }: { open: boolean; onClose: () => void; onSearch: () => void; onTheme: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  const { user, logout } = useAuth();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={onClose} aria-label="Menu" className="m-0 h-dvh max-h-none w-screen max-w-none bg-bg p-0 md:hidden">
      <div className="pop flex h-full flex-col px-5 pb-6">
        <div className="flex h-14 items-center justify-between">
          <span className="label text-faint">Menu</span>
          <button type="button" onClick={onClose} className="label -mr-2 h-10 px-2 text-muted">
            Close
          </button>
        </div>
        <nav aria-label="Main" className="mt-4 flex-1">
          <ul className="border-t border-line">
            {NAV.map((item, i) => (
              <li key={item.href} className="rise border-b border-line" style={{ animationDelay: `${i * 40}ms` }}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={path === item.href ? 'page' : undefined}
                  className={`display flex items-baseline justify-between py-4 text-3xl ${path === item.href ? 'text-accent' : 'text-ink'}`}
                >
                  {item.label}
                  <span className="label text-faint">0{item.key}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mb-3 flex items-center justify-between gap-3 border border-line px-3 py-2.5">
          {user ? (
            <>
              <span className="min-w-0 truncate text-sm text-muted">{user.email}</span>
              <button type="button" onClick={() => void logout()} className="label shrink-0 text-ink">
                Log out
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-muted">Browsing as a guest</span>
              <Link href="/login" onClick={onClose} className="label shrink-0 text-accent">
                Log in →
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <StatusBadge />
          <div className="flex gap-2">
            <button type="button" onClick={onTheme} className="label h-10 border border-line px-4 text-muted">
              Theme
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSearch();
              }}
              className="label h-10 bg-ink px-4 text-bg"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function Header({ onSearch, onTheme }: { onSearch: () => void; onTheme: () => void }) {
  const path = usePathname();
  const { items } = useVault();
  const [menu, setMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-5 md:px-10">
        <Wordmark />

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex h-9 items-stretch border border-line bg-surface/80 p-[3px]">
            {NAV.map((item) => {
              const active = path === item.href;
              return (
                <li key={item.href} className="flex">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-1.5 px-3 text-sm transition-colors duration-200 ${active ? 'bg-line text-ink' : 'text-muted hover:text-ink'}`}
                  >
                    {item.label}
                    {item.href === '/vault' && items.length > 0 && <span className="label text-accent">{items.length}</span>}
                    <span className="label hidden text-faint xl:inline" aria-hidden="true">
                      {item.key}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="mr-1 hidden xl:block">
            <Clock />
          </div>
          <div className="hidden lg:block">
            <StatusBadge />
          </div>
          <button type="button" onClick={onSearch} aria-keyshortcuts="K" className={`inline-flex ${cell} pr-2`}>
            Search <Kbd>K</Kbd>
          </button>
          <button type="button" onClick={onTheme} aria-keyshortcuts="T" aria-label="Switch colour theme" className={`hidden md:inline-flex ${cell} !px-2`}>
            <Kbd>T</Kbd>
          </button>
          <Account />
          <button type="button" onClick={() => setMenu(true)} aria-haspopup="dialog" aria-expanded={menu} className="label h-9 border border-line bg-surface/80 px-3 text-ink md:hidden">
            Menu
          </button>
        </div>
      </div>
      <MobileMenu open={menu} onClose={() => setMenu(false)} onSearch={onSearch} onTheme={onTheme} />
    </header>
  );
}

export function Footer() {
  const hints: [string, string][] = [
    ['K', 'Search'],
    ['1–5', 'Sections'],
    ['R', 'Refresh'],
    ['T', 'Theme'],
    ['Esc', 'Close'],
  ];
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-12 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <p className="display flex items-center gap-2.5 text-2xl">
            <Mark className="h-5 w-5" /> Vault
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            One place to keep up with AI: what happened, what’s new to try, and what’s worth reading. Every item links to its original source.
          </p>
        </div>
        <div className="md:col-span-4">
          <p className="label text-faint">Sources</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Publisher RSS feeds, Hacker News (Algolia API), arXiv API and Hugging Face Papers. Thank you to arXiv for use of its open access
            interoperability.
          </p>
        </div>
        <div className="md:col-span-3">
          <p className="label text-faint">Keyboard</p>
          <ul className="mt-3 space-y-2">
            {hints.map(([key, what]) => (
              <li key={key} className="flex items-center gap-3 text-sm text-muted">
                <kbd className="kbd">{key}</kbd> {what}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1280px] px-5 md:px-10">{children}</div>;
}

export function PageFallback() {
  return (
    <Page>
      <div className="pt-24">
        <Skeleton rows={6} />
      </div>
    </Page>
  );
}
