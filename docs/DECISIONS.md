# Decisions

## 2026-10-06 — Share reader retirement requires OS exit, not Binder death

### Decision

Before Share cache mutation, completion acknowledgment or the next reader, the metadata worker confirms every handshaken reader PID has exited. Only `ESRCH` from a signal-zero probe succeeds. A started request without a valid PID fails closed. Keep the 30s read cutoff separate from the bounded 5s retirement confirmation budget.

### Context

Strict Android deadline/cancellation assertions observed a live process after Binder death. ActivityManager also retained stale process records, so neither a Binder callback nor an ActivityManager listing proves OS exit.

### Alternatives / Reason

Do not add a grace delay or relax the exit assertion. Reuse the existing orphan-reader exit probe in the background retirement path. If confirmation fails, preserve the active request and its bytes, return a safe failure and permit explicit release retry; do not start another writer or repeat the stage-completion callback.

### Consequences

No schema, Backup, Provider, permission or dependency change. Generated Android fault injection covers quarantine, queue exclusion, cleanup failure and retry. All final regressions and APK/device evidence must be recreated after this production repair; earlier green runs remain historical.

## 2026-10-06 — Share is a temporary entrance, not a second importer

### Decision

Extend acceptedURLShare with exact text and1–6static images into existingAPK-4AI input. Preserve URL precedence, explicitStart/humanPreview gate and ordinaryRecipe save. KeepSQLite4/Preview7/Backup2 unchanged; no persistent Share queue or new permission.

### Context

External temporary grants expire and arbitrary ContentProviders can block. DeferredShare must not overwrite ongoing work or leak temporary files.

### Alternatives

Deferred URI reading inJS, databaseSharequeue, or a cancellation-only worker susceptible to noncooperative Binder/read blocking. Rejected as inconsistent with approved safety/lifecycle contract.

### Reason

Immediate private staging plus reusedAiImageCodec, bounded disposable same-UID native reader, memoryreceipt ownership and atomic freshAI transfer preserve existing local model. Actual-delete release callbacks and retries protect cancellation/replacement races.

### Consequences

Private non-exportedservice adds no permission/dependency. Sources remain temporary, process death may discard pending. RealAndroid and physicalShareSheet verification stay separate from compile/browser evidence. No automaticQwen, video, cloud or main promotion.

## 2026-10-06 — Share Bridge lifetime and Android fixture readiness

### Decision

分享插件销毁与 consume/intent 回调使用同一 monitor，销毁后排队调用不得消费新 Activity 的内存槽。Android 原生密钥 Dialog 夹具先等待真实本地导航出现，再进行 Dialog 与关闭 Activity 验证；不改 SQLite 生产层或 schema。

### Context / Alternatives / Reason

Capacitor quitSafely 仍执行旧插件队列。生成回归用例在旧插件销毁后发布新 receipt，旧 consume 实测 RED（返回 url 而非 empty），最小生命周期门禁修复。全量测试另出现 database locked，实际 DOM 是数据库启动错误而非分享丢失；旧原生 Dialog 夹具不等 React/Backup 启动便关闭 Activity。等待业务就绪后完整回归通过，但未保留足够事务尾部日志，不把具体某一事务认定为已证明的原因。夹具等待真实就绪，不改 SQLite 生产层、不增加任意 delay、超时或跳过断言。

真实 IME 日志还显示未结束的显示动画与 Back 隐藏请求重叠。AndroidTest-only `AndroidImeProbe` 等待平台动画结束、可见状态和窗口焦点，再执行原有 Back/草稿/门禁断言；不改变键盘、页面路由或生产监听，不增加第二套页面状态机。

### Consequences

旧分享调用不会抢新 receipt；保持来源仅内存、单次消费和显式网络操作。最终全仓与 Android 结果需来自补丁后的实现，不复用补丁前绿灯；生成夹具不清除数据库或私人数据。

## 2026-10-05 — Accepted APK-5A ff promotion and URL-only Share entry

### Decision

用户明确批准将 APK-5A `f7c5d8de8cf2dde94cc61f2d7ca9f896e73417af` fast-forward 提升 main，并创建 annotated `v0.6.0-link-import`；普通 push，保留所有历史。APK-5B 从该 main 建立 `feat/recipio-share-target`，只接 Android SEND/text/plain 中唯一 HTTP(S) URL，预填既有网页入口。

