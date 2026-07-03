// شبكة HN — بنية موحدة للمشاريع الأم وواجهاتها
// Auto-organized from the provided 150+ URLs into ~20 parent projects.

export type HNCategory =
  | "transport"
  | "database"
  | "ai"
  | "chat"
  | "portal"
  | "creator"
  | "media"
  | "cv"
  | "finance"
  | "realestate"
  | "commerce"
  | "services"
  | "religion"
  | "clinic"
  | "learn"
  | "nawat";

export const CATEGORY_LABEL: Record<HNCategory, { ar: string; en: string; icon: string }> = {
  transport:  { ar: "النقل والتوصيل",       en: "Transport & Delivery", icon: "🚕" },
  database:   { ar: "قواعد البيانات",       en: "Databases",           icon: "🗄️" },
  ai:         { ar: "الذكاء الاصطناعي",     en: "AI",                  icon: "🧠" },
  chat:       { ar: "المحادثة",             en: "Chat",                icon: "💬" },
  portal:     { ar: "البوابة الرئيسية",     en: "Main Portal",         icon: "🌐" },
  creator:    { ar: "المبدعون والاستوديو",   en: "Creators & Studio",   icon: "🎨" },
  media:      { ar: "الفيديو والسينما",     en: "Video & Cinema",      icon: "🎬" },
  cv:         { ar: "السير الذاتية والصفقات", en: "CV & Tenders",       icon: "📄" },
  finance:    { ar: "المالية والفوترة",     en: "Finance & Billing",   icon: "💰" },
  realestate: { ar: "العقار",               en: "Real Estate",         icon: "🏠" },
  commerce:   { ar: "المتاجر والتطبيقات",   en: "Stores & Apps",       icon: "🛍️" },
  services:   { ar: "خدمات (مغسلة/طباعة)",  en: "Services (Wash/Print)", icon: "🧼" },
  religion:   { ar: "الأذكار",              en: "Adkhar",              icon: "📿" },
  clinic:     { ar: "الطبي",                en: "Clinic",              icon: "🏥" },
  learn:      { ar: "التعلم",               en: "Learn",               icon: "📚" },
  nawat:      { ar: "النواة",               en: "Nawat",               icon: "✨" },
};

export type HNInterface = {
  url: string;
  role?: string; // admin / client / driver / api / ...
};

export type HNProject = {
  id: string;
  name: string;         // ar-friendly name
  nameEn: string;
  category: HNCategory;
  summary: string;      // ar
  summaryEn: string;
  primary: string;      // main URL
  interfaces: HNInterface[];
  aliases?: string[];   // alternate domains (typos/variants)
};

// helper
const iface = (url: string, role?: string): HNInterface => ({ url, role });

