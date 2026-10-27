import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { aiImagePreviewUri, parseTransferredAiImages, type AiTemporaryImage } from "../ai/native-bridge";
import { V2Image } from "../ui-v2/components";
import { NativeV2Sheet } from "../ui-v2/native-sheet";
import type { IntakeSourceContext } from "./source-context";

export type IntakeSourcePanelProps = {
  source: IntakeSourceContext | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function controlledImageUri(image: Readonly<AiTemporaryImage>, operationId: string): string | null {
  try {
    // Reuse the existing Native ownership/URI validator, without broadening it.
    parseTransferredAiImages({ images: [image] }, operationId);
    return aiImagePreviewUri(image);
  } catch {
    return null;
  }
}

export function IntakeSourcePanel({ source, open, onOpenChange }: IntakeSourcePanelProps) {
  const opening = useRef<{ open: boolean; identity: object | null }>({ open: false, identity: null });
  const [imageId, setImageId] = useState<string | null>(null);
  // Keep only the opening identity. Retaining source text/images here would outlive the service owner.
  if (open && !opening.current.open) opening.current = { open: true, identity: source?.identity ?? null };
  if (!open && opening.current.open) opening.current = { open: false, identity: null };
  let current = false;
  try { current = !!source && source.identity === opening.current.identity && source.isCurrent(); }
  catch { /* The owner is no longer available; do not render a retained source. */ }
  const visible = open && current ? source : null;
  useEffect(() => {
    if (open && !current) onOpenChange(false);
  }, [open, current, onOpenChange]);

  const images = visible?.kind === "ai-input" ? visible.images : [];
  const selectedImage = images.find(image => image.id === imageId) ?? images[0];
  const selectedUri = visible?.kind === "ai-input" && selectedImage ? controlledImageUri(selectedImage, visible.operationId) : null;
  return <NativeV2Sheet open={!!visible} onOpenChange={onOpenChange} title="本轮来源" description="仅查看本轮已有信息；打开来源不代表已经核实，也不会保存来源。">
    {visible && <div className="v2-intake-source-content">
      {visible.kind === "ai-input" && <>
        {!!visible.text.trim() && <section aria-label="本轮提供的文字"><h3>本轮提供的文字</h3><p className="v2-intake-source-text">{visible.text}</p></section>}
        {images.length > 0 && <section aria-label="本轮提供的截图"><h3>本轮提供的截图</h3><p className="v2-task-note">这是本轮提供的截图，可能已经缩小处理；不会成为封面或步骤图。</p>
          {images.length > 1 && <div className="v2-task-actions">{images.map((image, index) => <Button key={image.id} type="button" variant="outline" aria-label={`查看截图 ${index + 1}`} aria-pressed={image.id === selectedImage?.id} onClick={() => setImageId(image.id)}>截图 {index + 1}</Button>)}</div>}
          {selectedUri && selectedImage ? <V2Image key={selectedImage.id} className="v2-source-image-full" src={selectedUri} alt={`本轮截图 ${images.indexOf(selectedImage) + 1}`} /> : <p role="status">截图暂不可用。</p>}
        </section>}
      </>}
      {(visible.kind === "web-parser" || visible.kind === "web-ai") && <>
        <p className="v2-task-note">以下是清洗后的网页文字，并非完整原网页。</p>
        {visible.kind === "web-ai" && <p className="v2-task-note">网页文字与 AI 整理结果是不同内容，请对照核对。</p>}
        {!!visible.visible.title && <h3>{visible.visible.title}</h3>}
        {visible.selected && <section aria-label="选中的网页菜谱"><h3>选中的网页菜谱</h3><p>{visible.selected.recipe.title}</p><p className="v2-task-note">{visible.selected.quality === "complete" ? "网页结构包含食材和步骤，仍需按实际情况核对。" : "网页菜谱信息不完整。"}</p>{visible.selected.warnings.map((warning, index) => <p key={index} className="v2-task-note">{warning}</p>)}</section>}
        {visible.visible.wasTruncated && <p role="status" className="v2-task-status">网页正文过长，已保留部分完整段落，可能缺少信息。</p>}
        {visible.visible.text ? <p className="v2-intake-source-text">{visible.visible.text}</p> : <p className="v2-task-note">本轮没有可展示的网页正文。</p>}
      </>}
      {visible.kind === "finder" && <>
        <p className="v2-task-note">本轮选定来源信息，非完整正文。</p>
        <h3>{visible.selected.title}</h3><p><span>来源站点：</span><span>{visible.selected.sourceHost}</span></p>
        {!!visible.selected.summary && <section aria-label="选定来源摘要"><h3>候选摘要</h3><p className="v2-intake-source-text">{visible.selected.summary}</p><p className="v2-task-note">候选摘要不是原文逐字引述，不能作为原文证据。</p></section>}
        <p className="v2-task-note">本轮未保留来源正文。</p>
      </>}
    </div>}
  </NativeV2Sheet>;
}
