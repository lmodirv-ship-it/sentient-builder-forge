// HN ecosystem sites — categorized, always available in Nawat's memory.
// Update this list to expand. Nawat retrieves these when asked about "مواقعي" / "my sites".
import type { Doc } from "./nawat-search";

export type SiteCategory = {
  key: string;
  emoji: string;
  ar: string;
  en: string;
  urls: string[];
};

export const SITE_CATEGORIES: SiteCategory[] = [
  {
    key: "transport",
    emoji: "🚗",
    ar: "النقل والتوصيل والسائقين",
    en: "Transport, delivery & drivers",
    urls: [
      "https://admin.hn-driver.com",
      "https://admin.hndriver.company",
      "https://call.hndriver.company",
      "https://callcentre.hn-driver.com",
      "https://client.hn-driver.com",
      "https://client.hndriver.company",
      "https://delivery.hn-driver.com",
      "https://delivery.hndriver.company",
      "https://driver.hn-driver.com",
      "https://driver.hndriver.company",
      "https://hn-driver.com",
      "https://hn-driver.online",
      "https://hn-driver.site",
      "https://hndriver.company",
      "https://hndriver.hn-driver.com",
      "https://ride.hn-driver.com",
      "https://stouk.hn-driver.com",
      "https://super.hn-driver.com",
      "https://www.hn-driver.com",
      "https://www.hn-driver.online",
      "https://www.hn-driver.site",
      "https://www.hndriver.company",
    ],
  },
  {
    key: "carwash-print",
    emoji: "🧺",
    ar: "مغسلة وطباعة وخدمات",
    en: "Carwash, print & services",
    urls: [
      "https://api.slavacall-hiba.online",
      "https://carwashpro.com",
      "https://facturation.hn-createur.com",
      "https://hn-carwash.online",
      "https://hn-carwash.site",
      "https://lavagenizar.com",
      "https://slavacall-hiba.com",
      "https://slavacall-hiba.online",
      "https://tanjaprint.com",
      "https://tanjaprint.online",
      "https://www.carwashpro.com",
      "https://www.hn-carwash.online",
      "https://www.hn-carwash.site",
      "https://www.lavagenizar.com",
      "https://www.slavacall-hiba.online",
      "https://www.tanjaprint.com",
      "https://www.tanjaprint.online",
    ],
  },
  {
    key: "ai-chat",
    emoji: "🤖",
    ar: "الذكاء الاصطناعي والمحادثة",
    en: "AI & chat",
    urls: [
      "https://ai.hn-db.fun",
      "https://ai.hn-groupe.org",
      "https://generatin.hn-groupe.org",
      "https://hn-ai.online",
      "https://hn-ai.pro",
      "https://hn-ai.site",
      "https://hn-ai.store",
      "https://hn-chat.com",
      "https://hnchat.net",
      "https://hnclinik-ai.com",
      "https://www.ai.hn-groupe.org",
      "https://www.hn-ai.online",
      "https://www.hn-ai.pro",
      "https://www.hn-ai.site",
      "https://www.hn-ai.store",
      "https://www.hn-chat.com",
      "https://www.hnchat.net",
      "https://www.hnclinik-ai.com",
    ],
  },
  {
    key: "media",
    emoji: "🎬",
    ar: "الفيديو والسينما والاستوديو",
    en: "Video, cinema & studio",
    urls: [
      "https://cinema.hn-groupe.org",
      "https://film.hn-createur.com",
      "https://film.hn-groupe.net",
      "https://studio.hn-createur.com",
      "https://studio.hn-groupe.org",
      "https://video.hn-createur.com",
      "https://video.hn-groupe.net",
      "https://video.hn-groupe.org",
      "https://video.hn-groupe.tech",
      "https://www.film.hn-groupe.net",
      "https://www.video.hn-createur.com",
      "https://www.video.hn-groupe.net",
      "https://www.video.hn-groupe.org",
      "https://www.video.hn-groupe.tech",
    ],
  },
  {
    key: "groupe-createur",
    emoji: "💼",
    ar: "المجموعة والمُنشِئ (Groupe & Créateur)",
    en: "Groupe & Créateur",
    urls: [
      "https://build.hn-createur.com",
      "https://build.hn-groupe.net",
      "https://cloud.hn-createur.com",
      "https://createur.hn-groupe.net",
      "https://db.hn-createur.com",
      "https://goupe-hn.com",
      "https://goupe-hn.fun",
      "https://goupe-hn.online",
      "https://goupe-hn.site",
      "https://groupe-hn.com",
      "https://hn-createur.com",
      "https://hn-groupe.fun",
      "https://hn-groupe.net",
      "https://hn-groupe.org",
      "https://hn-groupe.pro",
      "https://hn-groupe.site",
      "https://hn-groupe.tech",
      "https://www.createur.hn-groupe.net",
      "https://www.goupe-hn.com",
      "https://www.goupe-hn.fun",
      "https://www.goupe-hn.online",
      "https://www.goupe-hn.site",
      "https://www.groupe-hn.com",
      "https://www.hn-createur.com",
      "https://www.hn-groupe.fun",
      "https://www.hn-groupe.net",
      "https://www.hn-groupe.org",
      "https://www.hn-groupe.site",
      "https://www.hn-groupe.tech",
    ],
  },
  {
    key: "realestate",
    emoji: "🏢",
    ar: "العقارات",
    en: "Real estate",
    urls: [
      "https://hn-immo.com",
      "https://imm.hn-groupe.net",
      "https://www.hn-immo.com",
    ],
  },
  {
    key: "finance",
    emoji: "💰",
    ar: "المالية والاقتصاد",
    en: "Finance & economy",
    urls: [
      "https://hiba-eco.com",
      "https://hn-finance.online",
      "https://hn-finance.site",
      "https://www.hiba-eco.com",
      "https://www.hn-finance.online",
      "https://www.hn-finance.site",
    ],
  },
  {
    key: "islamic",
    emoji: "🕌",
    ar: "الأذكار والمحتوى الإسلامي",
    en: "Adhkar & Islamic content",
    urls: [
      "https://adkhar.hn-groupe.net",
      "https://hn-adkhar.life",
      "https://www.hn-adkhar.life",
    ],
  },
  {
    key: "db-infra",
    emoji: "🗄️",
    ar: "قواعد البيانات والـ APIs والبنية التحتية",
    en: "Databases, APIs & infrastructure",
    urls: [
      "https://api.hn-db.fun",
      "https://api.hn-dbpro.com",
      "https://auth.hn-db.fun",
      "https://cloud.hn-createur.com",
      "https://files.hn-db.fun",
      "https://hn-bd.online",
      "https://hn-db.fun",
      "https://hn-db.hn-groupe.net",
      "https://hn-dbpro.com",
      "https://owner.hn-db.fun",
      "https://rule.hn-db.fun",
      "https://status.hn-db.fun",
      "https://users.hn-db.fun",
      "https://ws.hn-db.fun",
      "https://www.hn-bd.online",
      "https://www.hn-db.fun",
      "https://www.hn-dbpro.com",
    ],
  },
  {
    key: "clinic",
    emoji: "🏥",
    ar: "العيادة الطبية",
    en: "Clinic",
    urls: [
      "https://hnclinik.hn-groupe.net",
      "https://hnclinik-ai.com",
      "https://www.hnclinik-ai.com",
    ],
  },
  {
    key: "apps",
    emoji: "📱",
    ar: "متجر التطبيقات",
    en: "Apps store",
    urls: [
      "https://hnapps.store",
      "https://www.hnapps.store",
      "https://store.hn-groupe.net",
      "https://www.store.hn-groupe.net",
    ],
  },
  {
    key: "learn-cv-blog",
    emoji: "📚",
    ar: "التعلم والسيرة والمدونة والعطاءات",
    en: "Learn, CV, blog & tenders",
    urls: [
      "https://audit.hn-groupe.net",
      "https://blog.hn-groupe.org",
      "https://buildcv-ai.online",
      "https://cv.hn-groupe.org",
      "https://learn.hn-createur.com",
      "https://learn.hn-groupe.tech",
      "https://rfp.hn-groupe.net",
      "https://search.hn-groupe.net",
      "https://site.hn-groupe.tech",
      "https://tender.hn-groupe.org",
      "https://www.audit.hn-groupe.net",
      "https://www.buildcv-ai.online",
      "https://www.rfp.hn-groupe.net",
      "https://www.search.hn-groupe.net",
      "https://www.tender.hn-groupe.org",
    ],
  },
  {
    key: "nawat",
    emoji: "🌰",
    ar: "نواة (Nawat)",
    en: "Nawat itself",
    urls: [
      "https://nawat.hn-groupe.net",
      "https://www.nawat.hn-groupe.net",
    ],
  },
];

