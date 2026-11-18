'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { DotArt } from '../components/art';
import { Mark } from '../components/Shell';
import { Link, useNavigate } from '../router';

const field =
  'mt-2 block h-11 w-full border border-line bg-surface px-3.5 text-[0.9375rem] text-ink placeholder:text-faint transition-colors duration-200 focus:border-faint';
const secondary = 'flex h-11 w-full items-center justify-center border border-line bg-bg text-[0.9375rem] font-medium text-ink transition-colors duration-200 hover:border-faint';

export function LoginPage() {
  const { user, loading, login, register, logout } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const problem = await (signup ? register(email, password) : login(email, password));
    setBusy(false);
    if (problem) setError(problem);
    else navigate('/vault');
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,34rem)_1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="label inline-flex items-center gap-2 self-start text-muted transition-colors hover:text-ink">
          ← Back to Vault
        </Link>

        <div className="rise mx-auto flex w-full max-w-[21rem] flex-1 flex-col justify-center py-12">
          <Mark className="h-14 w-14 text-ink" />
          <h1 className="display mt-8 text-3xl leading-none">{user ? 'You’re in' : signup ? 'Create account' : 'Log in'}</h1>

          {loading ? (
            <p className="mt-6 text-sm text-muted" aria-live="polite">
              Checking your session…
            </p>
          ) : user ? (
            <div className="mt-4">
              <p className="text-[0.9375rem] leading-relaxed text-muted">
                Signed in as <span className="text-ink">{user.email}</span>. Your vault is saved to this account.
              </p>
              <Link href="/vault" className="mt-8 flex h-11 w-full items-center justify-center bg-ink text-[0.9375rem] font-medium text-bg transition-opacity hover:opacity-85">
                Open My Vault
              </Link>
              <button type="button" onClick={() => void logout()} className={`${secondary} mt-3`}>
                Log out
              </button>
            </div>
          ) : (
            <>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
                {signup ? 'Keep your saved tools, stories and papers in an account.' : 'Open your saved tools, stories and papers.'}
              </p>
              <form onSubmit={submit} className="mt-8" noValidate>
                <label htmlFor="email" className="block text-sm font-medium text-ink">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={field}
                />
                <label htmlFor="password" className="mt-5 block text-sm font-medium text-ink">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={signup ? 'At least 8 characters' : 'Your password'}
                  aria-describedby={error ? 'login-error' : undefined}
                  className={field}
                />
                <p id="login-error" role="alert" className={`text-sm leading-relaxed text-bad ${error ? 'mt-4' : ''}`}>
                  {error}
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-7 flex h-11 w-full items-center justify-center bg-ink text-[0.9375rem] font-medium text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
                >
                  {busy ? 'One moment…' : signup ? 'Create account' : 'Log in'}
                </button>
              </form>

              <p className="mt-4 text-center text-[0.8125rem] text-muted">
                {signup ? 'Already have an account?' : 'Don’t have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(signup ? 'login' : 'signup');
                    setError(null);
                  }}
                  className="font-medium text-ink underline decoration-faint underline-offset-4 hover:decoration-ink"
                >
                  {signup ? 'Log in' : 'Sign up'}
                </button>
              </p>

              <div className="my-7 flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-line" />
                <span className="label text-faint">or</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <Link href="/" className={secondary}>
                Continue as a guest
              </Link>
              <p className="mt-3 text-center text-[0.8125rem] leading-relaxed text-faint">Guests can save too; items stay in this browser.</p>
            </>
          )}
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-line lg:block">
        <DotArt />
        <p className="label absolute bottom-8 right-8 bg-bg px-2 py-1 text-faint">Vault · AI news, tools and papers</p>
      </div>
    </div>
  );
}
