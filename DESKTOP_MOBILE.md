# 📦 نواة — بناء APK و EXE

تم إعداد ٣ طرق للتوزيع. اختر ما يناسبك:

---

## 1️⃣ PWA — التثبيت الفوري (الأسهل، يعمل على الكل)

✅ **مفعّل تلقائياً.** بعد النشر:

- **Android (Chrome):** افتح الموقع → القائمة (⋮) → «إضافة إلى الشاشة الرئيسية» → يُثبَّت كتطبيق حقيقي (يشبه APK).
- **iOS (Safari):** زر المشاركة → «إضافة إلى الشاشة الرئيسية».
- **Windows / Mac / Linux (Chrome/Edge):** أيقونة التثبيت في شريط العنوان → «تثبيت نواة».

لا حاجة لمتجر تطبيقات. التحديثات فورية.

---

## 2️⃣ EXE — ملف ويندوز مستقل (Electron)

شغّل محلياً على جهازك:

```bash
# تثبيت
npm install --save-dev electron @electron/packager

# بناء EXE لويندوز
npx @electron/packager . "Nawat" \
  --platform=win32 --arch=x64 \
  --out=electron-release --overwrite \
  --icon=public/icon-512.png

# سيُنشأ: electron-release/Nawat-win32-x64/Nawat.exe
```

للينكس: `--platform=linux` • للماك: `--platform=darwin`

يفتح التطبيق المنشور داخل نافذة سطح مكتب. لتغيير الرابط، عيّن `NAWAT_URL`.

---

## 3️⃣ APK — تطبيق أندرويد أصلي (Capacitor)

يحتاج Android Studio على جهازك:

```bash
# تثبيت
npm install --save-dev @capacitor/cli
npm install @capacitor/core @capacitor/android

# توليد مشروع Android
npx cap add android
npx cap sync android

# فتح في Android Studio لبناء APK
npx cap open android
# داخل Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
```

سيُنشأ ملف `app-debug.apk` داخل `android/app/build/outputs/apk/debug/`.

للنشر على Google Play: `Build → Generate Signed Bundle / APK`.

---

## ملفات الإعداد المُنشأة

| الملف | الغرض |
|---|---|
| `public/manifest.webmanifest` | PWA manifest |
| `public/icon-{192,512}.png` | أيقونات التطبيق |
| `electron/main.cjs` | نقطة دخول Electron |
| `capacitor.config.ts` | إعداد Capacitor للأندرويد/iOS |