export const HN_PROJECTS: HNProject[] = [
  {
    id: "hn-driver",
    name: "HN Driver — منصة النقل والتوصيل",
    nameEn: "HN Driver — Ride & Delivery",
    category: "transport",
    summary: "نظام كامل للنقل والتوصيل مع واجهات للسائق والعميل والإدارة ومركز الاتصال.",
    summaryEn: "Full ride & delivery stack with driver, client, admin, and call-center apps.",
    primary: "https://hn-driver.com",
    aliases: ["https://hn-driver.online", "https://hn-driver.site", "https://hndriver.company", "https://hndriver.hn-driver.com"],
    interfaces: [
      iface("https://hn-driver.com", "site"),
      iface("https://admin.hn-driver.com", "admin"),
      iface("https://client.hn-driver.com", "client"),
      iface("https://driver.hn-driver.com", "driver"),
      iface("https://super.hn-driver.com", "super-admin"),
      iface("https://callcentre.hn-driver.com", "call-center"),
      iface("https://ride.hn-driver.com", "ride"),
      iface("https://delivery.hn-driver.com", "delivery"),
      iface("https://stouk.hn-driver.com", "stock"),
      iface("https://hndriver.company", "site-alt"),
      iface("https://admin.hndriver.company", "admin-alt"),
      iface("https://client.hndriver.company", "client-alt"),
      iface("https://driver.hndriver.company", "driver-alt"),
      iface("https://delivery.hndriver.company", "delivery-alt"),
      iface("https://call.hndriver.company", "call-alt"),
    ],
  },
  {
    id: "hn-db",
    name: "HN DB — منصة قواعد البيانات",
    nameEn: "HN DB — Database Platform",
    category: "database",
    summary: "منصة قواعد بيانات كاملة مع API ومصادقة وملفات وذكاء اصطناعي وحالة.",
    summaryEn: "Full DB platform: API, auth, files, AI, users, status, websockets.",
    primary: "https://hn-db.fun",
    interfaces: [
      iface("https://hn-db.fun", "site"),
      iface("https://admin.hn-db.fun", "admin"),
      iface("https://api.hn-db.fun", "api"),
      iface("https://auth.hn-db.fun", "auth"),
      iface("https://ai.hn-db.fun", "ai"),
      iface("https://files.hn-db.fun", "files"),
      iface("https://owner.hn-db.fun", "owner"),
      iface("https://rule.hn-db.fun", "rules"),
      iface("https://status.hn-db.fun", "status"),
      iface("https://users.hn-db.fun", "users"),
      iface("https://ws.hn-db.fun", "websocket"),
      iface("https://hn-db.hn-groupe.net", "portal"),
    ],
  },
  {
    id: "hn-dbpro",
    name: "HN DB Pro — النسخة الاحترافية",
    nameEn: "HN DB Pro",
    category: "database",
    summary: "النسخة الاحترافية لقاعدة البيانات مع API مستقل.",
    summaryEn: "Pro tier of HN DB with dedicated API.",
    primary: "https://hn-dbpro.com",
    interfaces: [
      iface("https://hn-dbpro.com", "site"),
      iface("https://api.hn-dbpro.com", "api"),
    ],
  },
  {
    id: "hn-bd",
    name: "HN BD",
    nameEn: "HN BD",
    category: "database",
    summary: "منصة بيانات إضافية.",
    summaryEn: "Additional data platform.",
    primary: "https://hn-bd.online",
    interfaces: [iface("https://hn-bd.online", "site")],
  },
  {
    id: "hn-groupe",
    name: "HN Groupe — البوابة الرئيسية",
    nameEn: "HN Groupe — Main Portal",
    category: "portal",
    summary: "المركز الرئيسي للمجموعة يجمع الخدمات: تدقيق، بناء، متجر، فيديو، بحث، عيادة.",
    summaryEn: "Central hub aggregating audit, build, store, video, search, clinic services.",
    primary: "https://hn-groupe.net",
    aliases: [
      "https://hn-groupe.org","https://hn-groupe.fun","https://hn-groupe.pro",
      "https://hn-groupe.site","https://hn-groupe.tech","https://groupe-hn.com",
      "https://goupe-hn.com","https://goupe-hn.fun","https://goupe-hn.online","https://goupe-hn.site",
    ],
    interfaces: [
      iface("https://hn-groupe.net", "portal"),
      iface("https://audit.hn-groupe.net", "audit"),
      iface("https://build.hn-groupe.net", "build"),
      iface("https://createur.hn-groupe.net", "creators"),
      iface("https://film.hn-groupe.net", "film"),
      iface("https://imm.hn-groupe.net", "real-estate"),
      iface("https://rfp.hn-groupe.net", "rfp"),
      iface("https://search.hn-groupe.net", "search"),
      iface("https://store.hn-groupe.net", "store"),
      iface("https://video.hn-groupe.net", "video"),
      iface("https://hn-groupe.org", "portal-org"),
      iface("https://blog.hn-groupe.org", "blog"),
      iface("https://cinema.hn-groupe.org", "cinema"),
      iface("https://cv.hn-groupe.org", "cv"),
      iface("https://generatin.hn-groupe.org", "generation"),
      iface("https://studio.hn-groupe.org", "studio"),
      iface("https://tender.hn-groupe.org", "tender"),
      iface("https://video.hn-groupe.org", "video-org"),
      iface("https://learn.hn-groupe.tech", "learn"),
      iface("https://site.hn-groupe.tech", "site-builder"),
      iface("https://video.hn-groupe.tech", "video-tech"),
      iface("https://hn-groupe.fun", "portal-fun"),
      iface("https://hn-groupe.pro", "portal-pro"),
      iface("https://hn-groupe.site", "portal-site"),
      iface("https://groupe-hn.com", "portal-alt"),
    ],
  },
  {
    id: "hn-createur",
    name: "HN Créateur — منصة المبدعين",
    nameEn: "HN Créateur — Creators Platform",
    category: "creator",
    summary: "منصة إنتاج للمبدعين: استوديو، بناء، تعلم، سحابة، فوترة، فيديو، أفلام.",
    summaryEn: "Creator suite: studio, build, learn, cloud, billing, video, film.",
    primary: "https://hn-createur.com",
    interfaces: [
      iface("https://hn-createur.com", "site"),
      iface("https://build.hn-createur.com", "build"),
      iface("https://cloud.hn-createur.com", "cloud"),
      iface("https://db.hn-createur.com", "db"),
      iface("https://facturation.hn-createur.com", "billing"),
      iface("https://film.hn-createur.com", "film"),
      iface("https://learn.hn-createur.com", "learn"),
      iface("https://studio.hn-createur.com", "studio"),
      iface("https://video.hn-createur.com", "video"),
    ],
  },
  {
    id: "hn-ai",
    name: "HN AI — منصات الذكاء الاصطناعي",
    nameEn: "HN AI Platforms",
    category: "ai",
    summary: "منصات الذكاء الاصطناعي المتعددة عبر عدة نطاقات.",
    summaryEn: "AI platforms across multiple TLDs.",
    primary: "https://hn-ai.pro",
    interfaces: [
      iface("https://hn-ai.pro", "pro"),
      iface("https://hn-ai.online", "online"),
      iface("https://hn-ai.site", "site"),
      iface("https://hn-ai.store", "store"),
      iface("https://ai.hn-groupe.org", "ai-portal"),
      iface("https://ai.hn-db.fun", "ai-db"),
    ],
  },
  {
    id: "hn-chat",
    name: "HN Chat — المحادثة",
    nameEn: "HN Chat",
    category: "chat",
    summary: "منصة المحادثة الذكية.",
    summaryEn: "Smart chat platform.",
    primary: "https://hn-chat.com",
    interfaces: [
      iface("https://hn-chat.com", "site"),
      iface("https://hnchat.net", "alt"),
    ],
  },
  {
    id: "nawat",
    name: "نواة — العقل المعرفي",
    nameEn: "Nawat — Knowledge Brain",
    category: "nawat",
    summary: "الذاكرة الشخصية والدماغ المعرفي لمنظومة HN — أنت هنا الآن.",
    summaryEn: "The personal memory & knowledge OS of HN — you are here.",
    primary: "https://nawat.hn-groupe.net",
    interfaces: [iface("https://nawat.hn-groupe.net", "site")],
  },
  {
    id: "hnclinik",
    name: "HN Clinik — العيادة الذكية",
    nameEn: "HN Clinik — Smart Clinic",
    category: "clinic",
    summary: "منصة طبية بمساعدة الذكاء الاصطناعي.",
    summaryEn: "AI-assisted medical clinic platform.",
    primary: "https://hnclinik-ai.com",
    interfaces: [
      iface("https://hnclinik-ai.com", "ai"),
      iface("https://hnclinik.hn-groupe.net", "portal"),
    ],
  },
  {
    id: "buildcv-ai",
    name: "BuildCV AI — بناء السير الذاتية",
    nameEn: "BuildCV AI",
    category: "cv",
    summary: "إنشاء وبناء السير الذاتية بالذكاء الاصطناعي.",
    summaryEn: "AI-powered CV/résumé builder.",
    primary: "https://buildcv-ai.online",
    interfaces: [iface("https://buildcv-ai.online", "site")],
  },
  {
    id: "adkhar",
    name: "الأذكار — HN Adkhar",
    nameEn: "HN Adkhar",
    category: "religion",
    summary: "منصة الأذكار اليومية.",
    summaryEn: "Daily Islamic remembrances (adkhar).",
    primary: "https://hn-adkhar.life",
    interfaces: [
      iface("https://hn-adkhar.life", "site"),
      iface("https://adkhar.hn-groupe.net", "portal"),
    ],
  },
  {
    id: "carwashpro",
    name: "CarWash Pro — إدارة المغاسل",
    nameEn: "CarWash Pro",
    category: "services",
    summary: "إدارة مغاسل السيارات (احترافية).",
    summaryEn: "Professional carwash management.",
    primary: "https://carwashpro.com",
    interfaces: [
      iface("https://carwashpro.com", "site"),
      iface("https://hn-carwash.online", "online"),
      iface("https://hn-carwash.site", "alt"),
    ],
  },
  {
    id: "slavacall-hiba",
    name: "Slavacall Hiba — مغسلة هبة",
    nameEn: "Slavacall Hiba",
    category: "services",
    summary: "خدمة اتصال ومغسلة (هبة) مع API خلفي.",
    summaryEn: "Call & wash service (Hiba) with backend API.",
    primary: "https://slavacall-hiba.com",
    interfaces: [
      iface("https://slavacall-hiba.com", "site"),
      iface("https://slavacall-hiba.online", "online"),
      iface("https://api.slavacall-hiba.online", "api"),
    ],
  },
  {
    id: "lavagenizar",
    name: "Lavage Nizar — مغسلة نزار",
    nameEn: "Lavage Nizar",
    category: "services",
    summary: "مغسلة سيارات — نزار.",
    summaryEn: "Carwash — Nizar.",
    primary: "https://lavagenizar.com",
    interfaces: [iface("https://lavagenizar.com", "site")],
  },
  {
    id: "tanjaprint",
    name: "Tanja Print — الطباعة",
    nameEn: "Tanja Print",
    category: "services",
    summary: "خدمات الطباعة (طنجة).",
    summaryEn: "Printing services (Tanja).",
    primary: "https://tanjaprint.com",
    interfaces: [
      iface("https://tanjaprint.com", "site"),
      iface("https://tanjaprint.online", "online"),
    ],
  },
  {
    id: "hn-finance",
    name: "HN Finance — المالية",
    nameEn: "HN Finance",
    category: "finance",
    summary: "منصة الخدمات المالية.",
    summaryEn: "Financial services platform.",
    primary: "https://hn-finance.online",
    interfaces: [
      iface("https://hn-finance.online", "online"),
      iface("https://hn-finance.site", "alt"),
    ],
  },
  {
    id: "hn-immo",
    name: "HN Immo — العقار",
    nameEn: "HN Immo",
    category: "realestate",
    summary: "منصة العقارات.",
    summaryEn: "Real-estate platform.",
    primary: "https://hn-immo.com",
    interfaces: [iface("https://hn-immo.com", "site")],
  },
  {
    id: "hiba-eco",
    name: "Hiba Eco",
    nameEn: "Hiba Eco",
    category: "commerce",
    summary: "منصة تجارية/بيئية — هبة.",
    summaryEn: "Commerce/eco platform — Hiba.",
    primary: "https://hiba-eco.com",
    interfaces: [iface("https://hiba-eco.com", "site")],
  },
  {
    id: "hnapps",
    name: "HN Apps Store",
    nameEn: "HN Apps Store",
    category: "commerce",
    summary: "متجر التطبيقات لمنظومة HN.",
    summaryEn: "App store for the HN ecosystem.",
    primary: "https://hnapps.store",
    interfaces: [iface("https://hnapps.store", "site")],
  },
];

