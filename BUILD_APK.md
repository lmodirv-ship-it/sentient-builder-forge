# 📱 نواة — بناء أول APK يعمل أوفلاين

## الطريقة الأسهل (بدون Android Studio): PWA → APK

بعد النشر من زر **Publish** في Lovable:
1. افتح الرابط المنشور على هاتف أندرويد بمتصفح Chrome.
2. Chrome سيقترح **«تثبيت التطبيق»** أو من القائمة (⋮) → «إضافة إلى الشاشة الرئيسية».
3. سيُنشأ اختصار حقيقي مع أيقونة نواة، ويعمل **أوفلاين** بعد أول فتحة (Service Worker يحفظ الواجهة والذاكرة محلياً).

> ملاحظة: ميزات الذكاء الاصطناعي (المحادثة، OCR، الترجمة) تحتاج إنترنت. لكن الذاكرة، الملاحظات، البحث، ورفع الملفات — كل ذلك يعمل بدون إنترنت.

---

## بناء ملف APK حقيقي (Capacitor + Android Studio)

على حاسوبك:

```bash
# 1) استخرج ZIP المشروع (أو حمّله من Lovable → GitHub)
cd nawat
npm install

# 2) ابنِ نسخة الإنتاج
npm run build

# 3) أضف Capacitor Android
npm install @capacitor/core @capacitor/android
npm install --save-dev @capacitor/cli
npx cap add android
npx cap sync android

# 4) افتح في Android Studio
npx cap open android
# داخل Android Studio: Build → Build APK(s)
```

الملف الناتج: `android/app/build/outputs/apk/debug/app-debug.apk`

### إعدادات الأوفلاين

في `capacitor.config.ts` — لتشغيل التطبيق **بالكامل من داخل الهاتف** بدون إنترنت:
- احذف السطر `url: "https://..."` من `server`.
- اترك `webDir: "dist"` كما هو.
- شغّل `npm run build` ثم `npx cap sync android`.

الآن التطبيق سيحمل الواجهة من الهاتف مباشرة، ويحتاج إنترنت فقط عند استخدام الذكاء الاصطناعي.

---

## نصائح مهمة
- **الذاكرة محلية**: كل بياناتك في `localStorage`. لا تُمسح إلا لو ألغيت التطبيق.
- **نسخة احتياطية**: من تبويب «الذاكرة» → زر **تصدير JSON** → احفظ الملف على Google Drive.
- **حفظ خارجي**: من نفس التبويب → **«اختر مجلداً على الحاسوب»** لحفظ نسخة تلقائية.
