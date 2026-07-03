import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(2).max(4000),
  lang: z.enum(["ar", "en"]).default("ar"),
});

/** CV generation via BuildCV AI. Falls back to Lovable AI (HTML CV) if HN not configured. */
export const generateCV = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const { hnBuildCV } = await import("./hn-clients.server");
    const hn = await hnBuildCV(data.prompt, data.lang);
    if (hn.ok) return { html: hn.html, pdfUrl: hn.pdfUrl ?? null, error: null };
    if (!("notConfigured" in hn) || !hn.notConfigured) console.warn("[nawat-cv] HN failed:", hn.error);

    // Lovable fallback: generate a self-contained HTML CV.
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { html: "", pdfUrl: null, error: "Missing LOVABLE_API_KEY" };
    const sys = data.lang === "ar"
      ? `أنت مصمم سِيَر ذاتية احترافية. أنتج ملف HTML واحد كامل مستقل يستعمل Tailwind CDN. RTL عربي. تصميم أنيق ومقروء وقابل للطباعة (A4). ابدأ بـ <!DOCTYPE html>.`
      : `You are a professional CV designer. Output ONE self-contained HTML file using Tailwind CDN. Elegant, printable (A4). Start with <!DOCTYPE html>.`;
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: data.prompt },
          ],
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        return { html: "", pdfUrl: null, error: `HTTP ${res.status}: ${t.slice(0, 200)}` };
      }
      const j: any = await res.json();
      let html: string = j?.choices?.[0]?.message?.content ?? "";
      html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
      return { html, pdfUrl: null, error: html ? null : "Empty response" };
    } catch (e: any) {
      return { html: "", pdfUrl: null, error: String(e?.message || e) };
    }
  });
