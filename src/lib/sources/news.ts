// News: publisher RSS/Atom feeds plus Hacker News stories filtered for AI.
// To add a source, append to RSS_SOURCES. Nothing else needs to change.

import { classifyTopics, isAboutAI } from '../classify';
import { fetchText } from '../http';
import { excerpt, hashId, normalizeUrl, stripHtml } from '../text';
import type { Feed, NewsItem } from '../types';
import { parseFeed } from '../xml';
import { collect, modeOf, type SourceDef } from './collect';
import { hnItemUrl, searchHn } from './hn';
import { sampleNews } from './sample';

interface RssSource {
  id: string;
  name: string;
  url: string;
  /** false = general feed; keep only items that mention AI. */
  aiOnly: boolean;
}

export const RSS_SOURCES: RssSource[] = [
  { id: 'openai', name: 'OpenAI', url: 'https://openai.com/news/rss.xml', aiOnly: true },
  { id: 'deepmind', name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', aiOnly: true },
  { id: 'google-ai', name: 'Google AI', url: 'https://blog.google/technology/ai/rss/', aiOnly: true },
  { id: 'huggingface', name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', aiOnly: true },
  { id: 'mit-tr', name: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', aiOnly: true },
  { id: 'verge', name: 'The Verge', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', aiOnly: true },
  { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', aiOnly: true },
  { id: 'ars', name: 'Ars Technica', url: 'https://arstechnica.com/ai/feed/', aiOnly: true },
];

const MAX_AGE_DAYS = 14;
const HN_TERMS = ['AI', 'LLM', 'GPT', 'OpenAI', 'Anthropic', 'Claude', 'Gemini'];

export function rssToNews(xml: string, source: Pick<RssSource, 'id' | 'name' | 'aiOnly'>): NewsItem[] {
  const cutoff = Date.now() - MAX_AGE_DAYS * 86400_000;
  const items: NewsItem[] = [];
  for (const entry of parseFeed(xml)) {
    if (!entry.title || !entry.link || !entry.date) continue;
    if (Date.parse(entry.date) < cutoff) continue;
    const summary = excerpt(stripHtml(entry.summaryHtml), 240);
    const text = `${entry.title} ${summary}`;
    if (!source.aiOnly && !isAboutAI(text)) continue;
    items.push({
      id: hashId(normalizeUrl(entry.link)),
      title: entry.title,
      url: entry.link,
      source: source.name,
      sourceId: source.id,
      publishedAt: entry.date,
      summary,
      topics: classifyTopics(text),
    });
  }
  return items;
}

async function loadHn(): Promise<NewsItem[]> {
  const hits = await searchHn({ tag: 'story', terms: HN_TERMS, minPoints: 40, sinceDays: 7 });
  const items: NewsItem[] = [];
  for (const hit of hits) {
    if (!hit.title || !hit.created_at || !isAboutAI(hit.title)) continue;
    if (/^(show|ask|tell) hn\b/i.test(hit.title)) continue; // launches live in Tools
    const discussionUrl = hnItemUrl(hit.objectID);
    const url = hit.url || discussionUrl;
    items.push({
      id: hashId(normalizeUrl(url)),
      title: hit.title,
      url,
      source: 'Hacker News',
      sourceId: 'hn',
      publishedAt: new Date(hit.created_at).toISOString(),
      summary: hit.story_text ? excerpt(stripHtml(hit.story_text), 240) : '',
      topics: classifyTopics(hit.title),
      points: hit.points ?? 0,
      comments: hit.num_comments ?? 0,
      discussionUrl,
    });
  }
  return items;
}

/** Merge sources: when HN discussed a publisher's story, keep the publisher item and attach the HN signal. */
export function mergeNews(all: NewsItem[]): NewsItem[] {
  const byId = new Map<string, NewsItem>();
  for (const item of all) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    const publisher = existing.sourceId !== 'hn' ? existing : item.sourceId !== 'hn' ? item : existing;
    const hn = existing.sourceId === 'hn' ? existing : item.sourceId === 'hn' ? item : undefined;
    byId.set(item.id, hn ? { ...publisher, points: hn.points, comments: hn.comments, discussionUrl: hn.discussionUrl } : publisher);
  }
  return [...byId.values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 250);
}

export async function loadNews(): Promise<Feed<NewsItem>> {
  const defs: SourceDef<NewsItem>[] = [
    ...RSS_SOURCES.map((s) => ({
      id: s.id,
      name: s.name,
      load: async () => rssToNews(await fetchText(s.url, 'application/rss+xml, application/atom+xml, application/xml, text/xml'), s),
    })),
    { id: 'hn', name: 'Hacker News', load: loadHn },
  ];
  const { items, sources } = await collect(defs);
  const mode = modeOf(sources);
  return {
    items: mode === 'sample' ? sampleNews() : mergeNews(items),
    meta: { fetchedAt: new Date().toISOString(), mode, sources },
  };
}
