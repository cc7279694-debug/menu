// Synthetic browser adapter only; excluded by the production isolation gate.
import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import { LibraryApp } from "../../src/native/library-app";
import { PreviewRecipeLibrary } from "../../src/native/preview-store";
import { emptyDetails } from "../../src/native/recipe-model";
import { AiIntakeService } from "../../src/native/ai/service";
import type { AiBridge, AiKeyPort } from "../../src/native/ai/native-bridge";
import { LinkImportService } from "../../src/native/link-import/service";

export type R2Scenario = "missing-state" | "unsupported-state" | "wrong-target" | "unresolved-link" | "media-only" | "direct-note" | "generic" | "login" | "challenge";
export async function renderR2Fixture(target: HTMLElement, scenario: R2Scenario) {
  const store = new PreviewRecipeLibrary(), calls = { ai: 0, picks: 0, discarded: 0, read: 0, requests: [] as { text: string; imageIds: string[] }[] };
  const canvas = document.createElement("canvas"); canvas.width = 600; canvas.height = 1800;
  const drawing = canvas.getContext("2d"); if (!drawing) throw new Error("Canvas unavailable");
  drawing.fillStyle = "#f8f3e9"; drawing.fillRect(0, 0, 600, 1800);
  drawing.fillStyle = "#30382e"; drawing.font = "28px sans-serif";
  drawing.fillText("合成长图饭 · 仅供测试", 30, 80);
  drawing.fillText("青菜 200克 / 米饭 1碗 / 盐 适量", 30, 170);
  const steps = ["洗净青菜。", "将青菜切段。", "锅内放少量水。", "加入青菜。", "翻拌均匀。", "加盐适量。", "加入米饭炒匀。", "装盘。"];
  steps.forEach((step, i) => drawing.fillText(`${i + 1}. ${step}`, 30, 300 + i * 160));
  const media = canvas.toDataURL("image/jpeg", .8), uris = new Map<string, string>(), convert = Capacitor.convertFileSrc;
  Capacitor.convertFileSrc = uri => uris.get(uri) ?? convert(uri);
  const keys: AiKeyPort = { hasAiKey: async () => ({ configured: true }), saveAiKey: async () => { throw new Error("No credentials in QA"); }, deleteAiKey: async () => {} };
  const bridge: AiBridge = {
    createSession: async () => ({ operationId: crypto.randomUUID() }), cleanupExpired: async () => ({ pendingCleanup: false }),
    discardSession: async () => { calls.discarded++; uris.clear(); }, cancel: async () => {}, removeImage: async () => {},
    preflight: async () => { throw new Error("Provider preflight forbidden in QA"); },
    pickImage: async ({ operationId }) => {
      calls.picks++; const id = crypto.randomUUID(), previewUri = `file:///data/user/0/app.recipio.local/cache/ai-import/${operationId}/${id}.jpg`;
      uris.set(previewUri, media);
      return { cancelled: false, image: { id, previewUri, mimeType: "image/jpeg", byteSize: Math.floor(media.length * .75), width: 600, height: 1800 } };
    },
    organize: async ({ text, imageIds }) => {
      calls.ai++; calls.requests.push({ text, imageIds });
      return { rawJson: JSON.stringify({ recipe: { ...emptyDetails("合成长图饭"), ingredients: [{ name: "青菜", amount: "200克" }, { name: "米饭", amount: "1碗" }, { name: "盐", amount: "适量" }], steps: steps.map(instruction => ({ instruction, imagePath: null })) }, fieldChecks: [{ path: "servings", label: "份数", status: "missing", message: "合成截图未提供" }], warnings: [] }) };
    },
  };
  const ai = new AiIntakeService(keys, bridge, { store });
  const link = new LinkImportService({ store, ai, port: { cancel: async () => {}, read: async () => {
    calls.read++;
    const note = { noteId: "target", title: "合成来源标题", desc: scenario === "media-only" ? "" : "青菜200克，洗净后煮熟。", imageList: [{}] };
    let html = "<title>合成来源标题</title>", finalUrl = "https://www.xiaohongshu.com/explore/target?source=synthetic";
    if (scenario === "login") html = "<title>登录后查看笔记</title>";
    else if (scenario === "challenge") html = "<title>安全验证</title>";
    else if (scenario === "generic") {
      finalUrl = "https://recipes.example/synthetic";
      html += '<script type="application/ld+json">{"@type":"Recipe","name":"合成清汤","recipeIngredient":["青菜200克"],"recipeInstructions":["煮熟。"]}</script>';
    } else if (scenario === "unsupported-state") html += '<script>window.__INITIAL_STATE__={"unknownShape":{}}</script>';
    else if (scenario !== "missing-state") {
      if (scenario === "unresolved-link") finalUrl = "https://xhslink.cn/o/synthetic";
      const record = scenario === "wrong-target" ? { noteDetailMap: { other: { note: { ...note, noteId: "other" } } } }
        : { noteDetailMap: { target: scenario === "direct-note" ? note : { note } } };
      html += `<script>window.__INITIAL_STATE__=${JSON.stringify({ note: record })}</script>`;
    }
    html += "<main>推荐菜：肉500克炖熟。打开App查看更多。</main>";
    return { html, finalUrl, contentType: "text/html" };
  } } });
  const root = createRoot(target); root.render(<LibraryApp store={store} ai={ai} aiKeys={keys} link={link} />);
  return { calls, snapshot: () => ({ link: link.snapshot(), ai: ai.snapshot() }), recipes: async () => Promise.all((await store.list()).map(recipe => store.getDetails(recipe.id))), unmount: () => { root.unmount(); Capacitor.convertFileSrc = convert; uris.clear(); } };
}
