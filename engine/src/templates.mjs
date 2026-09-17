// طبقة القوالب: جواب فوري بلا نموذج عندما يتطابق السؤال.

import { q } from "./db.mjs";
import { normalizeAr } from "./memory.mjs";

const index = { at: 0, rows: [] };

export function lettersOnly(text) {
  return String(text || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadIndex() {
  if (Date.now() - index.at < 30_000 && index.rows.length) return index.rows;
  index.rows = await q("SELECT code, title, body FROM templates WHERE archived = FALSE ORDER BY code");
  index.at = Date.now();
  return index.rows;
}

export function invalidateTemplates() {
  index.at = 0;
}

function similarity(a, b) {
  const wa = new Set(normalizeAr(a).split(" ").filter(Boolean));
  const wb = new Set(normalizeAr(b).split(" ").filter(Boolean));
  if (!wa.size || !wb.size) return 0;
  let hits = 0;
  for (const w of wa) if (wb.has(w)) hits += 1;
  return Math.round((hits / Math.max(wa.size, wb.size)) * 100);
}

export async function matchTemplate(question) {
  const rows = await loadIndex();
  const norm = normalizeAr(question);
  if (!norm) return null;

  const exact = rows.find((r) => normalizeAr(r.title) === norm);
  if (exact) return { code: exact.code, answer: lettersOnly(exact.body), score: 100 };

  let best = null;
  for (const r of rows) {
    const score = similarity(question, r.title);
    if (!best || score > best.score) best = { code: r.code, answer: lettersOnly(r.body), score };
  }
  return best && best.score >= 70 ? best : null;
}

export async function listTemplates() {
  return q("SELECT code, title, body, archived FROM templates ORDER BY code");
}

export async function saveTemplate(code, title, body) {
  invalidateTemplates();
  const rows = await q(
    "UPDATE templates SET title = $2, body = $3, updated_at = now() WHERE code = $1 RETURNING code, title, body",
    [code, title, body],
  );
  return rows[0] || null;
}

export async function createTemplate(title, body, kind = "qa") {
  invalidateTemplates();
  const rows = await q(
    "INSERT INTO templates (code, title, body, kind) VALUES (gen_template_code(), $1, $2, $3) RETURNING code, title, body",
    [title, body, kind],
  );
  return rows[0];
}
