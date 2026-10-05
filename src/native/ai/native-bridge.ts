import { Capacitor, registerPlugin } from "@capacitor/core";
import { z } from "zod";
import { AI_LIMITS } from "./contract";

const messages = {
  key_missing: "请先在设置中配置本机 AI 密钥。", network_unavailable: "AI 整理需要联网，已有菜谱仍可正常使用。", forbidden: "当前 AI 账号或模型无访问权限。", input_invalid: "请检查文字与截图后重试。", image_too_large: "截图超出数量或大小限制。", response_too_large: "AI 返回内容过大，请减少输入后重试。",
  native_unavailable: "AI 整理仅支持 Android；本地菜谱仍可使用。", key_unavailable: "请在设置中重新配置本机 AI 密钥。", busy: "当前 AI 操作尚未结束，请稍候。", cancelled: "已取消整理。", invalid_input: "请检查文字与截图后重试。", invalid_output: "AI 返回内容不完整，请重试或手动录入。", no_network: "无法连接 AI；请检查网络。已有菜谱仍可离线使用。", timeout: "AI 请求超时，请手动重试。", unauthorized: "AI 密钥无效或没有权限，请检查设置。", rate_limited: "AI 请求过于频繁，请稍后重试。", provider_unavailable: "AI 服务暂不可用，请稍后重试。", provider_access: "当前账号、区域或模型访问不可用。", image_invalid: "截图无法读取，请选择 JPG、PNG 或 WebP 图片。", image_limit: "截图超出数量或大小限制。", storage_error: "本机临时存储失败，请检查可用空间。", stale_session: "本轮整理已结束，请重新进入。", review_required: "请先检查推断或缺失内容，并明确确认。", save_uncertain: "保存结果尚未确认，请勿重复新建。",
} as const;
export type AiErrorCode = keyof typeof messages;
const providerCodes = ["ModelNotFound", "InvalidApiKey", "AccessDenied", "InvalidParameter", "QuotaExceeded", "ResourceNotFound", "NoPermission", "UnsupportedModel", "ModelNotSupported", "model_not_found", "invalid_api_key", "insufficient_quota"] as const;
const diagnosticSchema = z.object({httpStatus:z.number().int().min(300).max(599).optional(),providerCode:z.enum(providerCodes).optional()});
export class AiIntakeError extends Error { constructor(readonly code: AiErrorCode, readonly diagnostic?:z.infer<typeof diagnosticSchema>) { super(messages[code]); this.name = "AiIntakeError"; } }
export function safeAiError(error: unknown): AiIntakeError {
  if (error instanceof AiIntakeError) return error;
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  const data = error && typeof error === "object" && "data" in error ? diagnosticSchema.safeParse(error.data) : null;
  return new AiIntakeError(typeof code === "string" && Object.hasOwn(messages, code) ? code as AiErrorCode : "native_unavailable", data?.success ? data.data : undefined);
}
export interface NativeAiKeyApi {saveAiKey(): Promise<unknown>; hasAiKey(): Promise<unknown>; deleteAiKey(): Promise<unknown>}
export interface AiKeyPort { saveAiKey(): Promise<{configured: boolean; cancelled: boolean}>; hasAiKey(): Promise<{configured: boolean}>; deleteAiKey(): Promise<void> }
export function createAiKeyPort(api?: NativeAiKeyApi): AiKeyPort {
  let native = api;
  const getNative = () => native ?? (native = registerPlugin<NativeAiKeyApi>("LocalAiSecret"));
  async function run<T>(work: () => Promise<unknown>, schema: z.ZodType<T>): Promise<T> {
    if (!api && !Capacitor.isNativePlatform()) throw new AiIntakeError("native_unavailable");
    try { const parsed = schema.safeParse(await work()); if (!parsed.success) throw new AiIntakeError("invalid_output"); return parsed.data; } catch (error) { throw safeAiError(error); }
  }
  return {
    saveAiKey: () => run(() => getNative().saveAiKey(), z.strictObject({configured: z.boolean(), cancelled: z.boolean()})),
    hasAiKey: () => run(() => getNative().hasAiKey(), z.strictObject({configured: z.boolean()})),
    deleteAiKey: async () => { await run(() => getNative().deleteAiKey(), z.union([z.undefined(), z.strictObject({})])); },
  };
}
export type AiOrganizeRequest = {operationId: string; requestId: string; text: string; imageIds: string[]};
export type AiTemporaryImage={id:string;mimeType:"image/jpeg";byteSize:number;width:number;height:number;previewUri:string};
export interface NativeAiApi {
  createSession(): Promise<unknown>;
  discardSession(options:{operationId:string}): Promise<unknown>;
  organize(options:AiOrganizeRequest): Promise<unknown>;
  cancel(options:{operationId:string;requestId:string}): Promise<unknown>;
  preflight(): Promise<unknown>;
  pickImage(options:{operationId:string}):Promise<unknown>;
  removeImage(options:{operationId:string;imageId:string}):Promise<unknown>;
  cleanupExpired():Promise<unknown>;
}
// Retained bridge field: this is an allowlisted service profile, not geolocation.
export type AiPreflightResult = {available:true;model:"qwen3.8-flash";region:"beijing"|"qianwen-platform"};
export interface AiBridge {
  createSession():Promise<{operationId:string}>;
  discardSession(options:{operationId:string}):Promise<void>;
  organize(options:AiOrganizeRequest):Promise<{rawJson:string}>;
  cancel(options:{operationId:string;requestId:string}):Promise<void>;
  preflight():Promise<AiPreflightResult>;
  pickImage(options:{operationId:string}):Promise<{cancelled:boolean;image?:AiTemporaryImage}>;
  removeImage(options:{operationId:string;imageId:string}):Promise<void>;
  cleanupExpired():Promise<{pendingCleanup:boolean}>;
}
const operationSchema=z.strictObject({operationId:z.uuid()}), requestSchema=operationSchema.extend({requestId:z.uuid()});
const organizeSchema=requestSchema.extend({text:z.string(),imageIds:z.array(z.uuid()).max(AI_LIMITS.imageCount)}).superRefine((input,context)=>{
  if(Array.from(input.text.trim()).length>AI_LIMITS.textCodePoints||(!input.text.trim()&&!input.imageIds.length)||new Set(input.imageIds).size!==input.imageIds.length)context.addIssue({code:"custom",message:"Invalid source"});
});
const voidSchema=z.union([z.undefined(),z.strictObject({})]);
const imageSchema=z.strictObject({id:z.uuid(),mimeType:z.literal("image/jpeg"),byteSize:z.number().int().min(1).max(AI_LIMITS.imageBytes),width:z.number().int().min(11).max(AI_LIMITS.imageEdge),height:z.number().int().min(11).max(AI_LIMITS.imageEdge),previewUri:z.string().max(512)});
function ownedImage(image:AiTemporaryImage,operationId:string):boolean{
  return new RegExp(`^file:///data/(?:user/\\d+|data)/app\\.recipio\\.local/cache/ai-import/${operationId}/${image.id}\\.jpg$`).test(image.previewUri)&&Math.max(image.width,image.height)<=Math.min(image.width,image.height)*200;
}
export function aiImagePreviewUri(image:AiTemporaryImage):string{return Capacitor.convertFileSrc(image.previewUri);}
export function createAiBridge(api?:NativeAiApi):AiBridge {
  let native=api;const getNative=()=>native??(native=registerPlugin<NativeAiApi>("LocalAiIntake"));
  async function run<T>(work:()=>Promise<unknown>,schema:z.ZodType<T>):Promise<T>{
    if(!api&&!Capacitor.isNativePlatform())throw new AiIntakeError("native_unavailable");
    try{const result=schema.safeParse(await work());if(!result.success)throw new AiIntakeError("invalid_output");return result.data;}catch(e){throw safeAiError(e);}
  }
  function options<T>(schema:z.ZodType<T>,value:unknown):T{const result=schema.safeParse(value);if(!result.success)throw new AiIntakeError("input_invalid");return result.data;}
  return {
    createSession:()=>run(()=>getNative().createSession(),operationSchema),
    discardSession:async input=>{const checked=options(operationSchema,input);await run(()=>getNative().discardSession(checked),voidSchema);},
    cancel:async input=>{const checked=options(requestSchema,input);await run(()=>getNative().cancel(checked),voidSchema);},
    organize:async input=>{const checked=options(organizeSchema,input);const reply=await run(()=>getNative().organize(checked),z.strictObject({rawJson:z.string()}));if(new TextEncoder().encode(reply.rawJson).length>AI_LIMITS.responseBytes)throw new AiIntakeError("response_too_large");return reply;},
    preflight:()=>run(()=>getNative().preflight(),z.strictObject({available:z.literal(true),model:z.literal("qwen3.8-flash"),region:z.enum(["beijing","qianwen-platform"])})),
    pickImage:async input=>{const checked=options(operationSchema,input);const reply=await run(()=>getNative().pickImage(checked),z.union([z.strictObject({cancelled:z.literal(true)}),z.strictObject({cancelled:z.literal(false),image:imageSchema})]));if(!reply.cancelled&&!ownedImage(reply.image,checked.operationId))throw new AiIntakeError("invalid_output");return reply;},
    removeImage:async input=>{const checked=options(operationSchema.extend({imageId:z.uuid()}),input);await run(()=>getNative().removeImage(checked),voidSchema);},
    cleanupExpired:()=>run(()=>getNative().cleanupExpired(),z.strictObject({pendingCleanup:z.boolean()})),
  };
}