### Context / Alternatives / Reason

分享是入口而非新导入系统。未选择自动抓取/AI、Share Target 接收图片/视频、来源表、持久化 pending 或第二套 IME 状态。Native 只读取 EXTRA_TEXT，32KiB UTF-8、精确去重、复用无 DNS 的 URL 校验；网络连接安全仍由用户点击 Read 后的 APK-5A 负责。事件只提示有新项，JS 显式消费权威内存槽。

### Consequences

新 pending 可替代旧 pending 并提示，但不会覆盖正在编辑/请求/恢复/查看中的状态；安全页面立即预填，延后分享必须用户 Open/Ignore。异步打开检查挂载所有者与最新路由，监听失败可重新连接，父级订阅已有 Link 状态以避免按钮滞后。Native 清理已消费 payload，保留 Intent 身份以兼容真实生命周期；不持久化处理标记。进程关闭可能丢未处理分享，不支持附件或猜测末尾标点。无新权限/依赖/schema/Backup；本轮0真实AI，交付后停在5B，不授权5C。

## 2026-10-05 — APK-5A Parser First with pinned native public-page reads

### Decision

按用户已批准的10任务实施独立网页入口：Native OkHttp4.12.0 安全读取 → 惰性 Cheerio slim Schema.org Parser → 人工预览 → 原 RecipeLibrary.createDetails。只有显式选择才复用 APK-4 AI。SQLite4 / Preview7 / Backup2 不变，来源仅内存、网页图片不下载。

### Context / Alternatives / Reason

APK-4 `d01589e` 已验收并提升稳定 main；旧 Web fetch 的 DNS 检查后二次解析、平台特例和自动 AI 不符合新边界。不搬旧服务端代码、不改栈、不新增 recipe-scrapers、服务器、来源表或重复 Provider。全部 DNS 地址校验后固定到每跳 OkHttp Dns，独立池禁复用/跨主机 coalescing，系统 TLS；无代理、认证、Cookie、Referer、自动跳转/重试。MIME/字节/时间预算和取消由 Native 负责，UI 不控制方法、headers 或IP。

### Consequences

允许批准的 HTTP80，Android `usesCleartextTraffic=true` 是明确平台配置取舍；系统 TLS、Qwen 固定 HTTPS及WebView CSP不放宽，无新权限。代理/VPN Fake DNS 的保留地址会被拒绝，不为平台放行。自动化仅生成源与 Fake Provider；真实网页失败可回退，不降低 SSRF 安全。未知写入结果查同UUID、恢复代次使迟到来源/保存失效，保留编辑草稿。暴露文字作为不可信输入，严格解析与人工门禁控制保存，不声称清洗消除了所有 Prompt Injection。模块交付后停止，不授权 APK-5B/C。

本轮修补保持三处来源生命周期：未知 Parser save 的原编辑输入、Native cancel 失败时的 AI cleanup、restore 后迟到 AI save 的 generation。均有 RED→GREEN；Android 测试窗口先验证真实焦点与即时布局，生产 Back 路由没有增加延时或第二键盘状态机。执行证据见 verification/link-import.md 与 checkpoints/2026-10-05-link-import.md。

## 2026-10-05 — APK-4 approved Qianwen workspace-key compatibility

### Decision

用户明确批准修正格式与接口匹配。`sk-ws-` 应用密钥允许 ASCII 句点，走固定 `https://maas.qianwenaiapi.com/compatible-mode/v1/chat/completions`；旧北京百炼 `sk-` 保留原固定接口及字符规则。Token Plan `sk-sp-` 不作为应用凭据。两类都保留20–512长度、边界空白容忍、拒绝内部空白/控制字符/打码值。

### Context / Alternatives / Reason

用户授权的一次极小桌面文字诊断返回 HTTP200、严格 status-ok JSON（970ms，qwen3.8-flash）。官方首次调用文档明确新的 sk-ws- 与 maas 域名；旧本地 ASCII-only 判断及固定北京路由无法兼容该凭据。这不是用户复制错误或模型权限失败。未选择任意 URL、JS 持有 key、双接口探测/失败回退、更换模型或把 Token Plan 用于应用。完整凭据未写入项目/命令行/env/日志/包，诊断仅在内存使用后清理会话；用户应撤销已在聊天中披露的密钥。

