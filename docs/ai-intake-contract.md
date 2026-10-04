# APK-4 AI Intake Contract

2026-10-04。产品范围来自用户已确认的 APK-4 请求；下列实现默认值随实施计划提交开工前审核，**尚未实现或验收**。

原请求：`E:\CODEX\.codex\attachments\97267355-ba22-4a92-92e9-23eb1d9c4718\已粘贴的文本.txt`。继承 APK-3 `78f1877664db0b0015c132e970a4cfffe7ff03fc`、SQLite4 / Preview7 / Backup2；执行计划为 `superpowers/plans/2026-10-04-apk-4-ai-intake.md`。

## 1. Goal / Scope / Non-goals

文字、1–6 张截图或二者组合，经一次用户主动 Qwen 请求生成可编辑草稿；经过本地校验与人工预览确认后，保存为普通本地菜谱。原手动菜名/编辑/烹饪/历史/图片/备份完全独立于 AI。

不做 URL、网页、JSON-LD、网页抓取、视频/音频、独立 OCR 服务、搜索/推荐/比较、Share Target、AI 聊天、自动改已有菜谱、来源历史、ImportJob、分类/标签、蛋白质管理、营养中心、第二服务商、云后端、登录或云同步。不修改真实云数据、不部署、不合并 main。

## 2. Planned data flow

```text
新增 → 只写菜名（原路径） / AI 整理菜谱
AI 输入页（文字 + 临时截图；内存状态）
  → AiIntakeService → LocalAiIntake 原生桥
      → AiSecretStore（Keystore + 私有密文）
      → AiTemporaryImages（cache/ai-import/<UUID>）
      → QwenClient（显式 HTTPS，限时/限量/可取消）
  → JSON → strict Zod → 保守归一化 → 审核 + RecipeEditor
  → 用户保存 + 必要确认 → RecipeLibrary.createDetails
  → SQLite4 / Preview7 → 原 Backup2
```

无新增表、迁移、业务同步字段或备份版本。AI 输入/输出/审核/临时截图/密钥不持久化到业务库。最后只存当前模型的可编辑字段，不留下 AI 标记或来源元数据。

## 3. Provider decision and evidence

查阅日 **2026-10-04**，候选固定为阿里云百炼中国内地服务 **`qwen3.8-flash`**，`enable_thinking=false`、`temperature=0.1`、`stream=false`、`max_tokens=16384`；不提供模型选择、不自动回退或重试、不启用联网搜索/代码执行/Function Calling。此 ID 是官方已列出的模型，不是沿用旧代码即认定可用；账号实际权限仍需后续原生 smoke 证明。

固定北京兼容 endpoint：`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`。官方仍列为存量兼容域名，推荐生产大流量改用业务空间专属域名；本个人 BYOK MVP 不增加 WorkspaceId 配置或任意 URL。只接受北京百炼密钥，不承诺其他地域可混用。

纯文字请求用 `response_format.type=json_schema`、strict=true、所有键明确 required、additionalProperties=false。图片请求明确用 `json_object`，同一固定完整合约/合法空态放入提示词；两者都走同一个本地校验器。多模态不能宣称 Provider 严格 schema 已生效。`finish_reason` 非 stop、空/拒绝/非 JSON/截断/错 schema 均不给可保存草稿。

官方依据（公开文档，没有登录、读取用户密钥或真实模型调用）：

