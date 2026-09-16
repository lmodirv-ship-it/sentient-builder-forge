import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * دورية تعلّم النواة (cron): يعيد حساب نسب النجاح ويحدّث أوزان model_policies.
 * يستدعى خارجياً (pg_cron أو مجدول) على /api/public/cron-learn مع ترويسة x-cron-secret.
 */
export const Route = createFileRoute("/api/public/cron-learn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["NAWAT_CRON_SECRET"];
        const provided = request.headers.get("x-cron-secret") ?? "";
        if (secret) {
          const a = Buffer.from(provided);
          const b = Buffer.from(secret);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Unauthorized", { status: 401 });
          }
        } else {
          // بدون سر مُعدّ: اسمح فقط لمستخدم طاقم عبر توكن صالح.
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
          const supabase = createClient(
            process.env["SUPABASE_URL"]!,
            process.env["SUPABASE_PUBLISHABLE_KEY"]!,
            { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
          );
          const { data } = await supabase.from("user_roles").select("role");
          const roles = (data ?? []).map((r: any) => String(r.role));
          if (!roles.includes("owner") && !roles.includes("admin")) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: jobs } = await supabaseAdmin
          .from("generation_jobs")
          .select("kind, service_key, status")
          .limit(5000);
        const agg: Record<string, { total: number; ok: number }> = {};
        for (const j of jobs ?? []) {
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
          action: "cron_learn",
          entity: "model_policies",
          detail: { updated },
        });
        return Response.json({ ok: true, updated });
      },
    },
  },
});
