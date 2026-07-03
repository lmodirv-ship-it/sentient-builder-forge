// TF-IDF style local retrieval — fully offline.
export type Doc = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source?: string;
  createdAt: number;
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
    return { ...d, score: score * recency };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}
