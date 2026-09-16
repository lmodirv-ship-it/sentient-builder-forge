import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function isStaff(supabase: any): Promise<boolean> {
  const { data } = await supabase.from("user_roles").select("role");
  const roles = (data ?? []).map((r: any) => String(r.role));
  return roles.includes("owner") || roles.includes("admin");
}

function tokens(s: string): string[] {
  return s.toLowerCase().split(/[\s،.,!؟?:"'()\-_/\\]+/).filter((t) => t.length > 2);
}

/** تسجيل تقييم المستخدم (إعجاب/عدم إعجاب/إعادة) + تحديث تقييم الذاكرة. */
export const recordFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        jobId: z.string().uuid().optional(),
        kind: z.enum(["like", "dislike", "regenerate"]),
        intent: z.string().optional(),
        prompt: z.string().optional(),
        serviceKey: z.string().optional(),
        resultSummary: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const ins = await context.supabase.from("feedback_events").insert({
      job_id: data.jobId ?? null,
      user_id: context.userId,
      kind: data.kind,
    });
    if (ins.error) return { ok: false as const, error: ins.error.message };

    if (data.intent) {
      const { data: rows } = await context.supabase
        .from("knowledge_items")
        .select("id")
        .eq("user_id", context.userId)
        .eq("intent", data.intent)
        .order("created_at", { ascending: false })
        .limit(5);
      const target = rows?.[0]?.id;
      if (target) {
        const delta = data.kind === "like" ? 1 : data.kind === "dislike" ? -1 : 0;
        await context.supabase.rpc("noop" as never).catch(() => {});
        await context.supabase
          .from("knowledge_items")
          .update({ rating: delta, result_summary: data.resultSummary?.slice(0, 500) ?? null })
          .eq("id", target);
      } else if (data.kind !== "regenerate") {
        await context.supabase.from("knowledge_items").insert({
          user_id: context.userId,
          intent: data.intent,
          prompt: data.prompt?.slice(0, 2000) ?? null,
          service_key: data.serviceKey ?? null,
          result_summary: data.resultSummary?.slice(0, 500) ?? null,
          rating: data.kind === "like" ? 1 : -1,
          ok: data.kind === "like",
        });
      }
    }
    return { ok: true as const };
  });

/** حفظ نتيجة عملية في ذاكرة النواة (knowledge_items). */
export const learnFromJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        intent: z.string(),
        prompt: z.string().optional(),
        serviceKey: z.string().optional(),
        promptTemplate: z.string().optional(),
        resultSummary: z.string().optional(),
        ok: z.boolean().default(true),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("knowledge_items").insert({
      user_id: context.userId,
      intent: data.intent,
      prompt: data.prompt?.slice(0, 2000) ?? null,
      service_key: data.serviceKey ?? null,
      prompt_template: data.promptTemplate?.slice(0, 4000) ?? null,
      result_summary: data.resultSummary?.slice(0, 500) ?? null,
      ok: data.ok,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** اقتراح النواة: أفضل قالب معروف لطلب مشابه (بحث دلالي مبسّط بالتقاطع اللفظي). */
export const kernelSuggest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ intent: z.string(), prompt: z.string().min(1).max(2000) }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { data: rows } = await context.supabase
      .from("knowledge_items")
      .select("prompt_template, service_key, prompt, rating, result_summary")
      .eq("intent", data.intent)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!rows?.length) return { found: false as const };

    const want = new Set(tokens(data.prompt));
    let best: any = null;
    let bestScore = 0;
    for (const r of rows) {
      const have = new Set(tokens(`${r.prompt ?? ""} ${r.prompt_template ?? ""}`));
      let overlap = 0;
      for (const t of want) if (have.has(t)) overlap += 1;
      const score = overlap + (r.rating === 1 ? 1.5 : r.rating === -1 ? -2 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }
    if (!best || bestScore <= 0) return { found: false as const };
    return {
      found: true as const,
      promptTemplate: best.prompt_template ?? best.prompt ?? null,
      serviceKey: best.service_key ?? null,
      score: bestScore,
    };
  });

/** إعادة تدريب النواة: حساب نسب النجاح لكل (نوع، خدمة) وتحديث الأوزان. */
export const retrainKernel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isStaff(context.supabase)))
      return { ok: false as const, error: "غير مصرّح" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: jobs } = await supabaseAdmin
      .from("generation_jobs")
      .select("kind, service_key, status")
      .limit(5000);
    if (!jobs) return { ok: false as const, error: "لا بيانات" };

    const agg: Record<string, { total: number; ok: number }> = {};
    for (const j of jobs) {
      const key = `${j.kind}|${j.service_key ?? "default"}`;
      agg[key] ??= { total: 0, ok: 0 };
      agg[key].total += 1;
      if (j.status === "success") agg[key].ok += 1;
    }
    let updated = 0;
    for (const [key, v] of Object.entries(agg)) {
      const [intent, serviceKey] = key.split("|");
      const rate = v.total ? v.ok / v.total : 0;
      const { error } = await supabaseAdmin.from("model_policies").upsert(
        {
          intent,
          service_key: serviceKey,
          success_rate: rate,
          uses: v.total,
          weight: Math.max(0.1, rate),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "intent,service_key" },
      );
      if (!error) updated += 1;
    }
    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      action: "kernel_retrain",
      entity: "model_policies",
      detail: { updated },
    });
    return { ok: true as const, updated };
  });

/** تنظيف الذاكرة الرديئة (تقييم سالب أو فشل). */
export const purgeBadKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isStaff(context.supabase)))
      return { ok: false as const, error: "غير مصرّح" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("knowledge_items")
      .delete()
      .neq("rating", 1)
      .eq("ok", false);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
