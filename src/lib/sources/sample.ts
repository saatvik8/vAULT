// Placeholder content shown only when live sources cannot be reached. Every item is
// flagged `sample: true`, has no outbound link, and is worded so it cannot be mistaken
// for a real story, paper or product. The UI badges each one and shows a banner.

import type { NewsItem, Paper, Tool } from '../types';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export function sampleNews(): NewsItem[] {
  const rows: [string, string, NewsItem['topics'], number][] = [
    ['Placeholder: a lab announces a new model family', 'This is where the summary of a model release would appear, taken from the publisher’s feed.', ['models'], 2],
    ['Placeholder: a research team publishes an evaluation study', 'This is where a short description of a research result would appear.', ['research'], 5],
    ['Placeholder: an assistant gains a new product feature', 'This is where a short description of a product update would appear.', ['products'], 9],
    ['Placeholder: a regulator proposes rules for AI systems', 'This is where a short description of a policy development would appear.', ['policy'], 14],
    ['Placeholder: a startup closes a funding round', 'This is where a short description of a funding announcement would appear.', ['funding'], 20],
    ['Placeholder: an open-weights model is released', 'This is where the summary of a second model story would appear.', ['models', 'research'], 27],
  ];
  return rows.map(([title, summary, topics, h], i) => ({
    id: `sample-news-${i}`,
    title,
    url: '',
    source: 'Sample data',
    sourceId: 'sample',
    publishedAt: hoursAgo(h),
    summary,
    topics,
    points: (6 - i) * 10,
    comments: (6 - i) * 4,
    sample: true,
  }));
}

export function sampleLaunches(): Tool[] {
  const rows: [string, string, Tool['category'], number][] = [
    ['Placeholder Coder', 'Where a newly launched coding tool would be described.', 'coding', 6],
    ['Placeholder Voice', 'Where a newly launched audio tool would be described.', 'audio', 30],
    ['Placeholder Agent', 'Where a newly launched agent framework would be described.', 'agents', 52],
    ['Placeholder Notes', 'Where a newly launched productivity tool would be described.', 'productivity', 80],
  ];
  return rows.map(([name, tagline, category, h], i) => ({
    id: `sample-tool-${i}`,
    name,
    tagline,
    category,
    pricing: 'unknown',
    url: '',
    origin: 'launch',
    addedAt: hoursAgo(h),
    sample: true,
  }));
}

export function samplePapers(): Paper[] {
  const rows: [string, string[], number][] = [
    ['Placeholder: a method for more efficient training', ['cs.LG'], 8],
    ['Placeholder: a benchmark for long-context reasoning', ['cs.CL', 'cs.AI'], 20],
    ['Placeholder: a vision model with a new architecture', ['cs.CV'], 33],
    ['Placeholder: an analysis of agent behaviour', ['cs.AI'], 50],
    ['Placeholder: a study of evaluation reliability', ['cs.CL'], 70],
  ];
  return rows.map(([title, categories, h], i) => ({
    id: `sample-paper-${i}`,
    title,
    authors: ['Sample Author', 'Example Researcher'],
    summary: 'This is where a short summary of the abstract would appear.',
    summaryKind: 'excerpt',
    abstract: 'This is where the full abstract would appear. Live sources could not be reached, so Vault is showing placeholder entries instead of real papers.',
    publishedAt: hoursAgo(h),
    absUrl: '',
    pdfUrl: '',
    categories,
    upvotes: (5 - i) * 12,
    comments: 5 - i,
    score: 5 - i,
    sample: true,
  }));
}
