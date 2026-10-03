import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.recipio.local",
  appName: "谱序 RECIPIO",
  webDir: "dist-native",
  android: { allowMixedContent: false },
};
export default config;
