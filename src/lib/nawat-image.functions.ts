import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(2).max(2000),
});

export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: data.prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 402) return { imageUrl: "", error: "AI credits exhausted" };
      if (res.status === 429) return { imageUrl: "", error: "Rate limited" };
      return { imageUrl: "", error: `HTTP ${res.status}: ${t.slice(0, 200)}` };
    }
    const j: any = await res.json();
    const url: string =
      j?.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? "";
    return { imageUrl: url, error: url ? null : "No image returned" };
  });
