import { useRef, useState } from "react";
import { AlertCircle, ArrowUpRight, BookOpen, Check, ImageIcon, Plus, Search, Trash2, X } from "lucide-react";
import { StateBadge, V2Button, V2Sheet } from "../components";
import { demoRecipes } from "./demo-data";
import { MaterialSample } from "./material-sample";

type ButtonVariant = "primary" | "secondary" | "icon" | "danger";
type DemoState = "default" | "pressed" | "focus" | "disabled" | "busy" | "error";

const buttonStates: readonly { state: DemoState; title: string; hint: string }[] = [
  { state: "default", title: "默认", hint: "点击查看反馈" },
  { state: "pressed", title: "按下", hint: "按下外观对照" },
  { state: "focus", title: "焦点", hint: "也可用 Tab 实际聚焦" },
  { state: "disabled", title: "禁用", hint: "请先完成必要确认" },
  { state: "busy", title: "处理中", hint: "状态样例，不发起请求" },
  { state: "error", title: "失败后重试", hint: "保留内容，可再次操作" },
];

const buttonVariants: readonly { variant: ButtonVariant; title: string; description: string }[] = [
  { variant: "primary", title: "主要操作", description: "每个任务区域的下一步。" },
  { variant: "secondary", title: "次要操作", description: "支持返回、继续与取消。" },
  { variant: "icon", title: "图标操作", description: "48 × 48 触区，始终有名称。" },
  { variant: "danger", title: "危险操作", description: "明确后果，保留安全选择。" },
];

const buttonCopy: Record<ButtonVariant, Record<DemoState, string>> = {
  primary: { default: "保存样例", pressed: "保存样例", focus: "保存样例", disabled: "等待确认", busy: "正在保存…", error: "重试保存" },
  secondary: { default: "继续编辑", pressed: "继续编辑", focus: "继续编辑", disabled: "等待处理", busy: "正在处理…", error: "重新打开" },
  icon: { default: "新增样例", pressed: "新增样例", focus: "新增样例", disabled: "新增暂不可用", busy: "正在添加…", error: "重试添加" },
  danger: { default: "移除样例", pressed: "移除样例", focus: "移除样例", disabled: "暂不可移除", busy: "正在移除…", error: "重试移除" },
};

