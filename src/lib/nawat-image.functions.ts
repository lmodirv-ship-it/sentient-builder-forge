import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ prompt: z.string().min(1).max(2000) });

/**
 * Image generation — HN only (generatin.hn-groupe.org). No external fallback.
 * On failure returns { imageUrl:"", error, hnUrl } so the UI can offer to open HN directly.
 */
export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const { hnGenerateImage } = await import("./hn-clients.server");
    const { bestUrlFor } = await import("./hn-manifest");
    const { url: hnUrl } = bestUrlFor("image-gen", data.prompt);

    const hn = await hnGenerateImage(data.prompt);
    if (hn.ok) return { imageUrl: hn.imageUrl, error: null, hnUrl, via: "hn" as const };

    const reason =
      "notConfigured" in hn && hn.notConfigured
        ? "HN AI Generation غير مُهيّأ (أضف HN_API_KEY أو HN_GENERATIN_API_KEY)."
        : hn.error;
    return { imageUrl: "", error: reason, hnUrl, via: "none" as const };
  });
