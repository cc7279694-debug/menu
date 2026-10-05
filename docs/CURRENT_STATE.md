# Current State

## Current Stage

2026-10-05：APK-4 AI Intake 主体 Task1–9 已实现，Task10 验收仍未完成。用户本轮明确选择“暂时不要做 Android 验收”；不再启动专用模拟器或执行 connected/真机/真实 Provider 调用。继续桌面验证、构建与待验收交付。分支 feat/recipio-ai-intake；生产修补基线 1382974，保留交付文档/工具修改。SQLite4 / Preview7 / Backup2 不变。

最终审查的两个 Important（数字后缀/小数误标 explicit、清理失败恢复后仍占会话名额）均已真实 RED→GREEN 最小修补。最终必须用修补后的同一版本重跑全部门禁。当前不是 APK_4_COMPLETE。

## Implemented / Inherited

- 可选文字/1–6截图/组合 → 原生 Qwen → strict JSON/Zod → 保守归一化 → explicit/inferred/missing → 共用可编辑 Preview → 明确确认 → 普通 Recipe。手动录入保留，AI不能直接写库。
- 原生 password dialog/FLAG_SECURE/AndroidKeystore AES-GCM + AtomicFile/noBackup；JS无 plaintext getter/setter。桥日志关闭，固定北京 HTTPS、安全错误码、取消/代次/UUID防双写；网络不占业务数据锁。
- 临时截图独立 SAF/cache、字节/像素限制、sampled decode/EXIF白底压缩、pin、丢弃/启动清理、失败重试回收owner；不进入永久资产/数据库/备份。
- APK-3 完整步骤默认、可选 Focus/Guided、明确最小做过记录、可选成品照片/评价/备注、只读修改历史、真实图片引用保护不变。
- APK-2 staging、安全副本、单事务 Replace、提交事实核查、严格原v1兼容和v2完整备份不变。旧APK/Golden/检查点/云回退保留。

## Verification

本轮桌面验证：全仓174文件/875、本地版50文件/287（子集）、实际JUnit XML77（0失败/错误/跳过），typecheck、Lint0错误/5旧警告、build:local、sync、Gradle全应用目标239执行/2m38s（Android lint0错误/35警告）均通过。旧报告JVM87已按本轮XML更正。新十项审查包测试实际RED2→GREEN2，包含在875中。APK静态8资源/权限/系统备份排除审计通过。历史connected31不代表新增键盘测试已通过；详细命令与失败尝试见 verification/ai-intake-android.md。

新增 AiImeBackInstrumentedTest 的实际 WindowInsets IME/系统 Back 诊断用例已编译，但未执行，未取得 RED/GREEN。原生路由存在不检查 IME 的入口，但根因未确认，不修改生产 MainActivity，不加页面延时/猜测状态机。最新复现因约300MB可用内存/CDP超时中断，不是功能绿灯；仅关闭本任务5580，其他项目设备未动。

专用 Recipio_Backup_36 / emulator-5580 / API36 的实际 UI：原v11 Golden基线、v11→v12覆盖升级、原生生成测试密钥/更换取消/重启/早期覆盖安装、SAF JPEG/PNG/WebP/六图/坏文件、临时缓存重启清理、本地编辑/烹饪/历史、v1/v2安全恢复及回滚、飞行模式核心流程通过。窄屏测试仍失败：真实键盘可打开，但首次 Back 后可见状态未在有界等待内转为关闭；尚不能判定产品缺陷或测试/模拟器问题，不能记绿灯。最后全流程后的覆盖安装尚未执行。

本轮重新构建到新路径的待验收APK artifacts/recipio-ai-intake-v12-final-debug.apk，16573867 bytes，SHA256 bdf7212457e1582b03f2b78af821d3b3432998e2295580ed5892c3b3e9031784；与原待验收包字节一致，未安装，旧文件未覆盖。生成测试备份 artifacts/ai-intake/ai-intake-generated-1791131128968.recipio，3350 bytes，SHA256 7ff043ccf1c28ffb0e5575bce8b20d51d19a10bdc54f51511916ca0d354327a8；本轮重新核对文件大小/哈希，设备导出/恢复是历史证据。原v11/Golden保留。

实际付费 Provider POST=0。候选 qwen3.8-flash 的用户账号/地域权限未验证，不能标为账号已冻结或 AI_PROVIDER_ACCESS_BLOCKED。最新要求是一次微型非私人文字/JSON preflight；当前原生实现仍是旧微型图片 preflight，必须先通过键盘验收，再测试先行对齐这一小差异，之后才允许真实调用。预算合计最多4POST；无实际key，不从Chat/终端/env索取。

## Pending / Not Run

- Android验收由用户明确暂缓。恢复允许后从键盘真实事件顺序开始，完成全部8场景、原生 RED→GREEN（若证实需修）、fresh connected、最后覆盖安装。未验证键盘修复，不通过 JS mock 声称成功。
- 本轮十项白名单审查包（新加 provider-smoke.md）、最终APK/提交/push进度见 verification 与 packet manifest；不得把目标产物描述当实际交付。
- 用户原生安全输入真实北京key、账号preflight、真实文字/图片质量与保存smoke未执行。不得在Chat/终端/env索取真实key。
- 物理手机/OEM独立全流程未执行。模拟器不冒充真机；浏览器Preview无Service Worker，不承诺离线冷启动/刷新。

## Current Risks / Boundaries

- AI需要网络和用户百炼账号额度；本地搜索/查看/手动CRUD/图片/Cooking/历史/Backup无需网络。INTERNET是唯一新增敏感权限，系统云备份/设备转移排除不变。
- 卸载/清数据会丢业务数据/私有安全副本；需先导出应用外校验备份。备份未加密、不含key；换设备需重设。Keystore不保证root/恶意系统/运行时注入不能取密。
- 文件故障可能使临时清理失败；保留警告和owner重试，不宣称绝对删除。永久未知孤立图保守保留，无全库GC。
- 旧Web五条img警告和Vite大chunk警告保留，未顺便升级依赖。其他项目模拟器不操作，内存不足时本任务分批验证并保留中断证据。
- 不改真实云数据/资源、不部署、不merge main/PR、无reset/clean/forcepush、不进入APK5。

## Current Branch / Next Task

feat/recipio-ai-intake / APK-4 Task10，状态 APK_4_PENDING_DEVICE_TEST。下一次用户允许设备验收后，先继续 IME/Back，之后 tiny-text preflight 对齐和真实账号 smoke；如生产修补，重跑同最终版本全套门禁。不重复 Task1–9，不进入APK5。

事实源：PROJECT / PRODUCT_SPEC / ai-intake-contract / approved plan；原APK1/2/3 checkpoint和verification保留为历史。
