import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { BackupControls } from "./backup-controls";
import type { BackupState } from "./service";
import { goldenSource, goldenAssets, manifestFor } from "./test-fixtures";
import { toPortableData } from "./references";
function controller(initial: BackupState = {phase:"idle"}) {
  let state=initial;const listeners=new Set<()=>void>();
  const service={getState:()=>state,subscribe:(l:()=>void)=>{listeners.add(l);return()=>listeners.delete(l);},export:vi.fn(async()=>{}),inspectRestore:vi.fn(async()=>{}),confirmReplace:vi.fn(async()=>{}),cancel:vi.fn(async()=>{})};
  return {service,emit:(s:BackupState)=>act(()=>{state=s;listeners.forEach(l=>l());})};
}
const manifest=manifestFor(toPortableData(goldenSource(),goldenAssets()));
it("exposes local Android file controls, privacy notice and non-native boundary",()=>{const c=controller();const {unmount}=render(<BackupControls service={c.service}/>);fireEvent.click(screen.getByRole("button",{name:"导出完整备份"}));expect(c.service.export).toHaveBeenCalledTimes(1);expect(screen.getByText(/此备份未加密/)).toBeInTheDocument();unmount();render(<BackupControls/>);expect(screen.getByText(/浏览器预览不能代替/)).toBeInTheDocument();expect(screen.queryByRole("button",{name:"导出完整备份"})).not.toBeInTheDocument();});
it("previews exact quantities then requires explicit second confirmation",()=>{const c=controller({phase:"preview",mode:"restore",manifest,currentCount:7});render(<BackupControls service={c.service}/>);expect(screen.getByText(/当前设备上的 7 道菜谱/)).toBeInTheDocument();expect(screen.getByText(/修改记录：1/)).toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"恢复并替换当前数据"}));expect(c.service.confirmReplace).not.toHaveBeenCalled();fireEvent.click(screen.getByRole("button",{name:"确认替换 7 道菜谱"}));expect(c.service.confirmReplace).toHaveBeenCalledTimes(1);});
it("preview cancel/back never confirms; committing blocks cancellation and duplicate actions",()=>{const c=controller({phase:"preview",mode:"restore",manifest,currentCount:1});render(<BackupControls service={c.service}/>);const back=new Event("recipio:back",{cancelable:true});fireEvent(window,back);expect(back.defaultPrevented).toBe(true);expect(c.service.cancel).toHaveBeenCalledTimes(1);expect(c.service.confirmReplace).not.toHaveBeenCalled();c.emit({phase:"restoring",mode:"restore"});expect(screen.getByRole("button",{name:"导出完整备份"})).toBeDisabled();expect(screen.queryByRole("button",{name:"取消恢复"})).not.toBeInTheDocument();});
it("shows errors, retries and persists service progress across remount without duplicate work",()=>{const c=controller({phase:"error",message:"文件哈希不一致"});const ui=render(<BackupControls service={c.service}/>);expect(screen.getByRole("alert")).toHaveTextContent("文件哈希不一致");fireEvent.click(screen.getByRole("button",{name:"导入并恢复"}));expect(c.service.inspectRestore).toHaveBeenCalledTimes(1);c.emit({phase:"writing",mode:"export"});ui.unmount();render(<BackupControls service={c.service}/>);expect(screen.getByRole("status")).toHaveTextContent(/写入/);expect(c.service.export).not.toHaveBeenCalled();});
