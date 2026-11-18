// Local stand-in for the third-party sources, used to exercise the live code path
// end to end without network access:
//
//   tsx test/mock-upstream.ts            # port 4999
//   VAULT_UPSTREAM_REWRITE=http://127.0.0.1:4999 npm start
//
// Set MOCK_FAIL to a comma-separated list of hosts to make them return HTTP 503.

import { createServer } from 'node:http';
import { arxivAtom, hfDaily, hnShow, hnStories, rss } from './fixtures';

const fail = (process.env.MOCK_FAIL ?? '').split(',').filter(Boolean);

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://mock');
  const [, host] = url.pathname.split('/');
  const send = (status: number, type: string, body: string) => {
    res.writeHead(status, { 'content-type': type });
    res.end(body);
  };
  if (fail.includes(host)) return send(503, 'text/plain', 'unavailable');
  if (host === 'hn.algolia.com') {
    return send(200, 'application/json', JSON.stringify(url.searchParams.get('tags') === 'show_hn' ? hnShow() : hnStories()));
  }
  if (host === 'huggingface.co' && url.pathname.includes('/api/daily_papers')) return send(200, 'application/json', JSON.stringify(hfDaily()));
  if (host === 'export.arxiv.org') return send(200, 'application/atom+xml', arxivAtom());
  // Every publisher feed gets the same RSS document with its own host in the links.
  return send(200, 'application/rss+xml', rss().replaceAll('publisher.test', host === 'openai.com' ? 'publisher.test' : host));
}).listen(Number(process.env.MOCK_PORT ?? 4999), () => console.log('mock upstream on :' + (process.env.MOCK_PORT ?? 4999)));
