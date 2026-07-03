// Router + fuzzy matcher for questions about the user's HN sites.
// Zero AI calls — pure local heuristics.
import { HN_PROJECTS, CATEGORY_LABEL, type HNProject, type HNCategory } from "./hn-ecosystem";

/** Normalize Arabic + strip diacritics + lower-case for loose matching. */
export function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")        // tashkeel
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^a-z0-9\u0600-\u06FF\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** AR/EN/FR synonyms → canonical tokens we index on. */
const SYNONYMS: Array<[RegExp, string[]]> = [
  [/اذكار|ذكر|adhkar|adkhar|dhikr/gi,                 ["adkhar", "اذكار", "religion"]],
  [/سائق|سياقه|سياقة|توصيل|رحله|رحلة|driver|delivery|ride|chauffeur|livraison/gi, ["driver", "transport", "سائق", "توصيل"]],
  [/عياده|عيادة|طبي|طبيه|clinic|clinique|medical|docteur|doctor/gi, ["clinic", "hnclinik", "عيادة"]],
  [/سيره|سيرة\s*ذاتيه|سيرة\s*ذاتية|cv|resume|curriculum/gi, ["cv", "buildcv", "سيرة"]],
  [/عقار|عقارات|immo|immobilier|real\s*estate/gi,    ["immo", "realestate", "عقار"]],
  [/مغسل|مغسله|مغسلة|carwash|lavage|wash/gi,          ["carwash", "lavage", "مغسلة"]],
  [/طباعه|طباعة|print|imprim/gi,                     ["print", "tanjaprint", "طباعة"]],
  [/ذكاء|اصطناعي|ai|intelligence|artificiel/gi,       ["ai", "hn-ai", "ذكاء"]],
  [/محادث|شات|chat|discussion/gi,                     ["chat", "hn-chat", "محادثة"]],
  [/قاعده\s*بيانات|قاعدة\s*بيانات|قواعد\s*بيانات|db|database|base\s*de\s*donn/gi, ["database", "hn-db", "hn-dbpro"]],
  [/فاتوره|فاتورة|فوتره|فوترة|ماليه|مالية|finance|billing|facturation/gi, ["finance", "billing", "فوترة"]],
  [/متجر|متاجر|store|shop|boutique|apps/gi,           ["store", "commerce", "hnapps", "متجر"]],
  [/بوابه|بوابة|portal|hub|groupe|هيئه|مجموعه/gi,     ["portal", "hn-groupe", "بوابة"]],
  [/تعلم|تعليم|learn|cours|course|study/gi,           ["learn", "تعلم"]],
  [/فيديو|سينما|فلم|film|cinema|video/gi,             ["media", "video", "film"]],
  [/مبدع|استوديو|createur|creator|studio/gi,          ["creator", "studio"]],
  [/نواه|نواة|nawat|noyau|core\s*brain/gi,            ["nawat", "نواة"]],
];

/** Keywords that signal a "my sites" question (regardless of project name). */
const SITE_INTENT = [
  /موقع|مواقع|مشروع|مشاريع|منصه|منصة|منصات|تطبيق|تطبيقات|رابط|روابط|لينك|نطاق|دومين|واجه|لوحه|لوحة|ادمن|ادار/i,
  /\bmy\s+(site|sites|project|projects|apps?|platforms?)\b/i,
  /\b(site|sites|project|projects|url|link|domain|dashboard|admin|panel|interface|portal|api)\b/i,
  /\bhn[-_ ]?\w*/i,
  /groupe[-_ ]?hn|hn[-_ ]?groupe/i,
];

export function expandSitesQuery(q: string): string[] {
  const nq = norm(q);
  const out = new Set<string>([nq]);
  for (const [re, adds] of SYNONYMS) {
    if (re.test(q)) adds.forEach((a) => out.add(norm(a)));
  }
  return [...out];
}

