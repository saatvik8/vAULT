'use client';

// Signed-in state for the whole app. Guests are fully supported: `user` is null and
// the library stays in the browser.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** true until the first session check finishes */
  loading: boolean;
  /** Resolve to an error message, or null on success. */
  login(email: string, password: string): Promise<string | null>;
  register(email: string, password: string): Promise<string | null>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function post(path: string, payload?: unknown): Promise<{ ok: boolean; data: { user?: AuthUser; error?: string } }> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, data: { error: 'Could not reach Vault. Check your connection and try again.' } };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d: { user: AuthUser | null }) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const submit = useCallback(async (path: string, email: string, password: string) => {
    const { ok, data } = await post(path, { email, password });
    if (ok && data.user) {
      setUser(data.user);
      return null;
    }
    return data.error ?? 'Something went wrong. Try again.';
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: (email, password) => submit('/api/auth/login', email, password),
      register: (email, password) => submit('/api/auth/register', email, password),
      logout: async () => {
        await post('/api/auth/logout');
        setUser(null);
      },
    }),
    [user, loading, submit],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
