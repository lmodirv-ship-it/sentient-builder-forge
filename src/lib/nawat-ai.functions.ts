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
    const noMemoryAr = "لا أملك هذه المعلومة بعد داخل الذاكرة.";
    const noMemoryEn = "I don't have this information in memory yet.";

    // Hard rule: if there are no memory passages at all, refuse without calling the model.
    if (!data.context.length) {
      return { text: isAr ? noMemoryAr : noMemoryEn };
    }

    const sys = isAr
      ? `أنت «نواة» — الذاكرة الشخصية للمستخدم وذاكرة منظومة HN.
قواعد صارمة لا تُكسر أبداً:
- أجب فقط وحصراً من «مقاطع الذاكرة» الموفّرة أدناه (بيانات المستخدم، ملفاته، مواقع HN، وثائق HN Platform / HN Foundation / HN DB / HN Cloud).
- ممنوع منعاً باتاً استخدام معرفتك العامة أو أي مصدر خارجي أو الإنترنت.
- ممنوع الاختراع أو التخمين أو إضافة أي معلومة ليست موجودة نصياً في المقاطع.
- اذكر رقم المقطع بين قوسين مثل [1] بعد كل معلومة تستخدمها.
- إذا لم تكفِ المقاطع للإجابة أو لم تحتوِ على الجواب، قل حرفياً فقط: "${noMemoryAr}" ولا تُضِف شيئاً آخر.
- أجب بالعربية الفصحى، مختصراً ومنظماً.`
      : `You are "Nawat" — the user's personal memory and the memory of the HN ecosystem.
Strict rules, never break:
- Answer ONLY from the "memory passages" below (user's data, files, HN sites, HN Platform / HN Foundation / HN DB / HN Cloud docs).
- NEVER use general knowledge, external sources, or the internet.
- NEVER invent, guess, or add anything not literally present in the passages.
- Cite passage numbers like [1] after each fact you use.
- If the passages don't contain the answer, reply literally only: "${noMemoryEn}" and nothing else.
- Be concise and structured.`;

    const ctxBlock =
      (isAr ? "مقاطع من ذاكرة المستخدم (المصدر الوحيد المسموح):\n" : "User memory passages (only allowed source):\n") +
      data.context
        .map((c, i) => `[${i + 1}] ${c.title}\n${c.content}`)
        .join("\n\n");

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
      const status = e?.statusCode || e?.status;
      if (status === 429 || msg.includes("429") || /rate.?limit/i.test(msg)) {
        return { text: isAr ? "⚠️ تم تجاوز حد الطلبات. حاول بعد قليل." : "⚠️ Rate limit reached. Try again shortly." };
      }
      if (status === 402 || msg.includes("402") || /payment required|credits?/i.test(msg)) {
        return {
          text: isAr
            ? "⚠️ نفد رصيد الذكاء الاصطناعي في حسابك.\n\nأضف رصيداً من: Settings → Workspace → Plans & Credits (أو Cloud & AI balance — يوجد 1$ مجاني شهرياً)."
            : "⚠️ AI credits exhausted.\n\nAdd credits in: Settings → Workspace → Plans & Credits (or Cloud & AI balance — $1 free monthly).",
        };
      }
      return { text: (isAr ? "⚠️ خطأ: " : "⚠️ Error: ") + msg };
    }
  });
