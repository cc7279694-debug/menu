# Current State

## Current Stage

2026-10-05 用户确认密钥可正常填入，随后对“验证模型访问、文字/截图整理、预览编辑与保存”的验收链回复“都没问题，验证通过”。密钥兼容修补与日常AI流程记为 **Accepted (user-reported)**；完整APK-4仍 **APK_4_PENDING_DEVICE_TEST**，不能把这次功能验收当作八项IME/Back及全部Android门禁完成。生产实现冻结在 `ad54de3dca3819d555ecee0dae4605cff3dba05e` / `feat/recipio-ai-intake`；本次只记文档，不改代码、不再调用AI。SQLite4 / Web Preview7 / Backup2 不变。详情见 `checkpoints/2026-10-05-ai-intake-user-acceptance.md`。

## Implemented / Inherited

- 同一原生 AiSecretEnvelope 校验用于输入、加密、解密和 HTTP。保留旧 sk- 应用 Key；sk-ws- 允许官方签名形式的点分段；拒绝 sk-sp- Token Plan、中间空白/控制字符/打码/错误长度。仅首尾 Unicode 空白及 U+FEFF/U+200B 可归一化，不替换内部字符。
- 原生按凭据类型选择两个固定官方 HTTPS 路由：workspace → maas.qianwenaiapi.com；旧北京百炼 → dashscope.aliyuncs.com。不探测、不跨端点回退、不提供任意主机或模型选择；模型仍 qwen3.8-flash。
- protected native dialog / FLAG_SECURE / AndroidKeystore AES-GCM / AtomicFile / noBackup 不变；JS 无明文 getter/setter。原 region 桥字段仅返回安全服务 profile beijing / qianwen-platform，不推断地理位置。preflight 同意提示与固定小文字请求一致，不声称验证图片。
- 原可选文字/1–6截图/组合 → Native HTTP → strict JSON/Zod → 保守归一化 → explicit/inferred/missing → 共用可编辑 Preview → 明确确认 → 普通 Recipe 保留。AI不能直接写库；输入/截图/raw response不进入正式媒体引用或备份。私有临时截图的约束/pin/清理重试不变。
- APK-3 完整步骤默认、可选 Focus/Guided、明确最小做过记录、图片真实引用保护；APK-2 staging、安全副本、单事务替换、v1兼容/v2完整备份继承，不增加云依赖。

## Final Implementation Verification (preceding repair; not rerun for this docs-only update)

- 全仓 Vitest **174文件 / 878通过 / 0失败**，961.36s；Java XML **11套 / 95通过 / 0失败/错误/跳过**，不叠加专项数字。
- typecheck、Lint **0错误/5旧图片警告**、build:local（15.87s，旧chunk警告）、Capacitor sync（1.668s）通过。
- 最终 app Gradle JVM/lint/assembleDebug/assembleDebugAndroidTest **239任务重新执行 / 5m4s** 通过；Android lint **0错误/35警告**。Android测试APK编译不等于运行。
- TDD：三类JVM37项/3失败，Token Plan1项/1失败→修后38通过；Web18项/3失败→18通过。新增真实原生workspace对话框与Fake HTTP桥场景已编译 **Not Run**；旧3项对话框和8项IME/Back仍需健康设备执行。
- immutable Debug APK：`artifacts/recipio-ai-intake-v12-qianwen-key-debug.apk`，**16573907 bytes**，SHA256 **3a185094ca316c446d0f2c4c1d6328d07142330bca0d028442e6b4b756eb4214**。v12 /0.5.0-ai-intake；签名与保留v12一致。12文本资源/10DEX扩展密钥扫描及compiled manifest/五域云备份与转移排除审计通过，未新增权限。

代理执行的桌面最小测试真实POST **1**，自动测试真实POST **0**，此文档回合额外真实POST **0**；qwen3.8-flash / qianwen-platform / HTTP200 /970ms /strict status-ok。用户另已反馈原生模型访问及文字/截图流程通过，但未提供请求次数/HTTP/耗时/输入/具体安装包指纹，不编造这些字段，也不把用户手动调用混入可审计代理计数。暴露Key撤销/更换未独立确认；不再使用它。原代理四次预算最多剩3次，不自动重置。详见 `verification/ai-intake-provider-smoke.md`。

## Pending / Not Run

- 用户已接受密钥输入、模型访问、文字/截图整理及预览编辑保存这条日常链路，不再写成全部未执行。精确安装版本/覆盖升级与旧数据保留、Key轮换、2–3图顺序/去重、inferred/missing未勾选保存拒绝、temp清理及原图不入Backup/媒体集合尚无本轮专项证据。
- 健康专用设备完整connected、新原生workspace场景、8项IME/Back、最终覆盖安装/飞行模式/本地Cooking/Backup导出。前次验收时仅另一项目Mirra5554在线，未操作；自有5580曾两次SystemUI ANR且资源受限，未盲目重启。本次文档回合不重新探测或操作设备。旧connected40/32通过/8IME失败是历史未关闭门禁，不算本版结果。MainActivity未改，不猜测延时或削弱测试。
- 手机日常AI功能已获用户反馈，不等于完整OEM/飞行模式/Cooking/Backup/安全回归；其余未提供的设备证据保持未验证。旧APK证据不冒充本版；浏览器开发Preview无Service Worker，不承诺离线冷启动。
- 现有十项白名单Review Packet仍冻结在生产提交ad54de3，其178097bytes/SHA256f1830eba65323e5847dc66909dcab63845e88415c94a2a02a21061dac53360aa是前次交付证据；本次文档更新不重建/覆盖它，不伪称含新用户验收记录。

## Current Risks / Boundaries

- 在线AI可失败，搜索/查看/手动CRUD/本地图片/Cooking/历史/Backup无需网络；不将桌面HTTP200外推成多模态质量或无需VPN保证。
- Key不进JS、数据库、localStorage、Backup、日志或Review Packet。Keystore不能保证root/恶意OS/注入安全；静态扫描不代替运行时审计。
- 卸载/清数据会丢业务数据和私有安全副本；保留应用外备份。原备份未加密、不含Key，换设备需重设。
- 无SQLite/Backup migration、依赖/权限/签名变化；旧APK、ZIP、Golden及测试备份保留。临时清理失败保留警告/重试，不声称绝对删除。
- 不操作Mirra、不删真实数据/云资源、不部署、不merge main/PR、无reset/clean/forcepush、不进入APK5。

## Current Branch / Next Task

`feat/recipio-ai-intake` / APK-4 Task10，日常AI链路 **Accepted (user-reported)**，完整交付 **APK_4_PENDING_DEVICE_TEST**。当前停在用户验收记录，不重复已通过链路、不进入APK5；下一次只补健康设备的8项Back/完整connected及尚无证据的专项门禁。生产代码或测试再变须重跑最终全量。修补证据见 `verification/ai-qianwen-key-compatibility.md`；本次新增记录见 `checkpoints/2026-10-05-ai-intake-user-acceptance.md`。
