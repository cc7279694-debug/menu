import "server-only";

import { ZodError } from "zod";

import { getRecipeAiEnv, type RecipeAiEnv } from "@/lib/server-env";
import {
  buildRecipeImportSourceText,
  parseRecipeImportDraftOutput,
  readOpenAiOutputText,
  RECIPE_IMPORT_SYSTEM_PROMPT,
} from "@/features/recipe-imports/recipe-ai-shared";
import { type RecipeDraftExtractor } from "@/features/recipe-imports/schemas";

const CHAT_COMPLETIONS_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const MULTIMODAL_GENERATION_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

type QianwenExtractorOptions = { fetchImpl?: typeof fetch; env?: RecipeAiEnv };
type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
type DashScopeContentPart = { text: string } | { image: string } | { video: string };

function buildUserContent(document: Parameters<typeof buildRecipeImportSourceText>[0], imageUrls: string[]): MessageContentPart[] {
  return [
    { type: "text", text: buildRecipeImportSourceText(document) },
    ...imageUrls.map((url) => ({ type: "image_url", image_url: { url } }) as const),
  ];
}

function buildDashScopeUserContent(document: Parameters<typeof buildRecipeImportSourceText>[0], imageUrls: string[]): DashScopeContentPart[] {
  return [
    { text: buildRecipeImportSourceText(document) },
    ...imageUrls.map((url) => ({ image: url }) as const),
    ...(document.videoUrls ?? []).map((url) => ({ video: url }) as const),
  ];
}

function readDashScopeOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("output" in payload)) return null;
  const output = (payload as { output?: unknown }).output;
  if (!output || typeof output !== "object" || !("choices" in output)) return null;
  const choices = (output as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices.length) return null;
  const message = choices[0] && typeof choices[0] === "object" && "message" in choices[0]
    ? (choices[0] as { message?: unknown }).message
    : null;
  if (!message || typeof message !== "object" || !("content" in message)) return null;
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const text = content.find((part) => part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string");
  return text && typeof text === "object" && "text" in text && typeof (text as { text?: unknown }).text === "string"
    ? (text as { text: string }).text
    : null;
}

function providerError(status: number): Error {
  if (status === 401 || status === 403) return new Error("AI 服务认证失败");
  if (status === 429) return new Error("AI 服务请求过于频繁");
  if (status >= 500) return new Error("AI 服务暂时不可用");
  return new Error("AI 服务请求失败");
}

async function readProviderError(response: Response): Promise<{ code?: string; message?: string }> {
  try {
    const payload = (await response.clone().json()) as { code?: unknown; message?: unknown; error?: { code?: unknown; message?: unknown } };
    const code = typeof payload.code === "string" ? payload.code : typeof payload.error?.code === "string" ? payload.error.code : undefined;
    const message = typeof payload.message === "string" ? payload.message : typeof payload.error?.message === "string" ? payload.error.message : undefined;
    return { code, message };
  } catch {
    return {};
  }
}

export function createQianwenRecipeDraftExtractor(options: QianwenExtractorOptions = {}): RecipeDraftExtractor {
  const fetchImpl = options.fetchImpl ?? fetch;
  const env = options.env ?? getRecipeAiEnv();

  return {
    async extract(input) {
      const videoUrls = input.document.videoUrls ?? [];
      const hasMultimodalInput = input.imageUrls.length > 0 || videoUrls.length > 0;
      const request = async (imageUrls: string[]) => fetchImpl(CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.RECIPE_AI_MODEL,
          messages: [
            { role: "system", content: RECIPE_IMPORT_SYSTEM_PROMPT },
            { role: "user", content: buildUserContent(input.document, imageUrls) },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          stream: false,
          enable_thinking: false,
        }),
      });
      const requestMultimodal = () => fetchImpl(MULTIMODAL_GENERATION_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.RECIPE_AI_MODEL,
          input: {
            messages: [
              { role: "system", content: [{ text: RECIPE_IMPORT_SYSTEM_PROMPT }] },
              { role: "user", content: buildDashScopeUserContent(input.document, input.imageUrls) },
            ],
          },
          parameters: {
            result_format: "message",
            response_format: { type: "json_object" },
            temperature: 0.1,
            ...(env.RECIPE_AI_MODEL.startsWith("qwen3.8")
              ? { reasoning_effort: "none" }
              : { enable_thinking: false }),
          },
        }),
      });

      let response: Response;
      try {
        response = await (hasMultimodalInput ? requestMultimodal() : request([]));
      } catch {
        throw new Error("AI 服务暂时不可用");
      }

      if (!response.ok) {
        const details = await readProviderError(response);
        if (!response.ok) {
          const retryDetails = await readProviderError(response);
          const providerMessage = retryDetails.message ?? details.message;
          console.error("[recipe-import] QianWen request failed", {
            status: response.status,
            model: env.RECIPE_AI_MODEL,
            providerCode: (retryDetails.code ?? details.code)?.slice(0, 80),
            providerMessage: providerMessage?.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 160),
          });
          throw providerError(response.status);
        }
      }

      try {
        const payload = (await response.json()) as unknown;
        const outputText = hasMultimodalInput ? readDashScopeOutputText(payload) : readOpenAiOutputText(payload);
        if (!outputText) throw new Error("missing output");
        return parseRecipeImportDraftOutput(outputText, input.document.text);
      } catch (error) {
        console.error("[recipe-import] QianWen output parse failed", error instanceof ZodError
          ? { error: "ZodError", issues: error.issues.slice(0, 8).map((issue) => ({ path: issue.path.join("."), code: issue.code })) }
          : { error: error instanceof Error ? error.name : "unknown" });
        throw new Error("菜谱内容整理失败");
      }
    },
  };
}
