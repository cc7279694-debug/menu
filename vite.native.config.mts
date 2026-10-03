import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/postcss";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "native",
  base: "./",
  plugins: [
    react(),
    {
      name: "local-development-csp",
      apply: "serve",
      transformIndexHtml: {
        order: "pre",
        handler: (html) =>
          html
            .replace(
              "script-src 'self';",
              "script-src 'self' 'unsafe-inline'; worker-src blob:;",
            )
            .replace(
              "connect-src 'self';",
              "connect-src 'self' ws://127.0.0.1:* ws://localhost:*;",
            ),
      },
    },
  ],
  css: { postcss: { plugins: [tailwind()] } },
  publicDir: "public",
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { outDir: "../dist-native", emptyOutDir: true, target: "es2022" },
});
