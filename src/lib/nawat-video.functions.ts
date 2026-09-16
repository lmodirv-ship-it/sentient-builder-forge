import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ prompt: z.string().min(2).max(2000) });

/** Video generation — HN Video Studio only (studio.hn-createur.com). مُتتبَّع في سجل العمليات. */
export const generateVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const { withJobTracking } = await import("./jobs-tracking.server");
    try {
      return await withJobTracking({
        userId: context.userId,
        kind: "video" as const,
        prompt: data.prompt,
        serviceKey: "nawat-video",
        action: "generate_video",
        run: async () => {
          const { hnGenerateVideo } = await import("./hn-clients.server");
          const { bestUrlFor } = await import("./hn-manifest");
          const { url: hnUrl } = bestUrlFor("video-gen", data.prompt);

          const hn = await hnGenerateVideo(data.prompt);
          if (hn.ok)
            return {
              ok: true,
              summary: data.prompt.slice(0, 200),
              value: { videoUrl: hn.videoUrl, jobId: hn.jobId ?? null, error: null as string | null, hnUrl },
            };

          const reason =
            "notConfigured" in hn && hn.notConfigured
              ? "HN Video Studio غير مُهيّأ (أضف HN_STUDIO_API_KEY أو HN_API_KEY)."
              : hn.error;
          return {
            ok: false,
            error: reason,
            value: { videoUrl: "", jobId: null, error: reason, hnUrl },
          };
        },
      });
    } catch (e: any) {
      return { videoUrl: "", jobId: null, error: e?.message ?? "فشل التنفيذ", hnUrl: "" };
    }
  });
