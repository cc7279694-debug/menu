import { BookOpen, ChevronRight, Plus, Search, Sparkles, X } from "lucide-react";
import { V2Button, V2Image } from "../components";
import { matchesDuration, type DurationFilter } from "../../recipe-model";
import type { DemoRecipe } from "./demo-data";
import logo from "../../../../native/public/icon.png";

export function HomeScreen({ recipes, library, query, filter, onQuery, onFilter, onOpen, onAdd, onFind, onLibrary }: {
  recipes: readonly DemoRecipe[]; library: boolean; query: string; filter: DurationFilter;
  onQuery: (query: string) => void; onFilter: (filter: DurationFilter) => void;
  onOpen: (item: DemoRecipe) => void; onAdd: () => void; onFind: () => void; onLibrary: () => void;
}) {
  const term = query.trim().toLocaleLowerCase();
  const results = recipes.filter(({ details }) => (!term || details.title.toLocaleLowerCase().includes(term)
    || details.ingredients.some((i) => i.name.toLocaleLowerCase().includes(term))) && matchesDuration(details.totalMinutes, library ? filter : "all"));
  const searching = term.length > 0;
  return <>
    <div className="v2-home-controls v2-glass">
    <header className="v2-home-header">
      {library ? <h1 className="v2-page-title">我的菜谱</h1> : <div className="v2-brand">
        <img src={logo} alt="" width="40" height="40" />
        <div><h1>谱序</h1><span>RECIPIO</span></div>
      </div>}
      <V2Button variant="icon" aria-label="新增菜谱" onClick={onAdd}><Plus aria-hidden="true" /></V2Button>
    </header>
    <div className="v2-search">
      <Search aria-hidden="true" />
      <input type="search" aria-label="搜索我的菜谱" placeholder="搜索菜名或食材" value={query} onChange={(event) => onQuery(event.target.value)} />
      {query ? <V2Button variant="icon" aria-label="清空搜索" onClick={(event) => {
        onQuery(""); event.currentTarget.closest(".v2-search")?.querySelector("input")?.focus();
      }}><X aria-hidden="true" /></V2Button> : null}
    </div>
    </div>
    {library ? <div className="v2-filters" role="group" aria-label="按耗时筛选">{([
      ["all", "全部"], ["short", "30 分钟内"], ["medium", "30–60 分钟"], ["long", "超过 60 分钟"],
    ] as const).map(([value, label]) => <V2Button key={value} variant="select" aria-pressed={filter === value} onClick={() => onFilter(value)}>{label}</V2Button>)}</div> : null}
    {!library && !searching && recipes.length > 0 ? <>
      <div className="v2-entry-grid">
        <button className="v2-entry-card" onClick={onAdd}><span className="v2-entry-symbol"><Plus aria-hidden="true" /></span><strong>添加菜谱</strong><span>文字、截图或链接</span></button>
        <button className="v2-entry-card" onClick={onFind}><span className="v2-entry-symbol v2-entry-symbol--find"><Sparkles aria-hidden="true" /></span><strong>帮我找做法</strong><span>比较有来源的做法</span></button>
      </div>
      <section className="v2-section" aria-labelledby="recent-title">
        <div className="v2-section-heading"><h2 id="recent-title">最近加入</h2><V2Button variant="text" onClick={onLibrary}>全部<ChevronRight aria-hidden="true" /></V2Button></div>
        <div className="v2-recent-strip">{recipes.slice(0, 4).map((item) => <button key={item.details.id} className="v2-recent-card" aria-label={`查看最近加入的${item.details.title}`} onClick={() => onOpen(item)}>
          <V2Image src={item.image} alt={`${item.details.title}（演示图片）`} placeholder="暂未添加封面" />
          <span className="v2-recent-title">{item.details.title}</span>
          <span className="v2-secondary">{new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(item.details.createdAt))} 加入</span>
        </button>)}</div>
      </section>
    </> : null}
    <section className="v2-section" aria-label={library ? "菜谱列表" : "我的菜谱简览"}>
      {!library ? <div className="v2-section-heading"><h2>{searching ? "搜索结果" : "我的菜谱"}</h2>{!searching && recipes.length ? <V2Button variant="text" onClick={onLibrary}>查看全部<ChevronRight aria-hidden="true" /></V2Button> : null}</div> : null}
      {results.length ? <div className="v2-recipe-list">{results.map((item) => <button key={item.details.id} className="v2-recipe-row" aria-label={`打开${item.details.title}`} onClick={() => onOpen(item)}>
        <V2Image src={item.image} alt="" placeholder="无封面" />
        <span className="v2-row-text"><strong>{item.details.title}</strong><span className="v2-secondary">{item.details.totalMinutes === null ? "耗时未填写" : `${item.details.totalMinutes} 分钟`}{!library && item.details.preparations.length > 0 ? " · 需提前准备" : ""}</span></span>
        <ChevronRight aria-hidden="true" />
      </button>)}</div> : <div className="v2-empty">
        <BookOpen aria-hidden="true" /><h2>{recipes.length === 0 ? "尚未添加菜谱" : "还没有找到这道菜"}</h2>
        <p className="v2-secondary">{recipes.length === 0 ? "从一道喜欢的菜开始，留下自己的做法。" : "换一个菜名或食材，也可以主动寻找新做法。"}</p>
        {recipes.length === 0 ? <V2Button onClick={onAdd}>添加第一道菜</V2Button> : <V2Button variant="secondary" onClick={onFind}>{term ? `帮我找「${query}」的做法` : "帮我找做法"}</V2Button>}
      </div>}
    </section>
  </>;
}
