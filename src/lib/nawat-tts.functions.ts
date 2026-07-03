import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().default("alloy"),
});

export const generateSpeech = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    // 1) Try HN AI Studio first (ai.hn-groupe.org) if configured.
    const { hnGenerateSpeech } = await import("./hn-clients.server");
    const hn = await hnGenerateSpeech(data.text, data.voice);
    if (hn.ok) return { audioBase64: hn.audioBase64, mime: hn.mime, error: null as string | null };
    if (!("notConfigured" in hn) || !hn.notConfigured) console.warn("[nawat-tts] HN failed:", hn.error);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { audioBase64: "", mime: "", error: "Missing LOVABLE_API_KEY" };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini-tts",
          input: data.text,
          voice: data.voice || "alloy",
          response_format: "mp3",
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        if (res.status === 402) return { audioBase64: "", mime: "", error: "AI credits exhausted" };
        if (res.status === 429) return { audioBase64: "", mime: "", error: "Rate limited" };
        return { audioBase64: "", mime: "", error: `HTTP ${res.status}: ${t.slice(0, 200)}` };
      }
      const buf = await res.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      return { audioBase64: b64, mime: "audio/mpeg", error: null as string | null };
    } catch (e: any) {
      return { audioBase64: "", mime: "", error: String(e?.message || e) };
    }
  });
