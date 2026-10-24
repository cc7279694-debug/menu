import {useState} from "react";
import {Button} from "@/components/ui/button";
import type {RecipeDetails} from "../recipe-model";
import type {AiIntakeService} from "./service";
import {safeAiError} from "./native-bridge";
export function AiSaveRecovery({service,onSaved,onAbsent,onLibrary}:{service:AiIntakeService;onSaved:(recipe:RecipeDetails)=>void;onAbsent:()=>void;onLibrary:()=>void}){
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function recover(){if(busy)return;setBusy(true);setError("");try{const recipe=await service.recoverSave();if(recipe)onSaved(recipe);else onAbsent();}catch(e){setError(safeAiError(e).message);}finally{setBusy(false);}}
  return <section className="v2-task v2-save-recovery"><header className="v2-task-header"><h2 className="v2-page-title">先核对保存结果</h2></header><p className="v2-task-status">当前无法确认这次菜谱是否已保存。为避免重复，输入与新建已暂停；核对只读取原编号，不重新创建菜谱。</p>{error&&<p className="v2-task-status" role="alert">{error}</p>}<div className="v2-task-actions"><Button disabled={busy} onClick={()=>void recover()}>{busy?"正在核对…":"核对保存结果"}</Button><Button variant="outline" disabled={busy} onClick={onLibrary}>返回我的菜谱</Button></div></section>;
}
