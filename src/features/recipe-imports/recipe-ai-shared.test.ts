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
});
