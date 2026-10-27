import { describe, expect, it, vi } from "vitest";
import { image, reviewDraft } from "../ai/service.test-support";
import type { AiIntakeState } from "../ai/service";
import type { RecipeCandidate as FinderCandidate } from "../find-recipe/contract";
import type { FindState } from "../find-recipe/service";
import type { LinkImportState } from "../link-import/service";
import { aiInputSource, finderIntakeSource, webIntakeSource } from "./source-context";

function aiSnapshot(): AiIntakeState {
  const operationId = crypto.randomUUID(), screenshot = image(operationId);
  return { phase: "preview", input: { text: "提供的文字\n盐适量 🥬", imageIds: [screenshot.id] }, operationId, requestId: null, draft: reviewDraft(), confirmed: true, error: null, images: [screenshot], imageBusy: false, pendingCleanup: false, savedRecipe: null };
}
function webSnapshot(): LinkImportState {
  const candidate = { id: "candidate-0", recipe: reviewDraft().recipe, quality: "partial" as const, score: 5, documentOrder: 0, warnings: ["来源缺少步骤"] };
  return { phase: "ready", url: "https://recipes.example/dish", parsed: { title: "网页标题", candidates: [candidate], needsSelection: false, warnings: [] }, selectedId: candidate.id, visible: { title: "清洗网页标题", text: "清洗后的做法\n姜适量", wasTruncated: true }, parserDraft: null, error: null };
}
function findSnapshot(): FindState {
  const selected: FinderCandidate = { id: "finder-1", title: "本轮选定汤", sourceHost: "cook.example.org", sourceUrl: "https://cook.example.org/soup", summary: "候选摘要，并非完整原文", highlights: ["简单"], totalMinutes: 10, preparationHint: "" };
  return { phase: "preview", dish: "汤", preference: "", candidates: [selected], selected, error: null, cancelling: false };
}

describe("G7 source contexts read existing session snapshots only", () => {
  it("T07 AI text and temporary images keep the original read-only references and result identity", () => {
    const snapshot = aiSnapshot(), current = vi.fn(() => true);
    Object.freeze(snapshot.images); Object.freeze(snapshot.input); Object.freeze(snapshot);
    const source = aiInputSource(snapshot, current);
    expect(source).toMatchObject({ kind: "ai-input", text: snapshot.input.text, operationId: snapshot.operationId });
    expect(source?.identity).toBe(snapshot.draft);
    expect(source?.kind === "ai-input" && source.images).toBe(snapshot.images);
    expect(source?.isCurrent()).toBe(true);
    current.mockReturnValue(false);
    expect(source?.isCurrent()).toBe(false);
    expect(snapshot.confirmed).toBe(true);
  });

  it("T07 image-only AI source remains available without inventing input text", () => {
    const snapshot = aiSnapshot(); snapshot.input.text = "";
    expect(aiInputSource(snapshot)).toMatchObject({ kind: "ai-input", text: "", images: snapshot.images });
  });

  it.each(["input", "requesting", "error", "saved", "uncertain"] as const)("T08 AI %s state cannot expose an expired source", phase => {
    const snapshot = aiSnapshot(); snapshot.phase = phase;
    expect(aiInputSource(snapshot)).toBeNull();
  });

  it("T08 missing AI session or absent source never creates a source entry", () => {
    const snapshot = aiSnapshot(); snapshot.operationId = null;
    expect(aiInputSource(snapshot)).toBeNull();
    snapshot.operationId = crypto.randomUUID(); snapshot.images = []; snapshot.input = { text: "", imageIds: [] };
    expect(aiInputSource(snapshot)).toBeNull();
    expect(aiInputSource(aiSnapshot(), () => false)).toBeNull();
  });

  it("T07 Parser exposes cleaned visible text, real truncation, and the selected original candidate", () => {
    const snapshot = webSnapshot(), selected = snapshot.parsed!.candidates[0];
    Object.freeze(snapshot.visible); Object.freeze(selected); Object.freeze(snapshot);
    const source = webIntakeSource(snapshot, selected);
    expect(source).toMatchObject({ kind: "web-parser", visible: { text: "清洗后的做法\n姜适量", wasTruncated: true } });
    expect(source?.identity).toBe(selected);
    expect(source && "visible" in source && source.visible).toBe(snapshot.visible);
    expect(source && "selected" in source && source.selected).toBe(selected);
  });

  it("T07 web AI uses the retained visible page, preserving its distinction from the AI request", () => {
    const snapshot = webSnapshot(), draft = reviewDraft(); snapshot.phase = "ai-preview";
    const source = webIntakeSource(snapshot, snapshot.parsed!.candidates[0], draft);
    expect(source).toMatchObject({ kind: "web-ai", visible: snapshot.visible });
    expect(source?.identity).toBe(draft);
    expect(source).not.toHaveProperty("text");
  });

  it("T08 web context disappears after release, invalidation, or a mismatched selected candidate", () => {
    const snapshot = webSnapshot(), selected = snapshot.parsed!.candidates[0];
    expect(webIntakeSource(snapshot, selected, null, () => false)).toBeNull();
    expect(webIntakeSource({ ...snapshot, phase: "saved" }, selected)).toBeNull();
    expect(webIntakeSource({ ...snapshot, visible: null }, selected)).toBeNull();
    expect(webIntakeSource(snapshot, { ...selected })).toBeNull();
  });

  it("T07 Finder uses selected metadata without retaining sourceText or manufacturing a body", () => {
    const snapshot = findSnapshot(), draft = reviewDraft(), source = finderIntakeSource(snapshot, draft);
    expect(source).toMatchObject({ kind: "finder", selected: { title: "本轮选定汤", sourceHost: "cook.example.org", summary: "候选摘要，并非完整原文" } });
    expect(source?.identity).toBe(draft);
    expect(source?.kind === "finder" && source.selected).toBe(snapshot.selected);
    expect(source).not.toHaveProperty("sourceText"); expect(source).not.toHaveProperty("text"); expect(source).not.toHaveProperty("visible");
    expect(Object.keys(snapshot).sort()).toEqual(["cancelling", "candidates", "dish", "error", "phase", "preference", "selected"]);
  });

  it("T08 Finder cannot expose metadata without both the selected result and the live AI draft", () => {
    const snapshot = findSnapshot();
    expect(finderIntakeSource(snapshot, null)).toBeNull();
    expect(finderIntakeSource({ ...snapshot, selected: null }, reviewDraft())).toBeNull();
    expect(finderIntakeSource({ ...snapshot, phase: "results" }, reviewDraft())).toBeNull();
    expect(finderIntakeSource(snapshot, reviewDraft(), () => false)).toBeNull();
  });
});
