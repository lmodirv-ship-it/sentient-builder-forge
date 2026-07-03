import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  question: z.string().min(1),
  lang: z.enum(["ar", "en"]).default("ar"),
});

export const expandQuery = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { variants: [data.question] };
    try {
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const { generateText } = await import("ai");
      const gateway = createLovableAiGatewayProvider(key);
      const model = gateway("google/gemini-3-flash-preview");
      const sys =
        data.lang === "ar"
          ? "أعطِ 4 صيغ بديلة للسؤال لأغراض بحث محلي (مرادفات، ترجمة إنجليزية، صيغة مختصرة، صيغة أعمّ). سطر واحد لكل صيغة، بدون ترقيم ولا شرح."
          : "Return 4 alternative phrasings of the question for local retrieval (synonyms, Arabic translation, terse form, broader form). One per line, no numbering, no commentary.";
      const { text } = await generateText({
        model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: data.question },
        ],
      });
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
