// One place for outbound requests: timeout, identifying User-Agent, uniform errors.

const TIMEOUT_MS = 8000;
const USER_AGENT = `Vault/0.1 (AI news reader; ${process.env.VAULT_CONTACT ?? 'contact not set'})`;

function target(url: string): string {
  // Test hook: VAULT_UPSTREAM_REWRITE=http://127.0.0.1:4999 sends every request to a
  // local mock as /<host>/<path>. Never set this in production.
  const base = process.env.VAULT_UPSTREAM_REWRITE;
  if (!base) return url;
  const u = new URL(url);
  return `${base.replace(/\/$/, '')}/${u.host}${u.pathname}${u.search}`;
}

export async function fetchText(url: string, accept = '*/*'): Promise<string> {
  if (process.env.VAULT_OFFLINE === '1') throw new Error('offline mode (VAULT_OFFLINE=1)');
  let res: Response;
  try {
    res = await fetch(target(url), {
      headers: { 'user-agent': USER_AGENT, accept },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
      cache: 'no-store', // Vault has its own cache (src/lib/cache.ts)
    });
  } catch (err) {
    const e = err as Error & { cause?: { code?: string } };
    if (e.name === 'TimeoutError') throw new Error(`timed out after ${TIMEOUT_MS / 1000}s`);
    throw new Error(e.cause?.code ? `network error (${e.cause.code})` : 'network error');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function fetchJson<T>(url: string): Promise<T> {
  const text = await fetchText(url, 'application/json');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('response was not valid JSON');
  }
}
