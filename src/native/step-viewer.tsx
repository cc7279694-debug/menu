import type { RecipeDetails } from "./recipe-model";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, List, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RecipePreparations, RecipeStepContent } from "./recipe-step-content";
import { IngredientsList, V2Button } from "./ui-v2/components";
import { NativeV2Sheet } from "./ui-v2/native-sheet";
import { useControlClearance } from "./ui-v2/use-control-clearance";
import { LocalImage } from "./local-image";
import { useV2Appearance } from "./ui-v2/appearance";
export type StepViewerProps = {
  recipe: RecipeDetails; mode: "focus" | "guided"; initialIndex: number;
  onClose: () => void; onComplete: () => void; busy?: boolean; error?: string;
};
export function StepViewer({ recipe, mode, initialIndex, onClose, onComplete, busy = false, error }: StepViewerProps) {
  const { theme, solid } = useV2Appearance();
  const [index, setIndex] = useState(() => mode === "guided" ? 0 : Math.max(0, Math.min(recipe.steps.length - 1, initialIndex)));
  const [overlay, setOverlay] = useState<"ingredients" | "image" | null>(null);
  const rootRef = useRef<HTMLElement>(null), controlsRef = useRef<HTMLElement>(null);
  const count = recipe.steps.length;
  useControlClearance(rootRef, controlsRef);
  return <Dialog open onOpenChange={open => {
    if (!open && !busy && overlay === null) onClose();
  }}>
    <DialogContent showCloseButton={false} className="recipio-ui-v2 v2-production-cooking v2-g5-cooking top-0 left-0 translate-x-0 translate-y-0"
      data-v2-theme={theme} data-v2-solid={solid} data-v2-dark="true">
      <section className="recipio-ui-v2 v2-cooking" data-v2-theme={theme} data-v2-solid={solid} data-v2-dark="true" ref={rootRef}>
        <header className="v2-cook-header">
          <DialogTitle className="sr-only">{mode === "guided" ? "引导烹饪" : "单步查看"}</DialogTitle>
          <DialogDescription className="sr-only">查看当前真实步骤。只有明确完成才记录下厨。</DialogDescription>
          <div className="v2-cook-toolbar v2-glass">
            <V2Button variant="icon" aria-label={mode === "guided" ? "退出引导" : "返回完整步骤"} disabled={busy} onClick={onClose}><X aria-hidden="true" /></V2Button>
            <p>{recipe.title}</p><V2Button variant="icon" aria-label="查看食材" disabled={busy} onClick={() => setOverlay("ingredients")}><List aria-hidden="true" /></V2Button>
          </div>
          {count ? <div className="v2-cook-progress"><progress aria-label="烹饪步骤进度" value={index + 1} max={count} />
            <span aria-live="polite">第 {index + 1} 步／共 {count} 步</span></div> : null}
        </header>
        <div className="v2-cook-scroll" key={index}>
          {count ? <><h1 className="v2-cook-step-label">步骤 {index + 1}</h1>
            <RecipeStepContent recipe={recipe} stepIndex={index} cooking onImage={() => setOverlay("image")} /></>
            : <p>还没有步骤，仍可以在菜谱页记录做过。</p>}
          {error ? <p role="alert" className="v2-cook-notice">{error}，可以再次点击完成重试。</p> : null}
        </div>
        {count ? <footer className="v2-cook-footer v2-glass" ref={controlsRef}>
          <V2Button variant="text" disabled={busy || index === 0} onClick={() => setIndex(value => value - 1)}><ArrowLeft aria-hidden="true" />上一步</V2Button>
          {mode === "guided" && index === count - 1 ? <V2Button disabled={busy} onClick={onComplete}>完成这道菜</V2Button>
            : <V2Button disabled={busy || index === count - 1} onClick={() => setIndex(value => value + 1)}>下一步<ArrowRight aria-hidden="true" /></V2Button>}
        </footer> : null}
      </section>
      <NativeV2Sheet open={overlay !== null} onOpenChange={open => { if (!open) setOverlay(null); }}
        title={overlay === "ingredients" ? "食材" : `步骤 ${index + 1} 图片`}
        description={overlay === "ingredients" ? "查看实际用量、提前准备和关键事项，不记录勾选进度。" : "本地原图，不裁掉做法信息。"} dark>
        {overlay === "ingredients" ? <div className="v2-cook-reference">
          <section className="v2-cook-reference-section" aria-label="食材用量">
            <IngredientsList ingredients={recipe.ingredients} />
          </section>
          {recipe.preparations.length ? <section className="v2-cook-reference-section">
            <h3>提前准备</h3><RecipePreparations preparations={recipe.preparations} />
          </section> : null}
          {recipe.keyTips.length ? <section className="v2-cook-reference-section">
            <h3>关键事项</h3><ul className="v2-cook-reference-tips">
              {recipe.keyTips.map((tip, tipIndex) => <li key={tipIndex}>
                <p>{tip.instruction}{tip.stepNumber !== null ? `（步骤 ${tip.stepNumber}）` : ""}</p>
              </li>)}
            </ul>
          </section> : null}
        </div>
          : overlay === "image" && recipe.steps[index]?.imagePath ? <LocalImage path={recipe.steps[index].imagePath} alt={`步骤 ${index + 1} 图片`} className="v2-large-image" /> : null}
      </NativeV2Sheet>
    </DialogContent>
  </Dialog>;
}
