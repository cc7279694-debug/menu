import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { createAiBridge, createAiKeyPort, safeAiError, type AiKeyPort, type AiPreflightResult } from "./native-bridge";

export function AiSettings({ keys, onChanged, verifyAccess }: {keys?: AiKeyPort; onChanged:()=>void; verifyAccess?:()=>Promise<AiPreflightResult>}) {
  const port=useMemo(()=>keys??createAiKeyPort(),[keys]);
  const [configured,setConfigured]=useState<boolean|null>(null), [busy,setBusy]=useState(false), [error,setError]=useState(""), [supported,setSupported]=useState(true), [confirm,setConfirm]=useState(false);
  const lock=useRef(false), alive=useRef(true);
  const [verifyConfirm,setVerifyConfirm]=useState(false),[verified,setVerified]=useState("");
  useEffect(()=>{
    alive.current=true;let current=true;
    port.hasAiKey().then(r=>{if(current)setConfigured(r.configured);}).catch(e=>{if(current){const safe=safeAiError(e);setError(safe.message);if(safe.code==="native_unavailable")setSupported(false);}});
    return ()=>{current=false;alive.current=false;};
  },[port]);
  async function work(action: "read"|"save"|"delete"|"verify") {
    if(lock.current)return;lock.current=true;setBusy(true);setError("");
    try {
      if(action==="read"){const r=await port.hasAiKey();if(alive.current)setConfigured(r.configured);}
      else if(action==="save"){const r=await port.saveAiKey();if(alive.current)setConfigured(r.configured);if(!r.cancelled){setVerified("");onChanged();}}
      else if(action==="delete"){await port.deleteAiKey();if(alive.current){setConfigured(false);setConfirm(false);setVerified("");}onChanged();}
      else {await (verifyAccess??(()=>createAiBridge().preflight()))();if(alive.current){setVerified("模型访问已验证：qwen3.8-flash（北京）");setVerifyConfirm(false);}}
    }catch(e){if(alive.current){const safe=safeAiError(e);const diagnostic=safe.diagnostic;setError(safe.message+(diagnostic?.httpStatus?` HTTP ${diagnostic.httpStatus}${diagnostic.providerCode?` · ${diagnostic.providerCode}`:""}`:""));setVerifyConfirm(false);}}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  return <Card>
    <CardHeader><CardTitle><h3>AI 整理</h3></CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">可选联网功能。文字和选中的截图会发送给阿里云百炼，可能产生 API 费用；已有菜谱始终可离线使用。</p>
      {supported && <p aria-live="polite">{configured===null?"正在读取本机密钥状态…":configured?"已配置":"未配置"}</p>}
      <p className="text-sm text-muted-foreground">密钥仅通过 Android 原生密码框设置，保存在本机安全存储，不进入菜谱或备份。更换设备需重新设置。</p>
      {error && <p role="alert">{error}</p>}
      {verified && <p aria-live="polite">{verified}</p>}
      {supported && <div className="flex flex-wrap gap-3">
        <Button className="min-h-11" disabled={busy||configured===null&&!error} onClick={()=>void work("save")}>{configured?"更换 AI 密钥":"设置 AI 密钥"}</Button>
        {configured && <Button className="min-h-11" variant="outline" disabled={busy} onClick={()=>setConfirm(true)}>删除 AI 密钥</Button>}
        {configured && <Button className="min-h-11" variant="outline" disabled={busy} onClick={()=>setVerifyConfirm(true)}>验证模型访问</Button>}
        {error && <Button className="min-h-11" variant="outline" disabled={busy} onClick={()=>void work("read")}>重新读取状态</Button>}
      </div>}
      <Dialog open={confirm} onOpenChange={v=>{if(!busy)setConfirm(v);}}>
        <DialogContent showCloseButton={!busy}>
          <DialogTitle>删除本机 AI 密钥？</DialogTitle><DialogDescription>菜谱和备份不受影响；再次使用 AI 整理时需要重新配置密钥。</DialogDescription>
          <DialogFooter><Button className="min-h-11" variant="outline" disabled={busy} onClick={()=>setConfirm(false)}>保留密钥</Button><Button className="min-h-11" disabled={busy} onClick={()=>void work("delete")}>确认删除</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={verifyConfirm} onOpenChange={v=>{if(!busy)setVerifyConfirm(v);}}>
        <DialogContent showCloseButton={!busy}>
          <DialogTitle>验证 qwen3.8-flash 访问？</DialogTitle><DialogDescription>将发送一张极小的程序生成图片到北京百炼接口，检查图片与 JSON 输出能力，可能产生少量 API 费用。不会发送已有菜谱，也不会自动重试。</DialogDescription>
          <DialogFooter><Button className="min-h-11" variant="outline" disabled={busy} onClick={()=>setVerifyConfirm(false)}>暂不验证</Button><Button className="min-h-11" disabled={busy} onClick={()=>void work("verify")}>{busy?"正在验证…":"确认验证"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </CardContent>
  </Card>;
}
