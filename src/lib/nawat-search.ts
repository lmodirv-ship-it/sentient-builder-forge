// TF-IDF style local retrieval — fully offline.
export type MemoryTier = "daily" | "long" | "core";
export type Doc = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source?: string;
  createdAt: number;
  /** daily = ephemeral notes/tasks · long = projects/decisions/books · core = vision/principles (never expire) */
  tier?: MemoryTier;
};

const STOP = new Set([
  "the","a","an","and","or","but","of","to","in","on","for","is","are","was","were","be","by","with","as","at","it","this","that","from","not","i","you","he","she","we","they",
  "في","من","على","الى","إلى","عن","هذا","هذه","ذلك","تلك","هو","هي","نحن","انت","أنت","انتم","هم","ما","لا","لم","لن","قد","كان","كانت","ثم","او","أو","و","ف","ب","ل","ال",
]);

function normalizeAr(s: string) {
  return s
    .replace(/[\u064B-\u0652]/g, "") // tashkeel
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه");
}

export function tokenize(text: string): string[] {
  const t = normalizeAr(text.toLowerCase());
  return t
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export function chunkText(text: string, size = 900, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= size) return [clean];
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + size, clean.length);
    let slice = clean.slice(i, end);
    // try to break at sentence boundary
    if (end < clean.length) {
      const lastDot = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("؟"), slice.lastIndexOf("!"), slice.lastIndexOf("؛"));
      if (lastDot > size * 0.5) slice = slice.slice(0, lastDot + 1);
    }
    out.push(slice.trim());
    i += Math.max(1, slice.length - overlap);
  }
  return out;
}

export function searchTFIDF(query: string, docs: Doc[], k = 5): Array<Doc & { score: number }> {
  const qTokens = tokenize(query);
  if (!qTokens.length || !docs.length) return [];
  const N = docs.length;
  const titleTokens = docs.map((d) => new Set(tokenize(d.title)));
  const tagTokens = docs.map((d) => new Set(tokenize(d.tags.join(" "))));
  const docTokens = docs.map((d) => tokenize(d.title + " " + d.content + " " + d.tags.join(" ")));
  const df: Record<string, number> = {};
  for (const tokens of docTokens) {
    for (const w of new Set(tokens)) df[w] = (df[w] || 0) + 1;
  }
  const avgLen = docTokens.reduce((s, t) => s + t.length, 0) / N || 1;
  const k1 = 1.4;
  const b = 0.75;
  const now = Date.now();
  const uniqQ = Array.from(new Set(qTokens));
  const scored = docs.map((d, i) => {
    const tokens = docTokens[i];
    const tf: Record<string, number> = {};
    for (const w of tokens) tf[w] = (tf[w] || 0) + 1;
    let score = 0;
    for (const q of uniqQ) {
      const f = tf[q];
      if (!f) continue;
      const idf = Math.log(1 + (N - (df[q] || 0) + 0.5) / ((df[q] || 0) + 0.5));
      const norm = (f * (k1 + 1)) / (f + k1 * (1 - b + b * (tokens.length / avgLen)));
      let w = idf * norm;
      if (titleTokens[i].has(q)) w *= 2.2;
      if (tagTokens[i].has(q)) w *= 1.6;
      score += w;
    }
    const ageDays = Math.max(0, (now - (d.createdAt || now)) / 86400000);
    const recency = 1 + 0.1 * Math.exp(-ageDays / 180);
    const tierWeight = d.tier === "core" ? 1.8 : d.tier === "daily" ? 0.7 : 1.0;
    return { ...d, score: score * recency * tierWeight };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}

// ---------- character n-grams for fuzzy AR/EN matching ----------
function ngrams(s: string, n = 3): Set<string> {
  const t = normalizeAr(s.toLowerCase()).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const out = new Set<string>();
  for (const w of t.split(/\s+/)) {
    if (!w) continue;
    const pad = " " + w + " ";
    for (let i = 0; i <= pad.length - n; i++) out.add(pad.slice(i, i + n));
  }
  return out;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// ---------- Reciprocal Rank Fusion ----------
export function fuseRankings(
  rankings: Array<Array<Doc & { score: number }>>,
  k = 60,
): Array<Doc & { score: number }> {
  const acc = new Map<string, { doc: Doc; score: number }>();
  for (const list of rankings) {
    list.forEach((d, rank) => {
      const prev = acc.get(d.id);
      const inc = 1 / (k + rank + 1);
      if (prev) prev.score += inc;
      else acc.set(d.id, { doc: d, score: inc });
    });
  }
  return Array.from(acc.values())
    .sort((a, b) => b.score - a.score)
    .map((x) => ({ ...x.doc, score: x.score }));
}

// ---------- Hybrid search: BM25 + trigram Jaccard, fused ----------
export function searchFuzzy(query: string, docs: Doc[], k = 20): Array<Doc & { score: number }> {
  if (!query.trim() || !docs.length) return [];
  const qg = ngrams(query, 3);
  const scored = docs.map((d) => {
    const dg = ngrams((d.title + " " + d.content).slice(0, 4000), 3);
    return { ...d, score: jaccard(qg, dg) };
  });
  return scored.filter((x) => x.score > 0.02).sort((a, b) => b.score - a.score).slice(0, k);
}

export function searchHybrid(
  queries: string[],
  docs: Doc[],
  k = 20,
): Array<Doc & { score: number }> {
  const qs = Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean)));
  if (!qs.length) return [];
  const rankings: Array<Array<Doc & { score: number }>> = [];
  for (const q of qs) {
    rankings.push(searchTFIDF(q, docs, k * 2));
    rankings.push(searchFuzzy(q, docs, k * 2));
  }
  return fuseRankings(rankings).slice(0, k);
}

