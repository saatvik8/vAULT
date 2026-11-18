// Shared domain types. Used by the server data layer, the API and the client.

export const TOPICS = ['models', 'research', 'products', 'policy', 'funding'] as const;
export type Topic = (typeof TOPICS)[number];

export const TOOL_CATEGORIES = [
  'assistants',
  'writing',
  'coding',
  'image',
  'video',
  'audio',
  'agents',
  'productivity',
  'research',
  'developer',
] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export type Pricing = 'free' | 'freemium' | 'paid' | 'unknown';

export interface NewsItem {
  id: string;
  title: string;
  /** Link to the original. Empty for sample items. */
  url: string;
  source: string;
  sourceId: string;
  publishedAt: string;
  summary: string;
  topics: Topic[];
  /** Hacker News signal, when the story was discussed there. */
  points?: number;
  comments?: number;
  discussionUrl?: string;
  sample?: boolean;
}

export interface Tool {
  id: string;
  name: string;
  tagline: string;
  category: ToolCategory;
  pricing: Pricing;
  url: string;
  /** curated = hand-maintained list of established tools; launch = live "Show HN" post. */
  origin: 'curated' | 'launch';
  addedAt?: string;
  points?: number;
  comments?: number;
  discussionUrl?: string;
  sample?: boolean;
}

export interface Paper {
  /** arXiv identifier without version, e.g. 2511.01234 */
  id: string;
  title: string;
  authors: string[];
  summary: string;
  /** provided = summary supplied by the source; excerpt = first sentences of the abstract. */
  summaryKind: 'provided' | 'excerpt';
  abstract: string;
  publishedAt: string;
  absUrl: string;
  pdfUrl: string;
  categories: string[];
  upvotes?: number;
  comments?: number;
  /** Time-decayed community score used for the Trending view. */
  score?: number;
  sample?: boolean;
}

export interface SourceStatus {
  id: string;
  name: string;
  ok: boolean;
  count: number;
  error?: string;
}

export type FeedMode = 'live' | 'partial' | 'sample';

export interface FeedMeta {
  fetchedAt: string;
  mode: FeedMode;
  sources: SourceStatus[];
}

export interface Feed<T> {
  items: T[];
  meta: FeedMeta;
}

export interface SearchResults {
  query: string;
  news: NewsItem[];
  tools: Tool[];
  papers: Paper[];
}

export interface StatusReport {
  mode: FeedMode;
  checkedAt: string;
  ok: number;
  total: number;
  sources: (SourceStatus & { area: 'news' | 'tools' | 'papers' })[];
}
