# Current State

## Current Stage

2026-10-05 密钥输入专项修补：从干净 HEAD 2d0ab5b / feat/recipio-ai-intake 修复原生复制边界兼容及不明确的格式错误，未重做 Task1–9。10项输入回归先 RED7→GREEN10，原安全存储不变；补3项真实原生对话框场景并编译，但本轮没有健康专用设备执行。状态仍为 APK_4_PENDING_DEVICE_TEST，不是 APK_4_COMPLETE。SQLite4 / Preview7 / Backup2 不变。

继承的数字来源/清理名额修补和固定文字 preflight 保留。本轮已用最终修补实现重新运行桌面、JVM与构建门禁；未使用旧875/81或旧connected作为新版本验收。

## Implemented / Inherited

- 可选文字/1–6截图/组合 → 原生 Qwen → strict JSON/Zod → 保守归一化 → explicit/inferred/missing → 共用可编辑 Preview → 明确确认 → 普通 Recipe。手动录入保留，AI不能直接写库。
- 原生 password dialog/FLAG_SECURE/AndroidKeystore AES-GCM + AtomicFile/noBackup；JS无 plaintext getter/setter。桥日志关闭，固定北京 HTTPS、安全错误码、取消/代次/UUID防双写；网络不占业务数据锁。
- AiKeyInput仅容忍首尾Unicode空白及U+FEFF/U+200B；不拼接中间空白，不接受打码/引号/Bearer/全角或错误前缀。格式原因不含输入，明确尚未连接百炼；提交后清空输入，允许重贴，取消保留旧密文。最终仍走未修改的AiSecretEnvelope校验。
- 临时截图独立 SAF/cache、字节/像素限制、sampled decode/EXIF白底压缩、pin、丢弃/启动清理、失败重试回收owner；不进入永久资产/数据库/备份。
- APK-3 完整步骤默认、可选 Focus/Guided、明确最小做过记录、可选成品照片/评价/备注、只读修改历史、真实图片引用保护不变。
- APK-2 staging、安全副本、单事务 Replace、提交事实核查、严格原v1兼容和v2完整备份不变。旧APK/Golden/检查点/云回退保留。

## Verification

本轮重新验证：全仓174文件/875通过（771.29s）；Java实际XML11套/91通过/0失败错误跳过；typecheck、Lint0错误/5旧警告、build:local、sync、Gradle全应用目标239重新执行/3m8s（Android lint0错误/35警告）均通过。输入回归真实RED10项/7失败→GREEN10，连原加密测试合计17通过；最终91包括这10项，不重复加总。原生3项对话框测试编译通过，不冒充执行。

本轮connected、原生对话框执行、覆盖安装、物理手机和真实Provider均Not Run。仅Mirra5554在线，未选择/操作它；专用5580此前两次SystemUI ANR、当前资源不足以稳定并行，未盲目重试。历史connected40/32通过/8个IME失败仍未关闭，不当成本轮结果；MainActivity未改，不添加猜测延时或第二IME状态机，不删除/跳过失败测试。

历史APK1382974的专用AVD UI：v11 Golden→v12覆盖升级、生成测试密钥/取消/重启、SAF/缓存、核心本地/备份/飞行模式通过；不是本轮最终APK的新证据。最后覆盖安装、稳定设备八场景、真实Provider与物理手机闭环仍待完成。

新待验收APK artifacts/recipio-ai-intake-v12-key-input-debug.apk，16573867 bytes，SHA256 c64fc897949e68e566d5116cadb11d26e5a437b66b0854ccd2e2e17271275679。十项资源静态扫描未发现密钥/旧云运行地址；签名与保留v12一致；相对v11仅原APK4的INTERNET，关闭系统备份及五域排除保持。旧APK、ZIP、Golden和生成备份保留，本轮没有清数据/新导出/恢复。专项证据见verification/ai-key-input-repair.md。

实际付费 Provider POST=0。候选qwen3.8-flash的账号/地域权限未验证，不标记AI_PROVIDER_ACCESS_BLOCKED。原生preflight现为固定非私人文字、128 tokens、strict小Schema，仅接受单个status="ok"并拒绝重复键/额外字段/普通文本，无图片。真实Key仍需用户原生安全输入，预算最多4POST；文字/单图/条件多图及真实人工确认保存均Not Run。详见 verification/ai-intake-provider-smoke.md。

## Pending / Not Run

- 用户覆盖安装密钥输入修补APK并在受保护原生框重新粘贴，确认本地保存后单独验证模型访问。无需把Key发给Chat/终端。实际输入未被读取，不断言用户Key无效或一定含隐藏字符。
- 恢复健康专用Android环境；3项新原生对话框与8项IME场景、完整connected和最终覆盖安装仍须执行。旧系统故障不是本轮绿灯。
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

feat/recipio-ai-intake / APK-4 Task10，状态 APK_4_PENDING_DEVICE_TEST。下一次先在手机验证密钥修补，再继续健康设备的3项对话框/8项IME/完整connected；文字preflight已对齐，不重复开发。之后最多4次实际Smoke及非破坏性手机验证；代码/测试再修改则重跑最终门禁。不进入APK5。

事实源：PROJECT / PRODUCT_SPEC / ai-intake-contract / approved plan；原APK1/2/3 checkpoint和verification保留为历史。
