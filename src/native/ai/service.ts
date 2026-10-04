import type { RecipeLibrary } from "../recipe-model";
import type { BackupController } from "../backup/backup-controls";
import type { AiReviewDraft } from "./contract";
import { AI_LIMITS } from "./contract";
import { parseAiDraft } from "./normalize";
import { z } from "zod";
import { AiIntakeError, safeAiError, type AiBridge, type AiKeyPort } from "./native-bridge";
export type AiInput={text:string;imageIds:string[]};
export type AiIntakeState={phase:"input"|"requesting"|"preview"|"error"|"saving"|"saved"|"uncertain";input:AiInput;operationId:string|null;requestId:string|null;draft:AiReviewDraft|null;confirmed:boolean;error:AiIntakeError|null};
export class AiIntakeService {
  private state:AiIntakeState={phase:"input",input:{text:"",imageIds:[]},operationId:null,requestId:null,draft:null,confirmed:false,error:null};
  private listeners=new Set<()=>void>();
  private generation=0;
  private opening:Promise<string>|null=null;
  private flight:{generation:number;operationId:string;requestId:string;sent:boolean}|null=null;
  private cancelling=false;
  private restoreBlocked=false;
  constructor(readonly keys:AiKeyPort,readonly bridge:AiBridge,readonly dependencies:{store:RecipeLibrary;backup?:BackupController}){
    const observe=()=>{const phase=dependencies.backup?.getState().phase;const blocked=phase==="restoring"||phase==="uncertain";if(blocked&&!this.restoreBlocked){this.restoreBlocked=true;void this.discard().catch(()=>{});}this.restoreBlocked=blocked;};
    dependencies.backup?.subscribe(observe);observe();
  }
  snapshot=():AiIntakeState=>this.state;
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  private set(state:AiIntakeState){this.state=state;this.listeners.forEach(listener=>listener());}
  async startSession():Promise<string>{
    if(this.restoreBlocked)throw new AiIntakeError("busy");
    if(this.state.operationId)return this.state.operationId;
    if(this.opening)return this.opening;
    const generation=++this.generation;
    const opening=this.bridge.createSession().then(async({operationId})=>{
      if(generation!==this.generation){await this.bridge.discardSession({operationId});throw new AiIntakeError("stale_session");}
      this.set({...this.state,operationId,error:null});return operationId;
    }).catch(error=>{const safe=safeAiError(error);if(generation===this.generation)this.set({...this.state,phase:"error",error:safe});throw safe;}).finally(()=>{if(this.opening===opening)this.opening=null;});
    this.opening=opening;return opening;
  }
  updateInput(input:AiInput):void{
    if(this.flight||this.cancelling||["saving","saved","uncertain"].includes(this.state.phase))throw new AiIntakeError("busy");
    this.set({...this.state,input:{text:input.text,imageIds:[...input.imageIds]},phase:"input",draft:null,confirmed:false,error:null});
  }
  async refreshKey():Promise<boolean>{return (await this.keys.hasAiKey()).configured;}
  async organize(input:AiInput):Promise<AiReviewDraft>{
    if(this.flight||this.cancelling||this.restoreBlocked||["saving","saved","uncertain"].includes(this.state.phase))throw new AiIntakeError("busy");
    const parsed=z.strictObject({text:z.string(),imageIds:z.array(z.uuid()).max(AI_LIMITS.imageCount)}).safeParse(input);
    if(!parsed.success||Array.from(input.text.trim()).length>AI_LIMITS.textCodePoints||!input.text.trim()&&!input.imageIds.length||new Set(input.imageIds).size!==input.imageIds.length)throw new AiIntakeError("input_invalid");
    const operationId=this.state.operationId;if(!operationId)throw new AiIntakeError("stale_session");
    const flight={generation:++this.generation,operationId,requestId:crypto.randomUUID(),sent:false};this.flight=flight;
    const source={text:input.text,imageIds:[...input.imageIds]};
    const assertCurrent=()=>{if(flight.generation!==this.generation||this.state.operationId!==operationId)throw new AiIntakeError("stale_session");};
    this.set({...this.state,input:source,phase:"requesting",requestId:flight.requestId,draft:null,confirmed:false,error:null});
    try{
      const configured=await this.refreshKey();assertCurrent();if(!configured)throw new AiIntakeError("key_missing");
      flight.sent=true;const reply=await this.bridge.organize({operationId,requestId:flight.requestId,...source});assertCurrent();
      let draft:AiReviewDraft;try{draft=parseAiDraft(reply.rawJson,{text:source.text,hasImages:source.imageIds.length>0});}catch{throw new AiIntakeError("invalid_output");}
      assertCurrent();this.set({...this.state,phase:"preview",requestId:null,draft,confirmed:false,error:null});return draft;
    }catch(error){const safe=flight.generation===this.generation?safeAiError(error):new AiIntakeError("stale_session");if(flight.generation===this.generation)this.set({...this.state,phase:"error",requestId:null,draft:null,error:safe});throw safe;}
    finally{if(this.flight===flight)this.flight=null;}
  }
  async cancelRequest():Promise<void>{
    const flight=this.flight;if(!flight)return;
    const generation=++this.generation;this.flight=null;this.cancelling=true;
    this.set({...this.state,phase:"requesting",requestId:null,draft:null,confirmed:false,error:null});
    try{if(flight.sent)await this.bridge.cancel({operationId:flight.operationId,requestId:flight.requestId});}finally{this.cancelling=false;if(generation===this.generation)this.set({...this.state,phase:"input"});}
  }
  async discard():Promise<void>{
    const operationId=this.state.operationId;++this.generation;this.opening=null;this.flight=null;
    this.set({phase:"input",input:{text:"",imageIds:[]},operationId:null,requestId:null,draft:null,confirmed:false,error:null});
    if(operationId)await this.bridge.discardSession({operationId});
  }
  keyChanged():void{void this.cancelRequest().catch(()=>{});this.set({...this.state,confirmed:false});}
}
