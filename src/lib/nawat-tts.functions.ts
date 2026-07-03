import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().default("alloy"),
});

/** TTS — HN AI Studio only (ai.hn-groupe.org). No external fallback. */
export const generateSpeech = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const { hnGenerateSpeech } = await import("./hn-clients.server");
    const { bestUrlFor } = await import("./hn-manifest");
    const { url: hnUrl } = bestUrlFor("tts", data.text.slice(0, 80));

    const hn = await hnGenerateSpeech(data.text, data.voice);
    if (hn.ok) return { audioBase64: hn.audioBase64, mime: hn.mime, error: null as string | null, hnUrl };

    const reason =
      "notConfigured" in hn && hn.notConfigured
        ? "HN AI Studio غير مُهيّأ (أضف HN_API_KEY)."
        : hn.error;
    return { audioBase64: "", mime: "", error: reason, hnUrl };
  });
