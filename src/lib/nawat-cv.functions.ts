import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(2).max(4000),
  lang: z.enum(["ar", "en"]).default("ar"),
});

/** CV generation — BuildCV AI only (buildcv-ai.online). No external fallback. */
export const generateCV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const { hnBuildCV } = await import("./hn-clients.server");
    const { bestUrlFor } = await import("./hn-manifest");
    const { url: hnUrl } = bestUrlFor("cv-build", data.prompt);

    const hn = await hnBuildCV(data.prompt, data.lang);
    if (hn.ok) return { html: hn.html, pdfUrl: hn.pdfUrl ?? null, error: null, hnUrl };

    const reason =
      "notConfigured" in hn && hn.notConfigured
        ? "BuildCV AI غير مُهيّأ (أضف HN_BUILDCV_API_KEY أو HN_API_KEY)."
        : hn.error;
    return { html: "", pdfUrl: null, error: reason, hnUrl };
  });
