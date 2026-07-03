import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ prompt: z.string().min(2).max(2000) });

/** Video generation via HN Video Studio. Falls back to "not available" if not configured. */
export const generateVideo = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const { hnGenerateVideo } = await import("./hn-clients.server");
    const hn = await hnGenerateVideo(data.prompt);
    if (hn.ok) return { videoUrl: hn.videoUrl, jobId: hn.jobId ?? null, error: null };
    if ("notConfigured" in hn && hn.notConfigured) {
      return { videoUrl: "", jobId: null, error: "HN Video Studio غير مُهيّأ بعد (أضف HN_VIDEO_BASE_URL و HN_STUDIO_API_KEY)." };
    }
    return { videoUrl: "", jobId: null, error: hn.error };
  });
