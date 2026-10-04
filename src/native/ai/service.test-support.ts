import { vi } from "vitest";
import type { AiBridge } from "./native-bridge";
import { emptyDetails } from "../recipe-model";
export const output=(title="啤酒鸭")=>JSON.stringify({recipe:emptyDetails(title),fieldChecks:[],warnings:[]});
export function fakeAi(){return {
  keys:{hasAiKey:vi.fn(async()=>({configured:true})),saveAiKey:vi.fn(async()=>({configured:true,cancelled:false})),deleteAiKey:vi.fn(async()=>{})},
  bridge:{createSession:vi.fn(async()=>({operationId:crypto.randomUUID()})),discardSession:vi.fn(async()=>{}),cancel:vi.fn(async()=>{}),organize:vi.fn(async()=>({rawJson:output()})),preflight:vi.fn(async()=>({available:true as const,model:"qwen3.8-flash" as const,region:"beijing" as const}))} satisfies AiBridge,
};}
export function deferred<T>(){let resolve!:(value:T)=>void;let reject!:(error:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
