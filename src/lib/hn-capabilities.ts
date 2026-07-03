// 52 خدمات لمنظومة HN — كل خدمة: intents (كلمات النية) + providers (الموقع الأساسي + البدائل).
// المستوى 1: توجيه فوري بالنية → رابط. جاهز للتوسّع للمستوى 2 (deep-link) و 3 (API).
import type { Doc } from "./nawat-search";
import { norm } from "./nawat-sites-router";

export type CapMode = "site" | "deeplink" | "api";

export type Provider = {
  url: string;
  priority: number;      // 1 = primary
  mode?: CapMode;        // default: site
  role?: string;         // admin / client / api / studio ...
};

export type Capability = {
  id: string;             // stable slug
  ar: string;             // اسم الخدمة بالعربية
  en: string;             // English label
  emoji: string;
  intents: string[];      // كلمات نية (ar/en/fr)
  providers: Provider[];  // موقع أساسي + بدائل
  parent: string;         // المشروع الأم (Driver / DB / AI …)
  note?: string;          // ⚠️ ملاحظات
};

/* eslint-disable prettier/prettier */
export const HN_CAPABILITIES: Capability[] = [
  // ── HN Driver (7) ────────────────────────────────────────────
  { id: "ride",           ar: "طلب رحلة",         en: "Book a ride",           emoji: "🚕", parent: "Driver",  intents: ["رحلة","ركوب","تاكسي","ride","taxi","course"],           providers: [{ url: "https://ride.hn-driver.com", priority: 1 }, { url: "https://client.hn-driver.com", priority: 2, role: "client" }] },
  { id: "delivery",       ar: "طلب توصيل",        en: "Delivery",              emoji: "📦", parent: "Driver",  intents: ["توصيل","طلبية","delivery","livraison"],                  providers: [{ url: "https://delivery.hn-driver.com", priority: 1 }, { url: "https://client.hn-driver.com", priority: 2, role: "client" }] },
  { id: "driver-panel",   ar: "لوحة السائق",      en: "Driver dashboard",      emoji: "🧑‍✈️", parent: "Driver",  intents: ["سائق","لوحة سائق","driver","chauffeur"],                 providers: [{ url: "https://driver.hn-driver.com", priority: 1, role: "driver" }, { url: "https://driver.hndriver.company", priority: 2, role: "driver" }] },
  { id: "client-panel",   ar: "لوحة العميل",      en: "Client dashboard",      emoji: "👤", parent: "Driver",  intents: ["عميل","زبون","client"],                                  providers: [{ url: "https://client.hn-driver.com", priority: 1, role: "client" }, { url: "https://client.hndriver.company", priority: 2, role: "client" }] },
  { id: "transport-admin",ar: "إدارة النقل",      en: "Transport admin",       emoji: "🛠️", parent: "Driver",  intents: ["ادارة النقل","admin driver","admin نقل","super"],       providers: [{ url: "https://admin.hn-driver.com", priority: 1, role: "admin" }, { url: "https://super.hn-driver.com", priority: 2, role: "super-admin" }] },
  { id: "callcenter",     ar: "مركز الاتصال",     en: "Call center",           emoji: "☎️", parent: "Driver",  intents: ["كول سنتر","مركز اتصال","call","call center"],           providers: [{ url: "https://callcentre.hn-driver.com", priority: 1, role: "call-center" }, { url: "https://call.hndriver.company", priority: 2, role: "call-center" }] },
  { id: "fleet-stock",    ar: "أسطول/مخزون",     en: "Fleet / stock",         emoji: "🚚", parent: "Driver",  intents: ["اسطول","fleet","stock","مخزون","stouk"],                 providers: [{ url: "https://stouk.hn-driver.com", priority: 1, role: "stock" }], note: "⚠️ يجمع بين الأسطول والمخزون" },

  // ── HN-DB (9) ────────────────────────────────────────────────
  { id: "db",             ar: "قاعدة بيانات",      en: "Database",              emoji: "🗄️", parent: "DB",      intents: ["قاعدة بيانات","db","database","base de donnees"],       providers: [{ url: "https://hn-db.fun", priority: 1 }, { url: "https://db.hn-createur.com", priority: 2 }] },
  { id: "api",            ar: "API برمجي",         en: "API",                   emoji: "🔌", parent: "DB",      intents: ["api","endpoint","rest","برمجي"],                          providers: [{ url: "https://api.hn-db.fun", priority: 1, mode: "api", role: "api" }, { url: "https://api.hn-dbpro.com", priority: 2, mode: "api", role: "api" }] },
  { id: "auth",           ar: "مصادقة",            en: "Authentication",        emoji: "🔐", parent: "DB",      intents: ["مصادقة","auth","login","تسجيل دخول"],                    providers: [{ url: "https://auth.hn-db.fun", priority: 1, role: "auth" }] },
  { id: "files",          ar: "تخزين ملفات",       en: "File storage",          emoji: "📁", parent: "DB",      intents: ["ملفات","تخزين","upload","files"],                        providers: [{ url: "https://files.hn-db.fun", priority: 1, role: "files" }, { url: "https://cloud.hn-createur.com", priority: 2, role: "cloud" }] },
  { id: "users",          ar: "مستخدمون",          en: "Users",                 emoji: "👥", parent: "DB",      intents: ["مستخدمين","users","حسابات"],                            providers: [{ url: "https://users.hn-db.fun", priority: 1, role: "users" }] },
  { id: "rules",          ar: "صلاحيات",           en: "Rules & permissions",   emoji: "🛡️", parent: "DB",      intents: ["صلاحيات","قواعد","rules","permissions"],                 providers: [{ url: "https://rule.hn-db.fun", priority: 1, role: "rules" }] },
  { id: "status",         ar: "مراقبة الحالة",     en: "Status",                emoji: "📶", parent: "DB",      intents: ["حالة","status","uptime","مراقبة"],                       providers: [{ url: "https://status.hn-db.fun", priority: 1, role: "status" }] },
  { id: "websocket",      ar: "WebSocket",         en: "WebSocket",             emoji: "🛰️", parent: "DB",      intents: ["websocket","ws","realtime","لحظي"],                      providers: [{ url: "https://ws.hn-db.fun", priority: 1, role: "websocket" }] },
  { id: "ai-on-db",       ar: "AI على DB",         en: "AI on DB",              emoji: "🧠", parent: "DB",      intents: ["ai db","ذكاء قاعدة"],                                   providers: [{ url: "https://ai.hn-db.fun", priority: 1, role: "ai" }] },

  // ── HN AI (3) ─────────────────────────────────────────────────
  { id: "chat-ai",        ar: "محادثة AI",         en: "AI chat",               emoji: "💬", parent: "AI",      intents: ["مساعد","chat ai","محادثة ذكاء","assistant"],            providers: [{ url: "https://ai.hn-groupe.org", priority: 1 }, { url: "https://hn-ai.pro", priority: 2 }] },
  { id: "image-gen",      ar: "توليد صور",         en: "Image generation",      emoji: "🖼️", parent: "AI",      intents: ["صورة","صور","image","logo","شعار","dessin","توليد صور"], providers: [{ url: "https://generatin.hn-groupe.org", priority: 1 }, { url: "https://hn-ai.pro", priority: 2 }] },
  { id: "content-gen",    ar: "توليد محتوى",       en: "Content generation",    emoji: "✍️", parent: "AI",      intents: ["توليد","generate","content","محتوى"],                    providers: [{ url: "https://generatin.hn-groupe.org", priority: 1 }, { url: "https://ai.hn-groupe.org", priority: 2 }] },

  // ── Chat (1) ─────────────────────────────────────────────────
  { id: "chat-general",   ar: "محادثة عامة",       en: "General chat",          emoji: "💭", parent: "Chat",    intents: ["شات","chat","محادثة"],                                   providers: [{ url: "https://hn-chat.com", priority: 1 }, { url: "https://hnchat.net", priority: 2 }] },

  // ── Créateur (7) ─────────────────────────────────────────────
  { id: "video",          ar: "إنتاج فيديو",       en: "Video production",      emoji: "🎥", parent: "Créateur", intents: ["فيديو","video","montage"],                              providers: [{ url: "https://video.hn-createur.com", priority: 1 }, { url: "https://video.hn-groupe.net", priority: 2 }, { url: "https://video.hn-groupe.org", priority: 3 }] },
  { id: "studio",         ar: "استوديو",           en: "Studio",                emoji: "🎬", parent: "Créateur", intents: ["استوديو","studio"],                                     providers: [{ url: "https://studio.hn-createur.com", priority: 1 }, { url: "https://studio.hn-groupe.org", priority: 2 }] },
  { id: "film",           ar: "أفلام",             en: "Films",                 emoji: "🎞️", parent: "Créateur", intents: ["فيلم","افلام","film"],                                  providers: [{ url: "https://film.hn-createur.com", priority: 1 }, { url: "https://film.hn-groupe.net", priority: 2 }] },
  { id: "cinema",         ar: "سينما",             en: "Cinema",                emoji: "🎦", parent: "Media",   intents: ["سينما","cinema"],                                       providers: [{ url: "https://cinema.hn-groupe.org", priority: 1 }] },
  { id: "build",          ar: "بناء مشروع",        en: "Build",                 emoji: "🏗️", parent: "Créateur", intents: ["بناء","build"],                                         providers: [{ url: "https://build.hn-createur.com", priority: 1 }, { url: "https://build.hn-groupe.net", priority: 2 }] },
  { id: "learn",          ar: "تعلّم",             en: "Learn",                 emoji: "📚", parent: "Créateur", intents: ["تعلم","تعليم","learn","course","cours"],                providers: [{ url: "https://learn.hn-createur.com", priority: 1 }, { url: "https://learn.hn-groupe.tech", priority: 2 }] },
  { id: "cloud",          ar: "سحابة",             en: "Cloud",                 emoji: "☁️", parent: "Créateur", intents: ["سحابة","cloud"],                                        providers: [{ url: "https://cloud.hn-createur.com", priority: 1 }] },
  { id: "billing",        ar: "فواتير",            en: "Invoicing",             emoji: "🧾", parent: "Créateur", intents: ["فاتورة","فواتير","invoice","facturation"],              providers: [{ url: "https://facturation.hn-createur.com", priority: 1 }, { url: "https://hn-finance.online", priority: 2 }] },

  // ── CV / Groupe (5) ──────────────────────────────────────────
  { id: "cv",             ar: "CV بالAI",          en: "AI CV builder",         emoji: "📄", parent: "BuildCV", intents: ["cv","سيرة","resume","curriculum"],                       providers: [{ url: "https://buildcv-ai.online", priority: 1 }, { url: "https://cv.hn-groupe.org", priority: 2 }] },
  { id: "tender",         ar: "مناقصات",           en: "Tenders",               emoji: "📢", parent: "Groupe",  intents: ["مناقصة","tender","عطاء"],                               providers: [{ url: "https://tender.hn-groupe.org", priority: 1 }] },
  { id: "rfp",            ar: "RFP",               en: "RFP",                   emoji: "📨", parent: "Groupe",  intents: ["rfp","عرض سعر","طلب عرض"],                              providers: [{ url: "https://rfp.hn-groupe.net", priority: 1 }] },
  { id: "search",         ar: "بحث",               en: "Search",                emoji: "🔎", parent: "Groupe",  intents: ["بحث","search"],                                         providers: [{ url: "https://search.hn-groupe.net", priority: 1 }] },
  { id: "audit",          ar: "تدقيق",             en: "Audit",                 emoji: "📊", parent: "Groupe",  intents: ["تدقيق","audit","مراجعة"],                               providers: [{ url: "https://audit.hn-groupe.net", priority: 1 }] },

  // ── Sectors (6) ──────────────────────────────────────────────
  { id: "immo",           ar: "عقارات",            en: "Real estate",           emoji: "🏢", parent: "Immo",    intents: ["عقار","عقارات","immo","real estate"],                   providers: [{ url: "https://hn-immo.com", priority: 1 }, { url: "https://imm.hn-groupe.net", priority: 2 }] },
  { id: "finance",        ar: "مالية",             en: "Finance",               emoji: "💰", parent: "Finance", intents: ["مالية","finance","محاسبة"],                             providers: [{ url: "https://hn-finance.online", priority: 1 }, { url: "https://hn-finance.site", priority: 2 }], note: "⚠️ خدمات مالية عامة" },
  { id: "clinic",         ar: "عيادة AI",          en: "AI clinic",             emoji: "🏥", parent: "Clinik",  intents: ["عيادة","clinic","clinique","طبي","docteur"],            providers: [{ url: "https://hnclinik-ai.com", priority: 1 }, { url: "https://hnclinik.hn-groupe.net", priority: 2 }] },
  { id: "adkhar",         ar: "أذكار",             en: "Adhkar",                emoji: "📿", parent: "Adkhar",  intents: ["اذكار","ذكر","adkhar","dhikr"],                          providers: [{ url: "https://hn-adkhar.life", priority: 1 }, { url: "https://adkhar.hn-groupe.net", priority: 2 }] },
  { id: "eco",            ar: "eco",               en: "Eco / economy",         emoji: "🌱", parent: "Hiba Eco",intents: ["eco","hiba eco","اقتصاد"],                              providers: [{ url: "https://hiba-eco.com", priority: 1 }], note: "⚠️ يحتاج توصيف" },

  // ── Carwash / Print (5) ──────────────────────────────────────
  { id: "carwash-pro",    ar: "مغسلة pro",         en: "Carwash Pro",           emoji: "🧼", parent: "Carwash", intents: ["مغسلة","carwash","lavage","wash"],                       providers: [{ url: "https://carwashpro.com", priority: 1 }, { url: "https://hn-carwash.online", priority: 2 }, { url: "https://hn-carwash.site", priority: 3 }] },
  { id: "carwash-nizar",  ar: "مغسلة نزار",        en: "Lavage Nizar",          emoji: "🚿", parent: "Lavage",  intents: ["نزار","lavage nizar","lavagenizar"],                    providers: [{ url: "https://lavagenizar.com", priority: 1 }] },
  { id: "carwash-book",   ar: "حجز مغسلة",         en: "Carwash booking",       emoji: "📅", parent: "SlavaCall",intents: ["حجز مغسلة","slava","hiba wash","slavacall"],           providers: [{ url: "https://slavacall-hiba.com", priority: 1 }, { url: "https://slavacall-hiba.online", priority: 2 }] },
  { id: "carwash-api",    ar: "API مغسلة",         en: "Carwash API",           emoji: "🔗", parent: "SlavaCall",intents: ["api slava","api مغسلة"],                                providers: [{ url: "https://api.slavacall-hiba.online", priority: 1, mode: "api", role: "api" }] },
  { id: "print",          ar: "طباعة",             en: "Print",                 emoji: "🖨️", parent: "TanjaPrint",intents: ["طباعة","print","tanja","imprim"],                      providers: [{ url: "https://tanjaprint.com", priority: 1 }, { url: "https://tanjaprint.online", priority: 2 }] },

  // ── Portal / Commerce / Nawat / infra extras (8) ─────────────
  { id: "portal",         ar: "بوابة HN",          en: "HN portal",             emoji: "🌐", parent: "Groupe",  intents: ["بوابة","portal","hub","groupe"],                        providers: [{ url: "https://hn-groupe.net", priority: 1 }] },
  { id: "blog",           ar: "مدونة",             en: "Blog",                  emoji: "📝", parent: "Groupe",  intents: ["مدونة","blog"],                                         providers: [{ url: "https://blog.hn-groupe.org", priority: 1 }] },
  { id: "site-builder",   ar: "منشئ مواقع",        en: "Site builder",          emoji: "🧱", parent: "Groupe",  intents: ["منشئ مواقع","site builder","بناء موقع"],                providers: [{ url: "https://site.hn-groupe.tech", priority: 1 }] },
  { id: "store-portal",   ar: "متجر",              en: "Store",                 emoji: "🛒", parent: "Groupe",  intents: ["متجر","store","boutique"],                              providers: [{ url: "https://store.hn-groupe.net", priority: 1 }, { url: "https://hnapps.store", priority: 2 }] },
  { id: "apps-store",     ar: "متجر apps",         en: "Apps store",            emoji: "📱", parent: "Apps",    intents: ["apps","تطبيقات"],                                       providers: [{ url: "https://hnapps.store", priority: 1 }] },
  { id: "nawat",          ar: "نواة",              en: "Nawat",                 emoji: "🌰", parent: "Nawat",   intents: ["نواة","nawat"],                                         providers: [{ url: "https://nawat.hn-groupe.net", priority: 1 }] },
  { id: "dbpro",          ar: "DB Pro",            en: "DB Pro",                emoji: "🗃️", parent: "DB Pro",  intents: ["dbpro","db pro","احترافي"],                             providers: [{ url: "https://hn-dbpro.com", priority: 1 }, { url: "https://api.hn-dbpro.com", priority: 2, mode: "api", role: "api" }], note: "⚠️ نسخة SLA أعلى" },
  { id: "hn-bd",          ar: "HN BD",             en: "HN BD",                 emoji: "🧩", parent: "BD",      intents: ["hn bd","hn-bd"],                                        providers: [{ url: "https://hn-bd.online", priority: 1 }], note: "⚠️ يحتاج توصيف" },
  { id: "db-createur",    ar: "DB Créateur",       en: "DB Créateur",           emoji: "🗄️", parent: "Créateur",intents: ["db createur","db مبدع"],                                providers: [{ url: "https://db.hn-createur.com", priority: 1 }] },
];
/* eslint-enable prettier/prettier */