export function allSites(): string[] {
  return Array.from(new Set(SITE_CATEGORIES.flatMap(c => c.urls))).sort();
}

/** Generate memory Docs for the sites index (one per category + one master). */
export function getSitesDocs(): Doc[] {
  const now = Date.now();
  const docs: Doc[] = SITE_CATEGORIES.map((c, i) => ({
    id: `site-cat-${c.key}`,
    title: `${c.emoji} ${c.ar} — ${c.en} (${c.urls.length})`,
    content:
      `تصنيف: ${c.ar} / ${c.en}\n` +
      `عدد المواقع: ${c.urls.length}\n\n` +
      c.urls.map(u => `• ${u}`).join("\n"),
    tags: ["مواقعي", "my-sites", "sites", c.key, c.ar],
    source: "hn-sites-registry",
    createdAt: now + i,
    tier: "core",
  }));

  const all = allSites();
  docs.unshift({
    id: "site-cat-all",
    title: `🌐 كل مواقعي (${all.length}) — All my sites`,
    content:
      `هذه قائمة كل مواقعي في منظومة HN (${all.length} موقع).\n` +
      `التصنيفات: ${SITE_CATEGORIES.map(c => `${c.emoji} ${c.ar} (${c.urls.length})`).join(" · ")}\n\n` +
      all.map(u => `• ${u}`).join("\n"),
    tags: ["مواقعي", "my-sites", "sites", "hn", "index", "فهرس"],
    source: "hn-sites-registry",
    createdAt: now,
    tier: "core",
  });

  return docs;
}

export const SITES_COUNT = allSites().length;
export const SITES_CATEGORY_COUNT = SITE_CATEGORIES.length;