/** Score a project against the (normalized) question. */
function scoreProject(p: HNProject, nq: string, expanded: string[]): number {
  const hay = norm(
    [
      p.id, p.name, p.nameEn, p.summary, p.summaryEn, p.primary,
      ...(p.aliases || []),
      ...p.interfaces.map((i) => `${i.role || ""} ${i.url}`),
      p.category, CATEGORY_LABEL[p.category].ar, CATEGORY_LABEL[p.category].en,
    ].join(" "),
  );
  let s = 0;
  // Exact id/name hit
  if (nq.includes(norm(p.id))) s += 8;
  if (nq.includes(norm(p.name))) s += 6;
  if (nq.includes(norm(p.nameEn))) s += 6;
  // Aliases / domain fragments
  for (const a of p.aliases || []) if (nq.includes(norm(a))) s += 5;
  // Category label
  if (nq.includes(norm(CATEGORY_LABEL[p.category].ar))) s += 3;
  if (nq.includes(norm(CATEGORY_LABEL[p.category].en))) s += 3;
  // Token overlap from synonyms
  for (const term of expanded) {
    if (!term || term.length < 2) continue;
    if (hay.includes(term)) s += 2;
  }
  // Bare tokens from the question
  for (const tok of nq.split(/\s+/)) {
    if (tok.length >= 3 && hay.includes(tok)) s += 1;
  }
  return s;
}

export type SitesRoute = {
  isSitesQuestion: boolean;
  matched: Array<HNProject & { _score: number }>;
  category: HNCategory | null;
  expanded: string[];
};

export function routeSitesQuestion(question: string): SitesRoute {
  const nq = norm(question);
  const expanded = expandSitesQuery(question);

  // Intent detection
  let intent = SITE_INTENT.some((re) => re.test(question));
  // Any project name/alias present ⇒ also treat as site intent
  const namesHit = HN_PROJECTS.some((p) =>
    nq.includes(norm(p.id)) ||
    nq.includes(norm(p.name)) ||
    nq.includes(norm(p.nameEn)) ||
    (p.aliases || []).some((a) => nq.includes(norm(a))),
  );
  if (namesHit) intent = true;
  // Synonym category hit
  const catSynHit = expanded.length > 1;
  if (catSynHit && /موقع|مشروع|منص|تطبيق|site|project|app|platform/i.test(question)) intent = true;

  // Category detection from Arabic/English labels
  let category: HNCategory | null = null;
  for (const [key, lbl] of Object.entries(CATEGORY_LABEL) as Array<[HNCategory, { ar: string; en: string }]>) {
    if (nq.includes(norm(lbl.ar)) || nq.includes(norm(lbl.en))) { category = key; break; }
  }

  // Rank projects
  const scored = HN_PROJECTS
    .map((p) => Object.assign({}, p, { _score: scoreProject(p, nq, expanded) }))
    .filter((p) => p._score > 0)
    .sort((a, b) => b._score - a._score);

  const matched = scored.slice(0, 8);

  // If we matched at least one project, force site intent on.
  if (matched.length) intent = true;

  return { isSitesQuestion: intent, matched, category, expanded };
}

/** Find multiple projects for a fuzzy needle (for /ابحث, /search). */
export function findProjects(needle: string, limit = 10): HNProject[] {
  const nq = norm(needle);
  if (!nq) return [];
  const expanded = expandSitesQuery(needle);
  return HN_PROJECTS
    .map((p) => ({ p, s: scoreProject(p, nq, expanded) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
}

/** Projects in a category (accepts AR/EN label or key). */
export function projectsForCategoryLabel(label: string): { key: HNCategory | null; projects: HNProject[] } {
  const n = norm(label);
  let key: HNCategory | null = null;
  for (const [k, lbl] of Object.entries(CATEGORY_LABEL) as Array<[HNCategory, { ar: string; en: string }]>) {
    if (n === norm(k) || n.includes(norm(lbl.ar)) || n.includes(norm(lbl.en))) { key = k; break; }
  }
  if (!key) return { key: null, projects: [] };
  return { key, projects: HN_PROJECTS.filter((p) => p.category === key) };
}