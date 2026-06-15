import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.nawat.ai",
  appName: "نواة",
  webDir: "dist",
  server: {
    // Points the native shell at the deployed web app so AI features keep working.
    // For a fully offline build, remove `url` and ship `dist/` instead.
    url: "https://learn-grow-unbound.lovable.app",
    cleartext: false,
  },
  android: {
    backgroundColor: "#0a1410",
  },
  ios: {
    backgroundColor: "#0a1410",
  },
};

export default config;
