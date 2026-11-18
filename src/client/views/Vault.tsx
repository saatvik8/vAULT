'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Page } from '../components/Shell';
import { Chip, EmptyState, External, PageHeader, Time, stagger, useNow } from '../components/ui';
import { Link, setQuery, useLocation } from '../router';
import type { SavedItem, SavedKind } from '../vault/repository';
import { useAuth } from '../auth';
import { useVault } from '../vault/store';

const KIND_LABEL: Record<SavedKind, string> = { news: 'News', tool: 'Tool', paper: 'Paper' };
const KIND_PLURAL: Record<SavedKind, string> = { news: 'News', tool: 'Tools', paper: 'Papers' };
const KINDS: SavedKind[] = ['tool', 'news', 'paper'];

function NoteEditor({ item }: { item: SavedItem }) {
  const { setNote } = useVault();
  const [draft, setDraft] = useState(item.note);
  useEffect(() => setDraft(item.note), [item.note]);
  const dirty = draft !== item.note;
  return (
    <div className="mt-4">
      <label htmlFor={`note-${item.key}`} className="label text-faint">
        Note
      </label>
      <textarea
        id={`note-${item.key}`}
        value={draft}
        rows={draft ? Math.min(6, Math.max(2, Math.ceil(draft.length / 70))) : 1}
        maxLength={2000}
        placeholder="Add a note: why you saved this, what to try…"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => dirty && setNote(item.key, draft.trim())}
        className="mt-1.5 block w-full max-w-2xl resize-y rounded-none border border-line bg-transparent px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-faint focus:border-faint"
      />
      <p className="label mt-1 h-4 text-faint" aria-live="polite">
        {dirty ? 'Saves when you leave the field' : item.note ? 'Saved' : ''}
      </p>
    </div>
  );
}

