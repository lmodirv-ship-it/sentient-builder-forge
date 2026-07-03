// Nawat executor: detects "create X" intent and maps it to an HN site + local backend runner.
// Each executor announces which HN site is being used, runs in background, returns a result.

export type ExecKind = "image" | "audio" | "html" | "text";

export type ExecutorId = "image" | "tts" | "site" | "video" | "cv" | "content";

export type ExecutorDef = {
  id: ExecutorId;
  kind: ExecKind;
  siteName: string;
  siteUrl: string;
  labelAr: string;
  labelEn: string;
  emoji: string;
  match: RegExp[];
  cleanPrompt?: (raw: string) => string;
};

const strip = (raw: string, re: RegExp) => raw.replace(re, "").trim();

export const EXECUTORS: ExecutorDef[] = [
  {
    id: "image",
    kind: "image",
    siteName: "HN AI Generation",
    siteUrl: "https://generatin.hn-groupe.org",
    labelAr: "توليد صورة",
    labelEn: "Image generation",
    emoji: "🖼️",
    match: [
      /^\/(?:صورة|image|img)\b/i,
      /\b(انشئ|أنشئ|اصنع|ولّد|ولد|اعمل|ارسم|صمم|generate|create|make|draw|design)\b.*\b(صور[ةه]?|image|picture|photo|illustration|logo|شعار|بوستر|poster|thumbnail)\b/i,
      /\b(صور[ةه]?|logo|شعار)\b.*\b(انشئ|أنشئ|اصنع|ولّد|صمم|generate|create|make|draw)\b/i,
    ],
    cleanPrompt: (raw) => strip(raw, /^\/(?:صورة|image|img)\s*/i),
  },
  {
    id: "tts",
    kind: "audio",
    siteName: "HN AI Studio",
    siteUrl: "https://ai.hn-groupe.org",
    labelAr: "تحويل النص إلى صوت",
    labelEn: "Text-to-speech",
    emoji: "🔊",
    match: [
      /^\/(?:صوت|نطق|tts|speak)\b/i,
      /\bحو[لّ]?\b.*\b(?:الى|إلى|to)\b.*\bصوت\b/i,
      /\bاقرأ|اقرا|انطق|قل\b.*\bبصوت\b/i,
      /\b(text[-\s]?to[-\s]?speech|read\s+aloud|say\s+this|voice\s+over)\b/i,
      /\bنص\s+الى\s+صوت\b/i,
    ],
    cleanPrompt: (raw) =>
      strip(raw, /^\/(?:صوت|نطق|tts|speak)\s*/i)
        .replace(/^\s*(?:حو[لّ]?|اقرأ|اقرا|انطق|قل|read\s+aloud|say)\s*/i, "")
        .replace(/^\s*(?:هذا\s+النص|النص\s+التالي|the\s+following|this\s+text)\s*[:：-]?\s*/i, ""),
  },
  {
    id: "site",
    kind: "html",
    siteName: "HN Site Builder",
    siteUrl: "https://site.hn-groupe.tech",
    labelAr: "تصميم موقع",
    labelEn: "Site design",
    emoji: "🧱",
    match: [
      /^\/(?:موقع|site)\b/i,
      /\b(صمم|أنشئ|انشئ|اصنع|اعمل|ابن[ي]?|build|create|design|make)\b.*\b(موقع|صفح[ةه]|landing|website|site|page)\b/i,
      /\b(موقع|صفح[ةه]|landing|website)\b.*\b(صمم|أنشئ|انشئ|صمّم|design|build|create)\b/i,
    ],
    cleanPrompt: (raw) => strip(raw, /^\/(?:موقع|site)\s*/i),
  },
  {
    id: "video",
    kind: "text",
    siteName: "HN Video Studio",
    siteUrl: "https://studio.hn-createur.com",
    labelAr: "إنتاج فيديو",
    labelEn: "Video production",
    emoji: "🎬",
    match: [
      /^\/(?:فيديو|فديو|video|vid)\b/i,
      /\b(انشئ|أنشئ|اصنع|ولّد|اعمل|generate|create|make|produce)\b.*\b(فيديو|فديو|video|clip|film|فلم|movie|مقطع)\b/i,
    ],
    cleanPrompt: (raw) => strip(raw, /^\/(?:فيديو|فديو|video|vid)\s*/i),
  },
  {
    id: "cv",
    kind: "text",
    siteName: "BuildCV AI",
    siteUrl: "https://buildcv-ai.online",
    labelAr: "بناء سيرة ذاتية",
    labelEn: "CV builder",
    emoji: "📄",
    match: [
      /^\/(?:cv|سيرة|resume)\b/i,
      /\b(انشئ|أنشئ|اصنع|اعمل|صمم|build|create|make)\b.*\b(cv|سيرة\s*ذاتيه?|resume|curriculum)\b/i,
    ],
    cleanPrompt: (raw) => strip(raw, /^\/(?:cv|سيرة|resume)\s*/i),
  },
];

export function detectExecutor(raw: string): { def: ExecutorDef; prompt: string } | null {
  for (const def of EXECUTORS) {
    if (def.match.some((re) => re.test(raw))) {
      const prompt = (def.cleanPrompt ? def.cleanPrompt(raw) : raw).trim();
      return { def, prompt };
    }
  }
  return null;
}

/** Header line the assistant posts before running the job. */
export function runningHeader(def: ExecutorDef, prompt: string, lang: "ar" | "en"): string {
  const isAr = lang === "ar";
  const title = isAr ? def.labelAr : def.labelEn;
  const via = isAr ? "يعمل الآن عبر" : "Running via";
  const p = prompt ? `\n\n**${isAr ? "الطلب" : "Prompt"}:** ${prompt}` : "";
  return `${def.emoji} **${title}** — ⏳ ${via} [${def.siteName}](${def.siteUrl})${p}`;
}

export function stamp(def: ExecutorDef, lang: "ar" | "en"): string {
  const isAr = lang === "ar";
  return isAr
    ? `\n\n> ✅ نُفِّذ عبر [${def.siteName}](${def.siteUrl}) — منظومة HN.`
    : `\n\n> ✅ Executed via [${def.siteName}](${def.siteUrl}) — HN ecosystem.`;
}
