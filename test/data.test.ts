import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cached, clearCache } from '../src/lib/cache';
import { classifyTopics, isAboutAI } from '../src/lib/classify';
import { queryNews, queryPapers, queryTools, searchAll } from '../src/lib/query';
import { mergeNews, rssToNews } from '../src/lib/sources/news';
import { arxivToPapers, hfToPapers, mergePapers } from '../src/lib/sources/papers';
import { sampleLaunches, sampleNews, samplePapers } from '../src/lib/sources/sample';
import { hitsToLaunches, parseShowHn } from '../src/lib/sources/tools';
import { SEED_TOOLS } from '../src/lib/sources/tools-seed';
import { excerpt, leadSentences, normalizeUrl, stripHtml } from '../src/lib/text';
import { TOOL_CATEGORIES } from '../src/lib/types';
import { arxivAtom, hfDaily, hnShow, rss } from './fixtures';

test('text helpers', () => {
  assert.equal(stripHtml('<p>A &amp; B&nbsp;<b>c</b></p><script>x()</script>'), 'A & B c');
  assert.equal(normalizeUrl('https://www.Site.com/a/b/?utm_source=x&id=2'), 'site.com/a/b?id=2');
  assert.ok(excerpt('word '.repeat(100), 50).length <= 51);
  assert.equal(leadSentences('One. Two. Three. Four.'), 'One. Two.');
});

test('RSS: parses CDATA and escaped HTML, drops old and undated items', () => {
  const items = rssToNews(rss(), { id: 'fx', name: 'Fixture', aiOnly: true });
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Fixture: lab releases new model & weights');
  assert.equal(items[0].url, 'https://publisher.test/posts/new-model?utm_source=rss');
  assert.ok(!items[0].summary.includes('<') && !items[0].summary.includes('alert'));
  assert.ok(items[0].topics.includes('models') && items[0].topics.includes('funding'));
  assert.equal(items[1].title, 'Fixture: regulators publish draft AI law & guidance');
  assert.equal(items[1].summary, 'Plain escaped description about regulation.');
  assert.ok(items[1].topics.includes('policy'));
});

test('RSS: general feeds keep only AI items', () => {
  const items = rssToNews(rss().replaceAll('model', 'tractor').replaceAll('AI law', 'farm law'), { id: 'fx', name: 'Fixture', aiOnly: false });
  assert.equal(items.length, 0);
  assert.ok(isAboutAI('A new LLM') && !isAboutAI('Rain in Spain'));
  assert.deepEqual(classifyTopics('Startup raises $40 million Series B'), ['funding']);
});

test('news merge attaches Hacker News signal to the publisher item', () => {
  const pub = rssToNews(rss(), { id: 'fx', name: 'Fixture', aiOnly: true });
  const hn = { ...pub[0], source: 'Hacker News', sourceId: 'hn', points: 420, comments: 180, discussionUrl: 'https://news.ycombinator.com/item?id=9001' };
  const merged = mergeNews([...pub, hn]);
  assert.equal(merged.length, 2);
  const top = merged.find((m) => m.id === pub[0].id)!;
  assert.equal(top.source, 'Fixture');
  assert.equal(top.points, 420);
  assert.equal(queryNews(merged, { sort: 'discussed' })[0].id, top.id);
  assert.equal(queryNews(merged, { topic: 'policy' }).length, 1);
});

test('arXiv Atom: ids, authors, links, categories', () => {
  const papers = arxivToPapers(arxivAtom());
  assert.equal(papers.length, 2);
  const [a, b] = papers;
  assert.equal(a.id, '2611.00001');
  assert.equal(a.title, 'Fixture Paper One: A Study of Things');
  assert.deepEqual(a.authors, ['Ada Example', 'Bo Sample']);
  assert.equal(a.absUrl, 'https://arxiv.org/abs/2611.00001');
  assert.equal(a.pdfUrl, 'http://arxiv.org/pdf/2611.00001v2');
  assert.deepEqual(a.categories, ['cs.CL', 'cs.AI']);
  assert.equal(a.summary, 'We study things. Our method improves results by a margin.');
  assert.equal(a.summaryKind, 'excerpt');
  assert.equal(b.pdfUrl, 'https://arxiv.org/pdf/2611.00002');
});

