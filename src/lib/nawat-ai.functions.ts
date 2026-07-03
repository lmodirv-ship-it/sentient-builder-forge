import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  question: z.string().min(1),
  lang: z.enum(["ar", "en"]).default("ar"),
  context: z
    .array(
      z.object({
        title: z.string(),
        content: z.string(),
        source: z.string().optional(),
        date: z.string().optional(),
        tags: z.array(z.string()).optional(),
        tier: z.enum(["daily", "long", "core"]).optional(),
      }),
    )
    .max(12)
    .default([]),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() }))
    .max(20)
    .default([]),
  mode: z.enum(["default", "sites"]).default("default"),
});

/**
 * Nawat chat brain — routed exclusively through HN AI Gateway (ai.hn-groupe.org).
 * If HN is not configured, refuses gracefully with a link to open HN Chat.
 */
export const askNawat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const isAr = data.lang === "ar";
    const noMemoryAr = "لا أملك هذه المعلومة بعد داخل الذاكرة.";
    const noMemoryEn = "I don't have this information in memory yet.";

    if (!data.context.length) return { text: isAr ? noMemoryAr : noMemoryEn };

    const base = process.env.HN_AI_BASE_URL;
    const key = process.env.HN_API_KEY;
    if (!base || !key) {
      return {
        text:
          (isAr
            ? "⚠️ منظومة HN AI غير مُهيّأة على هذا الجهاز. افتح المحادثة مباشرة على "
            : "⚠️ HN AI is not configured on this device. Open chat directly at ") +
          "[HN Chat](https://hn-chat.com) أو [HN AI](https://ai.hn-groupe.org).",
      };
    }

    const sys = isAr
      ? `أنت «نواة» — رفيق المعرفة داخل منظومة HN. المصدر الوحيد: مقاطع الذاكرة أدناه. ممنوع الاختراع.
- اذكر بعد كل معلومة: [n • العنوان • التاريخ • الطبقة].
- إذا لم تكفِ المقاطع قل: "${noMemoryAr}".
- كل رابط بصيغة Markdown [نص](https://...).
- لكل خدمة وجّه إلى موقع HN المطابق (generatin/site/studio/buildcv/ai).
- عربية فصحى مختصرة.`
      : `You are "Nawat" — knowledge companion inside HN. Only source: memory passages below. No invention.
- Cite every fact [n • title • date • tier].
- If passages don't answer: "${noMemoryEn}".
- Markdown links only. Route every service request to the matching HN site.`;

    const ctxBlock =
      (isAr ? "مقاطع من ذاكرة المستخدم:\n" : "User memory passages:\n") +
      data.context
        .map((c, i) => {
          const tierBadge = c.tier === "core" ? "🟣core" : c.tier === "daily" ? "🟢daily" : "🔵long";
          const meta = [c.source, c.date, tierBadge].filter(Boolean).join(" • ");
          const tags = c.tags?.length ? `\n#${c.tags.join(" #")}` : "";
          return `[${i + 1}] ${c.title}${meta ? ` — ${meta}` : ""}${tags}\n${c.content}`;
        })
        .join("\n\n");

    const messages = [
      { role: "system" as const, content: sys },
      { role: "system" as const, content: ctxBlock },
      ...data.history.map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: data.question },
    ];

    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-API-Key": key },
        body: JSON.stringify({ model: "hn-chat", messages }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        if (res.status === 429) return { text: isAr ? "⚠️ تم تجاوز حد الطلبات." : "⚠️ Rate limit." };
        if (res.status === 402) return { text: isAr ? "⚠️ نفد رصيد HN." : "⚠️ HN credits exhausted." };
        return { text: (isAr ? "⚠️ خطأ HN: " : "⚠️ HN error: ") + `HTTP ${res.status} ${t.slice(0, 200)}` };
      }
      const j: any = await res.json();
      const text: string = j?.choices?.[0]?.message?.content ?? "";
      return { text };
    } catch (e: any) {
      return { text: (isAr ? "⚠️ خطأ: " : "⚠️ Error: ") + String(e?.message || e) };
    }
  });
