import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronRight, Clock3, Flame, MoreHorizontal, NotebookPen, TriangleAlert, Utensils } from "lucide-react";
import type { RecipeDetails } from "./recipe-model";
import { LocalImage } from "./local-image";
import { RecipeStepContent } from "./recipe-step-content";
import { IngredientsList, V2Button } from "./ui-v2/components";
import { NativeV2Sheet } from "./ui-v2/native-sheet";
import { useControlClearance } from "./ui-v2/use-control-clearance";

export function RecipeDetail({ recipe, onEdit, onBack, onDelete, onFocus, onGuided, onComplete,
  completing = false, overview, onChanges,
}: {
  recipe: RecipeDetails; onEdit: () => void; onBack: () => void; onDelete: () => void;
  onFocus?: (index: number, trigger: HTMLElement) => void;
  onGuided?: (trigger: HTMLElement) => void; onComplete?: () => void;
  completing?: boolean; overview?: ReactNode; onChanges?: () => void;
}) {
  const rootRef = useRef<HTMLElement>(null), controlsRef = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);
  const [image, setImage] = useState<{ path: string; title: string } | null>(null);
  useControlClearance(rootRef, controlsRef);
  const navigation = <div className="v2-detail-navigation">
    <V2Button variant="icon" aria-label="返回菜谱库" disabled={completing} onClick={onBack}><ArrowLeft aria-hidden="true" /></V2Button>
    <V2Button variant="icon" aria-label="更多菜谱操作" disabled={completing} onClick={() => setMore(true)}><MoreHorizontal aria-hidden="true" /></V2Button>
  </div>;
  return <article className="v2-detail v2-production-detail" ref={rootRef}>
    <div className="v2-detail-scroll">
      {recipe.coverPath ? <div className="v2-detail-hero">
        <button className="v2-cover-button" aria-label="查看菜谱封面大图" disabled={completing}
          onClick={() => setImage({ path: recipe.coverPath!, title: "菜谱封面" })}>
          <LocalImage path={recipe.coverPath} alt={`${recipe.title} 封面`} className="v2-cover" />
        </button>{navigation}
      </div> : <div className="v2-detail-navigation-inline">{navigation}</div>}
      <div className={`v2-detail-body${recipe.coverPath ? " v2-detail-body--overlap" : ""}`}>
        <header><h1 className="v2-detail-title">{recipe.title}</h1><dl className="v2-meta">
          <div><Clock3 aria-hidden="true" /><dt>耗时</dt><dd>{recipe.totalMinutes === null ? "耗时未填写" : `${recipe.totalMinutes} 分钟`}</dd></div>
          {recipe.servings !== null ? <div><Utensils aria-hidden="true" /><dt>份量</dt><dd>{recipe.servings} 人份</dd></div> : null}
          {recipe.caloriesPerServing !== null ? <div className="v2-meta-calories"><Flame aria-hidden="true" /><dt>每份热量</dt><dd>约 {recipe.caloriesPerServing} kcal／份</dd></div> : null}
        </dl></header>
        <section className="v2-content-section"><h2>食材</h2><IngredientsList ingredients={recipe.ingredients} /></section>
        {recipe.preparations.length ? <section className="v2-content-section"><h2>提前准备</h2><ol className="v2-preparation-list">
          {recipe.preparations.map((preparation, index) => <li key={index}><span aria-hidden="true">{index + 1}</span><div>
            <p>{preparation.instruction}</p><p className="v2-secondary">
              {preparation.minutes !== null ? `约 ${preparation.minutes} 分钟` : ""}
              {preparation.timingText ? `${preparation.minutes !== null ? " · " : ""}${preparation.timingText}` : ""}
              {preparation.minutes === null && !preparation.timingText ? "时间未记录" : ""}
            </p></div></li>)}
        </ol></section> : null}
        {recipe.keyTips.length ? <section className="v2-content-section"><h2>关键事项</h2><div className="v2-callout">
          <TriangleAlert aria-hidden="true" /><div>{recipe.keyTips.map((tip, index) => <p key={index}>
            {tip.instruction}{tip.stepNumber !== null ? `（步骤 ${tip.stepNumber}）` : ""}
          </p>)}</div></div></section> : null}
        <section className="v2-content-section"><div className="v2-section-heading"><h2>完整步骤</h2>
          {recipe.steps.length ? <span className="v2-secondary">共 {recipe.steps.length} 步</span> : null}</div>
          {recipe.steps.length ? <ol className="v2-step-list">{recipe.steps.map((_, index) => <li key={index}>
            <span className="v2-step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div>
              <div className="v2-step-heading"><h3>步骤 {index + 1}</h3>
                {onFocus ? <V2Button variant="text" aria-label={`放大步骤 ${index + 1}`} disabled={completing}
                  onClick={event => onFocus(index, event.currentTarget)}>单步查看<ChevronRight aria-hidden="true" /></V2Button> : null}
              </div><RecipeStepContent recipe={recipe} stepIndex={index}
                onImage={(path, title) => setImage({ path, title })} />
            </div></li>)}</ol> : <p className="v2-secondary">只记菜名也没关系，需要时再补充做法。</p>}
        </section>
        {recipe.notes ? <section className="v2-content-section"><h2>个人备注</h2><p className="v2-notes"><NotebookPen aria-hidden="true" />{recipe.notes}</p></section> : null}
        <section className="v2-content-section v2-production-history v2-production-overview">
          <V2Button variant="secondary" disabled={!onComplete || completing} onClick={onComplete}>完成这道菜</V2Button>
          {overview}
          {onChanges ? <V2Button variant="text" disabled={completing} onClick={onChanges}>查看修改记录</V2Button> : null}
        </section>
      </div>
    </div>
    <footer className="v2-bottom-actions v2-glass" ref={controlsRef}>
      <V2Button variant="text" aria-label="编辑菜谱" disabled={completing} onClick={onEdit}>编辑</V2Button>
      {recipe.steps.length ? <V2Button aria-label="开始引导烹饪" disabled={completing || !onGuided} onClick={event => onGuided?.(event.currentTarget)}>开始烹饪</V2Button>
        : <V2Button disabled={completing} onClick={onEdit}>补充做法</V2Button>}
    </footer>
    <NativeV2Sheet open={more} onOpenChange={value => { if (!completing) setMore(value); }}
      title="菜谱操作" description="修改自己的做法，记录下厨，或删除并在五秒内撤销。">
      <div className="v2-action-list">
        <V2Button variant="text" disabled={completing} onClick={() => { setMore(false); onEdit(); }}>编辑菜谱</V2Button>
        <V2Button variant="text" disabled={completing || !onComplete} onClick={() => { setMore(false); onComplete?.(); }}>记录做过</V2Button>
        {onChanges ? <V2Button variant="text" disabled={completing} onClick={() => { setMore(false); onChanges(); }}>查看修改记录</V2Button> : null}
        <V2Button variant="danger" disabled={completing} onClick={() => { setMore(false); onDelete(); }}>删除这道菜</V2Button>
      </div>
    </NativeV2Sheet>
    <NativeV2Sheet open={image !== null} onOpenChange={value => { if (!value) setImage(null); }}
      title={image?.title ?? "本地图片"} description="仅查看当前菜谱实际保存的本地图片。">
      {image ? <LocalImage path={image.path} alt={image.title} className="v2-large-image" /> : null}
    </NativeV2Sheet>
  </article>;
}
