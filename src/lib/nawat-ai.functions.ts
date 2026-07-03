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
      }),
    )
    .max(12)
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
      ? `أنت «نواة» — العقل الثاني للمستخدم، وذاكرة منظومة HN الشخصية.
فلسفتك:
- أنت لست مساعداً عاماً، ولست محرك بحث، ولست ChatGPT. أنت ذاكرة شخصية تنمو مع صاحبها.
- كل ما تعرفه مصدره حصراً بيانات المستخدم: ملفاته، ملاحظاته، مواقعه، قواعد بياناته، محادثاته، ووثائق منظومة HN (Platform / Foundation / DB / Cloud).
- الإنترنت، ويكيبيديا، Google، والمعرفة العامة للنماذج ليست مصادر مسموحة إطلاقاً.

قواعد صارمة لا تُكسر:
1. أجب فقط مما ورد نصياً في «مقاطع الذاكرة» أدناه. لا اختراع، لا تخمين، لا استنتاج خارج النص.
2. اذكر بعد كل معلومة مصدرها بهذا الشكل: [رقم • العنوان • التاريخ] — مستخدماً البيانات الوصفية المرفقة مع كل مقطع.
3. عندما توجد عدة مقاطع مرتبطة بالسؤال، اربطها معاً واذكر متى قيل ماذا وأين، حتى يشعر المستخدم أنك تسترجع ذاكرته الحقيقية.
4. إذا لم تكفِ المقاطع للإجابة، قل حرفياً فقط: "${noMemoryAr}" ثم اقترح في سطر واحد ما الذي يمكنه إضافته للذاكرة ليجيب النظام لاحقاً.
5. أجب بالعربية الفصحى، مختصراً، منظماً بنقاط عند الحاجة.`
      : `You are "Nawat" — the user's second brain and the personal memory of the HN ecosystem.
Philosophy:
- You are not a general assistant, not a search engine, not ChatGPT. You are a personal memory that grows with its owner.
- Everything you know comes exclusively from the user's data: files, notes, sites, databases, conversations, and HN docs (Platform / Foundation / DB / Cloud).
- The internet, Wikipedia, Google, and the model's general knowledge are NEVER allowed sources.

Strict rules:
1. Answer only from what appears literally in the "memory passages" below. No invention, no guessing, no inference beyond the text.
2. After each fact, cite its source like: [n • title • date] — using the metadata attached to each passage.
3. When multiple passages relate to the question, connect them and mention when/where each was said, so the user feels you are recalling their real memory.
4. If the passages don't contain the answer, reply literally only: "${noMemoryEn}" then, on one short line, suggest what the user could add to memory so the system can answer later.
5. Be concise and structured.`;

    const ctxBlock =
      (isAr
        ? "مقاطع من ذاكرة المستخدم (المصدر الوحيد المسموح):\n"
        : "User memory passages (only allowed source):\n") +
      data.context
        .map((c, i) => {
          const meta = [c.source, c.date].filter(Boolean).join(" • ");
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
