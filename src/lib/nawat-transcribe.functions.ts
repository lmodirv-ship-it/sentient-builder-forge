import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  audioBase64: z.string().min(20),
  format: z.enum(["wav", "mp3", "webm", "m4a", "ogg", "aac", "flac", "mp4"]).default("webm"),
  lang: z.enum(["ar", "en"]).default("ar"),
});

/** Audio transcription — HN AI Gateway only (ai.hn-groupe.org). */
export const transcribeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const base = process.env.HN_AI_BASE_URL;
    const key = process.env.HN_API_KEY;
    const hnUrl = "https://ai.hn-groupe.org";
    if (!base || !key) return { text: "", error: "HN AI غير مُهيّأ (أضف HN_API_KEY).", hnUrl };

    let b64 = data.audioBase64;
    const m = b64.match(/^data:([^;]+);base64,(.*)$/);
    if (m) b64 = m[2];

    const prompt =
      data.lang === "ar"
        ? "فرّغ هذا التسجيل الصوتي إلى نص حرفي. أعد النص فقط بدون مقدمات."
        : "Transcribe this audio verbatim. Return text only.";

    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-API-Key": key },
        body: JSON.stringify({
          model: "hn-audio",
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
        const t = await res.text().catch(() => "");
        return { text: "", error: `HN Transcribe HTTP ${res.status}: ${t.slice(0, 200)}`, hnUrl };
      }
      const j: any = await res.json();
      return { text: (j?.choices?.[0]?.message?.content ?? "") as string, error: null as string | null, hnUrl };
    } catch (e: any) {
      return { text: "", error: String(e?.message || e), hnUrl };
    }
  });
