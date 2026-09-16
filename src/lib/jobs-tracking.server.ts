// Server-only: تتبّع عمليات الإنشاء (generation_jobs + activity_logs) وفحص الحصص.
// يُستورد داخل .handler() فقط — لا يُستورد من أي ملف يدخل حزمة العميل.
import { createClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type JobKind = "image" | "tts" | "video" | "site" | "cv" | "ocr" | "transcribe" | "chat" | "search";

/** فحص الحصة اليومية حسب الدور (افتراضي 50). */
export async function assertQuota(userId: string): Promise<{ ok: boolean; error?: string }> {
  const db = admin();
  if (!db || !userId) return { ok: true };
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [{ count }, roles] = await Promise.all([
    db.from("generation_jobs").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", since),
    db.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const role = (roles.data ?? []).map((r: any) => String(r.role)).sort()[0] ?? "user";
  const { data: quota } = await db.from("usage_quotas")
    .select("limit_count").eq("role", role as any).eq("period", "day").limit(1);
  const limit = Number(quota?.[0]?.limit_count ?? 50);
  if ((count ?? 0) >= limit) {
    return { ok: false, error: `بلغت حصتك اليومية (${limit} عملية). جرّب غداً أو راجع الإدارة.` };
  }
  return { ok: true };
}

/** يبدأ تسجيل عملية إنشاء ويعيد معرّفها. */
export async function recordJobStart(opts: {
  userId: string | null; kind: JobKind; prompt?: string; serviceKey?: string;
}): Promise<string | null> {
  const db = admin();
  if (!db) return null;
  const { data } = await db.from("generation_jobs").insert({
    user_id: opts.userId, kind: opts.kind, prompt: opts.prompt?.slice(0, 2000) ?? null,
    service_key: opts.serviceKey ?? null, status: "running",
  }).select("id").single();
  return data?.id ?? null;
}

/** يُغلق العملية بالنتيجة أو الخطأ ويكتب سجل النشاط. */
export async function recordJobEnd(opts: {
  jobId: string | null; userId: string | null; ok: boolean;
  durationMs: number; resultSummary?: string; error?: string | null; action?: string;
}): Promise<void> {
  const db = admin();
  if (!db) return;
  if (opts.jobId) {
    await db.from("generation_jobs").update({
      status: opts.ok ? "success" : "failed",
      duration_ms: Math.round(opts.durationMs),
      result_summary: opts.resultSummary?.slice(0, 500) ?? null,
      error: opts.error ?? null,
    }).eq("id", opts.jobId);
  }
  await db.from("activity_logs").insert({
    user_id: opts.userId,
    action: opts.action ?? (opts.ok ? "job_success" : "job_failed"),
    entity: "generation_job",
    job_id: opts.jobId,
    detail: { duration_ms: Math.round(opts.durationMs), error: opts.error ?? null },
  });
}

/** تغليف أي عملية إنشاء: حصة ← بدء ← تنفيذ ← إغلاق. */
export async function withJobTracking<T>(opts: {
  userId: string | null; kind: JobKind; prompt?: string; serviceKey?: string; action?: string;
  run: () => Promise<{ ok: boolean; summary?: string; error?: string | null; value: T }>;
}): Promise<T> {
  const quota = await assertQuota(opts.userId ?? "");
  if (!quota.ok) throw new Error(quota.error ?? "تم بلوغ الحصة اليومية");
  const jobId = await recordJobStart(opts);
  const started = Date.now();
  try {
    const r = await opts.run();
    await recordJobEnd({
      jobId, userId: opts.userId, ok: r.ok, durationMs: Date.now() - started,
      resultSummary: r.summary, error: r.error ?? null, action: opts.action,
    });
    return r.value;
  } catch (e: any) {
    await recordJobEnd({
      jobId, userId: opts.userId, ok: false, durationMs: Date.now() - started,
      error: e?.message ?? String(e), action: opts.action,
    });
    throw e;
  }
}
