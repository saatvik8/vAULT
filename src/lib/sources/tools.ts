// Tools: a curated list of established tools plus live "Show HN" AI launches.

import { classifyTool, isAboutAI } from '../classify';
import { excerpt } from '../text';
import type { Feed, Tool } from '../types';
import { collect } from './collect';
import { hnItemUrl, searchHn, type HnHit } from './hn';
import { sampleLaunches } from './sample';
import { SEED_TOOLS } from './tools-seed';

/** "Show HN: Name – what it does" → name and one-line description. */
export function parseShowHn(title: string): { name: string; tagline: string } | null {
  const body = title.replace(/^show hn:\s*/i, '').trim();
  if (!body) return null;
  const m = /^(.{2,48}?)\s+[–—-]\s+(.+)$/.exec(body) ?? /^(.{2,48}?)[:,]\s+(.+)$/.exec(body);
  if (m) return { name: m[1].trim(), tagline: sentence(m[2]) };
  // No separator: treat the whole title as the description.
  const words = body.split(' ');
  return { name: excerpt(words.slice(0, 4).join(' '), 40), tagline: sentence(body) };
}

function sentence(text: string): string {
  const t = excerpt(text.trim(), 120);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function hitsToLaunches(hits: HnHit[]): Tool[] {
  const tools: Tool[] = [];
  for (const hit of hits) {
    if (!hit.title || !hit.created_at || !/^show hn:/i.test(hit.title) || !isAboutAI(hit.title)) continue;
    const parsed = parseShowHn(hit.title);
    if (!parsed) continue;
    const discussionUrl = hnItemUrl(hit.objectID);
    tools.push({
      id: `launch-${hit.objectID}`,
      name: parsed.name,
      tagline: parsed.tagline,
      category: classifyTool(hit.title),
      pricing: 'unknown',
      url: hit.url || discussionUrl,
      origin: 'launch',
      addedAt: new Date(hit.created_at).toISOString(),
      points: hit.points ?? 0,
      comments: hit.num_comments ?? 0,
      discussionUrl,
    });
  }
  return tools.sort((a, b) => Date.parse(b.addedAt!) - Date.parse(a.addedAt!)).slice(0, 60);
}

export async function loadTools(): Promise<Feed<Tool>> {
  const { items, sources } = await collect<Tool>([
    { id: 'curated', name: 'Curated list', load: async () => SEED_TOOLS },
    {
      id: 'show-hn',
      name: 'Show HN launches',
      load: async () =>
        hitsToLaunches(await searchHn({ tag: 'show_hn', terms: ['AI', 'LLM', 'agent', 'GPT', 'Claude'], minPoints: 15, sinceDays: 30 })),
    },
  ]);
  const launchesOk = sources.find((s) => s.id === 'show-hn')?.ok;
  return {
    // The curated list is always available; if launches fail, show labelled placeholders for "New".
    items: launchesOk ? items : [...items, ...sampleLaunches()],
    meta: { fetchedAt: new Date().toISOString(), mode: launchesOk ? 'live' : 'partial', sources },
  };
}
