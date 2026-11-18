// Hand-written fixtures shaped like the documented source formats. They are test
// inputs only: the titles are deliberately generic and are never shown in the app.

const recent = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600_000);

export const rss = () => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Fixture Publisher</title>
    <link>https://publisher.test/</link>
    <atom:link href="https://publisher.test/feed" rel="self" type="application/rss+xml"/>
    <item>
      <title><![CDATA[Fixture: lab releases new model & weights]]></title>
      <link>https://publisher.test/posts/new-model?utm_source=rss</link>
      <guid isPermaLink="false">p-1</guid>
      <pubDate>${recent(3).toUTCString()}</pubDate>
      <dc:creator>Fixture Writer</dc:creator>
      <description><![CDATA[<p>The <b>model</b> is available through the API today.&nbsp;It raises $50 million.</p><script>alert(1)</script>]]></description>
      <category>AI</category>
    </item>
    <item>
      <title>Fixture: regulators publish draft AI law &amp; guidance</title>
      <link>https://publisher.test/posts/policy/</link>
      <pubDate>${recent(30).toUTCString()}</pubDate>
      <description>Plain &lt;em&gt;escaped&lt;/em&gt; description about regulation.</description>
    </item>
    <item>
      <title>Fixture: too old to show</title>
      <link>https://publisher.test/posts/old</link>
      <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
      <description>Old.</description>
    </item>
    <item>
      <title>Fixture: no date</title>
      <link>https://publisher.test/posts/nodate</link>
    </item>
  </channel>
</rss>`;

export const arxivAtom = () => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <title type="html">ArXiv Query</title>
  <id>http://arxiv.org/api/abc</id>
  <entry>
    <id>http://arxiv.org/abs/2611.00001v2</id>
    <updated>${recent(10).toISOString()}</updated>
    <published>${recent(20).toISOString()}</published>
    <title>Fixture Paper One:
  A Study of Things</title>
    <summary>  We study things. Our method improves results by a margin.
 A third sentence adds detail. A fourth one too.
    </summary>
    <author><name>Ada Example</name></author>
    <author><name>Bo Sample</name><arxiv:affiliation>Test Lab</arxiv:affiliation></author>
    <link href="http://arxiv.org/abs/2611.00001v2" rel="alternate" type="text/html"/>
    <link title="pdf" href="http://arxiv.org/pdf/2611.00001v2" rel="related" type="application/pdf"/>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2611.00002v1</id>
    <updated>${recent(5).toISOString()}</updated>
    <published>${recent(5).toISOString()}</published>
    <title>Fixture Paper Two</title>
    <summary>Only arXiv knows this one.</summary>
    <author><name>Cy Placeholder</name></author>
    <link href="http://arxiv.org/abs/2611.00002v1" rel="alternate" type="text/html"/>
    <category term="cs.CV" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
</feed>`;

export const hfDaily = () => [
  {
    publishedAt: recent(18).toISOString(),
    title: 'Fixture Paper One: A Study of Things',
    numComments: 4,
    paper: {
      id: '2611.00001',
      title: 'Fixture Paper One:\n A Study of Things',
      summary: 'We study things. Our method improves results by a margin.',
      ai_summary: 'A plain summary supplied by the source.',
      publishedAt: recent(20).toISOString(),
      upvotes: 120,
      authors: [{ name: 'Ada Example' }, { name: 'Bo Sample' }],
    },
  },
  {
    publishedAt: recent(100).toISOString(),
    numComments: 0,
    paper: { id: '2611.00003', title: 'Fixture Paper Three', summary: 'Older but upvoted. Second sentence.', publishedAt: recent(110).toISOString(), upvotes: 150, authors: [] },
  },
  { paper: { title: 'missing id, must be skipped' } },
];

export const hnStories = () => ({
  hits: [
    { objectID: '9001', title: 'Fixture: lab releases new AI model', url: 'https://www.publisher.test/posts/new-model', points: 420, num_comments: 180, created_at: recent(2).toISOString() },
    { objectID: '9002', title: 'Fixture: an LLM benchmark study', url: 'https://other.test/bench', points: 90, num_comments: 12, created_at: recent(8).toISOString() },
    { objectID: '9003', title: 'Fixture: a post about gardening', url: 'https://other.test/garden', points: 300, num_comments: 50, created_at: recent(4).toISOString() },
    { objectID: '9004', title: 'Ask HN: which AI editor do you use?', url: null, points: 70, num_comments: 90, created_at: recent(6).toISOString() },
  ],
});

export const hnShow = () => ({
  hits: [
    { objectID: '9101', title: 'Show HN: Fixturely – an open-source AI code review agent', url: 'https://fixturely.test', points: 88, num_comments: 31, created_at: recent(12).toISOString() },
    { objectID: '9102', title: 'Show HN: I built a voice LLM for podcasts', url: null, points: 40, num_comments: 9, created_at: recent(50).toISOString() },
    { objectID: '9103', title: 'Show HN: A keyboard for cats', url: 'https://cats.test', points: 500, num_comments: 100, created_at: recent(5).toISOString() },
  ],
});
