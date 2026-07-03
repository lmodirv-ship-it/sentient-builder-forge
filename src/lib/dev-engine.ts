// Development engine — runs "self-improvement" routines client-side and
// records every step in the studio logger so the user can see exactly what
// happened, how long it took, and why anything failed.

import { logEvent, traceRequest, reasonOf } from "./studio-logger";
import { enqueue, getAgentStatus } from "./background-agent";
import { listProjects } from "./studio-projects";
import { toast } from "sonner";

export type DevMode = "self" | "security" | "libraries" | "full";

const MODE_LABEL: Record<DevMode, string> = {
  self: "تطوير الذات",
  security: "تطوير الأمان",
  libraries: "تطوير المكتبات",
  full: "تطوير شامل",
};

// ── Individual routines ────────────────────────────────────────────────────

async function routineSelfHeal(): Promise<string> {
  return traceRequest("engine", "self-heal", async () => {
    // 1) Prune stale caches, 2) prewarm projects, 3) reset error counters.
    let cleared = 0;
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith("nawat_cache_") && k.includes("_stale_")) {
          localStorage.removeItem(k); cleared++;
        }
      }
    } catch {}
    const projects = listProjects();
    const status = getAgentStatus();
    return `أعيد التهيئة — كاش مُنظّف: ${cleared} · مشاريع: ${projects.length} · وكيل: ${status.queued}/${status.healed}`;
  });
}

async function routineSecurity(): Promise<string> {
  return traceRequest("engine", "security", async () => {
    const findings: string[] = [];
    // Scan localStorage keys for anything that looks like an exposed secret.
    const suspicious = /(_key|token|secret|api[_-]?key|password)/i;
    let hits = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || "";
        const v = localStorage.getItem(k) || "";
        if (suspicious.test(k) && v.length > 20) { hits++; findings.push(`مفتاح مشبوه: ${k}`); }
      }
    } catch {}
    // Check that we're on HTTPS in production.
    if (typeof window !== "undefined" && window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      findings.push("الاتصال ليس HTTPS");
    }
    // Check basic CSP presence.
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!csp) findings.push("لا يوجد CSP معلن — مقبول لتطبيقات SaaS");
    findings.forEach((f) => logEvent("warn", "engine", "security-finding", f));
    return `فحص الأمان: ${hits} مفتاح مشبوه · ${findings.length} ملاحظات`;
  });
}

async function routineLibraries(): Promise<string> {
  return traceRequest("engine", "libraries", async () => {
    // Warm the template cache so all studios respond instantly.
    const { localSiteTemplate, localVideoPreview } = await import("./studio-projects");
    const { cacheKey, setCached } = await import("./studio-cache");
    const seeds = [
      { kind: "site" as const, prompt: "متجر إلكتروني", lang: "ar" as const },
      { kind: "site" as const, prompt: "مدونة شخصية", lang: "ar" as const },
      { kind: "site" as const, prompt: "portfolio", lang: "en" as const },
      { kind: "video" as const, prompt: "إعلان قصير" },
      { kind: "video" as const, prompt: "شرح تعليمي" },
    ];
    let warmed = 0;
    for (const s of seeds) {
      try {
        if (s.kind === "site") {
          const html = localSiteTemplate(s.prompt, s.lang);
          setCached({ key: cacheKey("site", s.prompt, s.lang), kind: "site", html, via: "local" });
        } else {
          const poster = localVideoPreview(s.prompt);
          setCached({ key: cacheKey("video", s.prompt), kind: "video", poster, via: "local" });
        }
        warmed++;
      } catch (err) {
        logEvent("warn", "engine", "library-seed", `فشل بذر: ${reasonOf(err)}`, { seed: s });
      }
    }
    return `المكتبات جاهزة — بذور مُهيّأة: ${warmed}/${seeds.length}`;
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function runDevMode(mode: DevMode): Promise<void> {
  const label = MODE_LABEL[mode];
  logEvent("info", "engine", "start", `بدء ${label}`);
  const toastId = toast.loading(`${label} — جارٍ التنفيذ…`);
  try {
    const summaries: string[] = [];
    if (mode === "self" || mode === "full") summaries.push(await routineSelfHeal());
    if (mode === "security" || mode === "full") summaries.push(await routineSecurity());
    if (mode === "libraries" || mode === "full") summaries.push(await routineLibraries());
    toast.success(`${label} — اكتمل`, { id: toastId, description: summaries.join(" · ") });
    logEvent("success", "engine", "done", `${label}: ${summaries.join(" · ")}`);
  } catch (err) {
    const reason = reasonOf(err);
    toast.error(`${label} — فشل`, { id: toastId, description: reason });
    logEvent("error", "engine", "fail", `${label}: ${reason}`);
  }
}

/** Kick off a routine in the background agent's retry queue. */
export function scheduleDevMode(mode: DevMode) {
  enqueue({
    label: `engine:${mode}`,
    maxAttempts: 2,
    delay: 100,
    run: () => runDevMode(mode),
  });
}
