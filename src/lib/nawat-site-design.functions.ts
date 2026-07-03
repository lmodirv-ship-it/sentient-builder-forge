import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(2).max(4000),
  lang: z.enum(["ar", "en"]).default("ar"),
});

/** Generate a single self-contained HTML landing page (Tailwind via CDN). */
export const generateSiteHtml = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    // 1) Try HN Site Builder first (site.hn-groupe.tech) if configured.
    const { hnGenerateSite } = await import("./hn-clients.server");
    const hn = await hnGenerateSite(data.prompt, data.lang);
    if (hn.ok) return { html: hn.html, error: null };
    if (!("notConfigured" in hn) || !hn.notConfigured) console.warn("[nawat-site] HN failed:", hn.error);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { html: "", error: "Missing LOVABLE_API_KEY" };

    const sys = data.lang === "ar"
      ? `أنت مصمم مواقع HN. أنتج ملف HTML واحد كامل ومستقل يعتمد على Tailwind عبر CDN فقط.
- ابدأ بـ <!DOCTYPE html> وانتهِ بـ </html>.
- بدون أي شرح خارج الكود.
- تصميم عصري RTL عربي، ألوان متناسقة، Hero + Features + CTA + Footer.
- استخدم روابط داخلية # فقط.`
      : `You are HN's site designer. Output ONE complete self-contained HTML file using Tailwind CDN.
- Start with <!DOCTYPE html>, end with </html>.
- No explanation outside the code.
- Modern responsive design: Hero + Features + CTA + Footer.`;

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
        const t = await res.text();
        if (res.status === 402) return { html: "", error: "AI credits exhausted" };
        if (res.status === 429) return { html: "", error: "Rate limited" };
        return { html: "", error: `HTTP ${res.status}: ${t.slice(0, 200)}` };
      }
      const j: any = await res.json();
      let html: string = j?.choices?.[0]?.message?.content ?? "";
      // strip ```html fences if present
      html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
      return { html, error: html ? null : "Empty response" };
    } catch (e: any) {
      return { html: "", error: String(e?.message || e) };
    }
  });
