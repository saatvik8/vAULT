// A small, tolerant reader for RSS 2.0 and Atom feeds. It only extracts the handful of
// fields Vault needs, which keeps the app free of an XML dependency. If you later need
// full fidelity (namespaces, enclosures), swap this file for a real parser; callers only
// depend on `parseFeed`.

import { decodeEntities, stripHtml } from './text';

export interface FeedLink {
  href: string;
  rel?: string;
  title?: string;
  type?: string;
}

export interface FeedEntry {
  id: string;
  title: string;
  link: string;
  date: string | null;
  summaryHtml: string;
  authors: string[];
  categories: string[];
  links: FeedLink[];
}

function unwrap(raw: string): string {
  if (raw.includes('<![CDATA[')) return raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  return decodeEntities(raw).trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inner(block: string, tag: string): string {
  const re = new RegExp(`<${escapeRe(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeRe(tag)}>`, 'i');
  const m = re.exec(block);
  return m ? unwrap(m[1]) : '';
}

function innerAll(block: string, tag: string): string[] {
  const re = new RegExp(`<${escapeRe(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeRe(tag)}>`, 'gi');
  return [...block.matchAll(re)].map((m) => unwrap(m[1]));
}

function attrs(tagSource: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tagSource.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? '');
  }
  return out;
}

function toIso(value: string): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function parseFeed(xml: string): FeedEntry[] {
  const isAtom = /<entry[\s>]/i.test(xml) && !/<item[\s>]/i.test(xml);
  const blockRe = isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi;
  const entries: FeedEntry[] = [];

  for (const [block] of xml.matchAll(blockRe)) {
    const links: FeedLink[] = [...block.matchAll(/<link\b([^>]*?)\/?>/gi)]
      .map((m) => attrs(m[1]))
      .filter((a) => a.href)
      .map((a) => ({ href: a.href, rel: a.rel, title: a.title, type: a.type }));

    const textLink = inner(block, 'link');
    const alternate = links.find((l) => !l.rel || l.rel === 'alternate');
    const link = /^https?:\/\//i.test(textLink) ? textLink : alternate?.href ?? links[0]?.href ?? '';

    const date =
      toIso(inner(block, 'pubDate')) ??
      toIso(inner(block, 'published')) ??
      toIso(inner(block, 'dc:date')) ??
      toIso(inner(block, 'updated'));

    const summaryHtml =
      inner(block, 'description') ||
      inner(block, 'summary') ||
      inner(block, 'content:encoded') ||
      inner(block, 'content');

    const authors = isAtom
      ? innerAll(block, 'author').map((a) => stripHtml(inner(a, 'name') || a)).filter(Boolean)
      : [inner(block, 'dc:creator') || inner(block, 'author')].map(stripHtml).filter(Boolean);

    const categories = [
      ...[...block.matchAll(/<category\b([^>]*?)\/?>/gi)].map((m) => attrs(m[1]).term).filter(Boolean),
      ...innerAll(block, 'category').map(stripHtml).filter(Boolean),
    ];

    entries.push({
      id: inner(block, 'id') || inner(block, 'guid') || link,
      title: stripHtml(inner(block, 'title')),
      link,
      date,
      summaryHtml,
      authors,
      categories: [...new Set(categories)],
      links,
    });
  }
  return entries;
}
