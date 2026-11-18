# Vault

One place to keep up with AI: news, tools and papers, plus a personal library.

## Run it

Requires Node 20.9 or newer.

```bash
npm install
npm run dev        # http://localhost:3000 with hot reload
npm run build && npm start   # production
npm test           # data-layer tests
npm run typecheck
```

Environment variables (all optional; put them in `.env.local`):

| Variable | Purpose |
|---|---|
| `VAULT_SESSION_SECRET` | Secret used to sign login sessions. If unset, one is generated and kept in the data folder. Set it in production. |
| `VAULT_DATA_DIR` | Where accounts and saved libraries are stored. Default `./data`. |
| `VAULT_CONTACT` | Email or URL added to the User-Agent sent to sources. arXiv and others ask for this. |
| `VAULT_OFFLINE=1` | Skip all network requests and show labelled sample data. |
| `VAULT_UPSTREAM_REWRITE` | Test only. Routes source requests to a local mock (see `test/mock-upstream.ts`). |

## What's in it

| Route | Purpose |
|---|---|
| `/` | Today: top stories, new tools, trending papers |
| `/news` | Topic filter, newest / most discussed |
| `/tools` | Category browse, search, pricing filter, Popular / Newly added |
| `/papers` | Trending / Latest |
| `/vault` | Saved items, collections, notes |
| `/login` | Log in, sign up, or continue as a guest |
| `/api/news`, `/api/tools`, `/api/papers`, `/api/search`, `/api/status` | Feed API |
| `/api/auth/register`, `/login`, `/logout`, `/me`; `/api/vault` | Accounts and the signed-in user's library |

Keyboard: `K` or `/` search (also Ctrl/Cmd+K), `1`–`5` sections, `R` refresh, `T` theme, `Esc` close.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4. Fonts are Geist Sans, Geist Mono and Geist Pixel from the `geist` package, self-hosted through `next/font`, so nothing is loaded from a font CDN.

```
src/
  app/                 routes: layout, pages, not-found, api/*/route.ts, globals.css (design tokens)
  api/handlers.ts      feed API logic as (Request) => Response; route files re-export these
  api/auth.ts          account and library endpoints, same shape
  client/
    components/        AppShell (shortcuts, search, theme), Shell (header, footer), cards, ui, art (generated artwork)
    auth.tsx           signed-in state (AuthProvider, useAuth)
    views/             Today, News, Tools, Papers, Vault, Login (client components)
    vault/             repository interface, browser and account implementations, React store
    api.ts             useFeed hook: loading / error / refresh contract for every feed
    router.tsx         small helpers over next/navigation
  lib/                 data layer (below)
test/                  tests, fixtures and a mock of the upstream sources
```

Pages are client-rendered views inside a server layout; feeds are fetched from the API routes. Filter and tab state lives in the query string, so every view is linkable.

## Data layer

```
src/lib/
  feeds.ts            getNews / getTools / getPapers / getStatus (cached). The only thing the API imports.
  cache.ts            in-memory TTL cache, stale-while-revalidate, request de-duplication
  http.ts             fetch with timeout and User-Agent
  query.ts            pure filter / sort / search, shared by server and browser
  classify.ts         keyword rules for topics, AI relevance and tool categories
  xml.ts              small RSS / Atom reader
  sources/
    news.ts           RSS sources list + Hacker News
    papers.ts         Hugging Face daily papers + arXiv API, Summarizer interface
    tools.ts          curated list + Show HN launches
    tools-seed.ts     the curated tools (edit this file to add or correct tools)
    sample.ts         labelled placeholder items for when sources are unreachable
```

Every feed returns `{ items, meta: { fetchedAt, mode, sources[] } }`. `mode` is `live`, `partial` or `sample`, and `sources` reports each source's result, which drives the status badge and the notices in the UI.

Cache lifetimes: news 10 minutes, tools and papers 30 minutes, partial results 5 minutes, sample fallback 1 minute. API responses also carry `Cache-Control: max-age=60`. The cache and the login rate limiter are per server process; on serverless hosting each instance has its own, so use a shared store (Redis/KV) behind the same `cached()` function if that matters.

### Sources

| Area | Source | Key needed |
|---|---|---|
| News | RSS: OpenAI, Google DeepMind, Google AI, Hugging Face, MIT Technology Review, The Verge, TechCrunch, Ars Technica | No |
| News, Tools | Hacker News via `hn.algolia.com/api/v1` | No |
| Papers | `huggingface.co/api/daily_papers` | No |
| Papers | `export.arxiv.org/api/query` (cs.AI, cs.LG, cs.CL, cs.CV) | No |

## Design

Dark, square-cornered and grid-ruled, with one ember accent. Tokens (colours, fonts) live at the top of `src/app/globals.css`; there is a light theme on `T`. Display type is Geist Pixel (class `display`); reading text is Geist Sans; metadata is Geist Mono (class `label`). The hero landscape and the dotted vault door on the login page are generated in `src/client/components/art.tsx` (SVG and canvas), so there are no image files to license or host.

## Accounts and My Vault storage

Guests need no account: their library is kept in the browser (`LocalStorageVaultRepository`). Signing up or logging in switches to `ApiVaultRepository`, which keeps the library in the account so it follows the user between devices. On first login from a browser that has a guest library, that library is copied into the account if the account is still empty.

- Passwords are hashed with scrypt and a per-user salt. Sessions are HMAC-signed tokens in an `HttpOnly`, `SameSite=Lax` cookie (also `Secure` over HTTPS), valid for 30 days.
- Login and sign-up are rate limited per process; state-changing requests from other origins are refused; library uploads are validated field by field.
- Storage sits behind `AccountStore` in `src/lib/auth/store.ts`. The shipped implementation writes JSON files under `./data`, which needs a single long-running server with a writable disk. **It will not work on serverless hosting such as Vercel**: implement `AccountStore` on a database there.
- Not included: password reset, email verification, account deletion, OAuth providers.

## Testing against mock sources

```bash
npx tsx test/mock-upstream.ts &
VAULT_UPSTREAM_REWRITE=http://127.0.0.1:4999 npm run dev
# MOCK_FAIL=hn.algolia.com,export.arxiv.org makes those hosts fail, to see the partial state
```