- [视觉模型及输入/输出能力](https://help.aliyun.com/zh/model-studio/vision-model)
- [结构化输出与多模态限制](https://help.aliyun.com/zh/model-studio/qwen-structured-output)
- [北京地域及兼容接入域名](https://help.aliyun.com/zh/model-studio/beijing-access-information)
- [图片输入限制及 Base64](https://help.aliyun.com/zh/model-studio/vision)
- [Android Keystore](https://developer.android.com/privacy-and-security/keystore)
- [Android 标准加密建议](https://developer.android.com/privacy-and-security/cryptography)

文档支持不等于账户授权或实际识别质量已验证。无免费额度保证，不记录未经核实的价格。

## 4. BYOK / native secret boundary

设置 → AI：仅未配置/已配置、设置/更换/删除。首版不增加额外连接测试按钮，首次主动整理即验证可用性。

`saveAiKey()` 打开原生密码输入框，用户手动输入/粘贴并确认；JS 无 key 参数，不读取剪贴板、不回显旧值。取消保留旧 key；更换先成功加密并原子写入后替换。输入去首尾空白，标准 `sk-` key 长度 20–512、内部禁止空白/控制字符；非应用 API 凭据不能冒用。

AndroidKeyStore 不可导出 AES-256 key + 平台 `AES/GCM/NoPadding`，每次由 Cipher 生成新随机 IV；应用 ID / 合约版本为固定 AAD。版本化密文只存在 `noBackupFilesDir/ai-secret/key-v1.json`，采用 AtomicFile；不实现自制密码算法，不加第三方秘密存储依赖。包私有读取仅供 QwenClient，桥没有 plaintext getter。解密失败保留原密文并给“请重新配置”，不能清数据修复；删除必须在无请求时进行。

Secret Plugin 与 Intake Plugin 共用一个包私有 `AiRequestLifecycle`：开始请求、实际更换/删除密钥互斥；请求在途时更换/删除返回 busy。原生输入框可以打开，但确认时重新检查互斥状态，不只依赖 UI 先前读取的状态；输入和等待网络均不占业务数据库锁。

Typed API 只暴露 `saveAiKey / hasAiKey / deleteAiKey`；其余处理代码拿不到持久化完整 key。请求内短暂明文仅用 Authorization 头，不入提示词；释放可清理数组但不宣称 Java/String/操作系统内存绝对可擦除。Keystore 能降低静态提取风险，不保证 root、恶意系统、运行时注入无法盗取凭据。

`capacitor.config.ts` 将显式 `loggingBehavior: "none"`，Debug 与 Release 都禁用 Capacitor 参数/结果日志；不改 node_modules。审计 native bridge 的 `logToNative/logFromNative`、WebChromeClient、PluginCall 错误和异常，所有 AI 失败只返回稳定码/本地文案，不回传 provider message、完整原文、Base64、响应、headers 或 exception。真实 key 不经自动化参数、命令行、截图、日志、review packet 或 Git。密文目录也不进入 `.recipio`。

## 5. Explicit network boundary

新增权限只有 INTERNET，原有系统备份禁用/全域排除维持。使用系统 HttpsURLConnection，不新增 HTTP SDK；固定 HTTPS 主机、默认系统证书和主机名验证，禁止 redirect、cookies、自定义 endpoint、信任全部证书及工具调用。

不在 App 启动、回前台、读取本地库时访问 AI；未配置不发请求。每次“开始整理/重试”最多一个 POST；请求前显示“文字和选中的截图将发送给阿里云百炼，可能产生 API 费用”。核心离线功能不受 AI 状态影响。

连接 15 秒、读取 60 秒、整体 90 秒（包含上传/读取，以 elapsedRealtime 为准，watchdog 断开连接）。请求编码后最多 **10 MiB**，响应解压后最多 **2 MiB**，失败体最多读取 **64 KiB** 后只映射允许的错误类别。主动禁用压缩或对解压流继续计量。Native 和 TS 都检查输入限制，不能只依赖 Content-Length。

单 worker + 操作 UUID/取消 token；取消断开 HTTP，迟到回应作废。释放已完成 worker 的 busy/图片 pin 后再回复，不重现 APK-3 reply-before-unlock 竞态。整个网络等待不占 `DataOperationCoordinator`；本地 CRUD、读取和备份不会被 AI HTTP 阻塞。

错误类别：`key_missing / key_unavailable / network_unavailable / timeout / unauthorized / forbidden / rate_limited / provider_unavailable / invalid_output / input_invalid / image_invalid / image_too_large / response_too_large / busy / cancelled`。401 不假称缺网络，403 说明权限/账号问题，429 不自动循环，400 非公开允许类别一律本地通用提示。无网络文案固定“AI 整理需要联网，已有菜谱仍可正常使用。”

## 6. Input and temporary screenshots

- trim 后文字最多 **30,000 个 Unicode code points**；TS/Java 同一计数，不把 Emoji 算两次。文字和截图至少一项；超限拒绝，不截断。
- 截图 **0–6** 张、至少1张时可无文字；SAF 选择且可逐张追加/删除/排序，JPEG/PNG/WebP。AVIF 本轮不启用 AI 管线；不影响既有菜谱图片支持。
- 原图单张最多 **15 MiB**；流式字节上限不是只看 provider 声明。先读取尺寸，原始像素上限 **32,000,000**，任何一边须 >10，比例 ≤200:1；拒绝空、假 MIME、动画/多帧、无法解码、非法 URI、自身 FileProvider 和超限，不申请宽泛相册权限。
- 原生逐张 sampled decode，不同时全尺寸解码六张。中间 bitmap ≤4,194,304 pixels，旋转/翻转使用平台 ExifInterface；输出最长边 ≤2048、短边 >10，白底 JPEG，质量按85→75→65尝试，单张 ≤1 MiB、总图 ≤6 MiB；若仍超限/文字太小让用户裁切，不默默丢图。去除 EXIF/位置等元数据。给用户压缩后预览，不承诺模糊图可识别。
- 仅 `cacheDir/ai-import/<operation UUID>/`，文件句柄不可跨 operation；所有读取/删除规范化根路径、拒绝 traversal/符号链接/任意 content/file URL。不复用永久 LocalImagePicker 的 `images/` 路径。
- 原始复制临时文件在压缩完成即删除；缓存只保留压缩图及无敏感内容的操作登记。预览 URI 来自插件登记路径，不允许 JS 任意指定文件。请求读取期间 pin，取消等待读取结束再执行仅本操作清理。
- 保存成功、丢弃/确认离开、取消当前导入立即清理；失败保留用于本轮手动重试；单张移除只清该句柄。取消一次 HTTP 但仍停留输入页保留选图；“放弃本次整理”清整轮输入及图。
- 冷启动只清理本模块已登记且不活跃的残留；崩溃后的会话不自动恢复、可立刻清理。最迟24小时淘汰，以登记时间+文件时间交叉检查，时钟异常不允许越界删除。清理失败不阻止本地库启动，设置/输入页明确提示且下一启动重试；不宣称文件系统故障也能绝对按时删除。
- 不进封面、步骤图、Cooking Photo、修改历史、DB、备份、安全副本、packet。普通备份操作不扫描 cacheDir；即使应用在 Preview 中导出，原图/密钥也不能进入包。

Web Preview 默认显示“AI 整理需要 Android 本地版”，不创建 key 输入/云直连/持久来源。只有测试注入的 FakeBridge 能演示流程，DEV/TEST ONLY 明示；不能打包到发布 APK或冒称 Keystore/SAF/原生识别证明。

## 7. Draft, normalization and review

Raw JSON 顶层严格 `{ recipe, fieldChecks, warnings }`，全部键明确提供，内嵌 recipe 与现有 RecipeDetailsInput 对齐，coverPath 与每步 imagePath **必须 null**。最小合法响应是非空 title + 其余合法空态，不强制食材/步骤/准备时间存在；真正空菜谱拒绝，不默认补“未命名”或2份。

沿用本地字段限制：title1–120、notes≤20000；食材≤300且name1–10000/amount≤500；步骤≤300且instruction1–10000；准备≤100且instruction1–10000/timingText≤500；关键事项≤100且instruction1–10000。分钟为1–525600整数或null；servings0.1–10000或null；kcal0–100000或null；stepNumber正整数或null。禁止数字字符串/NaN/Infinity、未知业务键、超长字段和超量数组，不能先洗掉错误再称严格校验通过。坏引用直接拒绝，不自动猜目标。

模型 fieldChecks≤**1600**（容纳最大合法字段集合），path≤100、label≤120、message≤240；warnings≤20、单项≤500。合法路径只含 title/totalMinutes/servings/caloriesPerServing/notes 和当前数组真实索引下 name/amount/instruction/minutes/timingText/stepNumber；不允许 media、ID、SQL或任意 UI selector。

先完整 strict Zod，再归一化，再现有 recipeDetailsSchema 最终校验。未知 check path 丢弃；重复 path 取 missing > inferred > explicit。标签由本地生成，模型不能控制 DOM/路由。补齐所有真实可编辑字段检查；未提供的非空值保守 inferred、空值强制 missing（根notes为空不制造无意义提示）；空食材/步骤等集合提供本地缺失摘要，不让“仅标题”绕过检查。

未知用量留空，“适量/少许/一包”原样；可靠文字数量仅做确定性单位整理，不换算假数字。推断的精确准备/烹饪时间清空；模糊时间保留原文。只有来源明确的顺序时间可确定性汇总，不把腌制与并行步骤直接相加。来源完全没提到的食材/操作不允许常识补写；保守提示交人工，不靠提示词声称可自动证明所有事实。

servings 可以推断，但必须 inferred；kcal非空首版一律保守标记 inferred，显示“约 xxx kcal/份”，无法支持的用量/份数缺失时为空。不给医疗/营养准确承诺，不新增整道热量/蛋白质管理。

来源均为不可信数据；固定 system prompt 明确不执行来源中的命令、不泄露提示词/密钥、不改schema、不输出代码、不访问其他数据。模型无工具、DB或key访问；本地拒绝明确的注入指令回填为食材/步骤，Native拒绝回应包含本次真实key后再送JS。结构检查/黑名单无法证明所有语义安全，人工审核仍是必经关口，不能用模拟模型测试宣称云模型绝不会编造。

Preview 显示 explicit“来源明确”（AI判断，不是人工验证）、inferred“AI推断”、missing“缺失待确认”；摘要计数、推断/缺失展开、明确项默认折叠。只作为纯文本 React 呈现，不解析 HTML/Markdown，不保存推理链或长篇来源。

任意 inferred/missing：checkbox “我已检查以上 AI 推断和缺失内容”，未确认 UI及save service 都拒绝保存并聚焦提示；全明确则不额外强制checkbox。用户编辑保留原AI标签，不做字段自动转为explicit；重新整理/新draft重置确认。确认只针对本轮有效draft，不接收AI生成 confirmedAt/requiresConfirmation。

## 8. Save / errors / lifecycle

复用 RecipeEditor，通过小型可选参数改标题、按钮文案、审核slot和提交门禁；普通编辑默认行为不变。AI预览暂不开放选封面/步骤图，保持截图绝不被转成正式Asset；保存后用户可在普通编辑中主动选图。

标题去首尾空白后，对当前未删除库做精确同名提示，允许继续；不自动覆盖/合并/改名。不能因list第1页没找到就声称无同名，错误时提示未完成检查而非假阴性。

只在明确保存时调用现有 createDetails；计划允许向该现有接口添加可选 creation UUID、内存有效性断言，以及 hasExactTitle 查询，旧调用行为不变，不增加Schema。首个保存尝试冻结UUID与输入，防双点、丢回应重试重复建菜；已存在相同UUID必须核对可编辑内容，冲突不能覆盖，软删除不能复活。不能确定是否提交时保留上下文、禁用新的创建，先按UUID复读，不假称失败并另起UUID。

保存前错误保留输入和有效草稿；保存已成功但cache删除失败是“菜谱已保存，临时文件清理待重试”，不是再建一条。重试只清理/重新读取保存结果。不得因为AI、清理、导航失败删除已经保存的菜谱。

一次运行只有一个请求；重复点击、本地图片准备、发送中、取消后迟到callback都用同一UUID/generation判断。Android Back/主导航确认放弃，网络取消保持可返回；本地数据提交期间沿用短暂写入导航保护。后台切换不新建任务、不自动重发；输入切Preview的组件卸载不能丢draft，去设置配置key返回保留本轮输入但不自动发送。退出整轮AI才丢弃，单纯cancelRequest在无在途HTTP时不改变有效Preview。进程死亡可丢未保存草稿，当前正式库不变。恢复成功使未保存AI上下文失效，不能把替换前的草稿迟到保存到新库。

Service 直接同步订阅既有 BackupController 状态，不靠 React effect 延迟失效：进入 restoring/uncertain 即递增会话 generation、拒绝旧保存/回应；恢复取消不清当前数据。createDetails 的可选有效性断言在 FIFO 数据 gate 已取得、接触数据库之前执行；因此先排队但晚于 Replace 获锁的旧保存也会拒绝。先于 Replace 完成的正常保存属于原库，沿用恢复数量变化后二次确认和安全副本，不重复创建。原恢复事务/元数据/协调器语义不改。

## 9. Verification / delivery gate

自动化 100% fake transport/generated input，不存在测试key回退、connected测试真实Qwen、无上限重试。真实 provider smoke 仅用户通过原生输入的自己的北京百炼key，最多3次明确调用：文字、单PNG、2–3图合并；记录计数/结果类别，不保存key、原文或full response。失败停止自动消费，修复后追加调用须明确新的有限预算。

同一最终版本重跑全仓、原生subset、typecheck、lint、Web build、Capacitor sync、JVM、Android lint、assembleDebug/AndroidTest和完整connected。专用Recipio_Backup_36测试生成数据；确认serial/alias，外部已验证备份后才能清测试数据，禁止干扰其他项目。原v1/v2兼容、安全恢复、图片引用、烹饪/历史/离线/覆盖升级全回归。

只有真实已安装APK证明Keystore、原生选图、HTTP桥及SQLite；浏览器/fake不能代替。Key不在备份意味着换设备需重设；同设备Replace不得顺便删除现有key。通过新隔离secret上下文或明确删测试key后恢复证明“备份不会恢复key”。

建议versionCode12/name0.5.0-ai-intake、package app.recipio.local；APK/测试包字节/hash与Git最终SHA报告。packet9项白名单：manifest.json、diff.patch、checkpoint.md、verification.md、android-verification.md、ai-contract.md、security-notes.md、test-results.txt、apk-metadata.txt；逐项回读校验，不放私人内容、key或provider完整响应。只push当前功能分支，不merge/main/deploy/store，不进入APK-5。

完成状态只有按实际证据的 APK_4_COMPLETE / APK_4_PENDING_DEVICE_TEST / APK_4_BLOCKED。此文档目前不是任何一种完成状态；处于计划待批准。
