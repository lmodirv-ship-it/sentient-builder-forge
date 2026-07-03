// Build Nawat memory docs from HN_PROJECTS: one rich Doc per project with
// summary + primary url + interfaces + inferred tasks. `tier: "core"`.
import type { Doc } from "./nawat-search";
import { HN_PROJECTS, CATEGORY_LABEL, type HNProject, type HNCategory } from "./hn-ecosystem";

const CATEGORY_TASKS_AR: Record<HNCategory, string[]> = {
  transport:  ["طلب رحلة", "طلب توصيل", "إدارة السائقين", "مركز الاتصال", "متابعة الطلبات"],
  database:   ["إدارة قواعد البيانات", "مصادقة المستخدمين", "تخزين الملفات", "مراقبة الحالة", "قواعد صلاحيات"],
  ai:         ["توليد نصوص", "توليد صور", "مساعد ذكي"],
  chat:       ["محادثات فورية", "دعم العملاء"],
  portal:     ["بوابة موحّدة لخدمات HN", "الوصول السريع لكل المنتجات"],
  creator:    ["استوديو محتوى", "أدوات بناء", "تعلّم", "تخزين سحابي", "فوترة"],
  media:      ["إنتاج فيديو", "أفلام قصيرة", "سينما"],
  cv:         ["بناء سيرة ذاتية بالذكاء الاصطناعي"],
  finance:    ["فوترة", "خدمات مالية"],
  realestate: ["عرض عقارات", "إدارة إعلانات"],
  commerce:   ["متجر تطبيقات", "بيع/شراء"],
  services:   ["إدارة مغسلة", "طباعة", "حجز خدمات"],
  religion:   ["أذكار يومية"],
  clinic:     ["حجز مواعيد", "مساعد طبي بالذكاء الاصطناعي"],
  learn:      ["دورات ومحتوى تعليمي"],
  nawat:      ["الذاكرة الشخصية والدماغ المعرفي"],
};

const ROLE_LABEL_AR: Record<string, string> = {
  admin: "لوحة الإدارة",
  "super-admin": "لوحة الأدمن الأعلى",
  client: "واجهة العميل",
  driver: "تطبيق السائق",
  api: "واجهة برمجية (API)",
  auth: "المصادقة",
  files: "تخزين الملفات",
  ai: "الذكاء الاصطناعي",
  users: "إدارة المستخدمين",
  owner: "لوحة المالك",
  rules: "قواعد الصلاحيات",
  status: "مراقبة الحالة",
  websocket: "بث لحظي",
  "call-center": "مركز الاتصال",
  ride: "طلب رحلة",
  delivery: "طلب توصيل",
  stock: "المخزون",
  billing: "الفوترة",
  studio: "الاستوديو",
  build: "أدوات البناء",
  cloud: "التخزين السحابي",
  learn: "التعلّم",
  film: "الأفلام",
  video: "الفيديو",
  cinema: "السينما",
  blog: "المدوّنة",
  cv: "السيرة الذاتية",
  tender: "العطاءات",
  rfp: "طلبات العروض",
  search: "البحث",
  audit: "التدقيق",
  store: "المتجر",
  portal: "البوابة",
  site: "الموقع الرئيسي",
  "site-builder": "منشئ المواقع",
};

function tasksFor(p: HNProject): string[] {
  const t = new Set<string>(CATEGORY_TASKS_AR[p.category] || []);
  for (const i of p.interfaces) {
    if (i.role && ROLE_LABEL_AR[i.role]) t.add(ROLE_LABEL_AR[i.role]);
  }
  return [...t];
}

export function projectToDoc(p: HNProject): Doc {
  const cat = CATEGORY_LABEL[p.category];
  const tasks = tasksFor(p);
  const ifaces = p.interfaces
    .map((i) => `• ${i.role ? `[${ROLE_LABEL_AR[i.role] || i.role}] ` : ""}${i.url}`)
    .join("\n");
  const aliases = p.aliases?.length ? `\n\nنطاقات بديلة:\n${p.aliases.map((a) => `• ${a}`).join("\n")}` : "";

  const content =
    `${p.summary}\n\n` +
    `التصنيف: ${cat.icon} ${cat.ar}\n` +
    `الرابط الرئيسي: ${p.primary}\n\n` +
    `المهام / القدرات:\n${tasks.map((x) => `• ${x}`).join("\n")}\n\n` +
    `الواجهات (${p.interfaces.length}):\n${ifaces}${aliases}`;

  return {
    id: `hn-project-${p.id}`,
    title: `${cat.icon} ${p.name}`,
    content,
    tags: ["مواقعي", "site", "project", p.category, p.id, cat.ar, cat.en],
    source: p.primary,
    createdAt: Date.now(),
    tier: "core",
  };
}

