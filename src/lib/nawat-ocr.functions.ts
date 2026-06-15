import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  dataUrl: z.string().min(20), // data:image/...;base64,...
  filename: z.string().default("image"),
  lang: z.enum(["ar", "en"]).default("ar"),
});

export const ocrImage = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const prompt =
      data.lang === "ar"
        ? `استخرج كل النص المرئي في هذه الصورة حرفياً (OCR). إن لم يوجد نص، صف الصورة بدقة في فقرة موجزة (الأشخاص، الأشياء، السياق، أي معلومات قابلة للتعلم). أعد النص فقط دون مقدمات.`
        : `Extract ALL visible text from this image verbatim (OCR). If there is no text, describe the image precisely in one concise paragraph (people, objects, context, learnable facts). Return text only, no preamble.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
      const t = await res.text();
      if (res.status === 402) return { text: "", error: "AI credits exhausted" };
      if (res.status === 429) return { text: "", error: "Rate limited" };
      return { text: "", error: `HTTP ${res.status}: ${t.slice(0, 200)}` };
    }
    const j: any = await res.json();
    const text: string = j?.choices?.[0]?.message?.content ?? "";
    return { text, error: null as string | null };
  });
