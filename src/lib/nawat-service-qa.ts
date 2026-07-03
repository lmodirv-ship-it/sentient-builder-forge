// Wave 2 · Agent 8 — 500+ auto-generated Q&A docs from HN_CAPABILITIES.
// Pure local, tier: core. Retrieved via TF-IDF like any other doc.
import type { Doc } from "./nawat-search";
import { HN_CAPABILITIES, type Capability } from "./hn-capabilities";

function primary(cap: Capability) {
  return [...cap.providers].sort((a, b) => a.priority - b.priority)[0];
}

function answerFor(cap: Capability, lang: "ar" | "en"): string {
  const p = primary(cap);
  const alts = [...cap.providers].sort((a, b) => a.priority - b.priority).slice(1);
  if (lang === "ar") {
    const altLines = alts.length ? `\n\nبدائل:\n${alts.map((x) => `- ${x.role ? `[${x.role}] ` : ""}${x.url}`).join("\n")}` : "";
    return `الخدمة **${cap.ar}** (${cap.en}) → ${p.url}${p.role ? ` (${p.role})` : ""}${altLines}${cap.note ? `\n\nملاحظة: ${cap.note}` : ""}`;
  }
  const altLines = alts.length ? `\n\nAlternatives:\n${alts.map((x) => `- ${x.role ? `[${x.role}] ` : ""}${x.url}`).join("\n")}` : "";
  return `Service **${cap.en}** (${cap.ar}) → ${p.url}${p.role ? ` (${p.role})` : ""}${altLines}${cap.note ? `\n\nNote: ${cap.note}` : ""}`;
}

function questionsFor(cap: Capability): string[] {
  const p = primary(cap);
  const host = p.url.replace(/^https?:\/\//, "");
  const qs: string[] = [
    `ما هي خدمة ${cap.ar}؟`,
    `أي موقع أستخدم لـ ${cap.ar}؟`,
    `أريد ${cap.ar}`,
    `افتح ${cap.ar}`,
    `كيف أصل إلى ${cap.ar}؟`,
    `رابط ${cap.ar}`,
    `Which HN site handles ${cap.en}?`,
    `Open ${cap.en}`,
    `I need ${cap.en}`,
    `Where do I go for ${cap.en}?`,
    `What is ${host}?`,
    `شرح ${host}`,
  ];
  for (const intent of cap.intents.slice(0, 4)) {
    qs.push(`أريد ${intent}`);
    qs.push(`${intent}?`);
  }
  if (cap.providers.some((x) => x.role === "admin")) qs.push(`admin ${cap.en}`, `إدارة ${cap.ar}`);
  if (cap.providers.some((x) => x.role === "api")) qs.push(`API ${cap.en}`, `api ${cap.ar}`);
  return qs;
}

export function getServiceQADocs(): Doc[] {
  const now = Date.now();
  const docs: Doc[] = [];
  let i = 0;
  for (const cap of HN_CAPABILITIES) {
    const qs = questionsFor(cap);
    const answerAr = answerFor(cap, "ar");
    const answerEn = answerFor(cap, "en");
    // Bundle each capability's ~14 questions into 2 docs (AR/EN) for TF-IDF weight.
    docs.push({
      id: `hn-qa-ar-${cap.id}`,
      title: `❓ ${cap.emoji} ${cap.ar} — أسئلة شائعة`,
      content: `أسئلة عن ${cap.ar}:\n\n${qs.filter((q) => /[\u0600-\u06FF]/.test(q)).map((q) => `- ${q}`).join("\n")}\n\n**الإجابة:**\n${answerAr}`,
      tags: ["qa", "خدمة", cap.id, cap.parent.toLowerCase(), ...cap.intents.slice(0, 4)],
      source: primary(cap).url,
      createdAt: now + i++,
      tier: "core",
    });
    docs.push({
      id: `hn-qa-en-${cap.id}`,
      title: `❓ ${cap.emoji} ${cap.en} — FAQ`,
      content: `Questions about ${cap.en}:\n\n${qs.filter((q) => !/[\u0600-\u06FF]/.test(q)).map((q) => `- ${q}`).join("\n")}\n\n**Answer:**\n${answerEn}`,
      tags: ["qa", "service", cap.id, cap.parent.toLowerCase(), ...cap.intents.slice(0, 4)],
      source: primary(cap).url,
      createdAt: now + i++,
      tier: "core",
    });
  }
  // Cross-cutting comparison doc
  const compareAr = HN_CAPABILITIES.map((c) => `- ${c.emoji} **${c.ar}** → ${primary(c).url}`).join("\n");
  docs.push({
    id: "hn-qa-compare-all",
    title: `🧭 مقارنة سريعة — ${HN_CAPABILITIES.length} خدمة`,
    content: `أي موقع يقوم بماذا؟\n\n${compareAr}\n\nاستخدم /خدمة <اسم> لفتح خدمة مباشرة.`,
    tags: ["qa", "compare", "index", "capabilities"],
    source: "hn-capabilities",
    createdAt: now + 9999,
    tier: "core",
  });
  return docs;
}

export const SERVICE_QA_COUNT = getServiceQADocs().length;