test('Hugging Face: signal, provided summaries, bad rows skipped, bad shape rejected', () => {
  const papers = hfToPapers(hfDaily());
  assert.equal(papers.length, 2);
  assert.equal(papers[0].upvotes, 120);
  assert.equal(papers[0].summaryKind, 'provided');
  assert.equal(papers[1].summaryKind, 'excerpt');
  assert.throws(() => hfToPapers({ error: 'nope' }));
});

test('papers merge and ranking', () => {
  const merged = mergePapers([...hfToPapers(hfDaily()), ...arxivToPapers(arxivAtom())]);
  assert.equal(merged.length, 3);
  const one = merged.find((p) => p.id === '2611.00001')!;
  assert.deepEqual(one.categories, ['cs.CL', 'cs.AI']);
  assert.equal(one.upvotes, 120);
  assert.equal(one.summary, 'A plain summary supplied by the source.');

  const trending = queryPapers(merged, { view: 'trending' });
  assert.deepEqual(trending.map((p) => p.id), ['2611.00001', '2611.00003'], 'recent paper outranks an older one with more upvotes; no-signal papers excluded');
  const latest = queryPapers(merged, { view: 'latest' });
  assert.equal(latest[0].id, '2611.00002');
  assert.equal(queryPapers(merged, { view: 'latest', signalOnly: true }).length, 2);
});

test('Show HN launches', () => {
  assert.deepEqual(parseShowHn('Show HN: Fixturely – an open-source AI code review agent'), { name: 'Fixturely', tagline: 'An open-source AI code review agent' });
  const launches = hitsToLaunches(hnShow().hits);
  assert.equal(launches.length, 2, 'non-AI launch filtered out');
  assert.equal(launches[0].name, 'Fixturely');
  assert.equal(launches[0].category, 'coding');
  assert.equal(launches[1].url, 'https://news.ycombinator.com/item?id=9102');
  assert.equal(launches[1].category, 'audio');
});

test('tools directory: seed integrity and querying', () => {
  assert.equal(new Set(SEED_TOOLS.map((t) => t.id)).size, SEED_TOOLS.length, 'unique ids');
  for (const t of SEED_TOOLS) {
    assert.ok(TOOL_CATEGORIES.includes(t.category));
    assert.ok(/^https:\/\//.test(t.url));
    assert.ok(t.tagline.length > 10 && t.tagline.length < 90);
  }
  const all = [...SEED_TOOLS, ...hitsToLaunches(hnShow().hits)];
  assert.ok(queryTools(all, { view: 'popular' }).every((t) => t.origin === 'curated'));
  assert.equal(queryTools(all, { view: 'new' }).length, 2);
  assert.ok(queryTools(all, { view: 'popular', category: 'coding' }).length >= 5);
  assert.ok(queryTools(all, { view: 'popular', pricing: 'free' }).every((t) => t.pricing === 'free'));
  assert.equal(queryTools(all, { view: 'popular', q: 'cursor' })[0].name, 'Cursor');
});

test('search spans all three areas', () => {
  const data = { news: rssToNews(rss(), { id: 'fx', name: 'Fixture', aiOnly: true }), tools: SEED_TOOLS, papers: arxivToPapers(arxivAtom()) };
  const r = searchAll('fixture', data);
  assert.equal(r.news.length, 2);
  assert.equal(r.papers.length, 2);
  assert.equal(searchAll('claude', data).tools[0].name, 'Claude');
  assert.equal(searchAll('   ', data).news.length, 0);
});

test('sample data is always flagged and never links out', () => {
  for (const item of [...sampleNews(), ...sampleLaunches()]) {
    assert.equal(item.sample, true);
    assert.equal(item.url, '');
  }
  for (const p of samplePapers()) {
    assert.equal(p.sample, true);
    assert.equal(p.absUrl + p.pdfUrl, '');
  }
});

test('cache: de-duplicates, serves stale while refreshing, keeps stale on failure', async () => {
  clearCache();
  let calls = 0;
  const load = async () => ++calls;
  const [a, b] = await Promise.all([cached('k', 20, load), cached('k', 20, load)]);
  assert.deepEqual([a, b, calls], [1, 1, 1]);
  assert.equal(await cached('k', 20, load), 1);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(await cached('k', 20, load), 1, 'stale value returned immediately');
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(await cached('k', 20, load), 2, 'refreshed in background');
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(await cached('k', 20, async () => Promise.reject(new Error('down'))), 2, 'failure keeps stale');
});
