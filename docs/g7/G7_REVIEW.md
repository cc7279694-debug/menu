# RECIPIO G7 — 可靠收录与快速校对 V1

2026-10-27 · **RECIPIO_G7_READY_FOR_REVIEW** · ChatGPT 独立验收待定。

## 1. 固定基线与当前交付

- 分支：`feat/recipio-g7-reliable-intake`。
- G6 验收登记基线：`69e221567038e1e32668f882b31e57a589c483de`。
- 最终被测产品、测试和工作流：`e8c2f948544d8650919456bd2421b7a04ea218b4`。
- [最终云端运行 40460260275 / attempt1](https://github.com/cc7279694-debug/menu/actions/runs/40460260275)：四个 Job 全部 SUCCESS，headSha 与上述源码一致。
- 最终被测提交之后仅登记文档与原样截图；交付提交由本报告所在提交确定，可用 `git log -1 -- docs/g7/G7_REVIEW.md` 获取。最终报告另列交付 SHA，避免自引用提交哈希。
- G5/G6 的 ACCEPTED/FROZEN 和 NOTES 保留；G4 PENDING、R1 DEFERRED_BY_USER 不变。本报告不冻结 G7，不授权 G8。

## 2. 相对 G5/G6 实际新增

当前编辑器直接呈现食材、步骤、准备和关键事项的实际数量；默认最多三条优先提示，用户可展开全部并主动定位字段。修改、补充、删除和重排后重新计算，不在输入时抢焦点或自动滚动。不新增质量评分，不将可选图片、热量或备注变成保存门槛。

“查看本轮来源”复用现有 Sheet：AI 显示当前会话已有文字/受控临时截图；网页显示已清洗正文及截断事实；Finder 只展示已选来源标题、站点和候选摘要，明确本轮未保留全文。不新增抓取、网络、正文缓存、来源历史或正式媒体引用。浏览与关闭来源不等于审核确认。

原始 explicit/inferred/missing 证据保持不变；另算当前已编辑、已补充、已删除或无法定位状态。不会将手改内容伪装成已重新核实的 explicit。完整原始审核提示仍可主动展开。只有原有 Schema 错误阻止保存；来源推断/缺失继续使用原有明确确认门禁。

同名查询失败、返回检查和过期异步结果不能继续创建。真实改动撤销已有确认；单纯聚焦、看来源或展开不撤销确认。确认后仍新建普通 Recipe，不覆盖原同名菜谱。既有 uncertain/reconciliation 的 creationId、幂等和恢复结果继续由原 Service 管理。

## 3. 实现与数据边界

- `RecipeEditor` 仍是唯一当前可编辑 DTO 所有者；值和数组行映射原子更新，副作用不在 React 状态更新器内执行。
- UI session 只借用原始规范化菜谱和保留瞬态行映射。既有保存尝试会替换 draft.recipe，但保留 review；因此用原 review/session 身份跨 uncertain 页面恢复映射，避免把尝试保存后的值误认成原始证据。不建立第二个当前草稿。
- 行身份不按名称或内容匹配；同名、重排、删除后新增不会复用原行证据。保留现有步骤/关键事项编号关系。
- 来源仅借用所属 Service 当前已经持有的信息。失效会话关闭面板；没有延长临时图片寿命、独立清理所有权、持久化原文/截图/审核证据或保留 Finder sourceText。
- 保存仍经过现有 RecipeLibrary/Service；没有直接 SQL、AI 写库、导入实体或新的业务表。
- SQLite Schema **v4**、浏览器 Preview **v7**、Backup **v2**、Provider/normalizer/密钥/SSRF、媒体生命周期和 G6 份量语义均不变。
- 共享 `ui-v2/native-sheet.tsx` 的监听注册改为 layout；Editor 对可见、非 inert 的当前弹层让路。这是有真实 RED 的 UI Back 路由修补，不是 Native、第二套 IME 状态机、延时或全局禁用 Back。不能声称所有 G6 共用 UI 文件均未修改。

## 4. 最终验证：全部来自同一源码

| 门禁 | 实际结果 | 证据与范围 |
| --- | --- | --- |
| Windows 全仓 JS/TS | **1503 PASS / 221 files；0 fail、0 pending** | job122042902988；g7-full.json |
| 定向既有体验/审核 | **225 PASS** | 同一 Job 的8文件；包含在1503中 |
| G7 定向检查/映射/来源/恢复/Back | **122 PASS / 9 files** | g7-targeted.json；包含在1503中 |
| TypeScript / ESLint | **PASS；0错误、5项既有警告** | 既有 Next img 警告，未增加 G7 警告 |
| build:local / 正式隔离 | **PASS** | 正式模块324、共享V2模块15、showcase模块0、fixture资源0 |
| G7 实际浏览器 | **29组 PASS / 39几何检查 / 16张截图** | job122042902808；外部源、页面错误、console错误均0 |
| 既有 G6 实际浏览器回归 | **33组 PASS / 12张截图** | 同一被测源码重新运行，非复用G6历史绿灯 |
| Android JVM | **189 PASS；0失败/错误/跳过** | job122042902932；22 suites，JVM_ONLY |
| Capacitor sync / Android lint / 两个 Debug 构建 | **PASS** | app与androidTest，仅全新云端隔离测试身份 |
| API36 Android 原生定向 | **25 PASS；0失败/跳过** | job122043930796，严格 `OK (25 tests)` 与 `PASS 25` |

Android 25项分别为存储11、原IME/Back8、G5 UI2、G6份量2、G7 Intake2；不是全量历史 connected 测试的虚构总数。G7 使用真实 MainActivity/WebView、系统 IME 和系统 Back，验证来源关闭、键盘优先、脏编辑离开、临时图片 DOM 解码、确认撤销、同名返回与一次普通 SQLite 保存。图片为生成的私有临时文件；选择结果受控注入，不声称执行了真实 SAF。

浏览器运行真实 LibraryApp、Service、PreviewRecipeLibrary/IndexedDB。Provider/HTTP 为 Fake；临时图片通过严格受控 Native 格式 URI 映射到生成 blob，不能冒充原生文件路径/像素证据。编辑、查看来源和展开期间检查数据库/Storage 写入及实际数据行不变；受控造数、明确保存和 uncertain 模拟提交在该零写入窗口之外单独验证。真实付费 AI 调用 **0**。

三主题覆盖320/390/412宽度、CSS 100%/200%、长文本、实体玻璃回退和 reduced-motion。CSS 200% 不等于 Android 系统字号；回退测试明确设置现有实际作用域属性，不声称覆盖所有 OEM 或浏览器 @supports 实现。

实际运行的命令/入口：

```text
npm ci --no-audit --no-fund                         # 云端；本地未装依赖
npm test -- <既有8个文件> --pool=threads --maxWorkers=1 --no-file-parallelism
npm test -- src/native/intake-review src/native/ui-v2/native-sheet-registration.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
npm run typecheck
npm run lint
npm test -- --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=dot --reporter=json --outputFile=output/g7-full.json
npm run build:local
node scripts/verify-ui-v2-isolation.mjs
node scripts/verify-g6-browser.mjs --runtime=<隔离Playwright运行时>
node scripts/verify-g7-browser.mjs --runtime=<隔离Playwright运行时>
npm run sync:android
Gradle testDebugUnitTest / lintDebug / assembleDebug / assembleDebugAndroidTest
bash scripts/verify-g7-native-fixtures.sh           # 全新归属明确API36云端AVD；实际adb instrumentation
```

完整参数及工具版本由被测提交的 `.github/workflows/recipio-g7-cloud.yml` 固定。没有在资源不足的本机启动重型工具，没有操作其他项目的模拟器。

云端 Debug fixture 仅供本次空 AVD 验证：`app.recipio.local`、versionCode25、`0.10.0-g7-qa`，临时 Runner 签名，**不是用户安装/升级候选**。app fixture SHA-256 `f07c6dc13f84d168e2975c221bb09991c255efe2f4ffe8e9dd5bd92c485ec964`；test fixture `6cf2c472caac3a7613f007528eb9ea2e7dc222331babbb73a711083254c8b580`。不交付重复历史 APK，不恢复 R1。

## 5. 真实失败与修复

- `fd1a602b` / run40447931345：既有217 PASS，新113中103 RED；实际为实现stub、缺失新UI和过期保存保护，非测试加载失败。对应纯函数、组件和会话保护实现后通过。
- `9082441c` / run40451105345：新增同名 Back 两例 RED；先修监听阶段。随后真实 Chromium/API36 仍复现来源 Sheet 不关闭，证明仅 capture 不足。
- `ff0c533` / run40454243810：原生探针已证实 IME 隐藏、窗口和WebView聚焦、页面收到一次Back，但Source未关闭；不能归因于环境。`817905c` / run40458519166：225既有PASS、122定向中恰有2个新modal归属/重开注册RED。Editor显式让路+layout注册后，最终浏览器和25Native均GREEN。
- 中间发现原生旧 `intakeDraft_survivesImeBack` 一次期望0但收到1的失败。没有删除或修改该旧测试；后续及本轮最终25全部通过。单一API36的通过不代表所有IME/OEM稳定性。
- 可选热量/图片等原始 missing 不再误占优先问题列表，但完整历史审核保留；Schema错误照常阻止保存。原始字段名称规范化、候选对象键排序以及旧审核断言需主动展开属于测试预期调整，normalizer未变。
- 最后一次中间浏览器失败是对“未勾选审核而故意disabled的保存按钮”执行可点击命中检查。最终测试先断言不可保存，再明确勾选合成审核、断言enabled，保留原严格命中检查；没有放宽CSS门槛、自动确认或跳过场景。

完整 RED 记录见 [G7_TASK.md](G7_TASK.md)。最终无未解决失败，不使用中间1498/其他历史数字替代1503。

## 6. 截图与证据索引

以下全部为被测源码 **e8c2f948** 的实际运行画面、生成测试内容，未作裁剪/重绘。浏览器Chromium151.0.7922.34，默认视口390×844、CSS16px；窄屏例320×844、CSS32px。外部Provider/HTTP与浏览器媒体适配均为Fake；不代表真实AI识别质量。

| 画面 | 主题/视口 | 实际PNG |
| --- | --- | --- |
| 初始摘要与三条优先提示 | Warm Ivory /390×844 | [初始检查](screenshots/warm-initial-review-390.png) |
| 实际修改后检查更新 | Warm Ivory /390×844 | [修改后](screenshots/warm-updated-review-390.png) |
| 本轮文字与生成截图 | Warm Ivory /390×844 | [本轮来源](screenshots/warm-text-and-generated-screenshot-source-390.png) |
| 同名确认与返回检查入口 | Warm Ivory /390×844 | [同名返回入口](screenshots/warm-duplicate-return-review-390.png) |
| Finder无全文的真实边界 | Warm Ivory /390×844 | [候选摘要与限制](screenshots/warm-finder-without-fulltext-390.png) |
| 纯白主题检查 | Pure Glass /390×844 | [纯白](screenshots/pure-glass-review-390.png) |
| 淡绿主题检查 | Soft Sage /390×844 | [淡绿](screenshots/soft-sage-review-390.png) |
| 窄屏大字来源与可达关闭 | Warm Ivory /320×844、CSS200% | [窄屏大字](screenshots/warm-ivory-source-320-CSS200.png) |
| 原生同名弹层 | API36 Warm Ivory /320×640 | [Native同名](screenshots/g7-native-duplicate.png) |

同名浏览器截图拍摄于点击“返回检查”之前，展示真实弹层与返回入口；点击后的草稿保留、弹层关闭和零创建由同一流程另外断言，不把截图误记为返回后的画面。

原生3张诊断图中，两张带source文件名的PNG捕获到弹层合成前的底层编辑器；**不能作为原生来源图像呈现证据**，未选作这里的来源展示图。实际图片DOM `complete/naturalWidth/naturalHeight` 和Sheet/Back行为断言与浏览器可视证据分开登记；原生图片像素级呈现仍NOT_RUN。

原始下载证据在工作区忽略目录 `output/playwright/g7/ci/40460260275-{web,browser,build,native}/`，未把整套运行结果或私人内容提交。CI Artifact名为 `recipio-g7-{web-results,browser,build-evidence,native-evidence}-40460260275-1`，证据保留7日；临时APK只保留1日。持久记录为本报告、Git源码及9张选图，完整原始日志可按Run/Job定位。

## 7. 改动文件与保护核查

相对G6基线，产品改动仅在这些既有UI与新UI目录：

```text
src/native/intake-review/{field-bindings,quality,editor-session,review-panel,source-context,source-panel}.{ts,tsx}
src/native/recipe-editor.tsx
src/native/library-app.tsx
src/native/ai/{preview,review-panel}.tsx
src/native/link-import/screen.tsx
src/native/find-recipe/screen.tsx
src/native/main.tsx
src/native/ui-v2/g7-intake.css
src/native/ui-v2/native-sheet.tsx
```

对应新测试为 `intake-review/*.test.{ts,tsx}`、`ui-v2/native-sheet-registration.test.tsx`；既有 `ai/preview.test.tsx` 和 `ai/presentation-v2.test.tsx` 仅按新折叠UI主动展开后保留原断言。新增 `G7IntakeReviewInstrumentedTest.java`；旧23项Android测试未改。云端/合成夹具为 `.github/workflows/recipio-g7-cloud.yml`、`scripts/fixtures/g7-intake.tsx`、`scripts/verify-g7-browser.mjs` 和 `scripts/verify-g7-native-fixtures.sh`。其余仅 CURRENT_STATE/ROADMAP/DECISIONS/G7任务和本报告/选图；没有删除文件。完整精确列表可用：

```text
git diff --name-status 69e221567038e1e32668f882b31e57a589c483de HEAD
git diff --name-only e8c2f948544d8650919456bd2421b7a04ea218b4 HEAD
```

逐路径核对：Schema/Preview/Backup、所有Service/Repository、Provider/normalizer/Key/SSRF、媒体清理、Android生产Java/Manifest/Gradle、签名、原始Logo、依赖锁文件和G6计算/会话实现均无差异。唯一共享UI例外是上述NativeV2Sheet监听时序；测试文件和新增云端QA明确列出，不伪装为生产存储修改。提交前差异格式、敏感值/密钥文件检查通过；不包含真实凭据、私人截图、来源HTML或私人备份。

## 8. 仍未执行与停止点

**NOT_RUN**：实体手机/OEM、TalkBack、Android系统字号、实体设备性能、飞行模式进程冷启动、原生图片像素级呈现、长期同签名升级、真实个人数据迁移。未调用真实模型，不承诺AI准确率；本轮原生选图注入不等于系统SAF实测。既有5项lint警告以及极窄大字需继续观察的NOTES保留。

用户原版App、图片、数据库、备份与其他项目设备/数据均未操作。没有本地重型工具、用户APK安装、私钥生成、真实数据恢复、main合并、PR/Tag/Release/部署。仅普通推送G7功能分支，交付后核对远端HEAD一致、工作区干净。下一步仅等待ChatGPT集中独立审查，不启动G8或R1。
