// Isolated browser evidence only. Never imported by production.
import { createRoot } from "react-dom/client";
import { LibraryApp } from "../../src/native/library-app";
import { PreviewRecipeLibrary } from "../../src/native/preview-store";
import { emptyDetails } from "../../src/native/recipe-model";
import { AiIntakeService } from "../../src/native/ai/service";
import type { AiBridge, AiKeyPort } from "../../src/native/ai/native-bridge";
import { LinkImportService } from "../../src/native/link-import/service";
import { LinkImportError, type WebImportPort } from "../../src/native/link-import/contract";

export type XhsScenario = "public-note" | "title-only" | "video" | "partial" | "login" | "challenge" | "fake-ip" | "complete";
export async function renderXhsFixture(target: HTMLElement, scenario: XhsScenario) {
  const store = new PreviewRecipeLibrary(), calls = { ai: 0, read: 0 };
  const keys: AiKeyPort = { hasAiKey: async () => ({ configured: true }), saveAiKey: async () => { throw new Error("No credentials in QA"); }, deleteAiKey: async () => {} };
  const bridge: AiBridge = {
    createSession: async () => ({ operationId: crypto.randomUUID() }), discardSession: async () => {}, cancel: async () => {},
    cleanupExpired: async () => ({ pendingCleanup: false }), preflight: async () => ({ available: true, model: "qwen3.8-flash", region: "beijing" }),
    pickImage: async () => ({ cancelled: true }), removeImage: async () => {},
    organize: async () => {
      calls.ai++;
      return { rawJson: JSON.stringify({ recipe: { ...emptyDetails("合成青菜汤"), ingredients: [{ name: "青菜", amount: "200克" }] }, fieldChecks: [], warnings: [] }) };
    },
  };
  const ai = new AiIntakeService(keys, bridge, { store });
  const web: WebImportPort = { cancel: async () => {}, read: async () => {
    calls.read++;
    if (scenario === "fake-ip") throw new LinkImportError("dns_fake_ip");
    let html = "", finalUrl = "https://www.xiaohongshu.com/explore/test-note";
    if (scenario === "login") { finalUrl = "https://www.xiaohongshu.com/login"; html = "<title>小红书</title>"; }
    else if (scenario === "challenge") html = "<title>安全验证</title><main>请完成验证码</main>";
    else if (scenario === "partial" || scenario === "complete") {
      const recipe = { "@type": "Recipe", name: "合成青菜汤", recipeIngredient: ["青菜200克", "水500毫升"], ...(scenario === "complete" ? { recipeInstructions: ["洗净青菜。", "加入清水，煮熟。"] } : {}) };
      html = `<title>合成青菜汤</title><script type="application/ld+json">${JSON.stringify(recipe)}</script>`;
    } else {
      const desc = scenario === "title-only" ? "" : scenario === "video" ? "食材：青菜200克，水500毫升。制作步骤在视频中。" : "食材：青菜200克，水500毫升。\n1. 洗净青菜。\n2. 加入清水，煮熟。";
      const state = { note: { noteDetailMap: { "test-note": { note: { noteId: "test-note", title: "合成青菜汤", desc, type: scenario === "video" ? "video" : "normal", imageList: [{}] } } } } };
      html = `<script>window.__INITIAL_STATE__=${JSON.stringify(state)}</script>`;
    }
    return { html, finalUrl, contentType: "text/html" };
  } };
  const link = new LinkImportService({ store, ai, port: web });
  const root = createRoot(target);
  root.render(<LibraryApp store={store} ai={ai} aiKeys={keys} link={link} />);
  return { calls, snapshot: () => link.snapshot(), recipes: () => store.list(), unmount: () => root.unmount() };
}
