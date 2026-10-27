import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/** G1 is served separately. The accepted APK build never includes this entry. */
export default defineConfig(({ command, isPreview, mode }) => {
  if (command !== "serve" || isPreview || mode === "production") {
    throw new Error("UI V2 G1 is a DEV-only showcase; production build/preview is not authorized.");
  }
  return {
    root: fileURLToPath(new URL(".", import.meta.url)),
    publicDir: false,
    // The preview uses scoped plain CSS, not the legacy Next PostCSS configuration.
    css: { postcss: { plugins: [] } },
    plugins: [react()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: { host: "127.0.0.1", port: 5182, strictPort: true, open: false },
  };
});
