// 100 expected Q&A about the user's HN sites — loaded as long-term memory.
// Each pair becomes a searchable Doc so Nawat can answer directly from memory.
import type { Doc } from "./nawat-search";
import { SITE_CATEGORIES, allSites } from "./nawat-sites";

type QA = { q: string; a: string; tags?: string[] };

function fmtList(urls: string[]) {
  return urls.map(u => `• ${u}`).join("\n");
}

function build(): QA[] {
  const all = allSites();
  const byKey = Object.fromEntries(SITE_CATEGORIES.map(c => [c.key, c]));
  const cat = (k: string) => byKey[k];

  const qa: QA[] = [];

  // ─── عام (1-15) ─────────────────────────────────────────────
  qa.push({ q: "ما هي مواقعي؟", a: `لديك ${all.length} موقعاً موزّعة على ${SITE_CATEGORIES.length} تصنيفاً. القائمة الكاملة محفوظة تحت وسم «مواقعي» في الذاكرة (tier: core).`, tags: ["عام"] });
  qa.push({ q: "كم عدد مواقعي؟", a: `${all.length} موقع (بما فيها نسخ www).`, tags: ["عام", "عدد"] });
  qa.push({ q: "كم عدد تصنيفات مواقعي؟", a: `${SITE_CATEGORIES.length} تصنيفاً: ${SITE_CATEGORIES.map(c => `${c.emoji} ${c.ar}`).join(" · ")}.`, tags: ["عام", "تصنيف"] });
  qa.push({ q: "اعرض لي كل مواقعي", a: `كل المواقع (${all.length}):\n${fmtList(all)}`, tags: ["عام", "قائمة"] });
  qa.push({ q: "ما هي التصنيفات الرئيسية؟", a: SITE_CATEGORIES.map(c => `${c.emoji} ${c.ar} — ${c.en} (${c.urls.length})`).join("\n"), tags: ["عام", "تصنيف"] });
  qa.push({ q: "ما هو أكبر تصنيف لديّ؟", a: (() => { const s = [...SITE_CATEGORIES].sort((a,b)=>b.urls.length-a.urls.length)[0]; return `${s.emoji} ${s.ar} بـ ${s.urls.length} موقعاً.`; })(), tags: ["عام", "إحصاء"] });
  qa.push({ q: "ما هو أصغر تصنيف لديّ؟", a: (() => { const s = [...SITE_CATEGORIES].sort((a,b)=>a.urls.length-b.urls.length)[0]; return `${s.emoji} ${s.ar} بـ ${s.urls.length} موقع/مواقع.`; })(), tags: ["عام", "إحصاء"] });
  qa.push({ q: "كم عدد النطاقات الأساسية (بدون www)؟", a: `${all.filter(u => !u.includes("://www.")).length} نطاق أساسي.`, tags: ["عام", "إحصاء"] });
  qa.push({ q: "كم عدد نسخ www لدي؟", a: `${all.filter(u => u.includes("://www.")).length} نسخة www.`, tags: ["عام", "إحصاء"] });
  qa.push({ q: "ما امتدادات النطاقات المستخدمة؟", a: (() => { const ext = new Map<string, number>(); all.forEach(u => { const m = u.match(/\.([a-z]+)$/); if (m) ext.set(m[1], (ext.get(m[1])||0)+1); }); return [...ext.entries()].sort((a,b)=>b[1]-a[1]).map(([e,n]) => `.${e} (${n})`).join(" · "); })(), tags: ["عام", "نطاق"] });
  qa.push({ q: "هل لديّ نطاق .com؟", a: `نعم، ${all.filter(u => u.endsWith(".com")).length} نطاق ينتهي بـ .com.`, tags: ["نطاق"] });
  qa.push({ q: "ما هي نطاقات .online؟", a: fmtList(all.filter(u => u.endsWith(".online"))), tags: ["نطاق"] });
  qa.push({ q: "ما هي نطاقات .site؟", a: fmtList(all.filter(u => u.endsWith(".site"))), tags: ["نطاق"] });
  qa.push({ q: "ما هي نطاقات .fun؟", a: fmtList(all.filter(u => u.endsWith(".fun"))), tags: ["نطاق"] });
  qa.push({ q: "ما هي نطاقات .tech؟", a: fmtList(all.filter(u => u.endsWith(".tech"))), tags: ["نطاق"] });

  // ─── نقل وسائقين (16-25) ─────────────────────────────────────
  const T = cat("transport");
  qa.push({ q: "ما هي مواقع النقل والسائقين؟", a: `${T.emoji} ${T.ar} — ${T.urls.length} موقعاً:\n${fmtList(T.urls)}`, tags: ["نقل"] });
  qa.push({ q: "كم موقعاً لديّ في قطاع النقل؟", a: `${T.urls.length} موقع.`, tags: ["نقل", "إحصاء"] });
  qa.push({ q: "ما هو موقع السائق الرئيسي؟", a: `https://driver.hn-driver.com و https://driver.hndriver.company هما لوحتا السائق.`, tags: ["نقل", "سائق"] });
  qa.push({ q: "أين لوحة إدارة النقل؟", a: `https://admin.hn-driver.com و https://admin.hndriver.company.`, tags: ["نقل", "إدارة"] });
  qa.push({ q: "أين لوحة العميل في النقل؟", a: `https://client.hn-driver.com و https://client.hndriver.company.`, tags: ["نقل", "عميل"] });
  qa.push({ q: "أين موقع التوصيل (Delivery)؟", a: `https://delivery.hn-driver.com و https://delivery.hndriver.company.`, tags: ["نقل", "توصيل"] });
  qa.push({ q: "أين مركز الاتصال للنقل؟", a: `https://callcentre.hn-driver.com و https://call.hndriver.company.`, tags: ["نقل", "كول-سنتر"] });
  qa.push({ q: "ما هو موقع Ride؟", a: `https://ride.hn-driver.com — منصة الركوب.`, tags: ["نقل"] });
  qa.push({ q: "ما وظيفة super.hn-driver.com؟", a: `https://super.hn-driver.com — لوحة السوبر أدمن لمنظومة النقل.`, tags: ["نقل", "إدارة"] });
  qa.push({ q: "ما هو stouk.hn-driver.com؟", a: `https://stouk.hn-driver.com — إدارة مخزون أو أسطول ضمن منظومة النقل.`, tags: ["نقل", "مخزون"] });

  // ─── مغسلة وطباعة (26-35) ────────────────────────────────────
  const W = cat("carwash-print");
  qa.push({ q: "ما هي مواقع المغسلة والطباعة؟", a: `${W.emoji} ${W.ar} — ${W.urls.length} موقعاً:\n${fmtList(W.urls)}`, tags: ["مغسلة", "طباعة"] });
  qa.push({ q: "ما هي مواقع كارواش؟", a: fmtList(W.urls.filter(u => /carwash|lavage|slavacall|slava/i.test(u))), tags: ["مغسلة", "كارواش"] });
  qa.push({ q: "ما هو carwashpro.com؟", a: `https://carwashpro.com — الموقع الرئيسي لخدمة كارواش برو.`, tags: ["مغسلة"] });
  qa.push({ q: "ما هو lavagenizar.com؟", a: `https://lavagenizar.com — منصة غسيل السيارات (طنجة).`, tags: ["مغسلة"] });
  qa.push({ q: "ما هي مواقع الطباعة لديّ؟", a: fmtList(W.urls.filter(u => /tanjaprint/i.test(u))), tags: ["طباعة"] });
  qa.push({ q: "ما هو tanjaprint؟", a: `https://tanjaprint.com و https://tanjaprint.online — خدمة الطباعة (طنجة).`, tags: ["طباعة"] });
  qa.push({ q: "ما هو slavacall-hiba؟", a: `https://slavacall-hiba.com و https://slavacall-hiba.online — منصة اتصال/حجوزات كارواش (هبة).`, tags: ["مغسلة", "كول-سنتر"] });
  qa.push({ q: "أين API سلافاكول؟", a: `https://api.slavacall-hiba.online — الواجهة البرمجية.`, tags: ["مغسلة", "api"] });
  qa.push({ q: "أين نظام الفوترة؟", a: `https://facturation.hn-createur.com — نظام الفواتير التابع لـ HN Créateur.`, tags: ["فوترة"] });
  qa.push({ q: "كم موقعاً لديّ في المغسلة والطباعة؟", a: `${W.urls.length} موقع.`, tags: ["مغسلة", "إحصاء"] });

  // ─── AI (36-45) ──────────────────────────────────────────────
  const A = cat("ai-chat");
  qa.push({ q: "ما هي مواقع الذكاء الاصطناعي لديّ؟", a: `${A.emoji} ${A.ar} — ${A.urls.length} موقعاً:\n${fmtList(A.urls)}`, tags: ["ai"] });
  qa.push({ q: "أين منصة الدردشة الخاصة بي؟", a: `https://hn-chat.com و https://hnchat.net.`, tags: ["ai", "chat"] });
  qa.push({ q: "ما هي مواقع hn-ai؟", a: fmtList(A.urls.filter(u => /hn-ai/.test(u))), tags: ["ai"] });
  qa.push({ q: "ما وظيفة ai.hn-groupe.org؟", a: `https://ai.hn-groupe.org — بوابة AI الرئيسية للمجموعة.`, tags: ["ai"] });
  qa.push({ q: "ما هو generatin.hn-groupe.org؟", a: `https://generatin.hn-groupe.org — أداة توليد محتوى بالذكاء الاصطناعي.`, tags: ["ai", "توليد"] });
  qa.push({ q: "ما هو ai.hn-db.fun؟", a: `https://ai.hn-db.fun — طبقة AI فوق قاعدة hn-db.`, tags: ["ai", "db"] });
  qa.push({ q: "ما هو hnclinik-ai؟", a: `https://hnclinik-ai.com — عيادة رقمية مدعومة بالذكاء الاصطناعي.`, tags: ["ai", "عيادة"] });
  qa.push({ q: "كم موقع AI أملك؟", a: `${A.urls.length} موقع في تصنيف AI/Chat.`, tags: ["ai", "إحصاء"] });
  qa.push({ q: "ما امتدادات نطاقات hn-ai؟", a: `.online / .pro / .site / .store — أربع نسخ.`, tags: ["ai", "نطاق"] });
  qa.push({ q: "أي موقع أستخدمه للمحادثة العامة؟", a: `الأنسب: https://hn-chat.com (الاسم الأوضح تجارياً).`, tags: ["ai", "chat"] });

  // ─── فيديو/سينما/استوديو (46-55) ─────────────────────────────
  const V = cat("media");
  qa.push({ q: "ما هي مواقع الفيديو والاستوديو؟", a: `${V.emoji} ${V.ar} — ${V.urls.length} موقعاً:\n${fmtList(V.urls)}`, tags: ["ميديا"] });
  qa.push({ q: "ما هي مواقع video لديّ؟", a: fmtList(V.urls.filter(u => /video\./.test(u))), tags: ["فيديو"] });
  qa.push({ q: "ما هي مواقع film؟", a: fmtList(V.urls.filter(u => /film\./.test(u))), tags: ["فيلم"] });
  qa.push({ q: "أين موقع السينما؟", a: `https://cinema.hn-groupe.org.`, tags: ["سينما"] });
  qa.push({ q: "أين الاستوديو؟", a: `https://studio.hn-createur.com و https://studio.hn-groupe.org.`, tags: ["استوديو"] });
  qa.push({ q: "ما الفرق بين video.hn-groupe.org و video.hn-groupe.tech؟", a: `كلاهما منصة فيديو لكن على نطاقين مختلفين (.org للنسخة العامة، .tech للنسخة التقنية) — تُدارَان معاً.`, tags: ["فيديو"] });
  qa.push({ q: "كم موقع ميديا أملك؟", a: `${V.urls.length} موقع.`, tags: ["ميديا", "إحصاء"] });
  qa.push({ q: "أين نسخة video.hn-createur؟", a: `https://video.hn-createur.com — ذراع الفيديو تحت مظلة Créateur.`, tags: ["فيديو"] });
  qa.push({ q: "أين نسخة film.hn-groupe؟", a: `https://film.hn-groupe.net — ذراع السينما تحت المجموعة.`, tags: ["فيلم"] });
  qa.push({ q: "أين نسخة film.hn-createur؟", a: `https://film.hn-createur.com.`, tags: ["فيلم"] });

  // ─── Groupe/Créateur (56-65) ─────────────────────────────────
  const G = cat("groupe-createur");
  qa.push({ q: "ما هي مواقع HN Groupe و Créateur؟", a: `${G.emoji} ${G.ar} — ${G.urls.length} موقعاً:\n${fmtList(G.urls)}`, tags: ["groupe"] });
  qa.push({ q: "ما هي جميع نطاقات hn-groupe؟", a: fmtList(G.urls.filter(u => /hn-groupe\./.test(u))), tags: ["groupe", "نطاق"] });
  qa.push({ q: "ما هي جميع نطاقات goupe-hn (بدون r)؟", a: fmtList(G.urls.filter(u => /goupe-hn\./.test(u))), tags: ["groupe", "نطاق"] });
  qa.push({ q: "لماذا لديّ goupe-hn بدون r؟", a: `للتغطية ضد الأخطاء الإملائية الشائعة (typo-catching) وإعادة توجيهها للنطاق الرسمي.`, tags: ["groupe", "استراتيجية"] });
  qa.push({ q: "ما هو groupe-hn.com؟", a: `https://groupe-hn.com — أحد نطاقات الحماية/التسمية للمجموعة.`, tags: ["groupe"] });
  qa.push({ q: "ما هي مواقع Créateur؟", a: fmtList(G.urls.filter(u => /createur/i.test(u))), tags: ["créateur"] });
  qa.push({ q: "ما هو build.hn-createur؟", a: `https://build.hn-createur.com — بيئة البناء/النشر لمنصات Créateur.`, tags: ["créateur", "بناء"] });
  qa.push({ q: "ما هو cloud.hn-createur؟", a: `https://cloud.hn-createur.com — طبقة الاستضافة السحابية.`, tags: ["créateur", "سحابة"] });
  qa.push({ q: "ما هو db.hn-createur؟", a: `https://db.hn-createur.com — قاعدة البيانات الخاصة بمنصات Créateur.`, tags: ["créateur", "db"] });
  qa.push({ q: "كم نطاقاً ضمن hn-groupe/Créateur؟", a: `${G.urls.length} نطاق (بما فيها امتدادات: .net .org .com .fun .site .tech .pro .online).`, tags: ["groupe", "إحصاء"] });

  // ─── عقارات (66-68) ─────────────────────────────────────────
  const R = cat("realestate");
  qa.push({ q: "ما هي مواقع العقارات؟", a: `${R.emoji} ${R.ar} — ${R.urls.length}:\n${fmtList(R.urls)}`, tags: ["عقارات"] });
  qa.push({ q: "أين موقع HN Immo؟", a: `https://hn-immo.com — منصة العقارات الرئيسية.`, tags: ["عقارات"] });
  qa.push({ q: "ما هو imm.hn-groupe.net؟", a: `https://imm.hn-groupe.net — بوابة عقارية داخل نطاق المجموعة.`, tags: ["عقارات"] });

  // ─── مالية (69-72) ──────────────────────────────────────────
  const F = cat("finance");
  qa.push({ q: "ما هي مواقع المالية والاقتصاد؟", a: `${F.emoji} ${F.ar} — ${F.urls.length}:\n${fmtList(F.urls)}`, tags: ["مالية"] });
  qa.push({ q: "ما هو hiba-eco.com؟", a: `https://hiba-eco.com — منصة اقتصادية (هبة).`, tags: ["مالية"] });
  qa.push({ q: "ما هي مواقع hn-finance؟", a: `https://hn-finance.online و https://hn-finance.site.`, tags: ["مالية"] });
  qa.push({ q: "أين نظام الفواتير المحاسبي؟", a: `https://facturation.hn-createur.com — للفوترة العامة عبر مؤسسات المجموعة.`, tags: ["مالية", "فوترة"] });

  // ─── إسلامي (73-75) ─────────────────────────────────────────
  const I = cat("islamic");
  qa.push({ q: "ما هي مواقع الأذكار؟", a: `${I.emoji} ${I.ar} — ${I.urls.length}:\n${fmtList(I.urls)}`, tags: ["أذكار", "إسلامي"] });
  qa.push({ q: "أين موقع أذكار الرئيسي؟", a: `https://hn-adkhar.life — التطبيق الحيّ للأذكار اليومية.`, tags: ["أذكار"] });
  qa.push({ q: "ما هو adkhar.hn-groupe.net؟", a: `https://adkhar.hn-groupe.net — نسخة داخل نطاق المجموعة.`, tags: ["أذكار"] });

  // ─── DB / Infrastructure (76-85) ─────────────────────────────
  const D = cat("db-infra");
  qa.push({ q: "ما هي مواقع قواعد البيانات والـ APIs؟", a: `${D.emoji} ${D.ar} — ${D.urls.length}:\n${fmtList(D.urls)}`, tags: ["db", "بنية-تحتية"] });
  qa.push({ q: "ما هو hn-db.fun؟", a: `https://hn-db.fun — منصة قاعدة البيانات الرئيسية (النسخة العامة).`, tags: ["db"] });
  qa.push({ q: "ما هو hn-dbpro.com؟", a: `https://hn-dbpro.com — النسخة الاحترافية (Pro) من hn-db.`, tags: ["db", "pro"] });
  qa.push({ q: "أين نقطة المصادقة (Auth)؟", a: `https://auth.hn-db.fun — خدمة المصادقة المركزية.`, tags: ["db", "auth"] });
  qa.push({ q: "أين API قاعدة البيانات؟", a: `https://api.hn-db.fun و https://api.hn-dbpro.com.`, tags: ["db", "api"] });
  qa.push({ q: "أين تخزين الملفات؟", a: `https://files.hn-db.fun — خدمة الملفات.`, tags: ["db", "ملفات"] });
  qa.push({ q: "أين WebSocket؟", a: `https://ws.hn-db.fun — نقطة الـ WebSocket للتحديثات الحيّة.`, tags: ["db", "ws"] });
  qa.push({ q: "أين صفحة الحالة (Status)؟", a: `https://status.hn-db.fun — مراقبة حالة الخدمات.`, tags: ["db", "status"] });
  qa.push({ q: "أين إدارة المستخدمين؟", a: `https://users.hn-db.fun — لوحة إدارة المستخدمين.`, tags: ["db", "users"] });
  qa.push({ q: "ما هو owner.hn-db.fun؟", a: `https://owner.hn-db.fun — لوحة المالك (أعلى صلاحية).`, tags: ["db", "مالك"] });

  // ─── العيادة والمتجر (86-90) ────────────────────────────────
  const CL = cat("clinic");
  const AP = cat("apps");
  qa.push({ q: "ما هي مواقع العيادة؟", a: `${CL.emoji} ${CL.ar} — ${CL.urls.length}:\n${fmtList(CL.urls)}`, tags: ["عيادة"] });
  qa.push({ q: "ما الفرق بين hnclinik و hnclinik-ai؟", a: `hnclinik.hn-groupe.net = النسخة الأساسية، hnclinik-ai.com = النسخة المدعومة بالذكاء الاصطناعي.`, tags: ["عيادة", "ai"] });
  qa.push({ q: "ما هي مواقع المتجر؟", a: `${AP.emoji} ${AP.ar} — ${AP.urls.length}:\n${fmtList(AP.urls)}`, tags: ["متجر"] });
  qa.push({ q: "أين متجر التطبيقات الرئيسي؟", a: `https://hnapps.store.`, tags: ["متجر"] });
  qa.push({ q: "أين متجر المجموعة؟", a: `https://store.hn-groupe.net.`, tags: ["متجر"] });

  // ─── تعلّم / CV / عطاءات (91-97) ─────────────────────────────
  const L = cat("learn-cv-blog");
  qa.push({ q: "ما هي مواقع التعلّم والسيرة الذاتية والعطاءات؟", a: `${L.emoji} ${L.ar} — ${L.urls.length}:\n${fmtList(L.urls)}`, tags: ["تعلم", "cv"] });
  qa.push({ q: "أين منصات التعلّم؟", a: `https://learn.hn-createur.com و https://learn.hn-groupe.tech.`, tags: ["تعلم"] });
  qa.push({ q: "أين موقع السيرة الذاتية؟", a: `https://cv.hn-groupe.org و https://buildcv-ai.online (المدعوم بـ AI).`, tags: ["cv"] });
  qa.push({ q: "أين المدونة؟", a: `https://blog.hn-groupe.org.`, tags: ["مدونة"] });
  qa.push({ q: "أين نظام العطاءات RFP؟", a: `https://rfp.hn-groupe.net.`, tags: ["عطاءات", "rfp"] });
  qa.push({ q: "أين نظام Tender؟", a: `https://tender.hn-groupe.org — إدارة العطاءات الرسمية.`, tags: ["عطاءات"] });
  qa.push({ q: "أين نظام التدقيق (Audit)؟", a: `https://audit.hn-groupe.net.`, tags: ["تدقيق"] });

  // ─── نواة + خاتمة (98-100) ──────────────────────────────────
  qa.push({ q: "أين نواة (Nawat)؟", a: `https://nawat.hn-groupe.net — البوابة الرسمية لنواة، حافظ المعرفة.`, tags: ["nawat"] });
  qa.push({ q: "أي موقع هو الأكثر مركزية في المنظومة؟", a: `https://hn-groupe.net هو النطاق الأم — منه تتفرع معظم الخدمات (adkhar, imm, video, store, rfp, search, hn-db, hnclinik, nawat...).`, tags: ["استراتيجية"] });
  qa.push({ q: "كيف أوسّع قائمة مواقعي في نواة؟", a: `عدّل الملف src/lib/nawat-sites.ts وأضف موقعك تحت التصنيف المناسب، ثم اضغط زر «حدّث فهرس مواقعي» في تبويب الذاكرة.`, tags: ["توسيع", "دليل"] });

  return qa;
}

export function getSitesQADocs(): Doc[] {
  const now = Date.now();
  return build().map((p, i) => ({
    id: `site-qa-${i + 1}`,
    title: `س${i + 1}: ${p.q}`,
    content: `س: ${p.q}\nج: ${p.a}`,
    tags: ["مواقعي-qa", "sites-qa", "faq", ...(p.tags || [])],
    source: "hn-sites-qa",
    createdAt: now + i,
    tier: "long",
  }));
}

export const SITES_QA_COUNT = build().length;
