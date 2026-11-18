// Papers: Hugging Face daily papers (community upvotes and comments) for Trending,
// arXiv API for Latest. Papers found in both carry the community signal in Latest too.

import { fetchJson, fetchText } from '../http';
import { leadSentences, stripHtml } from '../text';
import type { Feed, Paper } from '../types';
import { parseFeed } from '../xml';
import { collect, modeOf } from './collect';
import { samplePapers } from './sample';

export const ARXIV_CATEGORIES = ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV'];

/**
 * Summaries. Without a language-model key, Vault uses the source's own summary when
 * one exists and otherwise the opening sentences of the abstract, labelled as an
 * excerpt. To produce true plain-language rewrites, implement this interface with a
 * model call and pass it to `loadPapers`.
 */
export interface Summarizer {
  summarize(paper: { title: string; abstract: string }): Promise<string | null>;
}

const arxivId = (raw: string) => raw.replace(/^https?:\/\/arxiv\.org\/abs\//, '').replace(/v\d+$/, '');
const cleanTitle = (t: string) => t.replace(/\s+/g, ' ').trim();

export function arxivToPapers(xml: string): Paper[] {
  const papers: Paper[] = [];
  for (const entry of parseFeed(xml)) {
    if (!entry.title || !entry.date || !entry.id) continue;
    const id = arxivId(entry.id);
    const abstract = stripHtml(entry.summaryHtml);
    papers.push({
      id,
      title: cleanTitle(entry.title),
      authors: entry.authors,
      summary: leadSentences(abstract),
      summaryKind: 'excerpt',
      abstract,
      publishedAt: entry.date,
      absUrl: `https://arxiv.org/abs/${id}`,
      pdfUrl: entry.links.find((l) => l.title === 'pdf' || l.type === 'application/pdf')?.href ?? `https://arxiv.org/pdf/${id}`,
      categories: entry.categories.filter((c) => /^[a-z-]+\.[A-Z]{2}$/.test(c)),
    });
  }
  return papers;
}

interface HfDaily {
  publishedAt?: string;
  numComments?: number;
  paper?: {
    id?: string;
    title?: string;
    summary?: string;
    ai_summary?: string;
    publishedAt?: string;
    upvotes?: number;
    authors?: { name?: string }[];
  };
}

/** Upvotes and comments, decayed by days since the paper was featured. */
export function trendScore(upvotes: number, comments: number, featuredAt: string, now = Date.now()): number {
  const ageDays = Math.max(0, (now - Date.parse(featuredAt)) / 86400_000);
  return (upvotes + 2 * comments) / Math.pow(ageDays + 2, 1.2);
}

export function hfToPapers(rows: unknown, now = Date.now()): Paper[] {
  if (!Array.isArray(rows)) throw new Error('unexpected response shape');
  const papers: Paper[] = [];
  for (const row of rows as HfDaily[]) {
    const p = row?.paper;
    if (!p?.id || !p.title) continue;
    const abstract = (p.summary ?? '').replace(/\s+/g, ' ').trim();
    const publishedAt = p.publishedAt ?? row.publishedAt;
    if (!publishedAt || Number.isNaN(Date.parse(publishedAt))) continue;
    const upvotes = p.upvotes ?? 0;
    const comments = row.numComments ?? 0;
    const provided = p.ai_summary?.trim();
    papers.push({
      id: p.id,
      title: cleanTitle(p.title),
      authors: (p.authors ?? []).map((a) => a?.name ?? '').filter(Boolean),
      summary: provided || leadSentences(abstract),
      summaryKind: provided ? 'provided' : 'excerpt',
      abstract,
      publishedAt: new Date(publishedAt).toISOString(),
      absUrl: `https://arxiv.org/abs/${p.id}`,
      pdfUrl: `https://arxiv.org/pdf/${p.id}`,
      categories: [],
      upvotes,
      comments,
      score: trendScore(upvotes, comments, row.publishedAt ?? publishedAt, now),
    });
  }
  return papers;
}

/** One record per paper: arXiv metadata, plus Hugging Face signal and summary where available. */
export function mergePapers(all: Paper[]): Paper[] {
  const byId = new Map<string, Paper>();
  for (const paper of all) {
    const existing = byId.get(paper.id);
    if (!existing) {
      byId.set(paper.id, paper);
      continue;
    }
    const signal = existing.upvotes !== undefined ? existing : paper;
    const meta = existing.categories.length ? existing : paper;
    byId.set(paper.id, {
      ...meta,
      summary: signal.summaryKind === 'provided' ? signal.summary : meta.summary,
      summaryKind: signal.summaryKind === 'provided' ? 'provided' : meta.summaryKind,
      upvotes: signal.upvotes,
      comments: signal.comments,
      score: signal.score,
    });
  }
  return [...byId.values()];
}

export async function loadPapers(summarizer?: Summarizer): Promise<Feed<Paper>> {
  const query = ARXIV_CATEGORIES.map((c) => `cat:${c}`).join(' OR ');
  const { items, sources } = await collect<Paper>([
    {
      id: 'hf-papers',
      name: 'Hugging Face Papers',
      load: async () => hfToPapers(await fetchJson('https://huggingface.co/api/daily_papers?limit=100')),
    },
    {
      id: 'arxiv',
      name: 'arXiv',
      load: async () =>
        arxivToPapers(
          await fetchText(
            'https://export.arxiv.org/api/query?' +
              new URLSearchParams({ search_query: query, sortBy: 'submittedDate', sortOrder: 'descending', max_results: '80' }),
            'application/atom+xml',
          ),
        ),
    },
  ]);
  const mode = modeOf(sources);
  let papers = mode === 'sample' ? samplePapers() : mergePapers(items);

  if (summarizer && mode !== 'sample') {
    papers = await Promise.all(
      papers.map(async (p) => {
        if (p.summaryKind === 'provided') return p;
        const s = await summarizer.summarize(p).catch(() => null);
        return s ? { ...p, summary: s, summaryKind: 'provided' as const } : p;
      }),
    );
  }
  return { items: papers, meta: { fetchedAt: new Date().toISOString(), mode, sources } };
}
