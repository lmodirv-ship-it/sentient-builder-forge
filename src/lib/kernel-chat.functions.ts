import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * نواة المساعد الذكي — طبقة القوالب.
 * تجيب على الأسئلة المعروفة مباشرة من جدول `templates` (صفحة القوالب في لوحة التحكم)
 * قبل أي استدعاء لخدمة HN AI، مع رسائل ترحيب/تعريف مدمجة كاحتياط.
 */

/** تطبيع عربي: إزالة التشكيل وتوحيد الهمزات والتاء المربوطة وعلامات الترقيم. */
function normAr(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // تشكيل + تطويل
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u0621-\u064A]*\s؟?$/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toks(s: string): string[] {
  return normAr(s).split(" ").filter((t) => t.length > 1);
}

/** الجواب حروف فقط: يزيل الرموز وعلامات الترقيم والإيموجي ويبقي الحروف والأرقام والمسافات. */
function lettersOnly(s: string): string {
  return (s || "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const AR_GREETING = `مرحبا انا نواة المساعد الذكي كيف اخدمك

للإنشاء اكتب طلبك مباشرة مثل صمم لي موقع أو حوّل هذا النص إلى صوت أو أنشئ صورة أو اصنع فيديو أو سيرة ذاتية والنواة ترسل طلبك لخدمة HN المناسبة وتعيد لك النتيجة مع أزرار تقييم على كل عملية لتتعلّم النواة وتتحسّن

لوحة التحكم زر أسفل الشاشة لك كمالك وتضم نظرة عامة والمستخدمين وخدمات HN والإعدادات والسجلات والقوالب والنواة

أوامر سريعة مواقع وابحث كلمة وموقع اسم وخدمة اسم`;

const EN_GREETING = `Hello I am the Nawat Smart Assistant Core how can I help you

To create just type your request like design a site or turn this text into speech or create an image or make a video or build a CV and the core routes it to the matching HN service and returns the result with rating buttons so the core keeps learning

The control panel button at the bottom of the screen for the owner only with overview users HN services settings logs templates and core

Quick commands sites search word site name service name`;

const IDENTITY_AR = "اسمي نواة المساعد الذكي العقل المركزي لمنظومة HN";
const IDENTITY_EN = "My name is the Nawat Smart Assistant Core the central brain of the HN ecosystem";

/** رسائل مدمجة تُستعمل فقط إن لم يجد جدول القوالب جواباً. */
const BUILTIN: Array<{ re: RegExp; ar: string; en: string }> = [
  {
    // ترحيب قصير (أقل من 6 كلمات حتى لا يختطف طلبات حقيقية)
    re: /^(مرحبا|مرحبتين|السلام|سلام|اهلا|هلا|هاي|صباح|مساء|hello|hi|hey|salut|bonjour)\b.*/i,
    ar: AR_GREETING,
    en: EN_GREETING,
  },
  {
    re: /(كيف\s*(اخدمك|استخدمك|اتعامل معك|تخدمني))|(وش\s*تسوي)|(what\s*can\s*you\s*do)|(how\s*(do\s*i\s*use|can\s*i\s*use)\s*you)/i,
    ar: AR_GREETING,
    en: EN_GREETING,
  },
  {
    re: /(من\s*انت|ما\s*انت|ما\s*هوية|who\s*are\s*you|what\s*are\s*you)/i,
    ar: IDENTITY_AR,
    en: IDENTITY_EN,
  },
];

export const kernelTemplateAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ question: z.string().min(1).max(500), lang: z.enum(["ar", "en"]).default("ar") }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const isAr = data.lang === "ar";
    const q = normAr(data.question);
    const qTokens = toks(data.question);
    if (!q) return { matched: false as const };

    // 1) جدول القوالب أولاً — المالك يعدّل الأجوبة من صفحة «القوالب» فتتغير استجابة النواة فوراً.
    const { data: rows, error } = await context.supabase
      .from("templates")
      .select("code, title, body")
      .eq("archived", false)
      .limit(300);
    if (!error && rows?.length) {
      let best: { code: string; body: string; score: number } | null = null;
      for (const r of rows) {
        const nt = normAr(r.title ?? "");
        if (!nt) continue;
        let score = 0;
        if (nt === q) score = 100;
        else {
          const tTokens = toks(r.title ?? "");
          if (tTokens.length) {
            const tSet = new Set(tTokens);
            const overlap = qTokens.filter((t) => tSet.has(t)).length;
            score = Math.round((overlap / Math.max(qTokens.length, tTokens.length)) * 100);
          }
        }
        if (score >= 70 && (!best || score > best.score)) {
          best = { code: r.code ?? "", body: r.body ?? "", score };
        }
      }
      if (best?.body?.trim()) {
        return { matched: true as const, source: "template" as const, code: best.code, text: lettersOnly(best.body) };
      }
    }

    // 2) رسائل مدمجة (ترحيب/تعريف) — فقط للرسائل القصيرة كي لا تختطف الطلبات الحقيقية.
    const wordCount = qTokens.length;
    if (wordCount <= 6) {
      for (const b of BUILTIN) {
        if (b.re.test(q)) return { matched: true as const, source: "builtin" as const, text: isAr ? b.ar : b.en };
      }
    }

    return { matched: false as const };
  });
