'use client';

// Client frame around every page: vault state, header, footer, search and shortcuts.

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { REFRESH_EVENT } from '../api';
import { useNavigate } from '../router';
import { AuthProvider } from '../auth';
import { useVault, VaultProvider } from '../vault/store';
import { SearchPalette } from './SearchPalette';
import { Footer, Header, NAV } from './Shell';

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  root.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#f3f2ef' : '#0c0c0c');
  try {
    window.localStorage.setItem('vault:theme', next);
  } catch {
    /* theme just won't persist */
  }
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

/** Shown when loading or saving the library fails, so a lost change is never silent. */
function VaultError() {
  const { error, dismissError } = useVault();
  if (!error) return null;
  return (
    <div role="alert" className="pop fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start justify-between gap-4 border border-bad/60 bg-bg px-4 py-3 text-sm text-ink shadow-2xl shadow-black/50">
      <span>{error}</span>
      <button type="button" onClick={dismissError} className="label shrink-0 text-muted hover:text-ink">
        Dismiss
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const main = useRef<HTMLElement>(null);
  const lastPath = useRef(path);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Move focus to the new page on navigation (not on first load).
  useEffect(() => {
    if (lastPath.current === path) return;
    lastPath.current = path;
    main.current?.focus({ preventScroll: true });
  }, [path]);

  // Global single-key shortcuts. Ignored while typing or when a dialog is open.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Read the dialog itself: its close event can lag a keypress behind our state.
        setSearchOpen(!document.querySelector('dialog[data-search][open]'));
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || document.querySelector('dialog[open]')) return;
      const key = e.key.toLowerCase();
      if (key === 'k' || key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (key === 't') {
        toggleTheme();
      } else if (key === 'r') {
        window.dispatchEvent(new Event(REFRESH_EVENT));
      } else {
        const target = NAV.find((n) => n.key === key);
        if (target && window.location.pathname !== '/login') navigateRef.current(target.href);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The login page is full-screen: no header or footer.
  const bare = path === '/login';

  return (
    <AuthProvider>
      <VaultProvider>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-bg">
          Skip to content
        </a>
        {!bare && <Header onSearch={openSearch} onTheme={toggleTheme} />}
        <main id="main" ref={main} tabIndex={-1} className="outline-none">
          {children}
        </main>
        {!bare && <Footer />}
        <SearchPalette open={searchOpen} onClose={closeSearch} />
        <VaultError />
      </VaultProvider>
    </AuthProvider>
  );
}
