# RECIPIO｜UI V2 Glass Minimal 完整执行提示词

执行角色：Codex 按已确定规格实施；ChatGPT 负责设计规划与独立验收，用户负责视觉选择和真机确认。

## 0. 本轮依据、授权与停止点

必须一起读取附件：

1. `RECIPIO_UI_V2_Spec_v1.0.md`：正式设计与验收依据。
2. `RECIPIO_UI_V2_Concept_A.png`：用户明确选中的唯一视觉参考。
3. 本提示词：实施流程与安全限制。

用户已选定第一张 Concept A — Glass Minimal。不要重做A/B/C方案、重新设计Logo、重开产品需求访谈，或要求用户决定已经确定的技术栈。

本次立即授权 G0 + G1：核对、规格落库、设计系统、组件状态页、首页/详情/烹饪三屏的隔离交互样板。

完成后停在：`UI_V2_VISUAL_READY_FOR_REVIEW`。

用户明确认可实际三屏样板后，再执行本文 G2–G4 完成整套重构。普通Task之间不反复询问；只保留这一次中期视觉门禁和最终真机验收。未获中期批准，不把样板替换成生产默认界面。

这是一项现有Android产品的UI/UX改造，不是新建网站、架构迁移或新功能项目。

## 1. 冻结基线与工作区保护

仓库：`cc7279694-debug/menu`。

已核对稳定 main：
`649804a8209413f9d682f1079a4fd19ea84cd064`

已核对 tree：
`2d1993bcab8dbb59c540b8225d51259562ad0316`

稳定版本口径：`v0.9.1-logo-refresh`。

开始前记录：

```text
git status --short --branch
git branch --show-current
git worktree list
git fetch origin --prune
git rev-parse origin/main
git log -5 --oneline origin/main
```

若远端已变化、工作区有未知未提交内容或其他任务并发修改：停止核对，不reset、clean、stash丢弃、不覆盖、不force push。

从确认后的稳定main建立 `feat/recipio-ui-v2-glass-minimal`，优先使用独立worktree。若分支已存在，检查其基线及未完成工作，不另起分支遗失改动。禁止从Video P0/P1、抖音解析、Finder preflight实验分支继续。

本轮不merge main、不tag、不部署、不发布商店、不启用后台自动轮询。

## 2. 技术栈与受保护文件

实际产品是：React / TypeScript / Vite + Tailwind / shadcn + Capacitor Android + 原生Java插件 + SQLite。

禁止迁移Kotlin Compose、SwiftUI、React Native、Flutter；禁止恢复旧Next.js/Supabase云主库。不要因文档出现“苹果风格”而更换框架。

先读：AGENTS、PROJECT、PRODUCT_SPEC、ARCHITECTURE、CURRENT_STATE、DECISIONS、ROADMAP、package.json，以及现有UI组件、测试脚本和最近交付报告。历史CURRENT_STATE与已接受tag可能有时间差，按提交、代码与用户验收分别记录，不抹掉历史NOT_RUN。

保护：SQLite v4、Preview v7、Backup v2，RecipeLibrary数据接口、Provider/密钥合同、Responses function handoff、来源校验、SSRF、临时图片租约与清理、保存幂等与不确定状态。

默认允许修改：`src/native/`的展示组件及相应测试、本地作用域样式、必要的现有UI原语、设计/验收文档。

默认只读：Repository/Schema/Migration、Backup事务实现、AI/Link/Finder业务服务、Native安全插件、Manifest权限及实验目录。若布局接线必须修改服务或原生返回逻辑，先给最小原因和失败证据，不能以“UI需要”为由重写。

不要全局改共用UI原语而影响旧Web路径。优先在Native根节点下限定V2 Token/样式，复用行为、包装外观。

## 3. 唯一设计方向与范围纠偏

视觉锁定：暖白 `#F6F4EF`、实体浅底 `#FBFAF7`、深石墨 `#1B1B1D`、鼠尾草系、轻玻璃控制层、清晰排版、克制阴影。

主按钮使用 `#49684F` + 白字，浅绿 `#7F9B82` 用于装饰。不要为贴近浅色示意牺牲小字号可读性。完整Token、尺寸、控件状态与文案见规格第05–11章。

图是视觉参考，不是额外功能需求。执行规格第03章的逐项映射：

- 保留首页／菜谱／设置三个根目的地；“＋”只打开新增Sheet，不是新业务Tab。
- “最近查看”改为“最近加入”，保留创建时间倒序，不做浏览追踪。
- 不新增全库最近下厨聚合；沿用真实上次做过字段和单菜谱记录。
- 不新增收藏、计时器、份量换算、推荐、标签系统、账号、通知、视频、购物清单。
- 不新增食材/步骤完成状态；“下一步”不写记录，只有“完成这道菜”写一次记录。
- 原Logo和Launcher资源保持，禁止重新生成、调色或缩放品牌母版。
- 不使用海报的手机框、刘海、植物或虚构统计作为UI。
- 有图与无图都必须精致；不自动生成、下载照片来填空。