export function getProjectDocs(): Doc[] {
  return HN_PROJECTS.map(projectToDoc);
}

export const HN_PROJECT_DOC_COUNT = HN_PROJECTS.length;

/** Find a project by name / id / alias fragment (loose match). */
export function findProject(needle: string): HNProject | null {
  const q = needle.trim().toLowerCase();
  if (!q) return null;
  const hits = HN_PROJECTS.filter((p) => {
    const hay = [p.id, p.name, p.nameEn, p.summary, p.summaryEn, ...(p.aliases || []), p.primary]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
  return hits[0] || null;
}

/** Render a project card as chat markdown. */
export function renderProjectCard(p: HNProject, lang: "ar" | "en" = "ar"): string {
  const isAr = lang === "ar";
  const cat = CATEGORY_LABEL[p.category];
  const tasks = tasksFor(p);
  const bullets = p.interfaces
    .map((i) => `- ${i.role ? `**${ROLE_LABEL_AR[i.role] || i.role}** — ` : ""}[${i.url.replace(/^https?:\/\//, "")}](${i.url})`)
    .join("\n");
  const head = isAr ? `### ${cat.icon} ${p.name}` : `### ${cat.icon} ${p.nameEn}`;
  const sum = isAr ? p.summary : p.summaryEn;
  const primary = `**${isAr ? "الرابط الرئيسي" : "Primary"}:** [${p.primary.replace(/^https?:\/\//, "")}](${p.primary})`;
  const taskLine = tasks.length
    ? `**${isAr ? "المهام" : "Tasks"}:** ${tasks.join(" · ")}`
    : "";
  return [head, sum, primary, taskLine, `**${isAr ? "الواجهات" : "Interfaces"} (${p.interfaces.length}):**`, bullets].filter(Boolean).join("\n\n");
}

/** Render a compact list of all projects with primary link. */
export function renderAllSites(lang: "ar" | "en" = "ar"): string {
  const isAr = lang === "ar";
  const head = isAr ? `### 🌐 كل مواقعي (${HN_PROJECTS.length} مشروعاً)` : `### 🌐 All my sites (${HN_PROJECTS.length} projects)`;
  const lines = HN_PROJECTS.map((p) => {
    const cat = CATEGORY_LABEL[p.category];
    return `- ${cat.icon} **${isAr ? p.name : p.nameEn}** — [${p.primary.replace(/^https?:\/\//, "")}](${p.primary}) · _${p.interfaces.length} ${isAr ? "واجهة" : "iface"}_`;
  }).join("\n");
  return `${head}\n\n${lines}`;
}

/** Render just the tasks/capabilities of a project. */
export function renderProjectTasks(p: HNProject, lang: "ar" | "en" = "ar"): string {
  const isAr = lang === "ar";
  const tasks = tasksFor(p);
  const head = isAr ? `### مهام ${p.name}` : `### Tasks — ${p.nameEn}`;
  const body = tasks.length
    ? tasks.map((x) => `- ${x}`).join("\n")
    : isAr ? "_لا مهام مسجّلة._" : "_No tasks recorded._";
  return `${head}\n\n${body}\n\n[${p.primary.replace(/^https?:\/\//, "")}](${p.primary})`;
}

/** Render categories with counts. */
export function renderAllCategories(lang: "ar" | "en" = "ar"): string {
  const isAr = lang === "ar";
  const head = isAr ? `### 🗂️ فئات مشاريعي` : `### 🗂️ Project categories`;
  const counts = new Map<HNCategory, number>();
  HN_PROJECTS.forEach((p) => counts.set(p.category, (counts.get(p.category) || 0) + 1));
  const rows = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => {
      const lbl = CATEGORY_LABEL[k];
      return `- ${lbl.icon} **${isAr ? lbl.ar : lbl.en}** — ${n} ${isAr ? "مشروع" : "project(s)"}`;
    })
    .join("\n");
  return `${head}\n\n${rows}`;
}

/** Render a compact list of matched projects. */
export function renderProjectList(list: HNProject[], lang: "ar" | "en" = "ar", title?: string): string {
  const isAr = lang === "ar";
  if (!list.length) return isAr ? "_لا نتائج._" : "_No results._";
  const head = title ? `### ${title}` : "";
  const rows = list.map((p) => {
    const cat = CATEGORY_LABEL[p.category];
    return `- ${cat.icon} **${isAr ? p.name : p.nameEn}** — [${p.primary.replace(/^https?:\/\//, "")}](${p.primary}) · _${p.interfaces.length} ${isAr ? "واجهة" : "iface"}_`;
  }).join("\n");
  return [head, rows].filter(Boolean).join("\n\n");
}