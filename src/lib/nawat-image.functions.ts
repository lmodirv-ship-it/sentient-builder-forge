import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(1).max(2000),
});

export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { imageUrl: "", error: "Missing LOVABLE_API_KEY" };

    // Expand very short/vague prompts so the model actually renders something.
    let prompt = data.prompt.trim();
    if (prompt.length < 12) {
      prompt = `${prompt} — صورة فنية عالية الجودة، إضاءة سينمائية، تفاصيل دقيقة، ألوان غنية، 4K`;
    }

    async function tryImagesEndpoint(model: string) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          prompt,
          size: "1024x1024",
          quality: "low",
          n: 1,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        return { url: "", err: `HTTP ${res.status}: ${t.slice(0, 200)}` };
      }
      const j: any = await res.json().catch(() => null);
      const b64: string = j?.data?.[0]?.b64_json ?? "";
      if (!b64) return { url: "", err: "No image returned" };
      return { url: `data:image/png;base64,${b64}`, err: "" };
    }

    async function tryGeminiChat(model: string) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        return { url: "", err: `HTTP ${res.status}: ${t.slice(0, 200)}` };
      }
      const j: any = await res.json().catch(() => null);
      const url: string = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? "";
      return { url, err: url ? "" : "No image returned" };
    }

    // Primary: OpenAI gpt-image-2 (most reliable via images endpoint).
    let out = await tryImagesEndpoint("openai/gpt-image-2");
    if (out.url) return { imageUrl: out.url, error: null };

    // Fallback 1: Gemini flash image via chat.
    const g1 = await tryGeminiChat("google/gemini-2.5-flash-image");
    if (g1.url) return { imageUrl: g1.url, error: null };

    // Fallback 2: Nano Banana 2.
    const g2 = await tryGeminiChat("google/gemini-3.1-flash-image");
    if (g2.url) return { imageUrl: g2.url, error: null };

    return { imageUrl: "", error: out.err || g1.err || g2.err || "No image returned" };
  });
