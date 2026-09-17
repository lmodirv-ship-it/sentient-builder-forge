// سجل الأدوات الموحّد: كل أداة لها معرّف ووصف ومنفّذ واحد.

import { knownOperations, runOperation, readStoredFile, writeStoredFile, listStored } from "./runtime.mjs";
import { log } from "./db.mjs";

const TOOLS = {
  "system.disk": {
    label: "مساحة القرص",
    run: () => runOperation("disk.usage"),
  },
  "system.memory": {
    label: "الذاكرة",
    run: () => runOperation("memory.usage"),
  },
  "system.processes": {
    label: "العمليات",
    run: () => runOperation("process.list"),
  },
  "site.status": {
    label: "حالة المواقع",
    run: () => runOperation("site.status"),
  },
  "site.restart": {
    label: "إعادة تشغيل موقع",
    run: (input) => runOperation("site.restart", { name: input.name }),
  },
  "site.build": {
    label: "بناء موقع",
    run: (input) => runOperation("site.build", { dir: input.dir }, 600_000),
  },
  "file.read": {
    label: "قراءة ملف",
    run: async (input) => ({ content: await readStoredFile(input.path) }),
  },
  "file.write": {
    label: "كتابة ملف",
    run: async (input) => ({ path: await writeStoredFile(input.path, input.content ?? "") }),
  },
  "file.list": {
    label: "قائمة الملفات",
    run: async (input) => ({ items: await listStored(input.path || ".") }),
  },
};

export function listTools() {
  return Object.entries(TOOLS).map(([id, t]) => ({ id, label: t.label }));
}

export function operations() {
  return knownOperations();
}

export async function runTool(id, input = {}) {
  const tool = TOOLS[id];
  if (!tool) throw new Error(`أداة غير معروفة: ${id}`);
  const started = Date.now();
  try {
    const result = await tool.run(input);
    await log("tools", `تنفيذ ${id}`, { input, ms: Date.now() - started });
    return result;
  } catch (error) {
    await log("tools", `فشل ${id}`, { input, error: String(error) }, "error");
    throw error;
  }
}

// فهم نية الأداة من نص المستخدم.
const INTENTS = [
  [/مساحه|القرص|disk/i, "system.disk"],
  [/الذاكره|الرام|memory/i, "system.memory"],
  [/العمليات|processes/i, "system.processes"],
  [/حاله المواقع|pm2|status/i, "site.status"],
  [/اعد تشغيل|أعد تشغيل|restart/i, "site.restart"],
  [/ابني|بناء|build/i, "site.build"],
];

export function detectToolIntent(text) {
  const clean = String(text || "");
  for (const [pattern, id] of INTENTS) if (pattern.test(clean)) return id;
  return null;
}