玻璃仅限导航、控制条、必要小浮层；正文实体。Android WebView用受控CSS实现，不宣称Apple原生Liquid Glass。同屏大面积blur最多2层；不支持或性能不佳时用实体回退，不新引入WebGL特效库。

## 4. Skills使用：不要安装错版本

优先复用现有技能，不盲装七八套重叠设计技能。

用户自有设计仓库：
`https://github.com/cc7279694-debug/HR-product-design-system.git`

完整内容在分支：
`feat/initialize-product-design-system`

已核对提交：
`d3ca5d96ffd8d2fe795c4b771858756d4879fc53`

该仓库main只有简短README。不要clone默认main后声称已经取得完整技能。

先找已有完整克隆；存在时只读核对，不覆盖本地修改。没有时，可在产品仓库之外的用户技能目录克隆完整指定分支并记录commit；不执行来源不明脚本、不全局安装、不修改Skill仓库历史。

必要读取：

```text
DESIGNER.md
skills/hr-product-design-system/SKILL.md
skills/product-ui-ux-design/SKILL.md
playbooks/ui-ux/17-design-system-extraction.md
playbooks/ui-ux/18-refinement.md
playbooks/ui-ux/19-production-specification.md
playbooks/ui-ux/20-developer-handoff.md
playbooks/ui-ux/21-production-validation.md
```

这五个Playbook能力不是五个独立Skill。先读产品记录，但过时云架构/收藏等不覆盖本轮冻结约束。

若Codex已安装superpowers，按writing-plans、test-driven-development、executing-plans、verification-before-completion执行；缺少子代理时顺序执行，不冒称独立审查。

若已安装build-web-apps，可用frontend-app-builder、react-best-practices、shadcn、frontend-testing-debugging帮助还原与测试；当前Concept已选定，不因Skill默认偏好重新生成设计/Logo或创建新应用。

Skill不可用时准确报告，依据本规格继续允许的工作；不虚构安装成功、不把下载Skill变成单独的大项目。

## 5. G0：把规格变成可追踪的实施基线

将规格与参考保存到项目适当目录，例如：

```text
docs/ui-v2/RECIPIO_UI_V2_SPEC.md
docs/ui-v2/reference/concept-a.png
docs/ui-v2/UI_V2_SCOPE_MAP.md
docs/superpowers/plans/2026-10-23-recipio-ui-v2.md
```

只维护一份正文，不复制多个互相冲突的版本。参考图只作设计证据，不打包进正式App。

列清：P01–P12页面、O01–O05覆盖层、现有文件、动作回调、数据来源、忙/空/错/不确定状态。图片与代码不同处按规格映射记录，不偷偷恢复图上越界功能。

计划拆为可验收任务，每项列实际文件、接口、先行测试、验证命令。不要重新请求产品规划批准。

## 6. G1：Token、组件、三屏隔离样板

在Native侧建立作用域清晰的V2视觉层，建议职责：

```text
src/native/ui-v2/tokens.css
src/native/ui-v2/components/（按钮/输入/卡片/玻璃外壳/Sheet等）
src/native/ui-v2/showcase/（仅DEV或隔离预览）
```

命名可以沿用现有规范，但避免一个数千行组件包办所有功能。不要因拆UI改变服务实例、owner/generation或业务副作用。

先完成：

1. 组件展示页：主/次/图标/危险按钮，默认、按下、焦点、禁用、加载、错误状态；表单、卡片、标签、Sheet、Toast。
2. 首页：3根导航、两入口卡、本地搜索、最近加入与普通列表简览。
3. 菜谱详情：有图/无图、实际字段、完整步骤、底部操作。
4. 深色Focus/Guided：图文层级、只读食材Sheet、上一/下一步，无计时器。

样板用同一组生成数据，不连接私人数据库和真实Provider，不让Mock进入生产fallback。必须能点击展示状态，不能只是大图。

浏览器检查390×844，另测320宽、长标题、无图、200%字号。打开参考和实际截图逐项比较布局、字级、颜色、圆角、图标、图片处理与主次；记录允许的功能映射差异。

交付少量清晰截图、组件状态页与简短偏差清单。不要用仅build通过替代视觉验收。

到这里停止：`UI_V2_VISUAL_READY_FOR_REVIEW`。

未获用户明确认可，不接生产默认入口，不连续完成G2–G4。

## 7. G2：用户认可后接入本地核心页面

