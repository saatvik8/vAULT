'use client';

// Global search (K). Searches news, tools and papers on the server and the user's
// vault locally. Arrow keys move, Enter opens, Esc closes.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { matches, tokenize } from '../../lib/query';
import type { SearchResults } from '../../lib/types';
import { getJson } from '../api';
import { useNavigate } from '../router';
import { useVault } from '../vault/store';
import { NAV } from './Shell';
import { Kbd } from './ui';

interface Option {
  id: string;
  group: string;
  title: string;
  meta: string;
  href: string;
  external: boolean;
}

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [active, setActive] = useState(0);
  const vault = useVault();
  const navigate = useNavigate();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      input.current?.focus();
    }
    if (!open && el.open) el.close();
    if (!open) {
      setQ('');
      setResults(null);
      setState('idle');
    }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults(null);
      setState('idle');
      return;
    }
    const controller = new AbortController();
    setState('loading');
    const timer = window.setTimeout(() => {
      getJson<SearchResults>(`/api/search?q=${encodeURIComponent(term)}`, controller.signal)
        .then((r) => {
          setResults(r);
          setState('idle');
        })
        .catch((err: Error) => {
          if (err.name !== 'AbortError') setState('error');
        });
    }, 160);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const options = useMemo<Option[]>(() => {
    const term = q.trim();
    if (!term) {
      return NAV.map((n) => ({ id: `nav-${n.href}`, group: 'Go to', title: n.label, meta: n.key, href: n.href, external: false }));
    }
    const tokens = tokenize(term);
    const saved: Option[] = vault.items
      .filter((i) => matches(`${i.title} ${i.subtitle} ${i.note}`, tokens))
      .slice(0, 5)
      .map((i) => ({ id: `vault-${i.key}`, group: 'My Vault', title: i.title, meta: i.note ? `Note: ${i.note}` : i.subtitle, href: '/vault', external: false }));
    if (!results) return saved;
    return [
      ...saved,
      ...results.news.map((n) => ({ id: `news-${n.id}`, group: 'News', title: n.title, meta: n.source + (n.sample ? ' · sample' : ''), href: n.url || '/news', external: !!n.url })),
      ...results.tools.map((t) => ({ id: `tool-${t.id}`, group: 'Tools', title: t.name, meta: t.tagline + (t.sample ? ' · sample' : ''), href: t.url || '/tools?view=new', external: !!t.url })),
      ...results.papers.map((p) => ({ id: `paper-${p.id}`, group: 'Papers', title: p.title, meta: p.authors.slice(0, 2).join(', ') + (p.sample ? ' · sample' : ''), href: p.absUrl || '/papers', external: !!p.absUrl })),
    ];
  }, [q, results, vault.items]);

  useEffect(() => setActive(0), [options.length, q]);
  useEffect(() => {
    document.getElementById(options[active]?.id ? `opt-${options[active].id}` : '')?.scrollIntoView({ block: 'nearest' });
  }, [active, options]);

  const activate = (option: Option) => {
    if (option.external) window.open(option.href, '_blank', 'noopener,noreferrer');
    else navigate(option.href);
    onClose();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (options.length ? (a + 1) % options.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (options.length ? (a - 1 + options.length) % options.length : 0));
    } else if (e.key === 'Enter' && options[active]) {
      e.preventDefault();
      activate(options[active]);
    }
  };

  const term = q.trim();
  let lastGroup = '';

  return (
    <dialog
      ref={dialog}
      data-search
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      aria-label="Search Vault"
      className="m-0 mx-auto mt-[10vh] w-[min(40rem,calc(100vw-1.5rem))] max-w-none overflow-hidden rounded-none border border-line bg-bg p-0 shadow-2xl shadow-black/50"
    >
      <div className="pop flex max-h-[72vh] flex-col" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b border-line px-5">
          <span className="label text-accent" aria-hidden="true">
            Search
          </span>
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-label="Search news, tools, papers and your vault"
            aria-expanded="true"
            aria-controls="search-results"
            aria-autocomplete="list"
            aria-activedescendant={options[active] ? `opt-${options[active].id}` : undefined}
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="News, tools, papers, your vault…"
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-faint"
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="shrink-0">
            <Kbd>Esc</Kbd>
          </button>
        </div>

        <ul id="search-results" role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
          {options.map((option, i) => {
            const heading = option.group !== lastGroup ? option.group : null;
            lastGroup = option.group;
            return (
              <li key={option.id} role="presentation">
                {heading && (
                  <p className="label px-5 pb-1 pt-3 text-faint" role="presentation">
                    {heading}
                  </p>
                )}
                <div
                  id={`opt-${option.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => i !== active && setActive(i)}
                  onClick={() => activate(option)}
                  className={`mx-2 flex cursor-pointer items-baseline justify-between gap-4 rounded-none px-3 py-2 ${i === active ? 'bg-surface' : ''}`}
                >
                  <span className="min-w-0">
                    <span className={`block truncate text-base font-medium leading-snug ${i === active ? 'text-accent' : 'text-ink'}`}>{option.title}</span>
                    {option.group !== 'Go to' && option.meta && <span className="block truncate text-[0.8125rem] text-muted">{option.meta}</span>}
                  </span>
                  <span className="label shrink-0 text-faint" aria-hidden="true">
                    {option.group === 'Go to' ? option.meta : option.external ? '↗' : '→'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-line px-5 py-2.5" role="status" aria-live="polite">
          <p className="label flex items-center justify-between gap-4 text-faint">
            <span>
              {state === 'error'
                ? 'Search is unavailable right now. Try again in a moment.'
                : !term
                  ? 'Type to search across everything'
                  : state === 'loading' && !results
                    ? 'Searching…'
                    : options.length === 0
                      ? `No results for “${term}”`
                      : `${options.length} ${options.length === 1 ? 'result' : 'results'}`}
            </span>
            <span className="hidden items-center gap-2 sm:flex" aria-hidden="true">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> move <Kbd>↵</Kbd> open
            </span>
          </p>
        </div>
      </div>
    </dialog>
  );
}
