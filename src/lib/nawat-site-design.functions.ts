import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(2).max(4000),
  lang: z.enum(["ar", "en"]).default("ar"),
});

/** Site generation — HN Site Builder only (site.hn-groupe.tech). No external fallback. مُتتبَّع في سجل العمليات. */
export const generateSiteHtml = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const { withJobTracking } = await import("./jobs-tracking.server");
    try {
      return await withJobTracking({
        userId: context.userId,
        kind: "site" as const,
        prompt: data.prompt,
        serviceKey: "nawat-site",
        action: "generate_site",
        run: async () => {
          const { hnGenerateSite } = await import("./hn-clients.server");
          const { bestUrlFor } = await import("./hn-manifest");
          const { url: hnUrl } = bestUrlFor("site-builder", data.prompt);

          const hn = await hnGenerateSite(data.prompt, data.lang);
          if (hn.ok)
            return {
              ok: true,
              summary: data.prompt.slice(0, 200),
              value: { html: hn.html, error: null as string | null, hnUrl },
            };

          const reason =
            "notConfigured" in hn && hn.notConfigured
              ? "HN Site Builder غير مُهيّأ (أضف HN_SITE_BUILDER_API_KEY أو HN_API_KEY)."
              : hn.error;
          return { ok: false, error: reason, value: { html: "", error: reason, hnUrl } };
        },
      });
    } catch (e: any) {
      return { html: "", error: e?.message ?? "فشل التنفيذ", hnUrl: "" };
    }
  });
