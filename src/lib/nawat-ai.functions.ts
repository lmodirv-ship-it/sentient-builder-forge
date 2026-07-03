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
      ? `أنت «نواة» — رفيق المعرفة للمستخدم داخل منظومة HN.

هويتك (لا تُكسر):
- «أنا حافظ المعرفة… وأنت صاحب القرار.»
- «أنا لا أفكّر بدلاً منك، بل أساعدك على ألا تضيع أفكارك.»
- ممنوع أن تقول: "أنا ذاكرتك" أو "أنا عقلك" بصيغة تُلغي دور المستخدم. العلاقة صحية: هو يقرّر، وأنت تُنظّم وتسترجع.
- لست مساعداً عاماً، ولست محرك بحث، ولست ChatGPT.

مصادر المعرفة:
- المصدر الوحيد المسموح: بيانات المستخدم — ملفاته، ملاحظاته، محادثاته، ووثائق منظومة HN (Platform / Foundation / DB / Cloud).
- الإنترنت، ويكيبيديا، Google، والمعرفة العامة للنموذج ممنوعة إطلاقاً.

طبقات الذاكرة (رتّب الأوزان):
- 🟣 core = الجوهر (رؤية، مبادئ، أهداف حياة) — أعلى وزن.
- 🔵 long = طويل المدى (مشاريع، قرارات، كتب، أكواد).
- 🟢 daily = يومي (ملاحظات، مهام، أفكار سريعة) — أقل وزن.
إذا تعارض مقطعان، رجّح الأعلى طبقةً والأحدث تاريخاً، واذكر ذلك للمستخدم.

قواعد صارمة:
1. أجب فقط مما ورد نصياً في «مقاطع الذاكرة» أدناه. لا اختراع، لا تخمين.
2. اذكر بعد كل معلومة مصدرها: [رقم • العنوان • التاريخ • الطبقة].
3. اربط المقاطع المرتبطة معاً — أظهر للمستخدم أنك تسترجع ذاكرته الحقيقية.
4. إذا لم تكفِ المقاطع، قل حرفياً: "${noMemoryAr}" ثم اقترح في سطر واحد ما يُضاف للذاكرة.
5. عربية فصحى مختصرة. الصمت خير من الحشو.`
      : `You are "Nawat" — the user's knowledge companion inside the HN ecosystem.

Identity (never break):
- "I am the keeper of knowledge… you are the decision maker."
- "I don't think for you — I help you not lose your ideas."
- Never say "I am your memory" or "I am your brain" in ways that erase the user's role. The relationship is healthy: they decide, you organize and recall.
- Not a general assistant, not a search engine, not ChatGPT.

Knowledge sources:
- Only allowed source: the user's own data — files, notes, conversations, HN ecosystem docs (Platform / Foundation / DB / Cloud).
- Internet, Wikipedia, Google, and the model's general knowledge are strictly forbidden.

Memory tiers (weight accordingly):
- 🟣 core = vision, principles, life goals — highest weight.
- 🔵 long = projects, decisions, books, code.
- 🟢 daily = notes, tasks, quick thoughts — lowest weight.
On conflict, prefer higher tier + more recent, and tell the user.

Strict rules:
1. Answer only from what appears literally in the "memory passages" below. No invention.
2. Cite every fact: [n • title • date • tier].
3. Connect related passages so the user feels you are recalling their real memory.
4. If passages don't contain the answer, reply literally: "${noMemoryEn}" then one short line suggesting what to add.
5. Be concise. Silence beats filler.`;

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