export const HN_PROJECT_COUNT = HN_PROJECTS.length;
export const HN_INTERFACE_COUNT = HN_PROJECTS.reduce((n, p) => n + p.interfaces.length, 0);

export function projectsByCategory(cat: HNCategory): HNProject[] {
  return HN_PROJECTS.filter((p) => p.category === cat);
}

export function allCategories(): HNCategory[] {
  const seen = new Set<HNCategory>();
  HN_PROJECTS.forEach((p) => seen.add(p.category));
  return Array.from(seen);
}

// -- Suggested integration hooks with Nawat --
export type IntegrationHook =
  | "import-content"     // pull site content into Nawat memory
  | "quick-link"          // just a fast launcher
  | "unified-search"      // include in cross-site search
  | "knowledge-source"    // treat as a data source (DB)
  | "chat-bridge"         // future: unify chat threads
  | "self"                // is Nawat itself
  ;

export function suggestedHooks(p: HNProject): IntegrationHook[] {
  if (p.category === "nawat") return ["self"];
  const hooks: IntegrationHook[] = ["quick-link", "unified-search"];
  if (p.category === "database") hooks.push("knowledge-source");
  if (["religion", "media", "creator", "learn"].includes(p.category)) hooks.push("import-content");
  if (["ai", "chat"].includes(p.category)) hooks.push("chat-bridge");
  return hooks;
}

export const HOOK_LABEL: Record<IntegrationHook, { ar: string; en: string }> = {
  "import-content":   { ar: "استيراد محتوى",     en: "Import content" },
  "quick-link":       { ar: "رابط سريع",         en: "Quick link" },
  "unified-search":   { ar: "بحث موحّد",         en: "Unified search" },
  "knowledge-source": { ar: "مصدر معرفة",        en: "Knowledge source" },
  "chat-bridge":      { ar: "جسر محادثة",        en: "Chat bridge" },
  "self":             { ar: "أنت هنا",           en: "You are here" },
};