### Consequences

本条替代下方历史记录的“仅北京”和“加密校验字符集完全不变”，不修改加密格式/AAD/路径、Keystore、SQLite4/Preview7/Backup2、权限或后续模块。格式由 AiSecretEnvelope 统一拥有；原生请求与状态回复使用同一 Provider 枚举，JS 仅收到白名单 profile。为保持桥兼容沿用 region 字段，qianwen-platform 表示服务平台，不宣称地理位置。一次桌面诊断不等于最终 APK、真实选图或手机审核保存验收；设备及图片 gates 仍 pending。不会重用曝光 key 追加真实请求。

官方依据：https://platform.qianwenai.com/docs/developer-guides/getting-started/first-api-call

## 2026-10-05 — APK-4 native key paste compatibility without weakening stored credentials

历史决定：字符集/单北京范围已由上方 workspace-key 兼容决定替代；边界处理、安全存储和历史验证证据保留。

### Decision

在原生输入边界去除首尾 Unicode 空白及 U+FEFF/U+200B，给出不回显输入的明确格式原因。内部异常字符、打码显示值、非小写 sk- 前缀和20–512长度规则保持严格，最终继续调用未修改的 AiSecretEnvelope 校验；保留输入清空和 Keystore/AtomicFile/生命周期互斥。

### Context / Alternatives / Reason

用户手机显示本地格式错误，确认复制值是 sk- 开头；实际密钥未被读取。旧 trim() 对生成样本的 NBSP/BOM/零宽边界可重复拒绝，不能据此宣称用户账号无效或认定实际输入一定含隐藏字符。未选择删除所有空白、接受任意字符串、把 Key 交给 JS 或发真实请求诊断。

### Consequences

仅复制边界兼容，不是认证绕过；本地保存后仍需独立 Provider 验证。普通输入失败明确尚未联网、已清空可重贴，旧密文不变。无新依赖、权限、SQLite/Backup版本或模型变更；本轮真实付费调用0。桌面/构建证据和设备未运行项分开记录，未验证实际手机前仍为待验收APK，不提升整个APK-4状态。

## 2026-10-05 — APK-4 pending acceptance evidence must remain explicit

### Decision

采用用户收尾请求中的 tiny-text preflight 与十项 packet 要求，替代旧预检输入类型/九项包约束；用户随后暂缓 Android 验收，允许完成桌面证据与待验收交付，但不声称键盘、真实模型、真机或整个APK-4完成。

### Context / Alternatives / Reason

新测试已编译但真实 IME 复现受内存不足中断，根因未确证。未选择凭推测修改原生返回键、页面延迟/第二状态机、用JS模拟宣称Android通过，或在键盘门禁前消费真实额度。

### Consequences

生产代码继续1382974基线。恢复设备验收后先跑原生键盘诊断及8个冻结场景；如需修补，必须RED→GREEN和fresh全量。预检当前仍是旧微型图片实现，真实调用前须测试先行改为批准的微型文字，不能悄悄把旧能力写成已通过。Review Packet 包含单独 Provider Not Run 证据；本轮状态保持 APK_4_PENDING_DEVICE_TEST，无云/数据库/产品范围变化。

## 2026-10-04 — APK-4 implemented narrow native BYOK boundary

### Decision

执行已批准 c8606e3 和用户补充冻结要求。只支持文字、1–6张截图/组合，经本地 strict 校验、完整数字 token 核对和三态审核，明确确认后用现有 RecipeLibrary.createDetails 保存普通 Recipe；SQLite4 / Preview7 / Backup2 不变。

### Context

原本地核心和安全 Replace 已验收；可选在线录入不能新增云主库/登录/第二种菜谱实体、来源持久化或持有业务数据库锁。密钥不能进入 WebView、业务数据、日志或备份。

### Alternatives

未采用 WebView 直接请求、持久 AI 草稿、云中转/共享内置 key、SDK/新秘密存储依赖、模型自动回退或重试。没有借本轮升级旧 Web/Android 依赖。

### Reason

原生 Keystore AES-GCM + AtomicFile/noBackup 密文、受保护 password dialog、固定系统 TLS HTTPS 和无 plaintext getter 形成窄边界。来源时间/用量保守审核和 UI/service 双确认防模型直接写库；操作 UUID/generation、终态先释放后回复和既有 FIFO precondition 保护取消/重复保存/恢复排序。私有临时图与永久资产完全分离，清理失败保留 owner，恢复后清理重试同时回收文件和会话名额，不只清除 UI 警告。

