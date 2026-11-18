'use client';

// Client data access. `useFeed` gives every page the same loading / error / data
// contract, keeps a short in-memory cache so moving between pages is instant, and
// refetches when the user asks for a refresh (R key or the Refresh button).

import { useCallback, useEffect, useRef, useState } from 'react';

const memory = new Map<string, { data: unknown; at: number }>();
const FRESH_MS = 60_000;
export const REFRESH_EVENT = 'vault:refresh';

export async function getJson<T>(url: string, signal?: AbortSignal, bypassHttpCache = false): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal, headers: { accept: 'application/json' }, cache: bypassHttpCache ? 'reload' : 'default' });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new Error('Could not reach Vault. Check your connection and try again.');
  }
  if (!res.ok) throw new Error(`The server returned an error (${res.status}).`);
  return (await res.json()) as T;
}

export interface FeedState<T> {
  data: T | null;
  error: string | null;
  /** true only when there is nothing to show yet */
  loading: boolean;
  /** true while refetching with data already on screen */
  refreshing: boolean;
  reload: () => void;
}

export function useFeed<T>(url: string): FeedState<T> {
  const cachedEntry = memory.get(url);
  const [data, setData] = useState<T | null>((cachedEntry?.data as T) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(!cachedEntry);
  const [tick, setTick] = useState(0);
  const force = useRef(false);

  const reload = useCallback(() => {
    force.current = true;
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    window.addEventListener(REFRESH_EVENT, reload);
    return () => window.removeEventListener(REFRESH_EVENT, reload);
  }, [reload]);

  useEffect(() => {
    const hit = memory.get(url);
    if (hit) setData(hit.data as T);
    if (hit && Date.now() - hit.at < FRESH_MS && !force.current) {
      setBusy(false);
      return;
    }
    const bust = force.current;
    force.current = false;
    const controller = new AbortController();
    setBusy(true);
    setError(null);
    getJson<T>(url, controller.signal, bust)
      .then((fresh) => {
        memory.set(url, { data: fresh, at: Date.now() });
        setData(fresh);
        setBusy(false);
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setBusy(false);
      });
    return () => controller.abort();
  }, [url, tick]);

  return { data, error, loading: busy && !data, refreshing: busy && !!data, reload };
}
