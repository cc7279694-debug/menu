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

type QianwenExtractorOptions = { fetchImpl?: typeof fetch; env?: RecipeAiEnv };
type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "video_url"; video_url: { url: string } };

function buildUserContent(document: Parameters<typeof buildRecipeImportSourceText>[0], imageUrls: string[]): MessageContentPart[] {
  return [
    { type: "text", text: buildRecipeImportSourceText(document) },
    ...imageUrls.map((url) => ({ type: "image_url", image_url: { url } }) as const),
    ...(document.videoUrls ?? []).map((url) => ({ type: "video_url", video_url: { url } }) as const),
  ];
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
            { role: "user", content: hasMultimodalInput ? buildUserContent(input.document, imageUrls) : buildRecipeImportSourceText(input.document) },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          stream: false,
          enable_thinking: false,
        }),
      });
      let response: Response;
      try {
        response = await request(hasMultimodalInput ? input.imageUrls : []);
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
        const outputText = readOpenAiOutputText(payload);
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
