import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(2).max(4000),
  lang: z.enum(["ar", "en"]).default("ar"),
});

/** Site generation — HN Site Builder only (site.hn-groupe.tech). No external fallback. */
export const generateSiteHtml = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const { hnGenerateSite } = await import("./hn-clients.server");
    const { bestUrlFor } = await import("./hn-manifest");
    const { url: hnUrl } = bestUrlFor("site-builder", data.prompt);

    const hn = await hnGenerateSite(data.prompt, data.lang);
    if (hn.ok) return { html: hn.html, error: null, hnUrl };

    const reason =
      "notConfigured" in hn && hn.notConfigured
        ? "HN Site Builder غير مُهيّأ (أضف HN_SITE_BUILDER_API_KEY أو HN_API_KEY)."
        : hn.error;
    return { html: "", error: reason, hnUrl };
  });
