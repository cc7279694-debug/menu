import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/postcss";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "native",
  base: "./",
  plugins: [react()],
  css: { postcss: { plugins: [tailwind()] } },
  publicDir: "public",
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { outDir: "../dist-native", emptyOutDir: true, target: "es2022" },
});
