'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth';
import {
  ApiVaultRepository,
  LocalStorageVaultRepository,
  itemKey,
  type Collection,
  type NewSavedItem,
  type SavedItem,
  type SavedKind,
  type VaultRepository,
  type VaultState,
} from './repository';

interface VaultContextValue extends VaultState {
  ready: boolean;
  /** Where the library lives right now. */
  storage: 'browser' | 'account';
  /** Last load or save failure, if any. */
  error: string | null;
  dismissError(): void;
  isSaved(kind: SavedKind, id: string): boolean;
  toggle(item: NewSavedItem): void;
  remove(key: string): void;
  setNote(key: string, note: string): void;
  toggleCollection(item: SavedItem, collectionId: string): void;
  createCollection(name: string): Promise<Collection | null>;
  renameCollection(id: string, name: string): void;
  deleteCollection(id: string): void;
}

const VaultContext = createContext<VaultContextValue | null>(null);
const EMPTY: VaultState = { items: [], collections: [] };
const localRepository = new LocalStorageVaultRepository();

export function VaultProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  // Guests use this browser; signed-in users use their account.
  const repository = useMemo<VaultRepository>(() => (userId ? new ApiVaultRepository() : localRepository), [userId]);

  const [state, setState] = useState<VaultState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await repository.getState());
    } catch (err) {
      setError((err as Error).message);
    }
  }, [repository]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setReady(false);
    setState(EMPTY);
    (async () => {
      try {
        let loaded = await repository.getState();
        // First sign-in on this browser: carry the guest library into the empty account.
        if (userId && loaded.items.length === 0 && loaded.collections.length === 0) {
          const guest = await localRepository.getState();
          if (guest.items.length > 0 || guest.collections.length > 0) {
            await repository.replaceState(guest);
            loaded = guest;
          }
        }
        if (!cancelled) setState(loaded);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    const unsubscribe = repository.subscribe(() => void refresh());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [repository, userId, authLoading, refresh]);

  const value = useMemo<VaultContextValue>(() => {
    const keys = new Set(state.items.map((i) => i.key));
    const run = (op: Promise<unknown>) =>
      void op.then(
        () => refresh(),
        (err: Error) => setError(err.message),
      );
    return {
      ...state,
      ready,
      storage: userId ? 'account' : 'browser',
      error,
      dismissError: () => setError(null),
      isSaved: (kind, id) => keys.has(itemKey(kind, id)),
      toggle: (item) => {
        const key = itemKey(item.kind, item.id);
        run(keys.has(key) ? repository.removeItem(key) : repository.saveItem(item));
      },
      remove: (key) => run(repository.removeItem(key)),
      setNote: (key, note) => run(repository.updateItem(key, { note })),
      toggleCollection: (item, collectionId) =>
        run(
          repository.updateItem(item.key, {
            collectionIds: item.collectionIds.includes(collectionId)
              ? item.collectionIds.filter((c) => c !== collectionId)
              : [...item.collectionIds, collectionId],
          }),
        ),
      createCollection: async (name) => {
        try {
          const created = await repository.createCollection(name);
          await refresh();
          return created;
        } catch (err) {
          setError((err as Error).message);
          return null;
        }
      },
      renameCollection: (id, name) => run(repository.renameCollection(id, name)),
      deleteCollection: (id) => run(repository.deleteCollection(id)),
    };
  }, [state, ready, error, userId, repository, refresh]);

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used inside <VaultProvider>');
  return ctx;
}
