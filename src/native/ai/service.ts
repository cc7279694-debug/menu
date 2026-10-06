import type { RecipeLibrary,RecipeDetails,RecipeDetailsInput } from "../recipe-model";
import {sameEditableDetails} from "../recipe-history";
import {AiRecipeSaver,type AiSaveResult} from "./save";
import type { BackupController } from "../backup/backup-controls";
import type { AiReviewDraft } from "./contract";
import { AI_LIMITS,requiresAiReview } from "./contract";
import { parseAiDraft } from "./normalize";
import { z } from "zod";
import { AiIntakeError, safeAiError, type AiBridge, type AiKeyPort, type AiTemporaryImage } from "./native-bridge";
export type AiInput={text:string;imageIds:string[]};
export type AiIntakeState={phase:"input"|"requesting"|"preview"|"error"|"saving"|"saved"|"uncertain";input:AiInput;operationId:string|null;requestId:string|null;draft:AiReviewDraft|null;confirmed:boolean;error:AiIntakeError|null;images:AiTemporaryImage[];imageBusy:boolean;pendingCleanup:boolean;savedRecipe:RecipeDetails|null};
export class AiIntakeService {
  private state:AiIntakeState={phase:"input",input:{text:"",imageIds:[]},operationId:null,requestId:null,draft:null,confirmed:false,error:null,images:[],imageBusy:false,pendingCleanup:false,savedRecipe:null};
  private saver:AiRecipeSaver;
  private saving:Promise<RecipeDetails>|null=null;
  private saveInput:RecipeDetailsInput|null=null;
  private pendingSavers=new Set<AiRecipeSaver>();
  private listeners=new Set<()=>void>();
  private generation=0;
  private opening:Promise<string>|null=null;
  private flight:{generation:number;operationId:string;requestId:string;sent:boolean}|null=null;
  private cancelling=false;
  private restoreBlocked=false;
  private cleanupStarted=false;
  constructor(readonly keys:AiKeyPort,readonly bridge:AiBridge,readonly dependencies:{store:RecipeLibrary;backup?:BackupController}){
    this.saver=new AiRecipeSaver(dependencies.store,bridge);
    const observe=()=>{const phase=dependencies.backup?.getState().phase;const blocked=phase==="restoring"||phase==="uncertain";if(blocked&&!this.restoreBlocked){this.restoreBlocked=true;void this.discard().catch(()=>{});}this.restoreBlocked=blocked;};
    dependencies.backup?.subscribe(observe);observe();
  }
  snapshot=():AiIntakeState=>this.state;
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  private set(state:AiIntakeState){this.state=state;this.listeners.forEach(listener=>listener());}
  async startSession():Promise<string>{
    if(this.restoreBlocked||this.state.phase==="uncertain"||this.saving)throw new AiIntakeError("busy");
    if(!this.cleanupStarted){this.cleanupStarted=true;void this.bridge.cleanupExpired().then(reply=>this.set({...this.state,pendingCleanup:reply.pendingCleanup})).catch(error=>{if(safeAiError(error).code!=="native_unavailable")this.set({...this.state,pendingCleanup:true});});}
    if(this.state.operationId)return this.state.operationId;
    if(this.opening)return this.opening;
    const generation=++this.generation;
    const opening=this.bridge.createSession().then(async({operationId})=>{
      if(generation!==this.generation){await this.bridge.discardSession({operationId});throw new AiIntakeError("stale_session");}
      this.saver=new AiRecipeSaver(this.dependencies.store,this.bridge);this.saveInput=null;
      this.set({...this.state,phase:"input",operationId,error:null,savedRecipe:null});return operationId;
    }).catch(error=>{const safe=safeAiError(error);if(generation===this.generation)this.set({...this.state,phase:"error",error:safe});throw safe;}).finally(()=>{if(this.opening===opening)this.opening=null;});
    this.opening=opening;return opening;
  }
  updateInput(input:AiInput):void{
    if(this.flight||this.cancelling||this.state.imageBusy||["saving","saved","uncertain"].includes(this.state.phase))throw new AiIntakeError("busy");
    this.set({...this.state,input:{text:input.text,imageIds:[...input.imageIds]},phase:"input",draft:null,confirmed:false,error:null});
  }
  async prepareSharedInput(input:{text:string;transferImages?:(operationId:string)=>Promise<AiTemporaryImage[]>;isCurrent?:()=>boolean}):Promise<void>{
    const current=this.state;
    if(this.flight||this.cancelling||this.restoreBlocked||current.imageBusy||current.phase!=="input"||current.draft||current.input.text!==""||current.images.length||current.input.imageIds.length)throw new AiIntakeError("busy");
    if(new TextEncoder().encode(input.text).length>32768||Array.from(input.text).length>AI_LIMITS.textCodePoints||!input.text.trim()&&!input.transferImages)throw new AiIntakeError("input_invalid");
    // Reserve the empty session synchronously, before asynchronous create/transfer.
    this.set({...current,imageBusy:true,error:null});
    let operationId:string|null=null;
    const initialGeneration=this.generation;
    try{
      operationId=await this.startSession();
      const generation=this.generation;
      const images=input.transferImages?await input.transferImages(operationId):[];
      if(generation!==this.generation||operationId!==this.state.operationId||this.restoreBlocked||input.isCurrent&&!input.isCurrent())throw new AiIntakeError("stale_session");
      if(images.length>AI_LIMITS.imageCount||input.transferImages&&!images.length||new Set(images.map(image=>image.id)).size!==images.length)throw new AiIntakeError("image_invalid");
      this.set({...this.state,phase:"input",input:{text:input.text,imageIds:images.map(image=>image.id)},images,draft:null,confirmed:false,imageBusy:false,error:null});
    }catch(error){
      const safe=safeAiError(error);
      if(operationId===this.state.operationId){await this.discard();this.set({...this.state,error:safe});}
      else if(operationId===null&&this.generation<=initialGeneration+1&&this.state.imageBusy)this.set({...this.state,imageBusy:false,error:safe});
      throw safe;
    }
  }
  async refreshKey():Promise<boolean>{return (await this.keys.hasAiKey()).configured;}
  setConfirmed(value:boolean):void{if(this.state.phase!=="preview"||!this.state.draft||!this.state.operationId||this.restoreBlocked)throw new AiIntakeError("stale_session");this.set({...this.state,confirmed:value});}
  assertCanSave():void{if(!this.state.draft||!this.state.operationId||this.restoreBlocked||this.flight||this.cancelling||this.state.imageBusy||this.state.phase!=="preview")throw new AiIntakeError("stale_session");if(requiresAiReview(this.state.draft)&&!this.state.confirmed)throw new AiIntakeError("review_required");}
  save(input:RecipeDetailsInput):Promise<RecipeDetails>{
    try{
      if(this.state.phase==="uncertain")throw new AiIntakeError("save_uncertain");
      if(this.saving){if(!this.saveInput||!sameEditableDetails(this.saveInput,input))throw new AiIntakeError("save_uncertain");return this.saving;}
      if(this.state.phase==="saved"&&this.state.savedRecipe){if(!sameEditableDetails(this.state.savedRecipe,input))throw new AiIntakeError("stale_session");return Promise.resolve(this.state.savedRecipe);}
      this.assertCanSave();
      const generation=this.generation,operationId=this.state.operationId!,draft=this.state.draft!,saver=this.saver;
      const assertCurrent=()=>{if(generation!==this.generation||operationId!==this.state.operationId||this.restoreBlocked||!this.state.draft||!["saving","uncertain"].includes(this.state.phase))throw new AiIntakeError("stale_session");if(requiresAiReview(this.state.draft)&&!this.state.confirmed)throw new AiIntakeError("review_required");};
      // Freeze this attempt in memory; ordinary RecipeDetails is the only database payload.
      this.saveInput=structuredClone(input);this.set({...this.state,phase:"saving",draft:{...draft,recipe:this.saveInput},error:null});
      const saving=saver.save({operationId,creationId:crypto.randomUUID(),input:this.saveInput,draft,confirmed:this.state.confirmed,assertCurrent}).then(result=>{
        assertCurrent();this.saved(result,saver);return result.recipe;
      }).catch(error=>{
        const safe=error instanceof AiIntakeError?error:new AiIntakeError("storage_error");
        if(generation===this.generation)this.set({...this.state,phase:safe.code==="save_uncertain"?"uncertain":"preview",error:safe});throw safe;
      }).finally(()=>{if(this.saving===saving)this.saving=null;});
      this.saving=saving;return saving;
    }catch(error){return Promise.reject(error);}
  }
  private saved(result:AiSaveResult,saver:AiRecipeSaver){
    if(result.cleanupWarning)this.pendingSavers.add(saver);
    this.set({...this.state,phase:"saved",input:{text:"",imageIds:[]},images:[],draft:null,confirmed:false,operationId:null,requestId:null,error:null,imageBusy:false,savedRecipe:result.recipe,pendingCleanup:this.state.pendingCleanup||!!result.cleanupWarning});
    this.saveInput=null;
  }
  async recoverSave():Promise<RecipeDetails|null>{
    if(this.state.phase!=="uncertain"||this.restoreBlocked)throw new AiIntakeError("stale_session");
    const generation=this.generation,saver=this.saver;
    try{const result=await saver.recover();if(generation!==this.generation)throw new AiIntakeError("stale_session");if(result){this.saved(result,saver);return result.recipe;}
      this.saveInput=null;this.set({...this.state,phase:"preview",error:null});return null;
    }catch(error){const safe=error instanceof AiIntakeError?error:new AiIntakeError("save_uncertain");if(generation===this.generation)this.set({...this.state,error:safe});throw safe;}
  }
  async retryCleanup():Promise<void>{
    for(const saver of this.pendingSavers)if(await saver.retryCleanup())this.pendingSavers.delete(saver);
    let pending=true;try{pending=(await this.bridge.cleanupExpired()).pendingCleanup;}catch{/* Native reports an actionable warning; core recipes stay available. */}
    this.set({...this.state,pendingCleanup:pending||this.pendingSavers.size>0});
  }
  private assertInputEditable(){if(this.flight||this.cancelling||this.state.imageBusy||this.restoreBlocked||["saving","saved","uncertain"].includes(this.state.phase))throw new AiIntakeError("busy");if(!this.state.operationId)throw new AiIntakeError("stale_session");}
  async pickImage():Promise<void>{
    this.assertInputEditable();if(this.state.images.length>=AI_LIMITS.imageCount)throw new AiIntakeError("image_too_large");
    const operationId=this.state.operationId!,generation=this.generation;this.set({...this.state,imageBusy:true,error:null});
    try{const reply=await this.bridge.pickImage({operationId});if(generation!==this.generation||operationId!==this.state.operationId)throw new AiIntakeError("stale_session");if(!reply.cancelled&&reply.image){const images=[...this.state.images,reply.image];this.set({...this.state,images,input:{...this.state.input,imageIds:images.map(image=>image.id)},phase:"input",draft:null,confirmed:false});}}
    catch(error){const safe=safeAiError(error);if(generation===this.generation)this.set({...this.state,error:safe});throw safe;}
    finally{if(generation===this.generation&&operationId===this.state.operationId)this.set({...this.state,imageBusy:false});}
  }
  async removeImage(id:string):Promise<void>{
    this.assertInputEditable();if(!this.state.images.some(image=>image.id===id))throw new AiIntakeError("image_invalid");const operationId=this.state.operationId!,generation=this.generation;this.set({...this.state,imageBusy:true,error:null});
    try{await this.bridge.removeImage({operationId,imageId:id});if(generation!==this.generation)throw new AiIntakeError("stale_session");const images=this.state.images.filter(image=>image.id!==id);this.set({...this.state,images,input:{...this.state.input,imageIds:images.map(image=>image.id)},phase:"input",draft:null,confirmed:false});}catch(error){const safe=safeAiError(error);if(generation===this.generation)this.set({...this.state,error:safe});throw safe;}finally{if(generation===this.generation)this.set({...this.state,imageBusy:false});}
  }
  moveImage(id:string,direction:-1|1):void{this.assertInputEditable();const images=[...this.state.images],index=images.findIndex(image=>image.id===id),next=index+direction;if(index<0)throw new AiIntakeError("image_invalid");if(next<0||next>=images.length)return;[images[index],images[next]]=[images[next],images[index]];this.set({...this.state,images,input:{...this.state.input,imageIds:images.map(image=>image.id)},phase:"input",draft:null,confirmed:false,error:null});}
  async organize(input:AiInput):Promise<AiReviewDraft>{
    if(this.flight||this.cancelling||this.state.imageBusy||this.restoreBlocked||["saving","saved","uncertain"].includes(this.state.phase))throw new AiIntakeError("busy");
    const parsed=z.strictObject({text:z.string(),imageIds:z.array(z.uuid()).max(AI_LIMITS.imageCount)}).safeParse(input);
    if(!parsed.success||Array.from(input.text.trim()).length>AI_LIMITS.textCodePoints||!input.text.trim()&&!input.imageIds.length||new Set(input.imageIds).size!==input.imageIds.length)throw new AiIntakeError("input_invalid");
    if(input.imageIds.some(id=>!this.state.images.some(image=>image.id===id)))throw new AiIntakeError("image_invalid");
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
    if(!this.restoreBlocked&&(this.state.phase==="uncertain"||this.saving))throw new AiIntakeError("save_uncertain");
    const operationId=this.state.operationId;++this.generation;this.opening=null;this.flight=null;
    this.set({phase:"input",input:{text:"",imageIds:[]},operationId:null,requestId:null,draft:null,confirmed:false,error:null,images:[],imageBusy:false,pendingCleanup:this.state.pendingCleanup,savedRecipe:null});
    if(operationId)try{await this.bridge.discardSession({operationId});}catch{this.set({...this.state,pendingCleanup:true});}
  }
  keyChanged():void{void this.cancelRequest().catch(()=>{});this.set({...this.state,confirmed:false});}
}
