// Wave 2 · Agent 6 — Service intent router + role resolver + reply formatter.
// Pure local — no AI calls. Detects service intent from Arabic/English/French,
// picks the right HN provider, formats the answer as Markdown.
import { HN_CAPABILITIES, matchCapabilities, renderCapability, type Capability, type Provider } from "./hn-capabilities";
import { norm } from "./nawat-sites-router";

export type ServiceRole = "admin" | "client" | "driver" | "api" | "call-center" | "super-admin" | "studio" | "auth" | "files" | "cloud" | "users" | "rules" | "status" | "websocket" | "stock" | null;

const ROLE_PATTERNS: Array<[RegExp, ServiceRole]> = [
  [/\b(super[-_ ]?admin|سوبر[-_ ]?ادمن|سوبر\s*مدير)\b/i, "super-admin"],
  [/\b(admin|ادمن|إدارة|إداره|اداره|مسؤول|dashboard|لوحة|لوحه|panel)\b/i, "admin"],
  [/\b(driver|سائق|شوفير|chauffeur)\b/i, "driver"],
  [/\b(client|عميل|زبون)\b/i, "client"],
  [/\b(api|endpoint|rest|برمج)\b/i, "api"],
  [/\b(call[-_ ]?center|كول[-_ ]?سنتر|مركز\s*(الاتصال|اتصال))\b/i, "call-center"],
  [/\b(studio|استوديو|أستوديو)\b/i, "studio"],
  [/\b(auth|login|تسجيل\s*دخول|مصادقة)\b/i, "auth"],
  [/\b(files?|ملفات|تخزين|storage)\b/i, "files"],
  [/\b(cloud|سحاب|سحابه|سحابة)\b/i, "cloud"],
  [/\b(users?|مستخدم)\b/i, "users"],
  [/\b(rules?|صلاحي|permissions?)\b/i, "rules"],
  [/\b(status|حالة|uptime|مراقبة)\b/i, "status"],
  [/\b(ws|websocket|realtime|لحظي)\b/i, "websocket"],
  [/\b(stock|stouk|مخزون|أسطول|اسطول|fleet)\b/i, "stock"],
];

export function detectRole(text: string): ServiceRole {
  const t = text || "";
  for (const [re, role] of ROLE_PATTERNS) if (re.test(t)) return role;
  return null;
}

export type ResolvedProvider = { provider: Provider; capability: Capability; matchedRole: ServiceRole };

export function resolveProvider(cap: Capability, opts: { role?: ServiceRole } = {}): ResolvedProvider {
  const role = opts.role || null;
  const sorted = [...cap.providers].sort((a, b) => a.priority - b.priority);
  let provider = sorted[0];
  if (role) {
    const roleMatch = sorted.find((p) => p.role === role);
    if (roleMatch) provider = roleMatch;
  }
  return { provider, capability: cap, matchedRole: provider.role === role ? role : null };
}

export function buildActionUrl(p: Provider, question?: string): string {
  try {
    const u = new URL(p.url);
    if (question && question.trim()) u.searchParams.set("q", question.trim().slice(0, 200));
    u.searchParams.set("via", "nawat");
    return u.toString();
  } catch {
    return p.url;
  }
}

export type ServiceIntent = {
  matched: boolean;
  confidence: number; // 0..1
  capability: Capability | null;
  role: ServiceRole;
  provider: Provider | null;
  actionUrl: string | null;
  alternatives: Array<Capability & { _score: number }>;
};

const OPEN_VERBS = /\b(افتح|شغل|شغّل|ادخل|روح|open|launch|start|go\s*to|ouvre|lance|va\b)\b/i;

export function detectServiceIntent(question: string): ServiceIntent {
  const q = (question || "").trim();
  const empty: ServiceIntent = { matched: false, confidence: 0, capability: null, role: null, provider: null, actionUrl: null, alternatives: [] };
  if (!q) return empty;

  const ranked = matchCapabilities(q, 5);
  if (!ranked.length) return empty;

  const top = ranked[0];
  const nq = norm(q);
  const toks = nq.split(/\s+/).filter(Boolean).length;
  // Confidence heuristic: normalize score by token count, boost when top >> second.
  const gap = top._score - (ranked[1]?._score ?? 0);
  const raw = top._score / Math.max(3, toks);
  const openBoost = OPEN_VERBS.test(q) ? 0.15 : 0;
  const gapBoost = gap >= 3 ? 0.15 : gap >= 1 ? 0.05 : 0;
  const confidence = Math.min(1, raw + openBoost + gapBoost);

  const role = detectRole(q);
  const resolved = resolveProvider(top, { role: role || undefined });
  return {
    matched: true,
    confidence,
    capability: top,
    role,
    provider: resolved.provider,
    actionUrl: buildActionUrl(resolved.provider, q),
    alternatives: ranked.slice(1),
  };
}

/** Render an executable answer for a matched service — Markdown, no AI. */
export function formatServiceReply(intent: ServiceIntent, lang: "ar" | "en" = "ar", question?: string): string {
  if (!intent.matched || !intent.capability || !intent.provider) return "";
  const isAr = lang === "ar";
  const cap = intent.capability;
  const p = intent.provider;
  const actionUrl = intent.actionUrl || p.url;
  const roleLabel = p.role ? ` · \`${p.role}\`` : "";
  const openLabel = isAr ? "افتح الآن" : "Open now";
  const primary = `**${isAr ? "الرابط الأنسب" : "Best match"}${roleLabel}:** [${p.url.replace(/^https?:\/\//, "")}](${actionUrl}) — [${openLabel}](${actionUrl})`;
  const card = renderCapability(cap, lang, question);
  const alts = intent.alternatives.length
    ? `\n\n**${isAr ? "خدمات قريبة" : "Related services"}:**\n` +
      intent.alternatives.slice(0, 3).map((a) => `- ${a.emoji} ${isAr ? a.ar : a.en} — \`/خدمة ${a.id}\``).join("\n")
    : "";
  const footer = `\n\n> ${isAr ? "نواة توجّهك دائماً إلى مواقع HN. لا مصادر خارجية." : "Nawat always routes you to HN sites. No external sources."}`;
  return `${card}\n\n${primary}${alts}${footer}`;
}

/** Look up a capability by id, name, or intent — used by /خدمة, /service. */
export function findCapability(needle: string): Capability | null {
  const n = norm(needle);
  if (!n) return null;
  const direct = HN_CAPABILITIES.find((c) => c.id === needle || norm(c.id) === n);
  if (direct) return direct;
  const nameHit = HN_CAPABILITIES.find(
    (c) => n === norm(c.ar) || n === norm(c.en) || n.includes(norm(c.ar)) || n.includes(norm(c.en)),
  );
  if (nameHit) return nameHit;
  const ranked = matchCapabilities(needle, 1);
  return ranked[0] || null;
}
