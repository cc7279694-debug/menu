# XHS-R2 — READY_FOR_INDEPENDENT_REVIEW

2026-11-03。分支 `fix/recipio-xhs-r2`。送交 ChatGPT 独立验收，未宣称真实平台修复成功或发布通过。

## 固定基线与差异

- A1 冻结业务源码：`cf806554ac38346644613dd8b3bf700aeb48b14f`。
- 继承 A2 证据 `081f98f8e31c9d280fc68388c760635a8d1e446d`、A3 登记 `54607862839c9f0d7b05643121f565f527a1b3de`。
- 修复业务及定向测试提交：[`c2c55d21c8328e6f78aa7f738bf9d1eba9f1423d`](https://github.com/cc7279694-debug/menu/commit/c2c55d21c8328e6f78aa7f738bf9d1eba9f1423d)。[精确差异](source.diff)。
- 最终浏览器验证脚本提交：[`cb4d5e864e6d4f51febcc7ac9acbf7c9c1bf6f85`](https://github.com/cc7279694-debug/menu/commit/cb4d5e864e6d4f51febcc7ac9acbf7c9c1bf6f85)。与业务修复提交相比仅改浏览器测试脚本，生产及 TS 测试文件无差异。
- 本报告和证据另行提交；不混淆业务源码与证据提交。

## 已确认与尚未确认的原因

用户描述的录屏现象是“仅标题 / 无目标正文 / 文字 AI 禁用”。本轮未收到或打开原录屏文件，未请求真实链接，不推断平台实际响应。

| 环节 | 已核对的代码事实 | 实际目标笔记情况 |
| --- | --- | --- |
| 短链、URL、参数 | Native 保留 query，仅去 fragment；每跳校验并固定 DNS 地址 | 是否成功跳转、最终 noteId、参数实际返回：UNKNOWN / NOT_RUN |
| 网络、登录或验证 | 保留独立的 DNS/Fake-IP、HTTP、登录、验证码错误类别 | 该笔记是否遇到限制：UNKNOWN，不能归因 Key 或模型 |
| 公开状态 | 原实现只接受 `note.noteDetailMap` 内包裹 `.note` 的记录；其他形状或缺失状态都会安全返回无正文 | 真实页面形状是否变化：UNKNOWN；本轮仅以合成变体确认兼容缺口 |
| 目标归属 | 缺失或错 ID 时拒绝推荐区和无关 JSON-LD；这是已验收的 BLOCKING-01 防护 | 保留，不能为得到结果而撤回 |
| 图片/视频 | 原网页读取不获取图片内容、视频画面或口播 | “主要菜谱在长图”来自用户报告，未独立读取该媒体 |
| AI 入口 | 仅标题时原文字 AI 必须禁用；原“改用文字/截图”先丢弃网页会话，丢失标题上下文 | 体验缺口已合成复现并修复；不是已经证实的模型或 Key 故障 |

## 实际修改

1. **有限公开状态兼容。** 在同一个 `noteDetailMap` 内兼容目标 ID 键直接存 note，以及唯一显式 noteId 匹配的直存记录。保留原包裹形式。未新增递归扫描、推测 ID、JS 执行或通用 HTML 回退。真实平台是否使用新形状仍未验证。
2. **可区分的诊断。** 状态缺失、不支持的状态格式、目标缺失、未完成目标定位、正文字段非法、媒体无正文、安全上限、登录和验证分别说明。没有公开状态时明确表示无法区分“未提供”还是“其他格式”，不猜测。
3. **原页面截图补救。** 新按钮“添加菜谱截图并用 AI 整理”进入既有 AiIntakeScreen，网页标题只作为未核实的本地提示。AI 输入初始为空，不自动夹带标题、网址、网页正文。用户自主选图/补字，再点开始才请求 AI，费用提示仍在。
4. **原审核保存闭环。** 继续使用临时图片、AiPreview、来源查看、缺失/推断确认、同名检查、UUID 与不确定写入恢复。取消清理截图，返回原网页结果；保存只产生普通 Recipe。没有持久化 ImportJob 或新数据实体。
5. **密钥设置返回。** 嵌入页在设置期间保持挂载；返回 active 时刷新 Key 配置状态，避免按钮一直禁用，并保留已输入文字和截图。隐藏时不处理页面 Back。

长图复用现有 Native 图片边界：原图最多15 MiB/3200万像素，现有缩放/输出限制保持不变。浏览器合成长图600×1800，真实系统 Picker、超长图压缩后的字迹和模型识别质量未验证。界面提示过长字小可由用户分成多张，最多6张；没有自动分图或降低图片安全限制。

## 本轮实际验证

| 检查 | 结果 | 证据/范围 |
| --- | --- | --- |
| 定向 JS/TS | **444 PASS / 39文件** | [最终日志](targeted-tests.txt)，link-import、ai、intake-review；非全仓历史重跑 |
| Native 纯 JVM | **25 PASS** | [最终日志](native-tests.txt)；WebUrlSafetyTest / WebImportRequestTest / SafeWebFetcherTest，fresh javac + JUnitCore，仅本地 MockWebServer/合成 DNS |
| TypeScript | PASS | [日志](typecheck.txt) |
| 全仓 Lint | 0 error，5既有 warning | [日志](lint.txt)，未消除或隐藏旧警告 |
| Web生产构建 | PASS | [日志](build.txt)，新隔离输出目录，不覆盖冻结 APK/既有 Android 资源 |
| 生产隔离 | PASS | [日志](isolation.txt)，326个生产模块、15共享V2、0 showcase/测试夹具，write=false |
| 实际浏览器 | **27组 PASS / 12图** | [最终结果](browser-results.json)；Chrome、390×844、三主题；0外部HTTP、0页面/控制台错误、0真实AI |
| 冻结文件 | PASS | [一致性回执](verification.json)，Native/存储/Backup/Provider/Token相对A1无变更，V28签名APK原SHA保持 |

浏览器9种合成场景×3主题：无状态、未知状态结构、错误目标、短链未定位、只有媒体无正文、目标直存状态、普通菜谱JSON-LD、登录和验证码。每个场景先断言0 AI / 0保存；“无状态”再走用户选生成长图→显式模拟AI→8步结果→编辑→查看原截图但不自动勾选→明确审核→保存普通菜谱→temp释放。Native文件映射和Provider由测试适配器替代，不能冒称原生/真实识别测试。

单元回归继续覆盖：A/B归属防护、合法目标、普通站点、恶意HTML/不可执行状态、深度和数量上限、补充文字、重复进入/迟到session、取消选图/取消录入、隐藏页Back、密钥设置返回、同名检查、保存失败及UUID恢复。源图片和原文不进入正式菜谱或Backup的既有保护未改。

RED→GREEN记录：新解析测试最初9失败、原40通过，再49通过；最初截图接入3失败/原38通过；诊断提示1失败后通过；设置返回刷新测试先失败后通过。早期浏览器27组通过后扩展来源弹层校对：一次测试脚本在modal打开期间查找被隔离的底层checkbox超时，属测试定位错误；移至关闭弹层后检查，最终27组通过。原始失败目录本地保留，未以跳过产品场景获取绿灯。

没有因为本轮重跑全量历史产品/Android验收。正式生产差异始终是c2c55d2，后续两次提交仅修改浏览器验证脚本；各日志的最终结果不与旧测试数字相加。

## 安全核对与 NOT_RUN

- Native网络源码0差异：SSRF、DNS全部地址检查、Fake-IP拒绝、每跳连接绑定、默认TLS校验、HTTPS防降级、3跳/2MiB限制保留。无Cookie、登录凭据、私有API、动态签名或验证码绕过。
- 网页标题保留在本轮内存，不等于可靠完整菜谱；仅标题仍不能启动网页文字AI。截图请求只含用户实际文字和本轮图片ID；服务不自动发送网页URL/token/HTML，也不偷偷读屏。
- SQLite4、Preview7、Backup2、图片真实引用关系、正式Key存储、Provider请求和模型选择、Logo、三主题Token均未修改。只读核对V28现有APK为 `52dfed4ef23afb5aa0dc6fb2b6089921af240993627aec9479ff69ea3d94b59b`。
- **NOT_RUN**：真实小红书匿名HTTP、真实短链跳转、原dns_blocked手机诊断、真实AI/Key/识别准确率、小米14/Android OEM/IME/Back/TalkBack、Native Picker/原生长图压缩/像素呈现、Gradle/connected/APK构建安装。浏览器Back合成事件不计Android证据。
- 没有请求真实网址、API Key、Cookie或个人备份；Git仅提交合成夹具和截图，无原笔记原文/录屏。已有 `android/.idea/` 未跟踪文件保留。
- 已签名V28、签名身份及个人数据均未修改；没有新APK、重签、手机操作、main合并或发布。

## 复验与截图

运行 `npx vitest run src/native/link-import src/native/ai src/native/intake-review --pool=threads --maxWorkers=1 --no-file-parallelism`。浏览器先 `npm run dev:local -- --host 127.0.0.1 --port 5203 --strictPort`，再用已装Playwright1.62.1运行 `node scripts/verify-xhs-r2-browser.mjs --runtime=<现有node_modules绝对路径> --out=<全新证据目录绝对路径> --base=http://127.0.0.1:5203/`。所有请求限定本机，不安装新依赖、不连接真实平台或Provider。

三主题各4张实际截图均在 [screenshots](screenshots)，文件哈希见 [verification.json](verification.json)：

| 页面 | Warm Ivory | Pure Glass | Soft Sage |
| --- | --- | --- | --- |
| 仅标题/诊断和截图入口 | [查看](screenshots/warm-ivory-missing-state.png) | [查看](screenshots/pure-glass-missing-state.png) | [查看](screenshots/soft-sage-missing-state.png) |
| 原页面截图输入 | [查看](screenshots/warm-ivory-screenshot-input.png) | [查看](screenshots/pure-glass-screenshot-input.png) | [查看](screenshots/soft-sage-screenshot-input.png) |
| 仍须人工审核 | [查看](screenshots/warm-ivory-screenshot-review.png) | [查看](screenshots/pure-glass-screenshot-review.png) | [查看](screenshots/soft-sage-screenshot-review.png) |
| 合成目标正文兼容 | [查看](screenshots/warm-ivory-direct-note.png) | [查看](screenshots/pure-glass-direct-note.png) | [查看](screenshots/soft-sage-direct-note.png) |

全页截图中已有固定保存操作条绘制在视口底缘；截图不等于真机像素检查，当前读写和保存门禁以行为断言为证。

下一步仅为 ChatGPT 独立验收。真实平台只读诊断须先取得用户明确授权；本报告不要求现在进行真实请求，也不自行进入新版打包/安装。
