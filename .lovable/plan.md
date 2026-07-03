# نسخة Windows جاهزة للتشغيل + حقن HN

الهدف: ملف مضغوط `Nawat-Windows.zip` فيه `Nawat.exe` تشغّله مباشرة على ويندوز بدون أي بناء أو تنصيب.

## المرحلة أ — حقن مصادر HN (شرط لعمل الـ exe فعلياً)

1. `src/data/hn-manifest.json` — كامل المانيفست (152 موقع / 27 مشروع / `HN_API_KEY` موحّد).
2. `src/lib/hn-manifest.ts` — Helpers: `resolveUrl` · `resolveKey` · `projectsByCapability` · `bestUrlFor`.
3. توحيد `hn-clients.server.ts` ليقرأ من المانيفست.
4. حذف كل Fallback خارجي من كل الدوال (`nawat-image/tts/site/cv/video/ai/ocr/transcribe/query-expand`) — HN فقط. عند الفشل: بطاقة "افتح على HN".
5. `HNStatusPill` + صفحة `/hn` تعرض الحالة الحقيقية لكل خدمة.
6. تحديث الدستور: "HN مصدر حصري".

## المرحلة ب — بناء exe جاهز

1. تثبيت أدوات التحزيم في الصندوق: `bun add -d electron @electron/packager`.
2. ضبط `vite.config.ts` (`base: './'`) و`package.json` (`main: electron/main.cjs`).
3. `bunx vite build` ثم:
   ```bash
   npx @electron/packager . "Nawat" \
     --platform=win32 --arch=x64 \
     --out=/tmp/electron-release --overwrite \
     --ignore='node_modules' --ignore='^/src' \
     --ignore='^/public' --ignore='^/electron-release'
   ```
4. ضغط الناتج مباشرة إلى `/mnt/documents/Nawat-Windows.zip` (يحتوي مجلد فيه `Nawat.exe` وكل ملفات Electron).
5. تضمين `.env.example` بجانب `Nawat.exe` مع `HN_API_KEY=` والمتغيرات الاختيارية لكل مشروع.
6. تسليم الملف عبر `<presentation-artifact>` — يظهر لك زر تنزيل مباشر.

### طريقة الاستخدام على ويندوز
- فك الضغط.
- (اختياري) ضع `HN_API_KEY` في ملف `.env` بجوار `Nawat.exe`.
- انقر مزدوجاً على `Nawat.exe` — يفتح التطبيق فوراً بدون تنصيب.

### قيود واقعية (شفافية)
- لا يمكن إصدار `.exe` installer موقّع رقمياً داخل هذا الصندوق (يحتاج `electron-builder` + توقيع Windows).
- الحل المُقدّم: مجلد Portable فيه `Nawat.exe` يعمل مباشرة — لا تنصيب، لا Admin.
- الحجم المتوقع: ~180–220 ميغا (Electron runtime مضمّن).

## معايير القبول
1. `Nawat-Windows.zip` موجود على `/mnt/documents/` مع زر تنزيل.
2. فك الضغط على ويندوز + نقرة مزدوجة = التطبيق يفتح.
3. كل خدمة تمر عبر مانيفست HN.
4. `rg "ai.gateway.lovable.dev" src/` = 0.

سأنفذ المرحلتين تلقائياً في تحويلة واحدة عند الموافقة.
