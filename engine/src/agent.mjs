// الوكيل المركزي: يقرر المسار، ثم يستدعي القوالب أو الأداة أو المهمة أو النموذج.

import { matchTemplate, lettersOnly } from "./templates.mjs";
import { detectToolIntent, runTool } from "./tools.mjs";
import { searchMemory, rememberExchange } from "./memory.mjs";
import { chat } from "./models.mjs";
import { createJob } from "./jobs.mjs";
import { log } from "./db.mjs";
import { isTvccQuestion, tvccAnswer } from "./tvcc.mjs";

const JOB_INTENTS = [
  [/صمم لي موقع|انشئ موقع|اصنع موقع/i, "site", (t) => ({ prompt: t })],
  [/انشئ صوره|ارسم|صوره ل/i, "image", (t) => ({ prompt: t })],
  [/حول.*صوت|اقرا بصوت|نطق/i, "tts", (t) => ({ text: t })],
  [/فيديو|مقطع مرئي/i, "video", (t) => ({ prompt: t })],
  [/سيره ذاتيه|cv/i, "cv", (t) => ({ data: t })],
];

function detectJob(text) {
  for (const [pattern, kind, build] of JOB_INTENTS) {
    if (pattern.test(text)) return { kind, input: build(text) };
  }
  return null;
}

export async function ask({ userId, text, onToken }) {
  const question = String(text || "").trim();
  if (!question) return { route: "empty", answer: "" };

  // 1) القوالب — جواب فوري
  const template = await matchTemplate(question);
  if (template) {
    await log("agent", "جواب من القوالب", { code: template.code });
    return { route: "template", code: template.code, answer: template.answer };
  }

  // 1.5) منصة TVCC — مركز قيادة المواقع
  if (isTvccQuestion(question)) {
    const tv = await tvccAnswer(question);
    if (tv) {
      await log("agent", "جواب من منصة TVCC", {});
      return { route: "tvcc", answer: tv };
    }
  }

  // 2) أداة
  const toolId = detectToolIntent(question);
  if (toolId) {
    const result = await runTool(toolId, { name: "", dir: "" });
    return { route: "tool", tool: toolId, result };
  }

  // 3) مهمة إنشاء
  const job = detectJob(question);
  if (job) {
    const created = await createJob(userId, job.kind, job.input);
    return { route: "job", job: created };
  }

  // 4) ذاكرة + نموذج
  const docs = await searchMemory(question);
  const context = docs.map((d) => `${d.title}\n${d.body}`).join("\n---\n");
  const { text: answer, model, node } = await chat({
    model: process.env.DEFAULT_MODEL || "llama3.1",
    messages: [
      {
        role: "system",
        content:
          "انت نواة المساعد الذكي اجب بالعربيه بحروف فقط دون رموز واعتمد على المعلومات المعطاه ان وجدت والا قل لم اجد",
      },
      ...(context ? [{ role: "system", content: context }] : []),
      { role: "user", content: question },
    ],
    onToken,
  });

  const clean = lettersOnly(answer);
  if (clean) await rememberExchange(question, clean);
  return { route: "model", answer: clean, model, node, sources: docs.map((d) => d.title) };
}