export const HN_CAPABILITIES_COUNT = HN_CAPABILITIES.length;

/** Match a free-text question → ranked capabilities by intent overlap. */
export function matchCapabilities(question: string, limit = 5): Array<Capability & { _score: number }> {
  const nq = norm(question);
  if (!nq) return [];
  const toks = nq.split(/\s+/).filter((t) => t.length >= 2);
  return HN_CAPABILITIES.map((c) => {
    const hay = norm([c.id, c.ar, c.en, ...c.intents, c.parent].join(" "));
    let s = 0;
    for (const intent of c.intents) {
      const ni = norm(intent);
      if (!ni) continue;
      if (nq.includes(ni)) s += 5;
    }
    for (const t of toks) if (hay.includes(t)) s += 1;
    if (nq.includes(norm(c.ar))) s += 3;
    if (nq.includes(norm(c.en))) s += 3;
    return Object.assign({}, c, { _score: s });
  })
    .filter((c) => c._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

/** Build the smart-open URL for a capability (with ?q= for context). */
export function openCapability(id: string, question?: string): string | null {
  const cap = HN_CAPABILITIES.find((c) => c.id === id);
  if (!cap) return null;
  const p = [...cap.providers].sort((a, b) => a.priority - b.priority)[0];
  if (!p) return null;
  try {
    const u = new URL(p.url);
    if (question) u.searchParams.set("q", question);
    u.searchParams.set("via", "nawat");
    return u.toString();
  } catch {
    return p.url;
  }
}

/** Render a capability as Markdown (primary link + alternates + smart open). */
export function renderCapability(cap: Capability, lang: "ar" | "en" = "ar", question?: string): string {
  const isAr = lang === "ar";
  const sorted = [...cap.providers].sort((a, b) => a.priority - b.priority);
  const head = `### ${cap.emoji} ${isAr ? cap.ar : cap.en}`;
  const primary = sorted[0];
  const line1 = `**${isAr ? "الرابط الأنسب" : "Best link"}:** [${primary.url.replace(/^https?:\/\//, "")}](${openCapability(cap.id, question) || primary.url})`;
  const alts = sorted.slice(1).length
    ? `**${isAr ? "بدائل" : "Alternatives"}:**\n` +
      sorted
        .slice(1)
        .map((p) => `- ${p.role ? `**${p.role}** — ` : ""}[${p.url.replace(/^https?:\/\//, "")}](${p.url})`)
        .join("\n")
    : "";
  const meta = `_${isAr ? "المشروع الأم" : "Parent"}: ${cap.parent}${cap.note ? ` · ${cap.note}` : ""}_`;
  return [head, line1, alts, meta].filter(Boolean).join("\n\n");
}

/** Turn every capability into a searchable memory Doc (tier: core). */
export function getCapabilityDocs(): Doc[] {
  const now = Date.now();
  const perCap: Doc[] = HN_CAPABILITIES.map((cap, i) => {
    const sorted = [...cap.providers].sort((a, b) => a.priority - b.priority);
    const primary = sorted[0];
    const alts = sorted.slice(1).map((p) => `  • ${p.role ? `[${p.role}] ` : ""}${p.url}`).join("\n");
    const content =
      `الخدمة: ${cap.ar} — ${cap.en}\n` +
      `المشروع الأم: ${cap.parent}\n` +
      `كلمات النية: ${cap.intents.join(" · ")}\n\n` +
      `الرابط الأساسي: ${primary.url}${primary.role ? ` (${primary.role})` : ""}${primary.mode ? ` · وضع: ${primary.mode}` : ""}\n` +
      (alts ? `بدائل:\n${alts}\n` : "") +
      (cap.note ? `\nملاحظة: ${cap.note}\n` : "");
    return {
      id: `hn-cap-${cap.id}`,
      title: `${cap.emoji} ${cap.ar} — ${cap.en}`,
      content,
      tags: ["مواقعي", "capability", "خدمة", cap.id, cap.parent.toLowerCase(), ...cap.intents.slice(0, 6)],
      source: primary.url,
      createdAt: now + i,
      tier: "core",
    };
  });

  // Index doc: summarizes all 52 services in one card.
  const index: Doc = {
    id: "hn-cap-index",
    title: `🧭 قدرات منظومة HN (${HN_CAPABILITIES.length} خدمة)`,
    content:
      `فهرس ${HN_CAPABILITIES.length} خدمة قابلة للاستدعاء عبر النية. عند طلب المستخدم لخدمة، وجّهه فوراً إلى الرابط الأنسب من هذه القائمة — ممنوع اقتراح أدوات خارجية.\n\n` +
      HN_CAPABILITIES.map((c, i) => {
        const p = [...c.providers].sort((a, b) => a.priority - b.priority)[0];
        return `${i + 1}. ${c.emoji} **${c.ar}** (${c.en}) → ${p.url}`;
      }).join("\n"),
    tags: ["مواقعي", "capabilities", "index", "فهرس-خدمات", "hn"],
    source: "hn-capabilities",
    createdAt: now,
    tier: "core",
  };

  return [index, ...perCap];
}