// ---------- Reranker: numeric second-pass with feedback ----------
export function rerank(
  query: string,
  hits: Array<Doc & { score: number }>,
  opts: { feedback?: Record<string, number>; k?: number } = {},
): Array<Doc & { score: number }> {
  const qTokens = new Set(tokenize(query));
  const qg = ngrams(query, 3);
  const now = Date.now();
  const fb = opts.feedback || {};
  const k = opts.k ?? 8;
  const rescored = hits.map((h) => {
    const titleT = new Set(tokenize(h.title));
    const tagT = new Set(tokenize(h.tags.join(" ")));
    let titleHit = 0, tagHit = 0;
    for (const q of qTokens) {
      if (titleT.has(q)) titleHit++;
      if (tagT.has(q)) tagHit++;
    }
    const dg = ngrams((h.title + " " + h.content).slice(0, 3000), 3);
    const jac = jaccard(qg, dg);
    const ageDays = Math.max(0, (now - (h.createdAt || now)) / 86400000);
    const recency = 1 + 0.15 * Math.exp(-ageDays / 180);
    const tierW = h.tier === "core" ? 1.8 : h.tier === "daily" ? 0.7 : 1.0;
    const fbW = 1 + Math.max(-0.5, Math.min(0.6, (fb[h.id] || 0) * 0.15));
    const base = h.score + 0.4 * titleHit + 0.25 * tagHit + 0.8 * jac;
    return { ...h, score: base * recency * tierW * fbW };
  });
  return rescored.sort((a, b) => b.score - a.score).slice(0, k);
}

// ---------- Neighbor expansion: same-source adjacent chunks ----------
export function withNeighbors(
  picks: Array<Doc & { score: number }>,
  allDocs: Doc[],
  perNeighbor = 1,
): Array<Doc & { score: number; _neighbor?: boolean }> {
  const bySource = new Map<string, Doc[]>();
  for (const d of allDocs) {
    const s = d.source || "";
    if (!s) continue;
    if (!bySource.has(s)) bySource.set(s, []);
    bySource.get(s)!.push(d);
  }
  for (const arr of bySource.values()) arr.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const seen = new Set(picks.map((p) => p.id));
  const out: Array<Doc & { score: number; _neighbor?: boolean }> = [...picks];
  for (const p of picks) {
    if (!p.source) continue;
    const arr = bySource.get(p.source);
    if (!arr) continue;
    const idx = arr.findIndex((x) => x.id === p.id);
    if (idx < 0) continue;
    const cand = [arr[idx - 1], arr[idx + 1]].filter(Boolean) as Doc[];
    for (const c of cand.slice(0, perNeighbor)) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ ...c, score: p.score * 0.4, _neighbor: true });
    }
  }
  return out;
}

