# Current State

## Current Stage

2026-10-05：APK_5A_COMPLETE。普通网页导入实现、最终自动化与专用 Android 模拟器验证已完成；在 `feat/recipio-link-import` 交付后暂停，等待用户验收，不进入 APK-5B/C。本轮不修改 main，不部署、不调用真实 AI。稳定 main 仍是 APK-4 已验收基线 `d01589e3540d80eb48592a75cf391c79c4533631` / `v0.5.0-ai-intake`。

## Implemented / Inherited

- 新增独立“从网页链接导入”：原生公网安全 GET → Schema.org Parser First → 可编辑 Parser Preview → 普通本地 Recipe。部分/无结构时仅提供显式 AI，读取本身 AI0。多候选由用户选择，同名不覆盖。
- Native OkHttp4.12.0：全部 DNS 地址校验并固定真实连接、独立每跳连接池、系统 TLS、手动跳转3次、无 HTTPS 降级、8/12/20秒预算、解压/UTF-8后2MiB HTML/XHTML；无代理、Cookie、Authorization、Referer或脚本执行。
- 来源和网页图不进入持久层；保留编辑的未知写入查证、原 UUID 幂等、restore generation 和取消释放边界。
- SQLite4 / Preview7 / Backup2（兼容v1）不变，无新业务实体/权限。仅允许批准 HTTP 的平台 cleartext 配置；WebView CSP与Qwen固定HTTPS不放宽。
- APK-1–4 的 CRUD/搜索/本地图片、默认完整步骤、Focus/Guided、明确做过、只读修改历史与安全备份恢复均继承。无购物/收藏/菜单/Timer/云同步/登录。
- APK-4 用户真实 Key/账号/Text/Screenshot/Preview/保存六项验收保留在 `checkpoints/2026-10-05-ai-intake-user-acceptance.md`，不是本轮 Codex 的真实 AI 执行记录；本轮付费调用0。

## Fresh Final Verification

- 全仓：180文件 / 960 PASS，970.21s。
- APK应用：56文件 / 372 PASS，199.40s；Link+AI+Backup：36文件 / 278 PASS，145.64s，属于全仓子集，不累加。
- Native JVM：14 suites / 114 PASS、0 failure/error/skip。Android lint：0 errors / 37 warnings（含新增OkHttp/MockWebServer版本提示）。
- typecheck PASS；JS lint 0 errors / 5旧图片警告；local build和Capacitor sync PASS，现有>500kB核心chunk警告保留。网页Parser服务130.26kB仅进入导入时惰性加载。
- Android API36 / Recipio_Backup_36 / emulator-5580：新增8项WebView/IME/SQLite/取消审核专项 PASS；完整connected53 PASS、0 failure/error/skip，5m35s。Fake网页/Provider不冒充真实外网/TLS/模型调用。
- v12生成菜谱→v13覆盖安装后保留；原生私网拒绝与失败手动入口 PASS。最终13项同步Web资源与已测APK逐字节一致。
- 实际飞行模式、关闭Wi-Fi/数据、force-stop后冷启动：v12菜谱与新Parser菜谱仍可读取，新导入菜谱Guided Cooking离线正常；实际WebView运行时错误0。
- 静态diff、APK221个文本/DEX条目、专用模拟器Logcat凭据扫描 PASS；不读取私人手机数据，不声称清除了历史聊天已曝光Key。

## Current Artifact

`artifacts/recipio-link-import-v13-debug.apk`，17204359 bytes。
SHA-256：`1f9ee38dd781b61d36ddd2552718f6dbed959ca4cbcb30a18c391dd43bac157f`。
`app.recipio.local` / versionCode13 / `0.6.0-link-import` / Debug签名。旧v12保留不覆盖。
白名单 `artifacts/link-import/review-packet-apk-5a-link-import.zip` 由最终干净提交与逐文件hash固定，并回读校验。最终提交SHA、Packet大小/hash与远端一致性见交付回执及Packet manifest，避免自引用提交SHA。

## Known Limits / Evidence Boundaries

- 本轮无物理OEM真机验收、真实Qwen追加请求、真实网页AI fallback调用。已有APK-4用户证据不扩写为这些项目。
- 当前VPN/DNS把普通公开域名解析成198.18保留地址，原生读例页返回dns_blocked；不使用平台豁免。真实网站成功导入不是批准计划的完成门槛，fixture是正式回归依据。
- 首轮Android专项被SystemUI ANR弹窗截走输入，真实焦点证据明确；修正测试窗口/布局前置条件并恢复系统后8项及53项全量通过，没有修改生产Back/IME或增加delay/debounce。旧失败日志保留。
- 初次无逐文件输出的重定向Vitest运行不宣称卡死；完整threads运行最终960项通过。保留终止的旧尝试，不复用旧APK数字。
- 来源仅内存，进程关闭会丢未保存导入；受限/认证/JS依赖网站不保证可读。备份仍未加密；卸载或清数据会丢应用内数据，应另存外部完整备份。
- 安全扫描和测试不证明root/恶意OS免疫。HTTP是批准的原生公开页面能力，不是放宽WebView或第三方任意协议。
- 专用模拟器网络状态在冷启动验证后恢复原飞行模式与Wi-Fi关闭；不操作Mirra5554。具体人工验证以 `verification/link-import-android.md` 为准。

## Next Task

停在APK-5A交付等待用户验收。后续工作必须另行批准；不自动规划或实现APK-5B/C。验收应使用独立v13 APK并注意当前VPN的Fake DNS可能导致安全拒绝；无须重复配置或调用真实Qwen来验收Parser路径。
