// Persistence boundary for My Vault.
//
// The UI only talks to `VaultRepository`. Two implementations ship:
//   - LocalStorageVaultRepository: guests; the library lives in this browser.
//   - ApiVaultRepository: signed-in users; the library lives in their account.
// Both extend StateVaultRepository, which holds the editing logic, so a new backend
// only has to implement `load` and `persist`.

export type SavedKind = 'news' | 'tool' | 'paper';

export interface SavedItem {
  /** `${kind}:${id}` */
  key: string;
  kind: SavedKind;
  id: string;
  title: string;
  url: string;
  /** Source, tagline or authors, captured at save time so the entry survives feed changes. */
  subtitle: string;
  savedAt: string;
  note: string;
  collectionIds: string[];
}

export interface Collection {
  id: string;
  name: string;
  createdAt: string;
}

export interface VaultState {
  items: SavedItem[];
  collections: Collection[];
}

export type NewSavedItem = Omit<SavedItem, 'key' | 'savedAt' | 'note' | 'collectionIds'>;

export interface VaultRepository {
  getState(): Promise<VaultState>;
  /** Replace the whole library (used to carry a guest library into a new account). */
  replaceState(state: VaultState): Promise<void>;
  saveItem(item: NewSavedItem): Promise<void>;
  removeItem(key: string): Promise<void>;
  updateItem(key: string, patch: Partial<Pick<SavedItem, 'note' | 'collectionIds'>>): Promise<void>;
  createCollection(name: string): Promise<Collection>;
  renameCollection(id: string, name: string): Promise<void>;
  deleteCollection(id: string): Promise<void>;
  /** Called when the data changes somewhere else (another tab, another device). */
  subscribe(onChange: () => void): () => void;
}

export const itemKey = (kind: SavedKind, id: string) => `${kind}:${id}`;

const EMPTY: VaultState = { items: [], collections: [] };

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalise(value: unknown): VaultState {
  const v = (value ?? {}) as Partial<VaultState>;
  return { items: Array.isArray(v.items) ? v.items : [], collections: Array.isArray(v.collections) ? v.collections : [] };
}

export abstract class StateVaultRepository implements VaultRepository {
  protected abstract load(): Promise<VaultState>;
  protected abstract persist(state: VaultState): Promise<void>;
  abstract subscribe(onChange: () => void): () => void;

  getState(): Promise<VaultState> {
    return this.load();
  }

  replaceState(state: VaultState): Promise<void> {
    return this.persist(normalise(state));
  }

  private async change(fn: (state: VaultState) => VaultState): Promise<void> {
    const state = await this.load();
    const next = fn(state);
    if (next !== state) await this.persist(next);
  }

  saveItem(item: NewSavedItem): Promise<void> {
    return this.change((state) => {
      const key = itemKey(item.kind, item.id);
      if (state.items.some((i) => i.key === key)) return state;
      const saved: SavedItem = { ...item, key, savedAt: new Date().toISOString(), note: '', collectionIds: [] };
      return { ...state, items: [saved, ...state.items] };
    });
  }

  removeItem(key: string): Promise<void> {
    return this.change((state) => ({ ...state, items: state.items.filter((i) => i.key !== key) }));
  }

  updateItem(key: string, patch: Partial<Pick<SavedItem, 'note' | 'collectionIds'>>): Promise<void> {
    return this.change((state) => ({ ...state, items: state.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) }));
  }

  async createCollection(name: string): Promise<Collection> {
    const collection: Collection = { id: newId(), name: name.trim().slice(0, 60), createdAt: new Date().toISOString() };
    await this.change((state) => ({ ...state, collections: [...state.collections, collection] }));
    return collection;
  }

  renameCollection(id: string, name: string): Promise<void> {
    return this.change((state) => ({
      ...state,
      collections: state.collections.map((c) => (c.id === id ? { ...c, name: name.trim().slice(0, 60) } : c)),
    }));
  }

  deleteCollection(id: string): Promise<void> {
    return this.change((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
      items: state.items.map((i) => ({ ...i, collectionIds: i.collectionIds.filter((c) => c !== id) })),
    }));
  }
}

/* ── Guests: browser storage ──────────────────────────────────────────── */

const STORAGE_KEY = 'vault:library:v1';

export class LocalStorageVaultRepository extends StateVaultRepository {
  /** Used when storage is unavailable (private mode, blocked cookies) so the session still works. */
  private fallback: VaultState | null = null;

  protected async load(): Promise<VaultState> {
    if (this.fallback) return this.fallback;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? normalise(JSON.parse(raw)) : EMPTY;
    } catch {
      return EMPTY;
    }
  }

  protected async persist(state: VaultState): Promise<void> {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      this.fallback = null;
    } catch {
      this.fallback = state;
    }
  }

  subscribe(onChange: () => void): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) onChange();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

/* ── Signed-in users: the account API ─────────────────────────────────── */

export class ApiVaultRepository extends StateVaultRepository {
  private cache: VaultState | null = null;

  protected async load(): Promise<VaultState> {
    if (this.cache) return this.cache;
    const res = await fetch('/api/vault', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status === 401 ? 'Your session has ended. Log in again.' : 'Couldn’t load your library.');
    return (this.cache = normalise(await res.json()));
  }

  protected async persist(state: VaultState): Promise<void> {
    let res: Response;
    try {
      res = await fetch('/api/vault', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state) });
    } catch {
      throw new Error('Couldn’t save: Vault is unreachable. Your change wasn’t stored.');
    }
    if (!res.ok) throw new Error(res.status === 401 ? 'Your session has ended. Log in again to save.' : 'Couldn’t save your change.');
    this.cache = state;
  }

  /** Re-read from the account when the tab regains focus, to pick up other devices. */
  subscribe(onChange: () => void): () => void {
    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      this.cache = null;
      onChange();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }
}