### Consequences

只增加 INTERNET，核心无需网络；Android 云备份和设备转移排除规则不变。同设备业务 Replace 不操作 device credential；备份不能在新设备或明确删除 key 后恢复它。原输入、临时图、raw response、fieldChecks 和 Provider metadata 不进入正式 Recipe/Backup2。生产代码的两个最终审查修补都有 RED→GREEN，最终证据另外记录，不能用历史数字宣称完成。

qwen3.8-flash 是候选，固定北京 endpoint。用户原生输入真实 key 后先一次微型图片/JSON preflight，成功才冻结账号实际可用；随后最多文字/单图/条件多图3次，合计最多4POST。当前实际付费 POST=0，没有实际账号错误，不标成 AI_PROVIDER_ACCESS_BLOCKED。自动化/JVM/connected 全部 Fake；未完成真实账号 smoke 时交付状态必须 pending。以下“待审技术约定”保留为此前计划阶段历史，当前执行与验证以 CURRENT_STATE/checkpoint 为准。

## 2026-10-04 — APK-4 冻结范围与待审技术约定

### Decision

用户授权进入文字/截图 AI Intake，复用当前本地Recipe与编辑/审核思想，不搬入旧Web的云导入架构。实施计划为 `superpowers/plans/2026-10-04-apk-4-ai-intake.md`，完整技术约定为 `ai-intake-contract.md`；当前只完成文档，等待一次开工前确认，技术默认值尚未成为已实现能力。

### Context

运行基线是 APK-3 `78f1877664db0b0015c132e970a4cfffe7ff03fc`、SQLite4 / Preview7 / Backup2。已有手动编辑、本地图片、明确烹饪记录及安全备份。旧Web的AI提示词和严格审核有可借鉴规则，但server-only、Supabase job、Storage、来源/分类/标签不能复活。

### Alternatives

不引入共享key、自建AI服务器、WebView明文key、额外服务商/模型选择、长期ImportJob或复制永久图片。原生secret输入、Keystore加密私有文件和固定原生HTTPS可以保持窄信任边界；纯浏览器结果不能证明这些边界。

### Reason

2026-10-04官方公开文档确认Qwen3.8 Flash支持本轮文字/图片和结构化输出；图片的JSON Schema不能假称严格生效，因此本地strict校验仍必需。候选固定北京兼容endpoint、非思考模式；账户权限和真实质量未调用验证。Android平台Keystore/AES-GCM/AtomicFile避免新依赖；原生password dialog不传明文给JS，并显式关闭Capacitor参数/结果日志，避免Debug隐性泄露。

### Consequences

计划将密钥、临时cache截图、内存草稿与正式库分开；只有经人工编辑和必要确认的内容保存为普通Recipe。SQLite及备份版本不变，普通创建保留默认行为，只评估可选UUID/内存precondition防双提交和恢复后的迟到写入。Provider请求与key变更共用原生互斥，不持本地业务锁。自动化fake、真实smoke最多3次，不索取聊天/命令行密钥；最终按实际Android/Provider证据区分完成、待验收、阻塞。当前分支 `feat/recipio-ai-intake`，不部署、不改变真实云数据、不进入APK-5。

## 2026-10-04 — APK-3 local cooking data and strict backup successor

### Decision

Keep full steps as the default. Focus/Guided are optional views, not sessions; only explicit completion creates an idempotent, minimal local record. Reuse current change snapshots as read-only history. Add incremental SQLite v4 / Preview v7 record storage and keyset indexes, without changing old rows.

### Context

APK-2 Backup Format v1 is a frozen strict schema: its source is SQLite3 and it already requires modification history. New records cannot be silently added to or omitted from that definition.

### Alternatives

Redefining v1 or making all new records optional would weaken the accepted integrity contract. A separate version tree or cooking state machine would exceed the approved product scope.

### Reason

New exports use strict Format v2/schema4 with required cooking records/counts. Unchanged v1 validation runs first; internal normalization adds only an empty cooking-record collection. The original input manifest/hash remains the restore commit identity. Full reference closure includes current images, old snapshots, soft-deleted Undo recipes and cooking photos; immutable paths can be shared with covers. Export pins protect snapshot files after releasing the short data lock.

