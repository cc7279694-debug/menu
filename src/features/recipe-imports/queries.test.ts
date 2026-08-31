import { describe, expect, it } from "vitest";

import { mapRecipeImportJob } from "@/features/recipe-imports/queries";

const legacyDraft = {
  title: "番茄炒蛋",
  description: null,
  baseServings: 2,
  prepMinutes: 5,
  cookMinutes: 8,
  personalNotes: null,
  suggestedCategoryName: "家常菜",
  suggestedTagNames: [],
  ingredients: [{ name: "鸡蛋", groupType: "main", quantity: 2, quantityText: null, unit: "个", preparationNote: null }],
  steps: [{ instruction: "炒熟", heatLevel: "中火", timerSeconds: 60, ingredientNames: ["鸡蛋"] }],
  preparations: [],
  warnings: [],
};

describe("mapRecipeImportJob", () => {
  it("upgrades a legacy draft to a confirmation-required review", () => {
    const job = mapRecipeImportJob({
      id: "job",
      source_type: "text",
      ai_provider: "qwen",
      image_paths: [],
      status: "review",
      draft: legacyDraft,
      warnings: [],
      expires_at: "2026-09-01T00:00:00.000Z",
    });

    expect(job.draft?.review.requiresConfirmation).toBe(true);
    expect(job.draft?.review.confirmedAt).toBeNull();
  });

  it("does not expose malformed stored drafts", () => {
    const job = mapRecipeImportJob({
      id: "job",
      source_type: "text",
      ai_provider: "qwen",
      image_paths: [],
      status: "review",
      draft: { title: "坏数据" },
      warnings: [],
      expires_at: "2026-09-01T00:00:00.000Z",
    });

    expect(job.draft).toBeNull();
  });
});
