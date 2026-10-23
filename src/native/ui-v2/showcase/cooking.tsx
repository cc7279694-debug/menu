import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, List, X } from "lucide-react";
import { IngredientsList, V2Button, V2Image, V2Sheet } from "../components";
import type { DemoRecipe } from "./demo-data";
import { useV2Appearance } from "../appearance";
import { useControlClearance } from "../use-control-clearance";

export function CookingScreen({ item, mode, initialIndex, onClose, onComplete }: {
  item: DemoRecipe; mode: "guided" | "focus"; initialIndex: number; onClose: () => void; onComplete: () => void;
}) {
  const { theme, solid } = useV2Appearance();
  const rootRef = useRef<HTMLElement>(null);
  const controlsRef = useRef<HTMLElement>(null);
  useControlClearance(rootRef, controlsRef);
  const recipe = item.details;
  const [index, setIndex] = useState(() => mode === "guided" ? 0 : Math.max(0, Math.min(initialIndex, recipe.steps.length - 1)));
  const [overlay, setOverlay] = useState<"ingredients" | "image" | null>(null);
  const [completed, setCompleted] = useState(false);
  const completionStarted = useRef(false);
  const step = recipe.steps[index];
  const count = recipe.steps.length;
  return <section ref={rootRef} className="recipio-ui-v2 v2-cooking" data-v2-theme={theme} data-v2-solid={solid} data-v2-dark="true" aria-label={mode === "guided" ? "引导烹饪" : "单步查看"}>
    <header className="v2-cook-header"><div className="v2-cook-toolbar v2-glass">
      <V2Button variant="icon" aria-label={mode === "guided" ? "退出引导" : "返回完整步骤"} onClick={onClose}><X aria-hidden="true" /></V2Button>
      <p>{recipe.title}</p><V2Button variant="icon" aria-label="查看食材" onClick={() => setOverlay("ingredients")}><List aria-hidden="true" /></V2Button>
    </div>{count ? <div className="v2-cook-progress"><progress aria-label="烹饪步骤进度" value={index + 1} max={count} /><span aria-live="polite">第 {index + 1} 步／共 {count} 步</span></div> : null}</header>
    <div className="v2-cook-scroll" key={index}>
      <h1>{count ? `步骤 ${index + 1}` : "还没有步骤"}</h1><p className="v2-cook-instruction">{step?.instruction ?? "请返回完整菜谱，随时补充自己的做法。"}</p>
      {recipe.keyTips.filter((tip) => tip.stepNumber === index + 1).map((tip, i) => <aside className="v2-cook-tip" key={i}><strong>这一步留意</strong><p>{tip.instruction}</p></aside>)}
      {item.stepImages?.[index] ? <button className="v2-step-image-button v2-cook-image-button" aria-label={`查看步骤 ${index + 1} 大图`} onClick={() => setOverlay("image")}><V2Image src={item.stepImages[index]} alt={`步骤 ${index + 1} 参考（演示图片）`} className="v2-cook-image" eager /></button> : null}
      {completed ? <p role="status" className="v2-cook-notice">演示完成确认。未写入任何做菜记录。</p> : null}
    </div>
    {count ? <footer className="v2-cook-footer v2-glass" ref={controlsRef}><V2Button variant="secondary" disabled={index === 0 || completed} onClick={() => setIndex((i) => i - 1)}><ArrowLeft aria-hidden="true" />上一步</V2Button>
      {mode === "guided" && index === count - 1 ? <V2Button disabled={completed} onClick={() => {
        if (completionStarted.current) return; completionStarted.current = true; setCompleted(true); onComplete();
      }}>完成这道菜</V2Button> : <V2Button disabled={index >= count - 1 || completed} onClick={() => setIndex((i) => i + 1)}>下一步<ArrowRight aria-hidden="true" /></V2Button>}
    </footer> : null}
    <V2Sheet open={overlay !== null} onOpenChange={(open) => { if (!open) setOverlay(null); }} title={overlay === "image" ? `步骤 ${index + 1} 图片` : "食材清单"} description={overlay === "image" ? "生成测试图片，仅用于视觉评审。" : "只读查看，不记录勾选或完成进度。"} dark>
      {overlay === "image" ? <V2Image src={item.stepImages?.[index] ?? null} alt={`步骤 ${index + 1} 图片大图（演示图片）`} className="v2-large-image" eager /> : <IngredientsList ingredients={recipe.ingredients} />}
    </V2Sheet>
  </section>;
}