### Consequences

Seven business tables participate in the same atomic restore and safety backup. Draft/replaced image files are conservatively retained; only explicit deletion candidates with no live/history/record/export reference are removed. No login, network, timer or later AI module is introduced. Final same-version verification passed; actual evidence is recorded separately in the APK-3 checkpoint and Android verification document.

The native backup bridge releases the finished operation's busy/phase state before publishing success or failure. It must never release in a post-reply finally: JavaScript can immediately start the next bridge call. A real export/discard/restore race and two RED→GREEN native tests justified this narrow correction; staging, safety backups, committed facts and transaction boundaries are unchanged.

## 2026-10-04 — Backup Format v1 与提交事实驱动的安全 Replace

### Decision

执行用户已批准 APK-2 计划。备份为包含六表逻辑数据和全部当前/历史引用媒体的 `.recipio` ZIP；原生标准 ZIP/流式 SHA-256，唯一规范为 `backup-format-v1.md`。恢复只提供 Replace：完整校验及媒体 staging 在明确确认之前，安全副本和单一 SQL 事务在确认之后。SQLite v3 仅增加同事务提交的恢复事实元数据，浏览器 Dexie v6 仅增加对应 store。

### Context

APK-1 已有规范化业务表、不可变私有媒体、before/after 修改快照。复制数据库文件会耦合插件布局；仅 JSON 缺少图片。任意 SAF provider 不能保证跨文件原子写入，SQL 与文件系统也没有共同事务。

### Alternatives

直接复制库、先删旧图、依赖 journal 阶段判断成功、或确认后才校验媒体；均不满足批准的数据保护边界。不引入云、合并恢复、加密或 CRDT。

### Reason

不可变新 generation 先落盘；事务同时切换业务数据和提交记录，使数据库只能指向完整旧或新媒体。提交响应丢失、进程中断后复读 SQL 与历史引用闭包，不重放恢复、不猜测 journal。导出采用完整私有包、新建文档、不覆盖、关闭后回读；失败删除仅本次未验证文档，删除被拒绝必须提示。

### Consequences

当前/历史旧图和私有安全副本保守保留，暂不做媒体 GC、提醒、加密或合并。安全副本不能防卸载/清数据；用户应保存外部备份。系统根目录别名先规范化，再严格拒绝子路径符号链接，避免 Android 合法路径被误判而阻止冷启动。系统云备份关闭及五域排除保持不变；厂商迁移/第三方 provider 行为不作绝对保证。自动测试、模拟器和真机证据分别报告，单模块完成后停止。

## 2026-10-04 — Android 图片从原生选择器直接导入私有目录

### Decision

Android 封面与步骤图使用应用内 Capacitor 插件，系统选择器授权后通过 ContentResolver 流式复制到 filesDir/images，返回既有 UUID 相对路径。保留 Web Preview 的 File/IndexedDB 路径。

### Context

稳定 Android 36 上，系统已授予同一 content URI 的读权限，原生 Filesystem.readFile 可读，而 WebView FileReader 抛 NotReadableError。Android 37 上曾成功，不足以排除跨环境兼容性问题。不能认定缺少 INTERNET 或相册权限是根因。

### Alternatives

放宽权限、升级整个 WebView/Capacitor、重试 FileReader、将 URI 再传回网页；均缺少必要证据，且无法保证当下选图边界可靠。

### Reason

直接在获授权的原生边界复制，避免失败的网页读取路径与大图 Base64 内存开销；不新增 INTERNET、READ_MEDIA、全量相册访问或第三方包。真实原生选择器和文件验收仍必需。

### Consequences

数据库结构与 images 路径契约不变，复制完成后 UI 才替换引用。取消、异常不破坏原有图片/文本；临时文件复制完成并关闭后再重命名。无固定图片大小上限，但按当时剩余空间减 32MiB 预留预算拒绝空间不足；不是无条件磁盘保证。进程强杀遗留部分文件的回收后置，图片本身仍保守保留以保护历史引用。不得把 JVM 单测当作 Android 选图验证。

## 2026-10-03 — 日常库原生数据验收先于备份

### Decision

