import "server-only";

import { ZodError } from "zod";

import { getGeminiRecipeAiEnv, type GeminiRecipeAiEnv } from "@/lib/server-env";
import {
  buildRecipeImportSourceText,
  parseRecipeImportDraftOutput,
  readOpenAiOutputText,
  RECIPE_IMPORT_SYSTEM_PROMPT,
} from "@/features/recipe-imports/recipe-ai-shared";
import { type RecipeDraftExtractor } from "@/features/recipe-imports/schemas";

const CHAT_COMPLETIONS_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MAX_INLINE_IMAGE_BYTES = 16 * 1024 * 1024;

type GeminiExtractorOptions = { fetchImpl?: typeof fetch; env?: GeminiRecipeAiEnv };
type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

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

async function inlineImages(fetchImpl: typeof fetch, imageUrls: string[]): Promise<MessageContentPart[]> {
  const parts: MessageContentPart[] = [];
  let totalBytes = 0;
  for (const url of imageUrls) {
    try {
      const response = await fetchImpl(url, { method: "GET" });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
      if (!contentType?.startsWith("image/")) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (totalBytes + bytes.byteLength > MAX_INLINE_IMAGE_BYTES) continue;
      totalBytes += bytes.byteLength;
      parts.push({ type: "image_url", image_url: { url: `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}` } });
    } catch {
      // A text source can still be imported when an optional image is unavailable.
    }
  }
  return parts;
}

export function createGeminiRecipeDraftExtractor(options: GeminiExtractorOptions = {}): RecipeDraftExtractor {
  const fetchImpl = options.fetchImpl ?? fetch;
  const env = options.env ?? getGeminiRecipeAiEnv();

  return {
    async extract(input) {
      const imageParts = await inlineImages(fetchImpl, input.imageUrls);
      if (!input.document.text.trim() && imageParts.length === 0) throw new Error("AI 服务暂时不可用");
      const response = await (async () => {
        try {
          return await fetchImpl(CHAT_COMPLETIONS_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${env.API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: env.RECIPE_AI_MODEL,
              messages: [
                { role: "system", content: RECIPE_IMPORT_SYSTEM_PROMPT },
                { role: "user", content: [{ type: "text", text: buildRecipeImportSourceText(input.document) }, ...imageParts] },
              ],
              response_format: { type: "json_object" },
              temperature: 0.1,
              stream: false,
            }),
          });
        } catch {
          throw new Error("AI 服务暂时不可用");
        }
      })();

      if (!response.ok) {
        const details = await readProviderError(response);
        console.error("[recipe-import] Gemini request failed", {
          status: response.status,
          model: env.RECIPE_AI_MODEL,
          providerCode: details.code?.slice(0, 80),
          providerMessage: details.message?.replace(/AIza[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 160),
        });
        throw providerError(response.status);
      }

      try {
        const payload = (await response.json()) as unknown;
        const outputText = readOpenAiOutputText(payload);
        if (!outputText) throw new Error("missing output");
        return parseRecipeImportDraftOutput(outputText, input.document.text);
      } catch (error) {
        console.error("[recipe-import] Gemini output parse failed", error instanceof ZodError
          ? { error: "ZodError", issues: error.issues.slice(0, 8).map((issue) => ({ path: issue.path.join("."), code: issue.code })) }
          : { error: error instanceof Error ? error.name : "unknown" });
        throw new Error("菜谱内容整理失败");
      }
    },
  };
}
