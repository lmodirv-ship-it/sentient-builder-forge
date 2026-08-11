import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  dataUrl: z.string().min(20),
  filename: z.string().default("image"),
  lang: z.enum(["ar", "en"]).default("ar"),
});

/** OCR — routed through HN AI Gateway (ai.hn-groupe.org). No external fallback. */
export const ocrImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const base = process.env.HN_AI_BASE_URL;
    const key = process.env.HN_API_KEY;
    const hnUrl = "https://ai.hn-groupe.org";
    if (!base || !key) {
      return { text: "", error: "HN AI غير مُهيّأ (أضف HN_API_KEY).", hnUrl };
    }

    const prompt =
      data.lang === "ar"
        ? "استخرج كل النص المرئي في هذه الصورة حرفياً (OCR). إن لم يوجد نص، صف الصورة بدقة في فقرة موجزة. أعد النص فقط دون مقدمات."
        : "Extract ALL visible text from this image verbatim (OCR). If no text, describe the image in one concise paragraph. Return text only.";

    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-API-Key": key },
        body: JSON.stringify({
          model: "hn-vision",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: data.dataUrl } },
              ],
            },
          ],
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        return { text: "", error: `HN OCR HTTP ${res.status}: ${t.slice(0, 200)}`, hnUrl };
      }
      const j: any = await res.json();
      const text: string = j?.choices?.[0]?.message?.content ?? "";
      return { text, error: null as string | null, hnUrl };
    } catch (e: any) {
      return { text: "", error: String(e?.message || e), hnUrl };
    }
  });
