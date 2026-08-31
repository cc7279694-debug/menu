import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildRecipeImportSourceText,
  parseRecipeImportDraftOutput,
  readOpenAiOutputText,
} from "@/features/recipe-imports/recipe-ai-shared";

const document = {
  platform: "小红书",
  title: "干锅脆鱼",
  author: "食谱作者",
  canonicalUrl: "https://example.com/recipe",
  text: "鱼片炸五分钟，撒孜然粉。",
  imageUrls: [],
};

describe("recipe AI shared helpers", () => {
  it("builds a clearly delimited source prompt", () => {
    const text = buildRecipeImportSourceText(document);
    expect(text).toContain("平台：小红书");
    expect(text).toContain("<source-content>");
    expect(text).toContain("鱼片炸五分钟");
    expect(text).toContain("</source-content>");
  });

  it("reads OpenAI-compatible text content and normalizes a draft", () => {
    const payload = { choices: [{ message: { content: JSON.stringify({
      title: "干锅脆鱼",
      ingredients: [{ name: "鱼片", groupType: "主料", quantity: 200, unit: "克" }],
      steps: [{ instruction: "炸五分钟", timerSeconds: "300", ingredientNames: [] }],
    }) } }] };

    const output = readOpenAiOutputText(payload);
    expect(output).toContain("干锅脆鱼");
    expect(parseRecipeImportDraftOutput(output!, document.text)).toMatchObject({
      title: "干锅脆鱼",
      baseServings: 2,
      ingredients: [{ name: "鱼片", quantity: 200, unit: "克", groupType: "main" }],
      steps: [{ instruction: "炸五分钟", timerSeconds: 300 }],
    });
  });

  it("keeps precise and text-only advance preparations, including model aliases", () => {
    const output = JSON.stringify({
      title: "绿豆牛肉",
      ingredients: [{ name: "牛肉", groupType: "main", quantity: 300, unit: "克" }],
      steps: [{ instruction: "下锅炒熟", ingredientNames: [] }],
      prepTasks: [
        { ingredient: "牛肉", instruction: "加入调料抓匀腌制", durationMinutes: 30 },
        { ingredient: "绿豆", instruction: "加水浸泡", timeText: "提前一晚" },
      ],
    });

    expect(parseRecipeImportDraftOutput(output).preparations).toEqual([
      { ingredientName: "牛肉", instruction: "加入调料抓匀腌制", leadTimeMinutes: 30, timingText: null },
      { ingredientName: "绿豆", instruction: "加水浸泡", leadTimeMinutes: null, timingText: "提前一晚" },
    ]);
  });
});
