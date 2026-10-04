import {z} from "zod";
import type {RecipeDetails,RecipeDetailsInput,RecipeLibrary} from "../recipe-model";
import {sameEditableDetails} from "../recipe-history";
import {aiModelOutputSchema,requiresAiReview,type AiReviewDraft} from "./contract";
import {AiIntakeError,type AiBridge} from "./native-bridge";
export type AiSaveRequest={operationId:string;creationId:string;input:RecipeDetailsInput;draft:AiReviewDraft;confirmed:boolean;assertCurrent:()=>void};
export type AiSaveResult={recipe:RecipeDetails;cleanupWarning:string|null};
export class AiRecipeSaver {
  private attempt:AiSaveRequest|null=null;
  private flight:Promise<AiSaveResult>|null=null;
  private recovery:Promise<AiSaveResult|null>|null=null;
  private result:AiSaveResult|null=null;
  private uncertain=false;
  constructor(readonly store:RecipeLibrary,readonly bridge:AiBridge){}
  save(request:AiSaveRequest):Promise<AiSaveResult>{
    try {
      request.assertCurrent();
      if(requiresAiReview(request.draft)&&!request.confirmed)throw new AiIntakeError("review_required");
      const parsed=aiModelOutputSchema.safeParse({recipe:request.input,fieldChecks:[],warnings:[]});
      if(!parsed.success||!z.uuid().safeParse(request.creationId).success||!z.uuid().safeParse(request.operationId).success)throw new AiIntakeError("input_invalid");
      if(this.uncertain)throw new AiIntakeError("save_uncertain");
      if(this.attempt&&(this.attempt.creationId!==request.creationId||this.attempt.operationId!==request.operationId||!sameEditableDetails(this.attempt.input,parsed.data.recipe)))throw new AiIntakeError("save_uncertain");
      if(this.result)return Promise.resolve(this.result);
      if(this.flight)return this.flight;
      // The attempt is only in memory. Neither review nor source metadata reaches the repository.
      this.attempt={...request,input:parsed.data.recipe};
      const flight=this.commit(this.attempt).finally(()=>{if(this.flight===flight)this.flight=null;});
      this.flight=flight;return flight;
    }catch(error){return Promise.reject(error);}
  }
  private async commit(attempt:AiSaveRequest):Promise<AiSaveResult>{
    let recipe:RecipeDetails;
    try{recipe=await this.store.createDetails(attempt.input,attempt.creationId,attempt.assertCurrent);}
    catch{
      attempt.assertCurrent();
      let existing:RecipeDetails|null;
      try{existing=await this.store.getDetails(attempt.creationId);attempt.assertCurrent();}
      catch(error){if(error instanceof AiIntakeError&&error.code==="stale_session")throw error;this.uncertain=true;throw new AiIntakeError("save_uncertain");}
      if(!existing){this.attempt=null;throw new AiIntakeError("storage_error");}
      if(!sameEditableDetails(existing,attempt.input)){this.uncertain=true;throw new AiIntakeError("save_uncertain");}
      recipe=existing;
    }
    attempt.assertCurrent();return this.finish(recipe,attempt);
  }
  private async finish(recipe:RecipeDetails,attempt:AiSaveRequest):Promise<AiSaveResult>{
    this.uncertain=false;this.result={recipe,cleanupWarning:null};
    try{await this.bridge.discardSession({operationId:attempt.operationId});}
    catch{this.result={recipe,cleanupWarning:"菜谱已保存，临时文件清理待重试。"};}
    return this.result;
  }
  recover():Promise<AiSaveResult|null>{
    if(this.recovery)return this.recovery;
    const attempt=this.attempt;
    if(!this.uncertain||!attempt)return Promise.reject(new AiIntakeError("save_uncertain"));
    const recovery=(async()=>{
      attempt.assertCurrent();let recipe:RecipeDetails|null;
      try{recipe=await this.store.getDetails(attempt.creationId);}
      catch{throw new AiIntakeError("save_uncertain");}
      attempt.assertCurrent();
      if(!recipe){this.uncertain=false;this.attempt=null;return null;}
      if(!sameEditableDetails(recipe,attempt.input))throw new AiIntakeError("save_uncertain");
      return this.finish(recipe,attempt);
    })().finally(()=>{if(this.recovery===recovery)this.recovery=null;});
    this.recovery=recovery;return recovery;
  }
  async retryCleanup():Promise<boolean>{
    if(!this.result||!this.attempt)throw new AiIntakeError("save_uncertain");
    try{await this.bridge.discardSession({operationId:this.attempt.operationId});this.result={...this.result,cleanupWarning:null};return true;}
    catch{return false;}
  }
}
