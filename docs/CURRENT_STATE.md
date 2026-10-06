# Current State

## Current Stage

2026-10-06：APK-5B 实现、完整回归、Android 模拟器与覆盖安装/离线验收通过；只缺真实物理设备 OEM Share Sheet。交付状态 `APK_5B_PENDING_DEVICE_TEST`，停止等待用户验收，不进入5C。当前分支 `feat/recipio-share-target`；main 保持已验收 APK-5A `f7c5d8de8cf2dde94cc61f2d7ca9f896e73417af` / annotated `v0.6.0-link-import`，经授权普通 fast-forward 与 push，历史保留。

## Implemented / Inherited

- APK-5B：Android SEND / exact text/plain / EXTRA_TEXT 中唯一 HTTP(S) URL → 既有网页入口预填。分享本身 Fetch/Parser/AI/save0。编辑、AI、已有 URL、恢复与烹饪视图受保护；hostname-only pending 支持显式打开/忽略，最新项替换有提示。
- 分享只在进程内存，单次消费；支持真实 cold/warm/late-JS/recreation。销毁的旧 Bridge 不得抢走新 receipt；无持久化来源、附件读取或第二导入器。
- 新增独立“从网页链接导入”：原生公网安全 GET → Schema.org Parser First → 可编辑 Parser Preview → 普通本地 Recipe。部分/无结构时仅提供显式 AI，读取本身 AI0。多候选由用户选择，同名不覆盖。
- Native OkHttp4.12.0：全部 DNS 地址校验并固定真实连接、独立每跳连接池、系统 TLS、手动跳转3次、无 HTTPS 降级、8/12/20秒预算、解压/UTF-8后2MiB HTML/XHTML；无代理、Cookie、Authorization、Referer或脚本执行。
- 来源和网页图不进入持久层；保留编辑的未知写入查证、原 UUID 幂等、restore generation 和取消释放边界。
- SQLite4 / Preview7 / Backup2（兼容v1）不变，无新业务实体/权限。仅允许批准 HTTP 的平台 cleartext 配置；WebView CSP与Qwen固定HTTPS不放宽。
- APK-1–4 的 CRUD/搜索/本地图片、默认完整步骤、Focus/Guided、明确做过、只读修改历史与安全备份恢复均继承。无购物/收藏/菜单/Timer/云同步/登录。
- APK-4 用户真实 Key/账号/Text/Screenshot/Preview/保存六项验收保留在 `checkpoints/2026-10-05-ai-intake-user-acceptance.md`，不是本轮 Codex 的真实 AI 执行记录；本轮付费调用0。

## Fresh Final Verification

- 全仓183文件 / 982 PASS，571.85s；APK应用59文件 / 394 PASS，129.15s；Share+Link+AI+Backup39文件 / 300 PASS，87.57s。子集不累加。
- Native JVM16 suites / 125 PASS，0 failure/error/skip；Android lint0 errors / 36 warnings。239 tasks全部重新执行，JVM/lint/assembleDebug/assembleDebugAndroidTest成功，2m3s。
- typecheck、JS lint、local build、Capacitor sync PASS；JS lint0 errors / 5旧图片警告，既有>500kB chunk警告保留。验收脚本最后适配后又重跑完整lint。
- API36 / Recipio_Backup_36 / emulator-5580：完整connected64 PASS，0 failure/error/skip，5m1s；其中11项Share原生专项，既有Back/IME断言保留。全部基于最终生产实现，不复用APK-5A数字。
- 实际v13→v14 install-r保留八表全部行/ID/时间/排序、当前与历史图片SHA和密钥配置状态；SQLite4/FK正常。按生成菜谱封面的精确alt校验真实解码，不以顶栏图标替代。
- 真实cold/warm分享0自动调用/写入；已有URL不覆盖、域名提示与Ignore、320px无横向溢出/按钮≥44px；飞行模式force-stop冷启动、封面、详情、Guided/Back、Backup SAF打开/取消均PASS。WebView外部请求0、未捕获运行时错误0。原飞行模式1/Wi-Fi0/移动数据0已精确恢复并回读。
- 13项同步Web资源与APK逐字节一致；APK222个文本/DEX条目、改动源码和专用模拟器有界Logcat凭据扫描0匹配。签名验证PASS，Debug v2。Review Packet仅白名单证据，不含数据库、私人媒体、Key或原始Logcat。

## Current Artifact

`artifacts/recipio-share-target-v14-delivery-debug.apk`，17206915 bytes。
SHA-256：`ea79ef10e1287fe056a5f1f4bbe90029a852dfa901c10bca24d6d5be1e7e313f`。
`app.recipio.local` / versionCode14 / `0.7.0-share-target` / Debug签名；与最终已测build完全一致。v13/v12及先前候选保留，不覆盖。
白名单 `artifacts/share-target/review-packet-apk-5b-share-target.zip` 从干净提交生成，10项逐文件hash回读。实际提交、Packet大小/hash与远端一致性见最终交付回执及manifest，避免文档自引用提交SHA。

## Known Limits / Evidence Boundaries

- 本轮无物理OEM真机验收、真实Qwen追加请求、真实网页AI fallback调用。已有APK-4用户证据不扩写为这些项目。
- 当前VPN/DNS把普通公开域名解析成198.18保留地址，原生读例页返回dns_blocked；不使用平台豁免。真实网站成功导入不是批准计划的完成门槛，fixture是正式回归依据。
- 旧Bridge消费竞态有真实Native RED→GREEN；夹具等待真实启动就绪/平台IME动画完成。最终开机SystemUI ANR在测试开始前由观察到的Wait按钮处理，64项全量随后通过。未改生产Back/IME、SQLite或增加delay/debounce；旧失败/中断日志只作诊断。
- Windows ADB双CR与API36 resumed字段造成的验收脚本误判已修；精确封面、取消、数据不变及网络恢复断言均保留，安装/离线流程已重新通过。
- 来源仅内存，进程关闭会丢未保存导入；受限/认证/JS依赖网站不保证可读。备份仍未加密；卸载或清数据会丢应用内数据，应另存外部完整备份。
- 安全扫描和测试不证明root/恶意OS免疫。HTTP是批准的原生公开页面能力，不是放宽WebView或第三方任意协议。
- pending仅进程内存，进程被结束可能丢失；只保留最新未处理项并可见提示。只接文字中唯一URL，不接图片、视频、VIEW或多链接。仅实体手机OEM Share Sheet未验证，不将模拟器结果冒充真机。
- 专用模拟器网络状态恢复后回读一致；不操作Mirra5554。完整证据见 `verification/share-target*.md` 和APK-5B checkpoint。

## Next Task

停止等待APK-5B真机验收：在用户手机覆盖安装独立v14，然后从浏览器分享一个普通网页链接至谱序，确认只预填、保护未保存编辑，并由用户手动点击读取。不要清除用户数据或重复真实Qwen调用。main不合入5B，不规划/实施5C。
