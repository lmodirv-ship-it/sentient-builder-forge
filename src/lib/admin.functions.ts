import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function isStaff(supabase: any): Promise<boolean> {
  const { data } = await supabase.from("user_roles").select("role");
  const roles = (data ?? []).map((r: any) => String(r.role));
  return roles.includes("owner") || roles.includes("admin");
}

async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** نظرة عامة: عدّادات، نسبة النجاح، آخر العمليات. */
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isStaff(context.supabase))) return { allowed: false as const };
    const db = await adminDb();
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [jobsAll, jobsToday, users, fb, recent, kinds] = await Promise.all([
      db.from("generation_jobs").select("id, status", { count: "exact" }),
      db.from("generation_jobs").select("id", { count: "exact" }).gte("created_at", since),
      db.from("profiles").select("id", { count: "exact" }),
      db.from("feedback_events").select("kind"),
      db.from("generation_jobs").select("*").order("created_at", { ascending: false }).limit(15),
      db.from("generation_jobs").select("kind, status").limit(5000),
    ]);
    const total = jobsAll.count ?? 0;
    const okCount = (jobsAll.data ?? []).filter((j: any) => j.status === "success").length;
    const byKind: Record<string, { total: number; ok: number }> = {};
    for (const j of kinds.data ?? []) {
      byKind[j.kind] ??= { total: 0, ok: 0 };
      byKind[j.kind].total += 1;
      if (j.status === "success") byKind[j.kind].ok += 1;
    }
    return {
      allowed: true as const,
      totalJobs: total,
      jobsToday: jobsToday.count ?? 0,
      totalUsers: users.count ?? 0,
      successRate: total ? Math.round((okCount / total) * 100) : 0,
      feedback: {
        like: (fb.data ?? []).filter((f: any) => f.kind === "like").length,
        dislike: (fb.data ?? []).filter((f: any) => f.kind === "dislike").length,
        regenerate: (fb.data ?? []).filter((f: any) => f.kind === "regenerate").length,
      },
      byKind,
      recentJobs: recent.data ?? [],
    };
  });

/** قائمة المستخدمين مع أدوارهم. */
export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isStaff(context.supabase))) return { allowed: false as const };
    const db = await adminDb();
    const [profiles, roles, jobs] = await Promise.all([
      db.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("user_roles").select("user_id, role"),
      db.from("generation_jobs").select("user_id").gte(
        "created_at",
        new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      ),
    ]);
    const roleByUser: Record<string, string> = {};
    for (const r of roles.data ?? []) {
      if (!roleByUser[r.user_id] || r.role === "owner" || r.role === "admin")
        roleByUser[r.user_id] = r.role;
    }
    const jobsByUser: Record<string, number> = {};
    for (const j of jobs.data ?? []) {
      const uid = j.user_id as string | null;
      if (uid) jobsByUser[uid] = (jobsByUser[uid] ?? 0) + 1;
    }
    const { data: authUsers } = await db.auth.admin.listUsers({ perPage: 200 });
    const emailById: Record<string, string> = {};
    for (const u of authUsers?.users ?? []) emailById[u.id] = u.email ?? "";
    return {
      allowed: true as const,
      users: (profiles.data ?? []).map((p: any) => ({
        ...p,
        role: roleByUser[p.id] ?? "user",
        email: emailById[p.id] ?? "",
        jobsToday: jobsByUser[p.id] ?? 0,
      })),
    };
  });

/** خدمات HN + آخر فحص صحة لكل خدمة. */
export const listAdminServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isStaff(context.supabase))) return { allowed: false as const };
    const db = await adminDb();
    const [services, health] = await Promise.all([
      db.from("hn_services").select("*").order("priority"),
      db.from("hn_service_health").select("*").order("checked_at", { ascending: false }).limit(200),
    ]);
    const lastHealth: Record<string, any> = {};
    for (const h of health.data ?? []) {
      if (!lastHealth[h.service_key]) lastHealth[h.service_key] = h;
    }
    return { allowed: true as const, services: services.data ?? [], lastHealth };
  });

export const upsertAdminService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        key: z.string().min(1),
        name: z.string().min(1),
        url: z.string().url(),
        capabilities: z.array(z.string()).default([]),
        enabled: z.boolean().default(true),
        priority: z.number().int().default(100),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    if (!(await isStaff(context.supabase))) return { ok: false as const, error: "غير مصرّح" };
    const db = await adminDb();
    const { error } = await db.from("hn_services").upsert(data, { onConflict: "key" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** فحص صحة خدمة: قياس زمن الاستجابة وتسجيل النتيجة. */
export const checkServiceHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ key: z.string(), url: z.string().url() }).parse(i))
  .handler(async ({ context, data }) => {
    if (!(await isStaff(context.supabase))) return { ok: false as const, error: "غير مصرّح" };
    const db = await adminDb();
    const started = Date.now();
    let ok = false;
    let err: string | null = null;
    try {
      const res = await fetch(data.url, { method: "GET", signal: AbortSignal.timeout(8000) });
      ok = res.ok;
      if (!res.ok) err = `HTTP ${res.status}`;
    } catch (e: any) {
      err = e?.message ?? String(e);
    }
    await db.from("hn_service_health").insert({
      service_key: data.key,
      ok,
      latency_ms: Date.now() - started,
      error: err,
    });
    return { ok, latencyMs: Date.now() - started, error: err };
  });

/** إعدادات المنصة. */
export const getPlatformSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isStaff(context.supabase))) return { allowed: false as const };
    const db = await adminDb();
    const { data } = await db.from("platform_settings").select("*").order("key");
    return { allowed: true as const, settings: data ?? [] };
  });

export const setPlatformSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ key: z.string().min(1), value: z.unknown() }).parse(i),
  )
  .handler(async ({ context, data }) => {
    if (!(await isStaff(context.supabase))) return { ok: false as const, error: "غير مصرّح" };
    const db = await adminDb();
    const { error } = await db.from("platform_settings").upsert({
      key: data.key,
      value: data.value as any,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** سجلات النشاط. */
export const getAdminLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).default(60) }).parse(i),
  )
  .handler(async ({ context, data }) => {
    if (!(await isStaff(context.supabase))) return { allowed: false as const };
    const db = await adminDb();
    const { data: logs } = await db
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    return { allowed: true as const, logs: logs ?? [] };
  });

/** القوالب. */
export const listAdminTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isStaff(context.supabase))) return { allowed: false as const };
    const db = await adminDb();
    const { data } = await db
      .from("templates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return { allowed: true as const, templates: data ?? [] };
  });

export const saveAdminTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        kind: z.string().min(1),
        title: z.string().min(1),
        body: z.string().min(1),
        tags: z.array(z.string()).default([]),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    if (!(await isStaff(context.supabase))) return { ok: false as const, error: "غير مصرّح" };
    const db = await adminDb();
    const { error } = await db
      .from("templates")
      .insert({ ...data, created_by: context.userId });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const archiveAdminTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    if (!(await isStaff(context.supabase))) return { ok: false as const, error: "غير مصرّح" };
    const db = await adminDb();
    const { error } = await db
      .from("templates")
      .update({ archived: true })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
