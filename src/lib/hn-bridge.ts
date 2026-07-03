// hn-bridge — واجهة موحّدة بين النواة ومنظومة HN.
// المرحلة الحالية: adapter محلي (deep-links + بطاقات). كل الدوال جاهزة لاستبدال
// الجزء الشبكي لاحقاً بمكالمات فعلية إلى HN-DB / HN-Cloud.

import { HN_PILLARS, HN_PROJECTS, type HNProject } from "./hn-ecosystem";

export type OpenServiceCtx = {
  question?: string;
  ref?: string;
};

function withCtx(url: string, ctx?: OpenServiceCtx): string {
  if (!ctx || (!ctx.question && !ctx.ref)) return url;
  try {
    const u = new URL(url);
    if (ctx.question) u.searchParams.set("q", ctx.question);
    if (ctx.ref) u.searchParams.set("ref", ctx.ref);
    u.searchParams.set("via", "nawat");
    return u.toString();
  } catch {
    return url;
  }
}

export const hnBridge = {
  pillars: HN_PILLARS,

  /** Identity / ownership check via TVCC (offline stub for now). */
  identity: {
    verify(siteIdOrUrl: string): { verified: true; anchor: string; project?: HNProject } {
      const project = HN_PROJECTS.find(
        (p) =>
          p.id === siteIdOrUrl ||
          p.primary === siteIdOrUrl ||
          p.interfaces.some((i) => i.url === siteIdOrUrl),
      );
      return { verified: true, anchor: HN_PILLARS.trust.url, project };
    },
    badgeAr: `✅ مُوثَّق عبر ${HN_PILLARS.trust.name}`,
    badgeEn: `✅ Verified by ${HN_PILLARS.trust.name}`,
  },

  /** HN-DB layer — deep-link only for now. Ready to swap for fetch(api). */
  db: {
    projectSpace(projectId: string): string {
      return `${HN_PILLARS.data.url}/p/${encodeURIComponent(projectId)}`;
    },
    async query(_projectId: string, _table: string, _params?: Record<string, unknown>) {
      // Placeholder for future REST/GraphQL call to HN-DB.
      return { ok: false as const, reason: "hn-db bridge is not wired to a live endpoint yet" };
    },
  },

  /** HN-Cloud layer — deep-link only for now. */
  cloud: {
    folder(projectId: string): string {
      return `${HN_PILLARS.files.url}/f/${encodeURIComponent(projectId)}`;
    },
    async list(_projectId: string, _path = "/") {
      return { ok: false as const, reason: "hn-cloud bridge is not wired to a live endpoint yet" };
    },
  },

  /** Open a service in its own HN site, passing the current question as context. */
  openService(siteIdOrUrl: string, ctx?: OpenServiceCtx): string {
    const project = HN_PROJECTS.find(
      (p) => p.id === siteIdOrUrl || p.primary === siteIdOrUrl,
    );
    const target = project?.primary ?? siteIdOrUrl;
    return withCtx(target, ctx);
  },

  /** Render the standard HN infrastructure stamp (Markdown). */
  stamp(lang: "ar" | "en" = "ar"): string {
    const isAr = lang === "ar";
    const t = HN_PILLARS.trust;
    const d = HN_PILLARS.data;
    const f = HN_PILLARS.files;
    return isAr
      ? `> ✅ **مُوثَّق عبر [${t.name}](${t.url})** · 🗄️ البيانات: [${d.name}](${d.url}) · ☁️ الملفات: [${f.name}](${f.url})`
      : `> ✅ **Verified by [${t.name}](${t.url})** · 🗄️ Data: [${d.name}](${d.url}) · ☁️ Files: [${f.name}](${f.url})`;
  },

  /** Render project-scoped HN links (DB space + Cloud folder). */
  projectLinks(project: HNProject, lang: "ar" | "en" = "ar"): string {
    const isAr = lang === "ar";
    return isAr
      ? `- 🗄️ **البيانات على HN-DB:** [${this.db.projectSpace(project.id)}](${this.db.projectSpace(project.id)})\n- ☁️ **الملفات على HN-Cloud:** [${this.cloud.folder(project.id)}](${this.cloud.folder(project.id)})`
      : `- 🗄️ **HN-DB space:** [${this.db.projectSpace(project.id)}](${this.db.projectSpace(project.id)})\n- ☁️ **HN-Cloud folder:** [${this.cloud.folder(project.id)}](${this.cloud.folder(project.id)})`;
  },
};

/** Standing memory card describing the HN infrastructure — seeded into Nawat's core memory. */
export function hnInfrastructureCard(): { id: string; title: string; content: string; tags: string[]; source: string; tier: "core"; createdAt: number } {
  const t = HN_PILLARS.trust;
  const d = HN_PILLARS.data;
  const f = HN_PILLARS.files;
  const content = [
    `منظومة HN تقوم على ثلاث ركائز رسمية — لا تُبدَّل ولا تُستبدل:`,
    ``,
    `1) **${t.name}** — ${t.purposeAr}. النطاق: ${t.url}`,
    `2) **${d.name}** — ${d.purposeAr}. النطاق: ${d.url}`,
    `3) **${f.name}** — ${f.purposeAr}. النطاق: ${f.url}`,
    ``,
    `كل مشروع/موقع آخر في المنظومة (HN Driver، HN Clinic، BuildCV، HN AI، HN Video…) يُعتبر تطبيقاً يعتمد على هذه الركائز:`,
    `• ملكيته مُثبتة عبر ${t.name}.`,
    `• بياناته الحيّة تُخزَّن في ${d.name}.`,
    `• ملفاته وأصوله تُحفظ على ${f.name} (VPS خاص).`,
    ``,
    `ممنوع اقتراح Google Drive / Dropbox / Firebase / Supabase العام أو أي بنية تحتية خارجية — البديل دائماً هذه الركائز الثلاث.`,
  ].join("\n");
  return {
    id: "hn-infrastructure-pillars",
    title: "🏛️ البنية التحتية لمنظومة HN (TVCC · HN-DB · HN-Cloud)",
    content,
    tags: ["hn", "infrastructure", "pillars", "tvcc", "hn-db", "hn-cloud", "core"],
    source: t.url,
    tier: "core",
    createdAt: Date.now(),
  };
}
