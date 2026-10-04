import {useState} from "react";
import {Button} from "@/components/ui/button";
import type {RecipeDetails} from "../recipe-model";
import type {AiIntakeService} from "./service";
import {safeAiError} from "./native-bridge";
export function AiSaveRecovery({service,onSaved,onAbsent,onLibrary}:{service:AiIntakeService;onSaved:(recipe:RecipeDetails)=>void;onAbsent:()=>void;onLibrary:()=>void}){
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function recover(){if(busy)return;setBusy(true);setError("");try{const recipe=await service.recoverSave();if(recipe)onSaved(recipe);else onAbsent();}catch(e){setError(safeAiError(e).message);}finally{setBusy(false);}}
  return <section className="space-y-4"><h2 className="text-2xl font-semibold">先核对保存结果</h2><p>当前无法确认这次菜谱是否已保存。为避免重复，输入与新建已暂停；核对只读取原编号，不重新创建菜谱。</p>{error&&<p role="alert">{error}</p>}<div className="flex flex-wrap gap-3"><Button className="min-h-11" disabled={busy} onClick={()=>void recover()}>{busy?"正在核对…":"核对保存结果"}</Button><Button className="min-h-11" variant="outline" disabled={busy} onClick={onLibrary}>返回我的菜谱</Button></div></section>;
}
