// Account and library storage.
//
// `AccountStore` is the boundary: the shipped implementation keeps JSON files under
// ./data (or VAULT_DATA_DIR), which suits a single long-running server. For
// serverless or multi-instance hosting, implement the same interface on a database
// (Postgres, SQLite, KV) and return it from `getStore()`.

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface AccountStore {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  /** Returns null when the email is already registered. */
  createUser(email: string, passwordHash: string): Promise<User | null>;
  getVault(userId: string): Promise<unknown | null>;
  putVault(userId: string, state: unknown): Promise<void>;
}

export const dataDir = () => process.env.VAULT_DATA_DIR ?? join(process.cwd(), 'data');

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }
}

/** Write to a temp file, then rename, so a crash never leaves a half-written file. */
async function writeJson(file: string, value: unknown): Promise<void> {
  const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(value), { mode: 0o600 });
  await rename(tmp, file);
}

class FileAccountStore implements AccountStore {
  /** Serialises writes so concurrent requests can't interleave read-modify-write. */
  private queue: Promise<unknown> = Promise.resolve();

  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async dir(sub = ''): Promise<string> {
    const d = join(dataDir(), sub);
    await mkdir(d, { recursive: true, mode: 0o700 });
    return d;
  }

  private async users(): Promise<User[]> {
    return readJson<User[]>(join(await this.dir(), 'users.json'), []);
  }

  async findByEmail(email: string): Promise<User | null> {
    return (await this.users()).find((u) => u.email === email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return (await this.users()).find((u) => u.id === id) ?? null;
  }

  createUser(email: string, passwordHash: string): Promise<User | null> {
    return this.exclusive(async () => {
      const users = await this.users();
      if (users.some((u) => u.email === email)) return null;
      const user: User = { id: randomUUID(), email, passwordHash, createdAt: new Date().toISOString() };
      await writeJson(join(await this.dir(), 'users.json'), [...users, user]);
      return user;
    });
  }

  private async vaultFile(userId: string): Promise<string> {
    if (!/^[0-9a-f-]{36}$/.test(userId)) throw new Error('invalid user id');
    return join(await this.dir('vaults'), `${userId}.json`);
  }

  async getVault(userId: string): Promise<unknown | null> {
    return readJson<unknown | null>(await this.vaultFile(userId), null);
  }

  putVault(userId: string, state: unknown): Promise<void> {
    return this.exclusive(async () => writeJson(await this.vaultFile(userId), state));
  }
}

const g = globalThis as typeof globalThis & { __vaultStore?: AccountStore };
export const getStore = (): AccountStore => (g.__vaultStore ??= new FileAccountStore());