继承已完成的日常库，不新增功能；先验证 Android SQLite/私有文件/迁移/离线/升级，再单独确认完整备份模块。只修复阻止原生运行的问题。

### Context

用户提供 APK-1 Android Native Acceptance Gate，新要求替代同日暂缓打包的执行顺序，但不改变产品定位或技术栈。

### Alternatives

继续只用浏览器结果宣布完成，或直接开始浏览器备份；都不能证明最终 Android 权威存储可靠。

### Reason

备份格式必须基于实际可用的 SQLite 与持久媒体，而非尚未验证的适配层假设。

### Consequences

构建、安装、模拟器检查与实机验证分别记录；缺少验证不虚报完成。新增真实 Android 返回键缺陷的修复和验证工具，无推送/部署。独立测试模拟器避免干预其他项目；媒体仍保守保留。旧检查点作为历史保留，当前证据另写原生检查点。

## 2026-10-03 — 功能先行，打包后置

### Decision

保留 APK-0，暂缓打包和原生验收，先完善共享客户端日常菜谱库。浏览器复用 Dexie localRecipes/media；Android 继续原 SQLite v1→v2 迁移，图片存私有文件目录。

### Context

用户明确产品尚不够实用，要求优先完善功能。

### Alternatives

立即打包或重建本地库；均不符合当前优先级。

### Reason

统一 RecipeLibrary 契约与领域校验，先验证流程，保留原生路线。设备图片必须与旧云缓存清除隔离。

### Consequences

Web 验证不替代 Android SQLite/文件验证。浏览器预览需本地服务器，不承诺离线冷启动；图片保守保留，备份/回收后续实施。本决定替代 APK-first 执行顺序，不改变产品定位和技术路线。

## 2026-10-03 — Android APK-first product baseline

### Decision

采用用户确认的 `RECIPIO_CODEX_APK_EXECUTION_PROMPT.md` 基线。当前只执行 APK-0：Vite 静态资源随 Capacitor APK 安装，原生 SQLite 无账户菜名闭环。完整备份提前到 APK-2，AI 后置为可选在线录入能力。

### Context

用户确认个人菜谱库定位，并优先要真实离线 APK。旧分支已有浏览器 Dexie/React/UI/规则等资产，没有 Android 工程。

### Alternatives

继续旧浏览器媒体模块，或全量重写。均不符合 APK-0 范围。

### Reason

最小 Android 纵切先验证资源、原生桥、SQLite、升级持久化。保留旧 Next/Supabase 功能避免丢失可复用成果。

### Consequences

名称是正常菜谱，允许重名。删除只提供 5 秒撤销，窗口内保留原记录，超时永久清理，无回收站。`RecipeNameStore` 是精简 SQL 投影，不复用含分类/收藏等旧字段的完整云模型；APK-1 再增量扩展原生表。
禁用系统备份并排除设备转移数据；厂商迁移不保证遵从。完整备份前不作为唯一重要数据来源。旧云资源不动，共享 AI 密钥不得进入 APK。

### Supersedes

2026-09-08 浏览器优先执行顺序和提前实施 AI/营养的顺序被 APK 路线取代。保留本地事实源、云回退保留、不迁移旧数据的原则。

## 2026-09-08 — Local-only runtime before cloud retirement

### Decision

Make device-local storage the source of truth for the new browser/PWA/Android runtime. Keep Supabase/Vercel as a rollback version during migration.

### Context

The user prioritizes fast domestic access, offline use and no VPN dependency. Existing data is small and does not need migration or multi-device sync.

### Alternatives

Keep Supabase as the primary source with a larger cache; build a separate Android client; or gradually introduce a shared local Repository layer.

### Reason

The Repository layer allows browser IndexedDB and Android SQLite to share business logic without duplicating the product, while avoiding a premature distributed sync system.

### Consequences

The migration temporarily carries both legacy cloud and local paths. AI remains online-only, and local backups become the recovery mechanism.

## 2026-09-08 — Basic link import and nutrition first

### Decision

Keep basic link/image import and post-import nutrition analysis in scope, but defer advanced link compatibility and nutrition precision/UI refinement.

### Context

These capabilities are valuable but are not required for the core offline recipe experience.

### Reason

Separating the core local data path from optional AI prevents an AI outage from blocking cooking and recipe editing.

### Consequences

The first local version must show clear AI-unavailable states and allow manual editing/saving without AI results.
