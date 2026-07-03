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

// Arabic verbs (creation) and English equivalents.
const AR_CREATE = "(?:انشئ|أنشئ|اصنع|ولّد|ولد|اعمل|ارسم|صمم|صمّم|حو[لّ]?|اقرأ|اقرا|انطق|قل|ابن[ي]?)";
const EN_CREATE = "\\b(?:generate|create|make|draw|design|build|produce|render|convert)\\b";
const AR_IMAGE = "(?:صور[ةه]?|شعار|بوستر|رسم|رسمة)";
const EN_IMAGE = "\\b(?:image|picture|photo|illustration|logo|poster|thumbnail|drawing)\\b";
const AR_VIDEO = "(?:فيديو|فديو|فلم|مقطع)";
const EN_VIDEO = "\\b(?:video|clip|film|movie)\\b";
const AR_SITE = "(?:موقع|صفح[ةه]|واجه[ةه])";
const EN_SITE = "\\b(?:site|website|landing|page|webpage)\\b";
const AR_CV = "(?:سيرة\\s*ذاتيه?|سيره\\s*ذاتيه?|السيرة)";
const EN_CV = "\\b(?:cv|resume|curriculum)\\b";

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
      new RegExp(`${AR_CREATE}.{0,30}${AR_IMAGE}`, "i"),
      new RegExp(`${AR_IMAGE}.{0,30}${AR_CREATE}`, "i"),
      new RegExp(`${EN_CREATE}.{0,30}${EN_IMAGE}`, "i"),
      new RegExp(`${EN_IMAGE}.{0,30}${EN_CREATE}`, "i"),
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
      /حو[لّ]?.{0,20}(?:الى|إلى|to).{0,20}صوت/i,
      /(?:اقرأ|اقرا|انطق|قل).{0,30}بصوت/i,
      /نص\s*(?:الى|إلى)\s*صوت/i,
      /\b(?:text[-\s]?to[-\s]?speech|read\s+aloud|say\s+this|voice\s+over)\b/i,
    ],
    cleanPrompt: (raw) =>
      strip(raw, /^\/(?:صوت|نطق|tts|speak)\s*/i)
        .replace(/^\s*(?:حو[لّ]?|اقرأ|اقرا|انطق|قل|read\s+aloud|say)\s*/i, "")
        .replace(/^\s*(?:هذا\s+النص|النص\s+التالي|the\s+following|this\s+text)\s*[:：-]?\s*/i, "")
        .replace(/\s*(?:الى|إلى|to)\s*صوت\s*/i, ""),
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
      new RegExp(`${AR_CREATE}.{0,30}${AR_SITE}`, "i"),
      new RegExp(`${AR_SITE}.{0,30}${AR_CREATE}`, "i"),
      new RegExp(`${EN_CREATE}.{0,30}${EN_SITE}`, "i"),
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
      new RegExp(`${AR_CREATE}.{0,30}${AR_VIDEO}`, "i"),
      new RegExp(`${EN_CREATE}.{0,30}${EN_VIDEO}`, "i"),
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
      new RegExp(`${AR_CREATE}.{0,30}${AR_CV}`, "i"),
      new RegExp(`${EN_CREATE}.{0,30}${EN_CV}`, "i"),
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

/**
 * Extract the actual subject/topic from the user's phrase by stripping
 * creation verbs, category nouns, and connector words. Used to detect
 * when the user gave a command without specifying WHAT to create.
 */
export function extractSubject(def: ExecutorDef, raw: string): string {
  const categoryNoun: Record<ExecutorId, RegExp> = {
    image: /(?:صور[ةه]?|شعار|بوستر|رسم|رسمة|image|picture|photo|illustration|logo|poster|thumbnail|drawing)/gi,
    tts: /(?:صوت|voice|audio|speech)/gi,
    site: /(?:موقع|صفح[ةه]|واجه[ةه]|site|website|landing|page|webpage)/gi,
    video: /(?:فيديو|فديو|فلم|مقطع|video|clip|film|movie)/gi,
    cv: /(?:سيرة\s*ذاتيه?|سيره\s*ذاتيه?|السيرة|cv|resume|curriculum(?:\s*vitae)?)/gi,
    content: /(?:محتوى|مقال|content|article)/gi,
  };
  const verbs = /(?:انشئ|أنشئ|اصنع|ولّد|ولد|اعمل|ارسم|صمم|صمّم|حو[لّ]?|اقرأ|اقرا|انطق|قل|ابن[ي]?|generate|create|make|draw|design|build|produce|render|convert)/gi;
  const connectors = /(?:^|\s)(?:لي|لنا|لك|لهم|من\s*فضلك|رجاءً?|رجاء|please|for\s+me|for\s+us|a|an|the|new|جديد[ةه]?|واحد[ةه]?|about|عن|حول)(?=\s|$)/gi;
  let s = raw
    .replace(/^\/\S+\s*/i, "")
    .replace(categoryNoun[def.id] || /(?!)/g, " ")
    .replace(verbs, " ")
    .replace(connectors, " ")
    .replace(/[.,،!؟?:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

/** Ask the user for the missing subject in a friendly way. */
export function subjectPrompt(def: ExecutorDef, lang: "ar" | "en"): string {
  const isAr = lang === "ar";
  const asks: Record<ExecutorId, [string, string]> = {
    image: ["🖼️ ما موضوع الصورة التي تريدها؟ (مثال: «جبل عند الغروب»، «شعار لمقهى»…)", "🖼️ What should the image be about? (e.g. \"a mountain at sunset\", \"a café logo\")"],
    tts: ["🔊 ما النص الذي أُحوّله إلى صوت؟ الصق النص كاملاً من فضلك.", "🔊 What text should I turn into speech? Please paste the full text."],
    site: ["🧱 صف الموقع الذي تريده: الفكرة، الجمهور، الأقسام، والألوان إن أحببت.", "🧱 Describe the site: idea, audience, sections, and colors if you like."],
    video: ["🎬 صف الفيديو: الموضوع، المدة، النبرة، واللغة.", "🎬 Describe the video: topic, duration, tone, language."],
    cv: ["📄 من فضلك أعطني: الاسم، الوظيفة المستهدفة، الخبرات، والمهارات.", "📄 Please share: name, target role, experience, and skills."],
    content: ["✍️ ما موضوع المحتوى ونوعه (منشور، مقال، وصف…)؟", "✍️ What's the topic and type (post, article, description…)?"],
  };
  return isAr ? asks[def.id][0] : asks[def.id][1];
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
