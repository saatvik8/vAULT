// In-memory cache with stale-while-revalidate and in-flight de-duplication.
//
// - Fresh entry: returned immediately.
// - Stale entry: returned immediately, refreshed in the background.
// - No entry: the loader is awaited; concurrent callers share one request.
// - Loader throws while a stale entry exists: the stale entry is kept.
//
// The store is per process. To share it across instances, implement the same
// `cached` signature on top of Redis or a KV store.

interface Entry<T> {
  value: T;
  expires: number;
}

// Kept on globalThis so all route handlers (and dev hot reloads) share one cache.
const g = globalThis as typeof globalThis & { __vaultCache?: { store: Map<string, Entry<unknown>>; inflight: Map<string, Promise<unknown>> } };
const { store, inflight } = (g.__vaultCache ??= { store: new Map(), inflight: new Map() });

export async function cached<T>(
  key: string,
  ttlMs: number | ((value: T) => number),
  loader: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  const now = Date.now();
  if (hit && hit.expires > now) return hit.value;

  let pending = inflight.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = loader()
      .then((value) => {
        const ttl = typeof ttlMs === 'function' ? ttlMs(value) : ttlMs;
        store.set(key, { value, expires: Date.now() + ttl });
        return value;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }

  if (hit) {
    pending.catch(() => undefined); // keep serving stale if the refresh fails
    return hit.value;
  }
  return pending;
}

export function clearCache(): void {
  store.clear();
  inflight.clear();
}
