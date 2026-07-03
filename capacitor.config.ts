import type { CapacitorConfig } from "@capacitor/cli";

// APK يفتح تطبيق نواة المنشور مباشرة (بمفاتيح HN على الخادم).
// لتشغيل نسخة أوفلاين كاملة: احذف server وابنِ dist/client فقط.
const config: CapacitorConfig = {
  appId: "app.nawat.ai",
  appName: "نواة",
  webDir: "dist/client",
  server: {
    url: "https://sentient-builder-forge.lovable.app",
    cleartext: false,
  },
  android: {
    backgroundColor: "#0a0f1a",
    allowMixedContent: false,
  },
  ios: {
    backgroundColor: "#0a0f1a",
  },
};

export default config;
