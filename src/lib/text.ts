// Small text helpers shared by server and client. No dependencies.

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  copy: '©', reg: '®', trade: '™', eacute: 'é', middot: '·', bull: '•',
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

export function stripHtml(input: string): string {
  return decodeEntities(
    input
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/** Shorten to roughly `max` characters, preferring a sentence end, then a word end. */
export function excerpt(text: string, max = 240): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const sentenceEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('? '), slice.lastIndexOf('! '));
  if (sentenceEnd > max * 0.5) return slice.slice(0, sentenceEnd + 1);
  const wordEnd = slice.lastIndexOf(' ');
  return slice.slice(0, wordEnd > 0 ? wordEnd : max).replace(/[,;:\s]+$/, '') + '…';
}

/** First `count` sentences of an abstract, capped in length. */
export function leadSentences(text: string, count = 2, max = 320): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.match(/[^.!?]+[.!?]+(?=\s|$)/g);
  if (!sentences) return excerpt(clean, max);
  return excerpt(sentences.slice(0, count).join(' ').trim(), max);
}

export function hashId(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Canonical form of a URL for matching the same story across sources. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const params = [...u.searchParams.entries()].filter(([k]) => !/^(utm_|ref$|source$|fbclid|gclid)/i.test(k));
    const query = params.length ? '?' + params.map(([k, v]) => `${k}=${v}`).join('&') : '';
    return (u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/+$/, '') + query).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function timeAgo(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(then).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function fullDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
