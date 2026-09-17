// عقل الذاكرة: بحث هجين بالكلمات + تقارب لفظي + إعادة ترتيب.

import { q } from "./db.mjs";

export function normalizeAr(text) {
  return String(text || "")
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function overlapScore(a, b) {
  const wa = new Set(normalizeAr(a).split(" ").filter(Boolean));
  const wb = new Set(normalizeAr(b).split(" ").filter(Boolean));
  if (!wa.size || !wb.size) return 0;
  let hits = 0;
  for (const w of wa) if (wb.has(w)) hits += 1;
  return Math.round((hits / Math.max(wa.size, wb.size)) * 100);
}

export async function searchMemory(question, limit = 6) {
  const rows = await q(
    `SELECT id, title, body, source
       FROM memory
      ORDER BY ts_rank(to_tsvector('simple', title || ' ' || body),
                       plainto_tsquery('simple', $1)) DESC,
               created_at DESC
      LIMIT 40`,
    [normalizeAr(question)],
  );

  return rows
    .map((r) => ({ ...r, score: Math.max(overlapScore(question, r.title), overlapScore(question, r.body)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function rememberExchange(question, answer) {
  await q("INSERT INTO memory (title, body, source, tier) VALUES ($1,$2,'chat','long')", [question, answer]);
}
