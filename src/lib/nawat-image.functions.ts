import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ prompt: z.string().min(1).max(2000) });

/**
 * Image generation — HN only (generatin.hn-groupe.org). No external fallback.
 * On failure returns { imageUrl:"", error, hnUrl } so the UI can offer to open HN directly.
 * كل عملية تُسجَّل في generation_jobs + activity_logs وتخضع للحصة اليومية.
 */
export const generateImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const { withJobTracking } = await import("./jobs-tracking.server");
    try {
      return await withJobTracking({
        userId: context.userId,
        kind: "image" as const,
        prompt: data.prompt,
        serviceKey: "nawat-image",
        action: "generate_image",
        run: async () => {
          const { hnGenerateImage } = await import("./hn-clients.server");
          const { bestUrlFor } = await import("./hn-manifest");
          const { url: hnUrl } = bestUrlFor("image-gen", data.prompt);

          const hn = await hnGenerateImage(data.prompt);
          if (hn.ok)
            return {
              ok: true,
              summary: data.prompt.slice(0, 200),
              value: { imageUrl: hn.imageUrl, error: null as string | null, hnUrl, via: "hn" as const },
            };

          const reason =
            "notConfigured" in hn && hn.notConfigured
              ? "HN AI Generation غير مُهيّأ (أضف HN_API_KEY أو HN_GENERATIN_API_KEY)."
              : hn.error;
          return {
            ok: false,
            error: reason,
            value: { imageUrl: "", error: reason, hnUrl, via: "none" as const },
          };
        },
      });
    } catch (e: any) {
      const { bestUrlFor } = await import("./hn-manifest");
      const { url: hnUrl } = bestUrlFor("image-gen", data.prompt);
      return { imageUrl: "", error: e?.message ?? "فشل التنفيذ", hnUrl, via: "none" as const };
    }
  });
