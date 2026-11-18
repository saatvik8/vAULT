import type { FeedMode, SourceStatus } from '../types';

export interface SourceDef<T> {
  id: string;
  name: string;
  load: () => Promise<T[]>;
}

/** Run every source, tolerate individual failures, and report what happened. */
export async function collect<T>(defs: SourceDef<T>[]): Promise<{ items: T[]; sources: SourceStatus[] }> {
  const settled = await Promise.allSettled(defs.map((d) => d.load()));
  const items: T[] = [];
  const sources: SourceStatus[] = settled.map((result, i) => {
    const { id, name } = defs[i];
    if (result.status === 'fulfilled') {
      items.push(...result.value);
      return { id, name, ok: true, count: result.value.length };
    }
    return { id, name, ok: false, count: 0, error: (result.reason as Error)?.message ?? 'failed' };
  });
  return { items, sources };
}

export function modeOf(sources: SourceStatus[]): FeedMode {
  const ok = sources.filter((s) => s.ok).length;
  if (ok === 0) return 'sample';
  return ok === sources.length ? 'live' : 'partial';
}
