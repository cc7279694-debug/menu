# Current State

## Current Stage

2026-10-05 最终收尾：用户已恢复 Android 验收授权；从干净 HEAD 1c3da828 / feat/recipio-ai-intake 继续四项门禁，未重做 Task1–9。固定文字 preflight 已完成测试先行修补；八个原生 IME/Back 场景已实现并编译，但模拟器系统无响应使验证未通过。状态仍为 APK_4_PENDING_DEVICE_TEST，不是 APK_4_COMPLETE。SQLite4 / Preview7 / Backup2 不变。

继承的两个 Important（数字后缀/小数误标 explicit、清理失败恢复后仍占会话名额）已在前轮真实 RED→GREEN 修补。本轮已用最终实现重新运行下列全量门禁；Android 八场景未通过，当前不是 APK_4_COMPLETE。

## Implemented / Inherited

- 可选文字/1–6截图/组合 → 原生 Qwen → strict JSON/Zod → 保守归一化 → explicit/inferred/missing → 共用可编辑 Preview → 明确确认 → 普通 Recipe。手动录入保留，AI不能直接写库。
- 原生 password dialog/FLAG_SECURE/AndroidKeystore AES-GCM + AtomicFile/noBackup；JS无 plaintext getter/setter。桥日志关闭，固定北京 HTTPS、安全错误码、取消/代次/UUID防双写；网络不占业务数据锁。
- 临时截图独立 SAF/cache、字节/像素限制、sampled decode/EXIF白底压缩、pin、丢弃/启动清理、失败重试回收owner；不进入永久资产/数据库/备份。
- APK-3 完整步骤默认、可选 Focus/Guided、明确最小做过记录、可选成品照片/评价/备注、只读修改历史、真实图片引用保护不变。
- APK-2 staging、安全副本、单事务 Replace、提交事实核查、严格原v1兼容和v2完整备份不变。旧APK/Golden/检查点/云回退保留。

## Verification

本轮重新验证：全仓174文件/875通过（810.85s；其中本地版50文件/287，不重复加总）；Java实际XML81通过/0失败错误跳过；typecheck、Lint0错误/5旧警告、build:local、sync、Gradle全应用目标239重新执行/3m58s（Android lint0错误/35警告）均通过。文字 preflight 的 Qwen Mock17项先 RED3→GREEN17；原生桥 Mock验证包含在本轮 connected 中。新数字来自本轮输出，不继承875/77旧绿灯。

最终 connected40项实际执行：32通过、8失败、0跳过。失败均为八个 IME 场景；两次实际设备截图显示 System UI 无响应，伴随 WebView回调超时/输入目标窗口不属于应用/无法达到UI条件。恢复AVD原配置2GB后仍失败。未确证应用路由根因，不修改 MainActivity、不加延时或第二套键盘状态机，不删除/跳过失败测试。仅操作本任务 Recipio_Backup_36 / 5580；Mirra设备未动。

历史APK1382974的专用AVD UI：v11 Golden→v12覆盖升级、生成测试密钥/取消/重启、SAF/缓存、核心本地/备份/飞行模式通过；不是本轮最终APK的新证据。最后覆盖安装、稳定设备八场景、真实Provider与物理手机闭环仍待完成。

新待验收APK artifacts/recipio-ai-intake-v12-final-r2-debug.apk，16573867 bytes，SHA256 804de950006d5b2f61880b77a71eed36d8e4c00fcf3eab7c969e5e3c08389906。十项资源静态扫描未发现密钥/旧云运行地址；编译权限仅增加INTERNET，关闭系统备份及五域排除保持。旧APK、ZIP与Golden保留。生成备份仍为3350 bytes / 7ff043ccf1c28ffb0e5575bce8b20d51d19a10bdc54f51511916ca0d354327a8；本轮回读哈希，不冒充新的导出/恢复。

实际付费 Provider POST=0。候选qwen3.8-flash的账号/地域权限未验证，不标记AI_PROVIDER_ACCESS_BLOCKED。原生preflight现为固定非私人文字、128 tokens、strict小Schema，仅接受单个status="ok"并拒绝重复键/额外字段/普通文本，无图片。真实Key仍需用户原生安全输入，预算最多4POST；文字/单图/条件多图及真实人工确认保存均Not Run。详见 verification/ai-intake-provider-smoke.md。

## Pending / Not Run

- 恢复健康专用Android环境（用户暂停其他项目模拟器或连接手机）；八场景仍须全部通过，再完成最终覆盖安装。测试发生系统故障不是应用修复绿灯。
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

feat/recipio-ai-intake / APK-4 Task10，状态 APK_4_PENDING_DEVICE_TEST。下一次从健康设备的八场景继续；文字preflight已对齐，不重复开发。之后安全配置真实Key，最多4次实际Smoke及非破坏性手机验证；代码/测试再修改则重跑最终门禁。不进入APK5。

事实源：PROJECT / PRODUCT_SPEC / ai-intake-contract / approved plan；原APK1/2/3 checkpoint和verification保留为历史。
