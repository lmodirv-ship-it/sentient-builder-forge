import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  // base64 only (no data: prefix), or full data URL — we strip it
  audioBase64: z.string().min(20),
  format: z.enum(["wav", "mp3", "webm", "m4a", "ogg", "aac", "flac", "mp4"]).default("webm"),
  lang: z.enum(["ar", "en"]).default("ar"),
});

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    let b64 = data.audioBase64;
    const m = b64.match(/^data:([^;]+);base64,(.*)$/);
    if (m) b64 = m[2];

    const prompt =
      data.lang === "ar"
        ? "فرّغ هذا التسجيل الصوتي إلى نص حرفي. أعد النص فقط بدون مقدمات."
        : "Transcribe this audio verbatim to text. Return text only, no preamble.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "input_audio", input_audio: { data: b64, format: data.format } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 402) return { text: "", error: "AI credits exhausted" };
      if (res.status === 429) return { text: "", error: "Rate limited" };
      return { text: "", error: `HTTP ${res.status}: ${t.slice(0, 200)}` };
    }
    const j: any = await res.json();
    return { text: (j?.choices?.[0]?.message?.content ?? "") as string, error: null as string | null };
  });
