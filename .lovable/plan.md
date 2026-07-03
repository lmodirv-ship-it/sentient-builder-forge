
## الهدف
جعل النواة (Nawat) تتحدث مع منظومة مواقع HN عبر ثلاث ركائز رسمية:

- **TVCC — `hn-driver.online`** → مرجع إثبات الملكية والهوية الموحّدة (Identity / Trust Anchor).
- **HN-DB — `hn-groupe.org`** → قاعدة البيانات المركزية للمنظومة (Data Layer).
- **HN-Cloud — `hn-groupe.site`** → التخزين السحابي على VPS الخاص (Files Layer).

كل مواقع HN الأخرى (Driver, Clinic, CV, AI, Video, Store…) تُعامَل كـ **عملاء** لهذه الثلاثة.

---

## المرحلة 1 — تسجيل الركائز الثلاث كمواطن أولى في ذاكرة النواة

في `src/lib/hn-ecosystem.ts`:
- إضافة/تحديث ثلاثة مشاريع بأدوار خاصة: `trust-anchor` (TVCC)، `data-core` (HN-DB)، `files-core` (HN-Cloud).
- إضافة حقل جديد `role?: "trust-anchor" | "data-core" | "files-core" | "app"` على `HNProject`.
- كل موقع في المنظومة يشير إلى `ownedBy: "tvcc"`, `dataOn: "hn-db"`, `filesOn: "hn-cloud"` (قيم افتراضية على مستوى المشروع).

في `src/lib/nawat-sites-memory.ts`:
- بطاقة كل مشروع تعرض صراحةً: "الملكية مُثبتة عبر TVCC · البيانات على HN-DB · الملفات على HN-Cloud".
- إضافة بطاقة "🏛️ البنية التحتية لـ HN" ثابتة في الذاكرة الأساسية (`tier: "core"`).

---

## المرحلة 2 — طبقة ربط موحّدة (`hn-bridge`)

ملف جديد `src/lib/hn-bridge.ts` (كود عميل + خادم) يوفّر واجهة موحّدة:

```
hnBridge.identity.verify(siteId)     → عبر TVCC
hnBridge.db.query(project, table, …) → عبر HN-DB
hnBridge.cloud.list/get/put(path)    → عبر HN-Cloud
hnBridge.openService(siteId, ctx)    → Deep-link مع تمرير السياق
```

في هذه المرحلة نبني الطبقة كـ **Adapter محلي** (يعيد بيانات وهمية/بطاقات + روابط deep-link) حتى لا نحتاج مفاتيح API فعلية الآن. الكود جاهز لتبديل الـ adapter لاحقاً بمكالمات حقيقية إلى endpoints HN-DB / HN-Cloud.

مبرر: يسمح للنواة أن "تتصرف" وكأنها متصلة، ويعطي المستخدم فوراً روابط تفتح الخدمة الصحيحة مع تمرير السؤال/السياق.

---

## المرحلة 3 — Router ذكي داخل الشات

توسيع `src/lib/nawat-sites-router.ts` + `src/routes/index.tsx`:
- عند سؤال يخص خدمة (رحلة، فاتورة، موعد…) النواة تُرجع:
  1. بطاقة الموقع من ذاكرتها.
  2. زر **"افتح الخدمة في HN"** (deep-link عبر `hnBridge.openService`).
  3. سطر "📂 الملفات المرتبطة على HN-Cloud" و "🗄️ البيانات على HN-DB" (روابط استعراض مباشرة).
  4. شارة "✅ مُوثَّق عبر TVCC".
- أوامر جديدة:
  - `/ثقة` → يعرض شهادة TVCC للمنظومة.
  - `/بيانات <مشروع>` → يفتح HN-DB على نطاق المشروع.
  - `/ملفات <مشروع>` → يفتح HN-Cloud على مجلد المشروع.

---

## المرحلة 4 — تحديث بروموت النواة

في `src/lib/nawat-ai.functions.ts`:
- إضافة قاعدة في system prompt: كل جواب يخص خدمة يذكر مصدر البيانات (HN-DB)، مصدر الملفات (HN-Cloud)، ومرجع الملكية (TVCC).
- ممنوع اقتراح Google Drive / Dropbox / أي DB خارجية — البديل دائماً HN-Cloud / HN-DB.

---

## المرحلة 5 — بطاقة "حالة المنظومة" في واجهة النواة

مكوّن صغير في الهيدر (سطح المكتب فقط، مخفي على الجوال حسب قاعدتك الحالية):
- 🟢 TVCC · 🟢 HN-DB · 🟢 HN-Cloud
- نقرة على أي منها → تفتح الموقع الرسمي.

---

## ملاحظة تقنية
- لا حاجة لأي مفتاح سري في هذه المراحل — كلها روابط موقّعة + adapter محلي.
- **الربط الفعلي بـ API HN-DB / HN-Cloud** (قراءة/كتابة حقيقية) يحتاج endpoints + توكن. سأطلبها فقط عند الوصول للمرحلة التي تحتاجها، ولن أطلب أي شيء الآن.

---

## المخرجات بعد التنفيذ
- ملفات جديدة/معدّلة: `hn-ecosystem.ts`, `nawat-sites-memory.ts`, `hn-bridge.ts` (جديد), `nawat-sites-router.ts`, `nawat-ai.functions.ts`, `routes/index.tsx`, مكوّن `HNStatusPill.tsx` (جديد).
- تجربة المستخدم: كل سؤال عن خدمة HN → جواب موحّد فيه (بطاقة + زر فتح + مصدر بيانات + مصدر ملفات + ختم ملكية).
