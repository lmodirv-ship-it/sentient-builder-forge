import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  question: z.string().min(1),
  lang: z.enum(["ar", "en"]).default("ar"),
});

/**
 * Query expansion — HN AI Gateway only. If HN not configured, returns the original
 * question unchanged (safe no-op, no external fallback).
 */
export const expandQuery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const base = process.env.HN_AI_BASE_URL;
    const key = process.env.HN_API_KEY;
    if (!base || !key) return { variants: [data.question] };

    const sys =
      data.lang === "ar"
        ? "أعطِ 4 صيغ بديلة للسؤال لأغراض بحث محلي. سطر واحد لكل صيغة، بدون ترقيم."
        : "Return 4 alternative phrasings of the question for local retrieval. One per line, no numbering.";

    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-API-Key": key },
        body: JSON.stringify({
          model: "hn-chat",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: data.question },
          ],
        }),
      });
      if (!res.ok) return { variants: [data.question] };
      const j: any = await res.json();
      const text: string = j?.choices?.[0]?.message?.content ?? "";
      const variants = text
        .split(/\r?\n/)
        .map((s) => s.replace(/^[\s\-\d\.\)•·]+/, "").trim())
        .filter((s) => s.length > 1)
        .slice(0, 4);
      return { variants: [data.question, ...variants] };
    } catch {
      return { variants: [data.question] };
    }
  });