function ButtonSamples({ variant, title, description, onAction }: {
  variant: ButtonVariant;
  title: string;
  description: string;
  onAction(message: string): void;
}) {
  return (
    <div className="v2-sample-group">
      <div className="v2-sample-group-heading">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="v2-button-sample-grid">
        {buttonStates.map(({ state, title: stateTitle, hint }) => (
          <div className="v2-button-sample" key={state}>
            <span className="v2-sample-state">{stateTitle}</span>
            <V2Button
              variant={variant}
              className="v2-gallery-button"
              data-demo-state={state}
              disabled={state === "disabled"}
              busy={state === "busy"}
              aria-label={variant === "icon" ? `${stateTitle}：${buttonCopy[variant][state]}` : undefined}
              onClick={() => onAction(`${title} · ${stateTitle}已响应；仅展示当前页面反馈。`)}
            >
              {variant === "icon" ? (state === "busy" ? null : <Plus size={22} aria-hidden="true" />) : buttonCopy[variant][state]}
            </V2Button>
            <span className="v2-sample-hint">{hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComponentsPage() {
  const [feedback, setFeedback] = useState("点击任一可用按钮，查看操作反馈。");
  const [search, setSearch] = useState("");
  const [recipeName, setRecipeName] = useState("可乐鸡翅");
  const [invalidName, setInvalidName] = useState("");
  const [notes, setNotes] = useState("收汁时留一点汤，拌饭刚刚好。");
  const [reviewed, setReviewed] = useState(false);
  const [reviewSaved, setReviewSaved] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const cancelConfirmation = useRef<HTMLButtonElement>(null);
  const recipe = demoRecipes[0];
  const cardRecipe = demoRecipes[1];
  const matches = search.trim() ? demoRecipes.filter(({ details }) => details.title.includes(search.trim())) : [];

  return (
    <div className="v2-components-page">
      <header className="v2-gallery-intro">
        <span className="v2-gallery-kicker">RECIPIO · UI V2</span>
        <h1>让每一次操作<br />都有清楚的回应。</h1>
        <p>组件与状态样板</p>
        <div className="v2-demo-notice">
          <BookOpen size={20} aria-hidden="true" />
          <p>以下均为演示内容。操作只改变当前页面，不联网、不写入正式菜谱，刷新后重置。</p>
        </div>
      </header>

      <MaterialSample onOpen={() => setSheetOpen(true)} />

      <section className="v2-gallery-section" aria-labelledby="v2-actions-title">
        <div className="v2-gallery-section-heading">
          <span className="v2-gallery-index" aria-hidden="true">01</span>
          <div><h2 id="v2-actions-title">动作，分清主次</h2><p>同一种行为，完整覆盖六种状态。</p></div>
        </div>
        <p className="v2-gallery-explainer">按下与焦点格用于外观对照；Tab 键可检查实际键盘焦点。禁用与处理中状态不可触发。</p>
        {buttonVariants.map((item) => <ButtonSamples key={item.variant} {...item} onAction={setFeedback} />)}
        <div className="v2-gallery-feedback" role="status" aria-live="polite">
          <Check size={18} aria-hidden="true" /><span>{feedback}</span>
        </div>
        <div className="v2-inline-samples">
          <V2Button variant="text" onClick={() => setFeedback("文字操作已响应；没有跳转或发起请求。")}>查看说明 <ArrowUpRight size={18} aria-hidden="true" /></V2Button>
          <V2Button variant="select" aria-pressed={toastVisible} onClick={() => setToastVisible((visible) => !visible)}>切换提示样例</V2Button>
        </div>
      </section>

      <section className="v2-gallery-section" aria-labelledby="v2-inputs-title">
        <div className="v2-gallery-section-heading">
          <span className="v2-gallery-index" aria-hidden="true">02</span>
          <div><h2 id="v2-inputs-title">输入，有迹可循</h2><p>名称一直可见，错误紧随字段。</p></div>
        </div>
        <div className="v2-form-sample">
          <label className="v2-field-label" htmlFor="v2-gallery-search">搜索演示菜谱</label>
          <div className="v2-gallery-search">
            <Search size={21} aria-hidden="true" />
            <input id="v2-gallery-search" ref={searchInput} type="search" value={search} placeholder="试试“鸡翅”" onChange={(event) => setSearch(event.target.value)} aria-describedby="v2-gallery-search-hint" />
            {search && <V2Button variant="icon" aria-label="清空演示搜索" onClick={() => { setSearch(""); searchInput.current?.focus(); }}><X size={20} aria-hidden="true" /></V2Button>}
          </div>
          <p id="v2-gallery-search-hint" className="v2-field-hint">只检索本页演示菜名，不发起请求。</p>
          {search.trim() && <p className="v2-search-sample-result" role="status">{matches.length ? matches.map(({ details }) => details.title).join("、") : "没有匹配的演示菜谱，可清空后重新输入。"}</p>}
        </div>
        <div className="v2-form-sample">
          <label className="v2-field-label" htmlFor="v2-gallery-name">菜名 <span>默认</span></label>
          <input className="v2-gallery-input" id="v2-gallery-name" value={recipeName} onChange={(event) => setRecipeName(event.target.value)} />
          <p className="v2-field-hint">点击或按 Tab 编辑，文字会保留在当前样板中。</p>
        </div>
        <div className="v2-form-sample">
          <label className="v2-field-label" htmlFor="v2-gallery-focus">菜名 <span>焦点外观对照</span></label>
          <input className="v2-gallery-input" id="v2-gallery-focus" data-demo-state="focus" defaultValue="番茄鸡蛋汤" />
        </div>
        <div className="v2-form-sample">
          <label className="v2-field-label" htmlFor="v2-gallery-error">菜名 <span>错误与恢复</span></label>
          <input className="v2-gallery-input" id="v2-gallery-error" value={invalidName} aria-invalid={!invalidName.trim()} aria-describedby="v2-gallery-name-error" placeholder="输入菜名后，错误提示消失" onChange={(event) => setInvalidName(event.target.value)} />
          <p id="v2-gallery-name-error" className={invalidName.trim() ? "v2-field-hint" : "v2-field-error"}>{invalidName.trim() ? "已补充演示菜名；未保存到正式菜谱。" : "请输入菜名。其他输入会完整保留。"}</p>
        </div>
        <div className="v2-form-sample">
          <label className="v2-field-label" htmlFor="v2-gallery-notes">我的备注 <span>多行输入</span></label>
          <textarea className="v2-gallery-input" id="v2-gallery-notes" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} aria-describedby="v2-gallery-notes-hint" />
          <p className="v2-field-hint" id="v2-gallery-notes-hint">保留换行，可自然增高；不会自动改写内容。</p>
        </div>
      </section>

      <section className="v2-gallery-section" aria-labelledby="v2-cards-title">
        <div className="v2-gallery-section-heading">
          <span className="v2-gallery-index" aria-hidden="true">03</span>
          <div><h2 id="v2-cards-title">内容，自然呈现</h2><p>有图与无图，都有完整的阅读次序。</p></div>
        </div>
        <div className="v2-card-samples">
          <button type="button" className="v2-gallery-recipe-card" onClick={() => setFeedback("番茄鸡蛋汤卡片已响应；这是演示卡片。")}>
            {cardRecipe.image && <img src={cardRecipe.image} alt="番茄鸡蛋汤（演示图片）" width={480} height={360} />}
            <span className="v2-gallery-card-copy"><span className="v2-gallery-card-eyebrow">有图 · 演示菜谱</span><strong>{cardRecipe.details.title}</strong><span>{cardRecipe.details.totalMinutes} 分钟 · {cardRecipe.details.servings} 人份</span></span>
          </button>
          <button type="button" className="v2-gallery-recipe-card v2-gallery-no-image" onClick={() => setFeedback("清蒸鱼卡片已响应；只有菜名也可以是一道普通菜谱。")}>
            <span className="v2-gallery-card-placeholder"><ImageIcon size={28} aria-hidden="true" /><span>未添加图片</span></span>
            <span className="v2-gallery-card-copy"><span className="v2-gallery-card-eyebrow">无图 · 演示菜谱</span><strong>{demoRecipes[4].details.title}</strong><span>耗时未填写</span></span>
          </button>
        </div>
        <div className="v2-gallery-callout">
          <AlertCircle size={20} aria-hidden="true" />
          <div><h3>收汁时，留在锅边观察</h3><p>关键事项用清楚的文字呈现。颜色帮助识别，不能代替说明。</p></div>
        </div>
      </section>

      <section className="v2-gallery-section" aria-labelledby="v2-review-title">
        <div className="v2-gallery-section-heading">
          <span className="v2-gallery-index" aria-hidden="true">04</span>
          <div><h2 id="v2-review-title">先检查，再确认</h2><p>来源标注保留原意，不替用户作判断。</p></div>
        </div>
        <div className="v2-review-sample">
          <div className="v2-review-intro"><h3>{recipe.details.title}</h3><span>审核样例</span></div>
          <dl className="v2-review-fields">
            <div><dt><StateBadge kind="explicit" />{recipe.details.ingredients[0].name}</dt><dd>{recipe.details.ingredients[0].amount}</dd></div>
            <div><dt><StateBadge kind="inferred" />总耗时</dt><dd>{recipe.details.totalMinutes} 分钟<span>请核对这一推断</span></dd></div>
            <div><dt><StateBadge kind="missing" />提前准备时长</dt><dd>未填写<span>空值不会改成 0</span></dd></div>
          </dl>
          <p className="v2-review-explainer">“来源明确”表示来源有标注，并不等于已独立验证。</p>
          <label className="v2-review-checkbox">
            <input type="checkbox" checked={reviewed} onChange={(event) => { setReviewed(event.target.checked); setReviewSaved(false); }} aria-describedby="v2-review-gate-hint" />
            <span>我已检查以上 AI 推断和缺失内容</span>
          </label>
          <p className="v2-field-hint" id="v2-review-gate-hint">{reviewed ? "现在可以确认这份样例。" : "请先确认推断和缺失内容，再保存审核样例。"}</p>
          <V2Button className="v2-gallery-review-save" disabled={!reviewed} onClick={() => setReviewSaved(true)}>保存审核样例</V2Button>
          {reviewSaved && <p className="v2-review-success" role="status"><Check size={18} aria-hidden="true" />样例已确认；未写入任何正式菜谱。</p>}
        </div>
      </section>

      <section className="v2-gallery-section" aria-labelledby="v2-overlays-title">
        <div className="v2-gallery-section-heading">
          <span className="v2-gallery-index" aria-hidden="true">05</span>
          <div><h2 id="v2-overlays-title">浮层，有来有回</h2><p>关闭后回到原入口，安全选择始终明确。</p></div>
        </div>
        <div className="v2-overlay-samples">
          <V2Button variant="secondary" onClick={() => setSheetOpen(true)}>打开食材 Sheet</V2Button>
          <V2Button variant="danger" onClick={() => setDialogOpen(true)}><Trash2 size={18} aria-hidden="true" />打开危险确认样例</V2Button>
          <V2Button variant="secondary" onClick={() => setToastVisible(true)}>显示 Toast 样例</V2Button>
        </div>
        <p className="v2-gallery-explainer">Sheet 与确认框可用 Esc 关闭。提示由你打开、由你关闭；此处没有删除倒计时或撤销业务。</p>
        {toastVisible && <div className="v2-gallery-toast" role="status"><Check size={20} aria-hidden="true" /><span>提示已显示，仅用于检查反馈样式。</span><V2Button variant="icon" aria-label="关闭提示样例" onClick={() => setToastVisible(false)}><X size={20} aria-hidden="true" /></V2Button></div>}
      </section>

      <footer className="v2-gallery-footer">同一套结构 · 三种主题 · 内容清晰优先</footer>

      <V2Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="食材清单样例" description="可乐鸡翅 · 只读演示内容，不记录勾选进度。">
        <dl className="v2-gallery-sheet-ingredients">{recipe.details.ingredients.map((ingredient) => <div key={ingredient.name}><dt>{ingredient.name}</dt><dd>{ingredient.amount}</dd></div>)}</dl>
        <V2Button variant="secondary" className="v2-gallery-review-save" onClick={() => setSheetOpen(false)}>返回组件样板</V2Button>
      </V2Sheet>
      <V2Sheet open={dialogOpen} onOpenChange={setDialogOpen} title="移除这份样例？" description="这仅演示确认与取消。不会删除菜谱、图片或其他正式数据。" kind="dialog" initialFocus={cancelConfirmation}>
        <div className="v2-gallery-dialog-actions">
          <V2Button ref={cancelConfirmation} variant="secondary" onClick={() => setDialogOpen(false)}>取消，保留样例</V2Button>
          <V2Button variant="danger" onClick={() => { setDialogOpen(false); setFeedback("移除确认已响应；没有删除任何正式数据。"); }}>确认演示操作</V2Button>
        </div>
      </V2Sheet>
    </div>
  );
}
