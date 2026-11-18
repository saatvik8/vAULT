// Passwords (scrypt) and sessions (HMAC-signed, httpOnly cookie). No dependencies.

import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dataDir, getStore, type User } from './store';

export const SESSION_COOKIE = 'vault_session';
const SESSION_DAYS = 30;

/* ── Passwords ────────────────────────────────────────────────────────── */

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64url')}$${(await derive(password, salt)).toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await derive(password, Buffer.from(salt, 'base64url'));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Compared against when the email is unknown, so both cases take the same time. */
export const DUMMY_HASH = 'scrypt$AAAAAAAAAAAAAAAAAAAAAA$' + 'A'.repeat(86);

/* ── Session tokens ───────────────────────────────────────────────────── */

let secretPromise: Promise<string> | null = null;

/** VAULT_SESSION_SECRET if set; otherwise a random secret generated once and kept in the data folder. */
function secret(): Promise<string> {
  return (secretPromise ??= (async () => {
    if (process.env.VAULT_SESSION_SECRET) return process.env.VAULT_SESSION_SECRET;
    const file = join(dataDir(), 'session-secret');
    try {
      return (await readFile(file, 'utf8')).trim();
    } catch {
      const value = randomBytes(32).toString('base64url');
      await mkdir(dataDir(), { recursive: true, mode: 0o700 });
      await writeFile(file, value, { mode: 0o600 });
      return value;
    }
  })());
}

const sign = async (payload: string) => createHmac('sha256', await secret()).update(payload).digest('base64url');

export async function createToken(userId: string): Promise<string> {
  const payload = `${userId}.${Date.now() + SESSION_DAYS * 86400_000}`;
  return `${payload}.${await sign(payload)}`;
}

async function readToken(token: string): Promise<string | null> {
  const [userId, expires, signature] = token.split('.');
  if (!userId || !expires || !signature) return null;
  const expected = Buffer.from(await sign(`${userId}.${expires}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return Number(expires) > Date.now() ? userId : null;
}

/* ── Cookies ──────────────────────────────────────────────────────────── */

const isHttps = (req: Request) => (req.headers.get('x-forwarded-proto') ?? new URL(req.url).protocol.replace(':', '')) === 'https';

export function sessionCookie(req: Request, token: string | null): string {
  const parts = [`${SESSION_COOKIE}=${token ?? ''}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${token ? SESSION_DAYS * 86400 : 0}`];
  if (isHttps(req)) parts.push('Secure');
  return parts.join('; ');
}

export async function currentUser(req: Request): Promise<User | null> {
  const match = (req.headers.get('cookie') ?? '').split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  const userId = await readToken(match.slice(SESSION_COOKIE.length + 1));
  return userId ? getStore().findById(userId) : null;
}
