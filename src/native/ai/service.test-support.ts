import { vi } from "vitest";
import type { AiBridge,AiTemporaryImage } from "./native-bridge";
export function image(operationId:string,id=crypto.randomUUID()){return {id,mimeType:"image/jpeg" as const,byteSize:100,width:200,height:100,previewUri:`file:///data/user/0/app.recipio.local/cache/ai-import/${operationId}/${id}.jpg`};}
import { emptyDetails } from "../recipe-model";
export const output=(title="啤酒鸭")=>JSON.stringify({recipe:emptyDetails(title),fieldChecks:[],warnings:[]});
export function fakeAi(){return {
  keys:{hasAiKey:vi.fn(async()=>({configured:true})),saveAiKey:vi.fn(async()=>({configured:true,cancelled:false})),deleteAiKey:vi.fn(async()=>{})},
  bridge:{createSession:vi.fn(async()=>({operationId:crypto.randomUUID()})),discardSession:vi.fn(async()=>{}),cancel:vi.fn(async()=>{}),organize:vi.fn(async()=>({rawJson:output()})),preflight:vi.fn(async()=>({available:true as const,model:"qwen3.8-flash" as const,region:"beijing" as const})),pickImage:vi.fn(async(input:{operationId:string}):Promise<{cancelled:boolean;image?:AiTemporaryImage}>=>({cancelled:false,image:image(input.operationId)})),removeImage:vi.fn(async()=>{}),cleanupExpired:vi.fn(async()=>({pendingCleanup:false}))} satisfies AiBridge,
};}
export function deferred<T>(){let resolve!:(value:T)=>void;let reject!:(error:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
