import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  question: z.string().min(1),
  lang: z.enum(["ar", "en"]).default("ar"),
  context: z
    .array(z.object({ title: z.string(), content: z.string() }))
    .max(8)
    .default([]),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() }))
    .max(20)
    .default([]),
});

export const askNawat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const isAr = data.lang === "ar";
    const sys = isAr
      ? `أنت «نواة» — عقل معرفي شخصي للمستخدم. أجب باللغة العربية الفصحى بوضوح ودفء.
- اعتمد أولاً على «مقاطع الذاكرة» الموفّرة أدناه إن وُجدت، واذكر رقم المقطع بين قوسين مثل [1].
- إن لم تكفِ الذاكرة، أكمل من معرفتك العامة وأشر إلى ذلك بصراحة.
- كن مختصراً ومنظماً (نقاط عند اللزوم). لا تختلق مصادر.`
      : `You are "Nawat" — a personal knowledge brain. Answer clearly and warmly.
- Prefer the user's "memory passages" below; cite as [1], [2] when used.
- If memory is insufficient, use general knowledge and say so briefly.
- Be concise and structured. Never fabricate sources.`;

    const ctxBlock = data.context.length
      ? (isAr ? "مقاطع من ذاكرة المستخدم:\n" : "User memory passages:\n") +
        data.context
          .map((c, i) => `[${i + 1}] ${c.title}\n${c.content}`)
          .join("\n\n")
      : isAr
      ? "لا توجد مقاطع ذاكرة ذات صلة."
      : "No relevant memory passages.";

    const messages = [
      { role: "system" as const, content: sys },
      { role: "system" as const, content: ctxBlock },
      ...data.history.map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: data.question },
    ];

    try {
      const { text } = await generateText({ model, messages });
      return { text };
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("429")) {
        return { text: isAr ? "⚠️ تم تجاوز حد الطلبات. حاول بعد قليل." : "⚠️ Rate limit reached. Try again shortly." };
      }
      if (msg.includes("402")) {
        return { text: isAr ? "⚠️ نفد رصيد الذكاء الاصطناعي. أضف رصيداً من إعدادات Workspace." : "⚠️ AI credits exhausted. Add credits in Workspace settings." };
      }
      throw e;
    }
  });