function SavedRow({ item, index, now }: { item: SavedItem; index: number; now: number }) {
  const { collections, toggleCollection, remove } = useVault();
  return (
    <li className="rise border-b border-line py-6" style={stagger(index)}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="label flex items-center gap-3 text-muted">
            <span className="text-accent">{KIND_LABEL[item.kind]}</span>
            <span className="text-faint">
              Saved <Time iso={item.savedAt} now={now} />
            </span>
          </p>
          <h3 className="mt-2 text-lg font-medium leading-snug tracking-tight md:text-xl">
            <External href={item.url} className="group transition-colors duration-200 hover:text-accent">
              {item.title}
              {item.url && (
                <span aria-hidden="true" className="ml-1 text-[0.7em] text-faint group-hover:text-accent">
                  ↗
                </span>
              )}
            </External>
          </h3>
          {item.subtitle && <p className="mt-1 text-sm text-muted">{item.subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => remove(item.key)}
          aria-label={`Remove “${item.title}” from My Vault`}
          className="label h-8 shrink-0 rounded-none border border-line px-3 text-muted transition-colors hover:border-bad hover:text-bad"
        >
          Remove
        </button>
      </div>

      {collections.length > 0 && (
        <div role="group" aria-label={`Collections for ${item.title}`} className="mt-4 flex flex-wrap items-center gap-2">
          <span className="label mr-1 text-faint">In</span>
          {collections.map((c) => (
            <Chip key={c.id} active={item.collectionIds.includes(c.id)} onClick={() => toggleCollection(item, c.id)}>
              {c.name}
            </Chip>
          ))}
        </div>
      )}
      <NoteEditor item={item} />
    </li>
  );
}

function Collections({ active, onSelect }: { active: string | null; onSelect: (id: string | null) => void }) {
  const { items, collections, createCollection, renameCollection, deleteCollection } = useVault();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = await createCollection(trimmed);
    if (!created) return;
    setName('');
    onSelect(created.id);
  };

  const row = (selected: boolean) =>
    `label flex h-9 min-w-0 flex-1 items-center justify-between gap-3 border-l px-4 text-left transition-colors duration-200 ${
      selected ? 'border-accent text-accent' : 'border-line text-muted hover:text-ink'
    }`;

  return (
    <aside aria-label="Collections" className="py-8 lg:sticky lg:top-20 lg:self-start">
      <p className="label pb-3 text-faint">Collections</p>
      <ul>
        <li className="flex">
          <button type="button" aria-pressed={active === null} onClick={() => onSelect(null)} className={row(active === null)}>
            Everything <span className="text-faint">{items.length}</span>
          </button>
        </li>
        {collections.map((c) => {
          const count = items.filter((i) => i.collectionIds.includes(c.id)).length;
          if (editing === c.id) {
            return (
              <li key={c.id}>
                <form
                  className="flex gap-2 border-l border-accent py-1 pl-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editName.trim()) renameCollection(c.id, editName);
                    setEditing(null);
                  }}
                >
                  <label className="sr-only" htmlFor={`rename-${c.id}`}>
                    Rename collection
                  </label>
                  <input
                    id={`rename-${c.id}`}
                    autoFocus
                    value={editName}
                    maxLength={60}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                    className="h-8 min-w-0 flex-1 rounded-none border border-line bg-transparent px-2 text-sm"
                  />
                  <button type="submit" className="label text-accent">
                    Save
                  </button>
                </form>
              </li>
            );
          }
          return (
            <li key={c.id} className="group/col">
              <div className="flex flex-wrap items-center">
                <button type="button" aria-pressed={active === c.id} onClick={() => onSelect(c.id)} className={row(active === c.id)}>
                  <span className="truncate">{c.name}</span> <span className="text-faint">{count}</span>
                </button>
                {active === c.id && (
                  <span className="flex w-full gap-4 border-l border-accent pb-2 pl-4">
                    <button
                      type="button"
                      className="label text-faint hover:text-ink"
                      onClick={() => {
                        setEditing(c.id);
                        setEditName(c.name);
                      }}
                    >
                      Rename<span className="sr-only"> {c.name}</span>
                    </button>
                    <button type="button" className="label text-faint hover:text-bad" onClick={() => setConfirming(c.id)}>
                      Delete<span className="sr-only"> {c.name}</span>
                    </button>
                  </span>
                )}
              </div>
              {confirming === c.id && (
                <div role="alert" className="my-2 rounded-none border border-line bg-surface p-3 text-sm text-muted">
                  Delete “{c.name}”? Saved items stay in your vault.
                  <span className="mt-2 flex gap-4">
                    <button
                      type="button"
                      className="label text-bad"
                      onClick={() => {
                        deleteCollection(c.id);
                        setConfirming(null);
                        onSelect(null);
                      }}
                    >
                      Delete collection
                    </button>
                    <button type="button" className="label text-muted hover:text-ink" onClick={() => setConfirming(null)}>
                      Cancel
                    </button>
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={submit} className="mt-5 flex gap-2">
        <label htmlFor="new-collection" className="sr-only">
          New collection name
        </label>
        <input
          id="new-collection"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="New collection…"
          className="h-9 min-w-0 flex-1 rounded-none border border-line bg-transparent px-4 text-sm placeholder:text-faint focus:border-faint"
        />
        <button type="submit" disabled={!name.trim()} className="label h-9 shrink-0 rounded-none bg-ink px-4 text-bg transition-opacity disabled:opacity-40">
          Add
        </button>
      </form>
    </aside>
  );
}

export function VaultPage() {
  const { items, collections, ready } = useVault();
  const { user } = useAuth();
  const { query } = useLocation();
  const now = useNow();
  const requested = query.get('collection');
  const collection = requested && collections.some((c) => c.id === requested) ? requested : null;
  const kind = (KINDS as string[]).includes(query.get('kind') ?? '') ? (query.get('kind') as SavedKind) : null;

  const visible = useMemo(
    () => items.filter((i) => (!collection || i.collectionIds.includes(collection)) && (!kind || i.kind === kind)),
    [items, collection, kind],
  );
  const collectionName = collections.find((c) => c.id === collection)?.name;

  return (
    <Page>
      <PageHeader
        eyebrow="05 · My Vault"
        title={collectionName ?? 'My Vault'}
        intro={
          user
            ? `Your saved tools, stories and papers, kept in your account (${user.email}) and available wherever you log in.`
            : 'Your saved tools, stories and papers. Stored in this browser only; log in to keep them in an account.'
        }
      >
        <p className="label shrink-0 text-faint">
          {items.length} saved · {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
        </p>
      </PageHeader>

      <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-14">
        <Collections active={collection} onSelect={(id) => setQuery({ collection: id })} />

        <div className="min-w-0">
          <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2 border-b border-line py-4 lg:pt-8">
            <Chip active={!kind} onClick={() => setQuery({ kind: null })}>
              All types
            </Chip>
            {KINDS.map((k) => (
              <Chip key={k} active={kind === k} onClick={() => setQuery({ kind: kind === k ? null : k })}>
                {KIND_PLURAL[k]}
              </Chip>
            ))}
          </div>

          {!ready ? null : items.length === 0 ? (
            <EmptyState title="Your vault is empty" hint="Use the Save button on any tool, story or paper and it will appear here, ready for notes and collections.">
              <span className="flex flex-wrap justify-center gap-2">
                {[
                  ['/tools', 'Browse tools'],
                  ['/news', 'Read news'],
                  ['/papers', 'Find papers'],
                ].map(([href, label]) => (
                  <Link key={href} href={href} className="label inline-flex h-9 items-center rounded-none border border-line px-4 text-muted transition-colors hover:border-faint hover:text-ink">
                    {label}
                  </Link>
                ))}
              </span>
            </EmptyState>
          ) : visible.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              hint={collection ? 'This collection has no items of this type. Add items to it from “Everything” using the collection chips on each item.' : 'No saved items of this type.'}
            >
              <Chip active={false} onClick={() => setQuery({ kind: null, collection: null })}>
                Show everything
              </Chip>
            </EmptyState>
          ) : (
            <ul>
              {visible.map((item, i) => (
                <SavedRow key={item.key} item={item} index={i} now={now} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </Page>
  );
}
