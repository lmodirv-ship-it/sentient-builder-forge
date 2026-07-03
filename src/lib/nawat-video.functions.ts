import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ prompt: z.string().min(2).max(2000) });

/** Video generation — HN Video Studio only (studio.hn-createur.com). */
export const generateVideo = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const { hnGenerateVideo } = await import("./hn-clients.server");
    const { bestUrlFor } = await import("./hn-manifest");
    const { url: hnUrl } = bestUrlFor("video-gen", data.prompt);

    const hn = await hnGenerateVideo(data.prompt);
    if (hn.ok) return { videoUrl: hn.videoUrl, jobId: hn.jobId ?? null, error: null, hnUrl };

    const reason =
      "notConfigured" in hn && hn.notConfigured
        ? "HN Video Studio غير مُهيّأ (أضف HN_STUDIO_API_KEY أو HN_API_KEY)."
        : hn.error;
    return { videoUrl: "", jobId: null, error: reason, hnUrl };
  });
