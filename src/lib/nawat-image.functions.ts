import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(1).max(2000),
});

export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    // 1) Try HN's own service first (generatin.hn-groupe.org) if configured.
    const { hnGenerateImage } = await import("./hn-clients.server");
    const hn = await hnGenerateImage(data.prompt);
    if (hn.ok) return { imageUrl: hn.imageUrl, error: null, via: "hn" as const };
    if (!("notConfigured" in hn) || !hn.notConfigured) {
      // configured but failed — log and continue to Lovable fallback
      console.warn("[nawat-image] HN generatin failed:", hn.error);
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { imageUrl: "", error: "Missing LOVABLE_API_KEY", via: "none" as const };

    const subject = data.prompt.trim();
    // Force an unambiguous image-generation instruction so chat models don't reply with text.
    const richPrompt = `Generate a high-quality, detailed image of: ${subject}. Cinematic lighting, rich colors, 4K, professional composition.`;

    async function tryImagesEndpoint(model: string) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            prompt: richPrompt,
            size: "1024x1024",
            quality: "low",
            n: 1,
          }),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          return { url: "", err: `${model} HTTP ${res.status}: ${t.slice(0, 200)}` };
        }
        const j: any = await res.json().catch(() => null);
        const b64: string = j?.data?.[0]?.b64_json ?? "";
        if (!b64) return { url: "", err: `${model}: empty payload` };
        return { url: `data:image/png;base64,${b64}`, err: "" };
      } catch (e: any) {
        return { url: "", err: `${model}: ${String(e?.message || e)}` };
      }
    }

    async function tryGeminiChat(model: string) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: `You are an image generator. Do NOT reply with text. Output ONLY an image. Subject: ${subject}. Style: cinematic, high detail, 4K.`,
              },
            ],
            modalities: ["image", "text"],
          }),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          return { url: "", err: `${model} HTTP ${res.status}: ${t.slice(0, 200)}` };
        }
        const j: any = await res.json().catch(() => null);
        const msg = j?.choices?.[0]?.message;
        const url: string =
          msg?.images?.[0]?.image_url?.url ??
          msg?.images?.[0]?.url ??
          "";
        return { url, err: url ? "" : `${model}: no image in response` };
      } catch (e: any) {
        return { url: "", err: `${model}: ${String(e?.message || e)}` };
      }
    }

    // Primary: OpenAI gpt-image-2.
    const errs: string[] = [];
    const a = await tryImagesEndpoint("openai/gpt-image-2");
    if (a.url) return { imageUrl: a.url, error: null };
    errs.push(a.err);

    // Fallback: Nano Banana 2 (better instruction following than 2.5-flash).
    const b = await tryGeminiChat("google/gemini-3.1-flash-image");
    if (b.url) return { imageUrl: b.url, error: null };
    errs.push(b.err);

    // Last resort: 2.5-flash-image.
    const c = await tryGeminiChat("google/gemini-2.5-flash-image");
    if (c.url) return { imageUrl: c.url, error: null };
    errs.push(c.err);

    console.error("[nawat-image] all providers failed:", errs);
    return { imageUrl: "", error: errs.join(" | ") };
  });