按规格第12–15及20章实施首页、库、详情、编辑、Focus/Guided、完成、做过历史和修改历史。

修改前先增加能失败的行为保护测试，至少：

- `localSearch_doesNotStartNetwork`
- `recentlyAdded_preservesCreationOrder`
- `recipeTitleOnly_remainsValidRecipe`
- `detailBack_restoresQueryFilterAndScroll`
- `stepNavigation_doesNotCreateCookingRecord`
- `explicitCompletion_createsExactlyOneRecord`
- `dirtyEditor_survivesDialogAndNavigationCancel`
- `deleteUndo_preservesOriginalFiveSecondWindow`

名称可与项目测试风格统一，但断言不可削弱。页内动作调用原服务；不从UI直接写SQL、不增加浏览历史、计时状态或新数据实体。

## 8. G3：导入、Finder、分享、备份统一

按规格第16–23章统一所有既有流程：

- AI输入：文字/图、移除/排序、缺密钥、取消、失败、临时清理提示。
- AI审核：来源明确/推断/缺失、检查确认、同名警告、未知保存核查。
- 网页：读取不自动AI、Parser完整/部分/多候选、失败降级。
- Finder：Search与选定提取两次显式操作；来源/Function交接不变。
- Share：冷/热启动预填、dirty/busy暂存、替代提示、release原路径。
- 设置备份：Native密钥框不改Web输入，恢复确认与不确定状态不丢。

必须新增/保留：

- `reviewRequired_blocksUiAndServiceSave`
- `parserRead_neverAutomaticallyCallsAi`
- `finderSearch_requiresExplicitAction`
- `shareWhileDirty_preservesActiveInput`
- `lateCallback_cannotReplaceNewerView`
- `restoreBusy_blocksNewIntakeNavigation`
- `uncertainSave_doesNotCreateDuplicate`
- `firstAndroidBack_hidesImeOnly`

阶段间不逐普通Task询问；只有安全边界、范围或无法实现的真实问题才暂停。

## 9. G4：验证与交付

同一最终实现重新执行仓库实际命令：

```text
npm test
npm run test:apk
npm run typecheck
npm run lint
npm run build:local
npm run sync:android
```

Android先读现有脚本，使用显式app任务，例如：

```text
:app:testDebugUnitTest
:app:lintDebug
:app:assembleDebug
:app:assembleDebugAndroidTest
:app:connectedDebugAndroidTest
```

选择正确串行参数与专属设备，避免误跑旧Cordova测试工程；命令依据实际项目调整并记录，不靠屏蔽测试换通过。

至少验证：390标准三屏、320/412/768宽、200%字号、无图/长步骤、减少动效/实体玻璃回退、真实IME、TalkBack主链、冷/热分享、断网冷启动、覆盖安装、图片/记录保留和备份取消。

不触碰Mirra/砺石模拟器或任务；内存不足则暂停，不能擅自关闭他人环境。无设备就NOT_RUN，不启动15分钟后台循环。

本轮真实AI调用默认0。所有搜索/图片请求使用Fake；样式重构不是重复消费Provider额度的理由。不要索取Key，不打印输入、URL token或真实用户数据。

## 10. 版本、Git与交付物

中期样板无需反复发APK。正式打包时读取当前APK版本与已有交付，使用未占用的递增versionCode；不要硬编码v20。版本名建议 `0.10.0-ui-v2-rc1`，最终发布名称待验收。包名和签名保持 `app.recipio.local` 的现有覆盖安装链，不清用户数据。

允许功能分支聚焦commit和普通push；禁止自动合main、tag、force、deploy。

默认交付：

1. 简短功能/视觉差异与范围落实清单。
2. 关键页面及异常状态实际截图，不提交私人素材。
3. 测试报告，区分浏览器、模拟器、用户真机、未运行。
4. 唯一当前APK的路径、bytes、SHA-256、包名、版本、签名信息。
5. 分支/commit、远端一致性和工作区状态。

不制作整仓ZIP、大型Manifest或重复APK。需要审查文件时只提供最小差异与关键证据。

## 11. 停止条件和状态

遇到必须改SQLite/Backup、放宽Key/来源/SSRF、丢未保存输入、重写Native安全链路、恢复未授权功能时立即停止，给最小证据与方案：

`UI_V2_BLOCKED`

G1完成：
`UI_V2_VISUAL_READY_FOR_REVIEW`

全量完成但缺真机证据：
`UI_V2_PENDING_DEVICE_TEST`

实现与已授权验证完成，等待独立验收：
`UI_V2_READY_FOR_REVIEW`

禁止自行宣称 `ACCEPTED / FROZEN`。正式UI改造完成也不得自动进入视频或其他模块。
