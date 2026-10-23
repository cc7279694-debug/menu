import { BookOpen, ChevronRight, Plus, Search, Sparkles, X } from "lucide-react";
import type { DurationFilter, RecipeListItem } from "../recipe-model";
import { LocalImage } from "../local-image";
import { V2Button } from "./components";

/** Real paginated rows only. Querying, ordering and navigation stay in LibraryApp. */
export function CoreLibraryScreen({ records, library, query, filter, loading, busy, page,
  onQuery, onFilter, onPage, onOpen, onAdd, onFind, onLibrary,
}: {
  records: readonly RecipeListItem[]; library: boolean; query: string;
  filter: DurationFilter; loading: boolean; busy: boolean; page: number;
  onQuery: (query: string) => void; onFilter: (filter: DurationFilter) => void;
  onPage: (page: number) => void; onOpen: (id: string) => void; onAdd: () => void;
  onFind: (dish?: string) => void; onLibrary: () => void;
}) {
  const searching = query.trim().length > 0;
  return <main className="v2-home" aria-label={library ? "我的菜谱" : "首页"}>
    <div className="v2-home-controls v2-glass">
      <header className="v2-home-header">
        {library ? <h1 className="v2-page-title">我的菜谱</h1> : <div className="v2-brand">
          <img src="./icon.png" alt="" width="36" height="36" />
          <div><h1>谱序</h1><span>RECIPIO</span></div>
        </div>}
        <V2Button variant="icon" aria-label="新增菜谱" disabled={busy} onClick={onAdd}><Plus aria-hidden="true" /></V2Button>
      </header>
      <div className="v2-search"><Search aria-hidden="true" />
        <input type="search" aria-label="搜索菜名或食材" placeholder="搜索菜名或食材" value={query}
          onChange={event => onQuery(event.target.value)} />
        {query ? <V2Button variant="icon" aria-label="清空搜索" onClick={event => {
          onQuery(""); event.currentTarget.parentElement?.querySelector("input")?.focus();
        }}><X aria-hidden="true" /></V2Button> : null}
      </div>
      {library ? <label className="v2-production-filter">耗时筛选
        <select aria-label="耗时筛选" value={filter} onChange={event => onFilter(event.target.value as DurationFilter)}>
          <option value="all">全部</option><option value="short">30 分钟内</option>
          <option value="medium">超过 30 至 60 分钟</option><option value="long">超过 60 分钟</option>
        </select>
      </label> : null}
    </div>
    {!library && !searching ? <>
      <div className="v2-entry-grid" role="group" aria-label="菜谱快捷操作">
        <button className="v2-entry-card v2-entry-card--primary" disabled={busy} onClick={onAdd}>
          <span className="v2-entry-symbol"><Plus aria-hidden="true" /></span><span className="v2-entry-copy"><strong>添加菜谱</strong><span>文字、截图或链接</span></span>
        </button>
        <button className="v2-entry-card v2-entry-card--secondary" disabled={busy} onClick={() => onFind()}>
          <span className="v2-entry-symbol"><Sparkles aria-hidden="true" /></span><span className="v2-entry-copy"><strong>帮我找做法</strong><span>比较有来源的做法</span></span>
        </button>
      </div>
      {records.length ? <section className="v2-section" aria-labelledby="recent-title">
        <div className="v2-section-heading"><h2 id="recent-title">最近加入</h2><V2Button variant="text" onClick={onLibrary}>全部<ChevronRight aria-hidden="true" /></V2Button></div>
        <div className="v2-recent-strip">{records.slice(0, 6).map(row => <button className="v2-recent-card" key={row.id}
          aria-label={`查看最近加入的 ${row.title}`} disabled={busy} onClick={() => onOpen(row.id)}>
          <LocalImage path={row.coverPath} alt={`${row.title} 封面`} />
          <strong className="v2-recent-title">{row.title}</strong><span className="v2-secondary"><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleDateString()}</time> 加入</span>
        </button>)}</div>
      </section> : null}
    </> : null}
    <section className="v2-section" aria-labelledby="library-title">
      <div className="v2-section-heading"><h2 id="library-title">{searching ? "搜索结果" : library ? "全部菜谱" : "我的菜谱"}</h2>
        {!library && !searching && records.length ? <V2Button variant="text" onClick={onLibrary}>查看全部<ChevronRight aria-hidden="true" /></V2Button> : null}
      </div>
      {loading && !records.length ? <p role="status" className="v2-secondary">正在读取本地菜谱…</p> : !records.length ? <div className="v2-empty">
        <BookOpen aria-hidden="true" /><h3>{searching || filter !== "all" ? "没有符合条件的菜谱" : "先记下第一道想做的菜"}</h3>
        <p className="v2-secondary">只记菜名也可以，以后再完善。</p>
        <V2Button variant="secondary" disabled={busy} onClick={onAdd}>添加第一道菜</V2Button>
      </div> : <ul className="v2-recipe-list">{records.map(row => <li key={row.id}>
        <button className="v2-recipe-row" aria-label={`打开 ${row.title}`} disabled={busy} onClick={() => onOpen(row.id)}>
          <LocalImage path={row.coverPath} alt={`${row.title} 封面`} />
          <span className="v2-row-text"><strong>{row.title}</strong><span className="v2-secondary">{row.totalMinutes == null ? "耗时未记录" : `${row.totalMinutes} 分钟`}
            {!library && row.preparationHint ? " · 需提前准备" : ""}</span>
            {!library && row.lastCookedAt ? <span className="v2-secondary">上次做过：{new Date(row.lastCookedAt).toLocaleString()}</span> : null}
          </span><ChevronRight aria-hidden="true" />
        </button>
      </li>)}</ul>}
      {!library && searching ? <V2Button className="v2-search-find" variant="secondary" disabled={busy} onClick={() => onFind(query.trim())}>帮我找『{query.trim()}』的做法</V2Button> : null}
      <div className="v2-pagination">
        {page > 0 ? <V2Button variant="secondary" disabled={busy || loading} onClick={() => onPage(page - 1)}>上一页</V2Button> : null}
        {records.length === 100 ? <V2Button variant="secondary" disabled={busy || loading} onClick={() => onPage(page + 1)}>下一页</V2Button> : null}
      </div>
    </section>
  </main>;
}
