import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, ChevronRight, Home, Image, PenLine, Plus, Settings } from "lucide-react";
import { V2Button, V2Image, V2Sheet } from "../components";
import { scenarioRecipes, type DemoRecipe, type DemoScenario } from "./demo-data";
import type { DurationFilter } from "../../recipe-model";
import { HomeScreen } from "./home";
import { DetailScreen } from "./detail";
import { CookingScreen } from "./cooking";
import { ComponentsPage } from "./components-page";
import { resolveV2Theme, V2AppearanceProvider } from "../appearance";
import { ThemePicker } from "./theme-picker";
import { useControlClearance } from "../use-control-clearance";

export type ShowcaseScreen = "home" | "library" | "detail" | "cooking" | "components" | "settings";
type RootScreen = "home" | "library" | "settings";
const rootTabs = [{ id: "home", label: "首页", Icon: Home }, { id: "library", label: "菜谱", Icon: BookOpen }, { id: "settings", label: "设置", Icon: Settings }] as const;
const scenarios: readonly [DemoScenario, string][] = [["default", "标准有图"], ["no-image", "全部无图"], ["title-only", "只有菜名"], ["long", "长标题与长步骤"], ["empty", "空库"], ["broken-image", "图片读取失败"]];

export function UiV2Showcase({ initialScreen = "home", initialScenario = "default", initialMode = "guided", initialTheme }: {
  initialScreen?: ShowcaseScreen; initialScenario?: DemoScenario; initialMode?: "guided" | "focus"; initialTheme?: string | null;
}) {
  const [theme, setTheme] = useState(() => resolveV2Theme(initialTheme));
  const [screen, setScreen] = useState<ShowcaseScreen>(initialScreen);
  const [scenario, setScenario] = useState<DemoScenario>(initialScenario);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<RootScreen>("home");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DurationFilter>("all");
  const [mode, setMode] = useState(initialMode);
  const [initialIndex, setInitialIndex] = useState(initialMode === "focus" ? 2 : 0);
  const [sheet, setSheet] = useState<"add" | "more" | "info" | "image" | "controls" | null>(null);
  const [info, setInfo] = useState("");
  const [imagePreview, setImagePreview] = useState<{ src: string; title: string } | null>(null);
  const [largeText, setLargeText] = useState(false);
  const [solid, setSolid] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const rootPositions = useRef<Partial<Record<RootScreen, number>>>({});
  const detailPosition = useRef(0);
  const detailFocus = useRef<string | null>(null);
  const originalFont = useRef(document.documentElement.style.fontSize);
  const recipes = scenarioRecipes(scenario);
  const selected = recipes.find((item) => item.details.id === selectedId) ?? recipes[0];
  const rootScreen = screen === "home" || screen === "library" || screen === "settings";
  useControlClearance(appRef, navigationRef, rootScreen);

  useEffect(() => {
    const original = originalFont.current;
    document.documentElement.style.fontSize = largeText ? "32px" : original;
    return () => { document.documentElement.style.fontSize = original; };
  }, [largeText]);
  useLayoutEffect(() => {
    if (rootScreen && pageRef.current) pageRef.current.scrollTop = rootPositions.current[screen] ?? 0;
    if (screen === "detail" && detailRef.current) {
      detailRef.current.scrollTop = detailPosition.current;
      if (detailFocus.current) {
        document.querySelector<HTMLButtonElement>(`button[data-v2-focus="${detailFocus.current}"]`)?.focus({ preventScroll: true });
        detailFocus.current = null;
      }
    }
  }, [screen, rootScreen]);

  function openRecipe(item: DemoRecipe) {
    if (rootScreen) { rootPositions.current[screen] = pageRef.current?.scrollTop ?? 0; setOrigin(screen); }
    setSelectedId(item.details.id); detailPosition.current = 0; setScreen("detail");
  }
  function showInfo(message: string) { setInfo(message); setSheet("info"); }
  function showImage(src: string, title: string) { setImagePreview({ src, title }); setSheet("image"); }
  function changeRoot(next: RootScreen) {
    if (rootScreen) rootPositions.current[screen] = pageRef.current?.scrollTop ?? 0;
    setScreen(next);
  }
  function startCooking(nextMode: "guided" | "focus", index: number) {
    detailPosition.current = detailRef.current?.scrollTop ?? 0;
    detailFocus.current = nextMode === "guided" ? "guided" : `focus-${index}`;
    setMode(nextMode); setInitialIndex(index); setScreen("cooking");
  }

  return <V2AppearanceProvider theme={theme} solid={solid}><div ref={appRef} className="recipio-ui-v2 v2-app" data-v2-theme={theme} data-v2-solid={solid} data-cooking={screen === "cooking" || undefined} data-overlay-open={sheet !== null || undefined}>
    <div className="v2-demo-bar"><span>UI V2 · 隔离样板 · 演示数据</span><button onClick={() => setSheet("controls")}>样板设置</button></div>
    <div className="v2-viewport">
      {screen === "home" || screen === "library" ? <main className="v2-page-region v2-home" ref={pageRef}>
        <HomeScreen recipes={recipes} library={screen === "library"} query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} onOpen={openRecipe} onAdd={() => setSheet("add")}
          onFind={() => showInfo(`${query ? `已预填「${query}」。` : ""}G1 只展示入口，不连接 Finder、不发起网络请求；正式找做法流程将在 G3 接入。`)} onLibrary={() => changeRoot("library")} />
      </main> : null}
      {screen === "detail" && selected ? <DetailScreen item={selected} scrollRef={detailRef} onBack={() => setScreen(origin)} onMore={() => setSheet("more")}
        onEdit={() => showInfo("本轮只验证三屏视觉。正式编辑器将在 G2 接入，样板不会修改你的菜谱。")}
        onGuided={() => startCooking("guided", 0)} onFocus={(index) => startCooking("focus", index)} onImage={showImage} /> : null}
      {screen === "cooking" && selected ? <CookingScreen key={`${selected.details.id}:${mode}:${initialIndex}`} item={selected} mode={mode} initialIndex={initialIndex} onClose={() => setScreen("detail")} onComplete={() => { /* Explicit demo acknowledgement only; never initializes a data service. */ }} /> : null}
      {(screen === "detail" || screen === "cooking") && !selected ? <main className="v2-page-region v2-home"><h1>尚未添加菜谱</h1><V2Button onClick={() => setScreen("home")}>返回首页</V2Button></main> : null}
      {screen === "settings" ? <main className="v2-page-region v2-home" ref={pageRef}><header className="v2-home-header"><h1 className="v2-page-title">设置</h1></header><section className="v2-settings-note"><h2>正式设置保持不变</h2><p>这里是三栏导航的样板占位。数据与备份、AI 密钥和版本信息将在 G3 接入，本页不读取或更改任何设置。</p><V2Button variant="secondary" onClick={() => setScreen("components")}>查看组件与状态</V2Button></section></main> : null}
      {screen === "components" ? <main className="v2-page-region v2-home"><header className="v2-home-header"><V2Button variant="icon" aria-label="返回首页" onClick={() => setScreen("home")}><ArrowLeft aria-hidden="true" /></V2Button><p className="v2-secondary">Design System · Candidate</p></header><ComponentsPage /></main> : null}
    </div>
    {rootScreen ? <div className="v2-nav-area" ref={navigationRef}><nav className="v2-bottom-nav v2-glass" aria-label="主导航">{rootTabs.map(({ id, label, Icon }) => <button key={id} aria-current={screen === id ? "page" : undefined} onClick={() => changeRoot(id)}><Icon aria-hidden="true" /><span>{label}</span></button>)}</nav></div> : null}
    <V2Sheet open={sheet !== null} onOpenChange={(open) => { if (!open) setSheet(null); }}
      kind={sheet === "info" ? "dialog" : "sheet"}
      title={sheet === "add" ? "添加菜谱" : sheet === "more" ? "菜谱操作" : sheet === "image" ? imagePreview?.title ?? "图片预览" : sheet === "controls" ? "样板设置" : "样板功能说明"}
      description={sheet === "controls" ? "仅调整隔离样板，不改变正式 App。" : sheet === "image" ? "生成测试图片，仅用于视觉评审。" : sheet === "add" ? "选择一种方式；打开入口不会自动联网。" : "G1 只验证展示与交互，不连接正式业务。"}>
      {sheet === "add" ? <div className="v2-action-list">{[
        { Icon: PenLine, name: "手动录入", note: "从一道菜名开始，离线记录" },
        { Icon: Image, name: "文字／截图整理", note: "主动开始后才发送给 AI" },
        { Icon: BookOpen, name: "从网页链接导入", note: "先读取网页，不自动调用 AI" },
        { Icon: Plus, name: "帮我找做法", note: "主动寻找有来源的做法" },
      ].map(({ Icon, name, note }) => <button key={name} onClick={() => showInfo(`已选择「${name}」。此隔离样板不启动服务、不读取私人数据；正式流程待后续阶段接入。`)}><Icon aria-hidden="true" /><span><strong>{name}</strong><span className="v2-secondary">{note}</span></span><ChevronRight aria-hidden="true" /></button>)}</div> : null}
      {sheet === "more" ? <div className="v2-action-list">{["编辑菜谱", "记录做过", "查看做菜记录", "查看修改记录", "删除菜谱"].map((name) => <V2Button key={name} variant={name === "删除菜谱" ? "danger" : "text"} onClick={() => showInfo(`「${name}」是展示入口；本轮不会更改、删除或写入任何菜谱和记录。`)}>{name}</V2Button>)}</div> : null}
      {sheet === "info" ? <><p>{info}</p><V2Button className="v2-dialog-dismiss" variant="secondary" onClick={() => setSheet(null)}>知道了</V2Button></> : null}
      {sheet === "image" && imagePreview ? <V2Image src={imagePreview.src} alt={`${imagePreview.title}大图（演示图片）`} className="v2-large-image" eager /> : null}
      {sheet === "controls" ? <div className="v2-review-controls">
        <ThemePicker theme={theme} onChange={setTheme} />
        <label>查看页面<select value={screen} onChange={(event) => setScreen(event.target.value as ShowcaseScreen)}>{([ ["home", "首页"], ["library", "菜谱库"], ["detail", "菜谱详情"], ["cooking", "烹饪模式"], ["components", "组件与状态"], ["settings", "设置占位"] ] as const).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>内容场景<select value={scenario} onChange={(event) => setScenario(event.target.value as DemoScenario)}>{scenarios.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="v2-toggle-label"><input type="checkbox" checked={largeText} onChange={(event) => setLargeText(event.target.checked)} />200% 字号</label>
        <label className="v2-toggle-label"><input type="checkbox" checked={solid} onChange={(event) => setSolid(event.target.checked)} />实体玻璃回退</label>
        <V2Button onClick={() => setSheet(null)}>查看样板</V2Button><p className="v2-secondary">照片为生成测试素材。所有修改只在本次页面内存中，刷新即重置；不保存到本地数据库。</p>
      </div> : null}
    </V2Sheet>
  </div></V2AppearanceProvider>;
}
