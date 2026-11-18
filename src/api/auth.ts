// Account and library endpoints. Same `(Request) => Response` shape as handlers.ts.

import { createToken, currentUser, DUMMY_HASH, hashPassword, sessionCookie, verifyPassword } from '../lib/auth/session';
import { getStore } from '../lib/auth/store';

type Handler = (req: Request) => Promise<Response>;

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

/** Browsers send Origin on cross-site POST/PUT; reject when it isn't this site. */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function guard(handler: Handler): Handler {
  return async (req) => {
    try {
      if (req.method !== 'GET' && !sameOrigin(req)) return json({ error: 'Cross-site request refused.' }, 403);
      return await handler(req);
    } catch (err) {
      console.error('[api]', new URL(req.url).pathname, err);
      return json({ error: 'Something went wrong. Try again.' }, 500);
    }
  };
}

async function body(req: Request, maxBytes: number): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/* ── Rate limiting (per process; use a shared store when running several instances) ── */

const attempts = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 15 * 60_000;

function limited(key: string, max: number): boolean {
  const now = Date.now();
  if (attempts.size > 5000) for (const [k, v] of attempts) if (v.reset < now) attempts.delete(k);
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  return ++entry.count > max;
}

const clientIp = (req: Request) => (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();

function credentials(data: Record<string, unknown> | null): { email: string; password: string } | null {
  if (!data || typeof data.email !== 'string' || typeof data.password !== 'string') return null;
  return { email: data.email.trim().toLowerCase(), password: data.password };
}

const publicUser = (u: { id: string; email: string }) => ({ id: u.id, email: u.email });

/* ── Handlers ─────────────────────────────────────────────────────────── */

export const register: Handler = guard(async (req) => {
  if (limited(`register:${clientIp(req)}`, 10)) return json({ error: 'Too many attempts. Try again in a few minutes.' }, 429);
  const input = credentials(await body(req, 2000));
  if (!input) return json({ error: 'Enter an email and a password.' }, 400);
  if (input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return json({ error: 'Enter a valid email address.' }, 400);
  if (input.password.length < 8) return json({ error: 'Use a password of at least 8 characters.' }, 400);
  if (input.password.length > 200) return json({ error: 'Use a password of 200 characters or fewer.' }, 400);

  const user = await getStore().createUser(input.email, await hashPassword(input.password));
  if (!user) return json({ error: 'An account with this email already exists. Log in instead.' }, 409);
  return json({ user: publicUser(user) }, 201, { 'set-cookie': sessionCookie(req, await createToken(user.id)) });
});

export const login: Handler = guard(async (req) => {
  const input = credentials(await body(req, 2000));
  if (!input) return json({ error: 'Enter your email and password.' }, 400);
  if (limited(`login:${clientIp(req)}:${input.email}`, 10)) return json({ error: 'Too many attempts. Try again in a few minutes.' }, 429);

  const user = await getStore().findByEmail(input.email);
  const ok = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return json({ error: 'Email or password is incorrect.' }, 401);
  return json({ user: publicUser(user) }, 200, { 'set-cookie': sessionCookie(req, await createToken(user.id)) });
});

export const logout: Handler = guard(async (req) => json({ ok: true }, 200, { 'set-cookie': sessionCookie(req, null) }));

export const me: Handler = guard(async (req) => {
  const user = await currentUser(req);
  return json({ user: user ? publicUser(user) : null });
});

/* ── Library ──────────────────────────────────────────────────────────── */

const str = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;

/** Accept only the known shape, so the server never stores arbitrary client data. */
function cleanVault(data: Record<string, unknown> | null) {
  if (!data || !Array.isArray(data.items) || !Array.isArray(data.collections)) return null;
  if (data.items.length > 2000 || data.collections.length > 200) return null;
  const collections = [];
  for (const c of data.collections as Record<string, unknown>[]) {
    if (!c || !str(c.id, 64) || !str(c.name, 60) || !str(c.createdAt, 40)) return null;
    collections.push({ id: c.id, name: c.name, createdAt: c.createdAt });
  }
  const items = [];
  for (const i of data.items as Record<string, unknown>[]) {
    if (!i || !str(i.key, 200) || !str(i.id, 190) || !str(i.title, 500) || !str(i.url, 2000) || !str(i.subtitle, 1000) || !str(i.savedAt, 40) || !str(i.note, 2000)) return null;
    if (i.kind !== 'news' && i.kind !== 'tool' && i.kind !== 'paper') return null;
    if (i.url && !/^https?:\/\//i.test(i.url)) return null;
    if (!Array.isArray(i.collectionIds) || i.collectionIds.length > 200 || !i.collectionIds.every((c) => str(c, 64))) return null;
    items.push({ key: i.key, kind: i.kind, id: i.id, title: i.title, url: i.url, subtitle: i.subtitle, savedAt: i.savedAt, note: i.note, collectionIds: i.collectionIds });
  }
  return { items, collections };
}

export const getVault: Handler = guard(async (req) => {
  const user = await currentUser(req);
  if (!user) return json({ error: 'Log in to load your library.' }, 401);
  return json((await getStore().getVault(user.id)) ?? { items: [], collections: [] });
});

export const putVault: Handler = guard(async (req) => {
  const user = await currentUser(req);
  if (!user) return json({ error: 'Log in to save to your library.' }, 401);
  const state = cleanVault(await body(req, 1_500_000));
  if (!state) return json({ error: 'That library data wasn’t valid or was too large.' }, 400);
  await getStore().putVault(user.id, state);
  return json({ ok: true });
});
