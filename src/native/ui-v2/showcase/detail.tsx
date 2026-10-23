import type { RefObject } from "react";
import { ArrowLeft, ChevronRight, Clock3, Flame, MoreHorizontal, NotebookPen, Utensils, TriangleAlert } from "lucide-react";
import { IngredientsList, V2Button, V2Image } from "../components";
import type { DemoRecipe } from "./demo-data";

export function DetailScreen({ item, scrollRef, onBack, onMore, onEdit, onGuided, onFocus, onImage }: {
  scrollRef?: RefObject<HTMLDivElement | null>;
  item: DemoRecipe; onBack: () => void; onMore: () => void; onEdit: () => void;
  onGuided: () => void; onFocus: (index: number) => void; onImage: (src: string, title: string) => void;
}) {
  const recipe = item.details;
  const cover = item.image;
  const navigation = <div className="v2-detail-navigation"><V2Button variant="icon" aria-label="返回菜谱" onClick={onBack}><ArrowLeft aria-hidden="true" /></V2Button><V2Button variant="icon" aria-label="更多菜谱操作" onClick={onMore}><MoreHorizontal aria-hidden="true" /></V2Button></div>;
  return <article className="v2-detail">
    <div className="v2-detail-scroll" ref={scrollRef}>
      {cover ? <div className="v2-detail-hero">
        <button className="v2-cover-button" onClick={() => onImage(cover, "菜谱封面")} aria-label="查看菜谱封面大图"><V2Image src={cover} alt={`${recipe.title}封面（演示图片）`} className="v2-cover" eager /></button>
        {navigation}
      </div> : <div className="v2-detail-navigation-inline">{navigation}</div>}
      <div className={`v2-detail-body${item.image ? " v2-detail-body--overlap" : ""}`}>
        <header><h1 className="v2-detail-title">{recipe.title}</h1>
          <dl className="v2-meta">
            <div><Clock3 aria-hidden="true" /><dt>耗时</dt><dd>{recipe.totalMinutes === null ? "耗时未填写" : `${recipe.totalMinutes} 分钟`}</dd></div>
            {recipe.servings !== null ? <div><Utensils aria-hidden="true" /><dt>份量</dt><dd>{recipe.servings} 人份</dd></div> : null}
            {recipe.caloriesPerServing !== null ? <div><Flame aria-hidden="true" /><dt>每份热量</dt><dd>约 {recipe.caloriesPerServing} kcal／份</dd></div> : null}
          </dl>
        </header>
        <section className="v2-content-section"><h2>食材</h2><IngredientsList ingredients={recipe.ingredients} /></section>
        {recipe.preparations.length ? <section className="v2-content-section"><h2>提前准备</h2><ol className="v2-preparation-list">{recipe.preparations.map((p, i) => <li key={i}><span aria-hidden="true">{i + 1}</span><div><p>{p.instruction}</p>{p.minutes !== null || p.timingText ? <p className="v2-secondary">{p.minutes !== null ? `约 ${p.minutes} 分钟` : p.timingText}</p> : null}</div></li>)}</ol></section> : null}
        {recipe.keyTips.length ? <section className="v2-content-section"><h2>关键事项</h2><div className="v2-callout"><TriangleAlert aria-hidden="true" /><div>{recipe.keyTips.map((tip, i) => <p key={i}>{tip.instruction}</p>)}</div></div></section> : null}
        <section className="v2-content-section"><div className="v2-section-heading"><h2>完整步骤</h2>{recipe.steps.length ? <span className="v2-secondary">共 {recipe.steps.length} 步</span> : null}</div>
          {recipe.steps.length ? <ol className="v2-step-list">{recipe.steps.map((step, i) => {
            const photo = item.stepImages?.[i];
            return <li key={i} id={`demo-step-${i}`}>
            <div className="v2-step-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</div>
            <div><div className="v2-step-heading"><h3>步骤 {i + 1}</h3><V2Button variant="text" data-v2-focus={`focus-${i}`} aria-label={`单步查看步骤 ${i + 1}`} onClick={() => onFocus(i)}>单步查看<ChevronRight aria-hidden="true" /></V2Button></div><p>{step.instruction}</p>
              {photo ? <button className="v2-step-image-button" aria-label={`查看步骤 ${i + 1} 大图`} onClick={() => onImage(photo, `步骤 ${i + 1} 图片`)}><V2Image src={photo} alt={`步骤 ${i + 1} 参考（演示图片）`} className="v2-step-image" /></button> : null}
            </div>
          </li>; })}</ol> : <p className="v2-secondary">还没有步骤，可以随时补充。</p>}
        </section>
        {recipe.notes ? <section className="v2-content-section"><h2>自己的备注</h2><p className="v2-notes"><NotebookPen aria-hidden="true" />{recipe.notes}</p></section> : null}
      </div>
    </div>
    <footer className="v2-bottom-actions v2-glass"><V2Button variant="secondary" onClick={onEdit}>编辑</V2Button><V2Button data-v2-focus="guided" onClick={recipe.steps.length ? onGuided : onEdit}>{recipe.steps.length ? "开始烹饪" : "补充做法"}</V2Button></footer>
  </article>;
}
