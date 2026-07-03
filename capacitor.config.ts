import type { CapacitorConfig } from "@capacitor/cli";

// لبناء APK يعمل أوفلاين: شغّل `npm run build` ثم `npx cap sync android`.
// التطبيق سيحمل كل ملفات dist/ داخل الهاتف — الذاكرة والملاحظات والبحث تعمل بدون إنترنت.
// ميزات الذكاء الاصطناعي (المحادثة/OCR/الترجمة) وحدها تحتاج اتصالاً.
const config: CapacitorConfig = {
  appId: "app.nawat.ai",
  appName: "نواة",
  webDir: "dist",
  android: {
    backgroundColor: "#0a0f1a",
    allowMixedContent: false,
  },
  ios: {
    backgroundColor: "#0a0f1a",
  },
};

export default config;

