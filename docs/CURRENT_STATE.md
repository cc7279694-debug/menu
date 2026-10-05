# Current State

## Current Stage

2026-10-05：**APK_4_COMPLETE**，按本轮批准的 Android Back / IME 专项与最终交付范围关闭 APK-4。日常 AI 功能来自用户真机验收；八场景、原生回归、离线与覆盖安装来自 Codex 专用模拟器验证，两者不可混写。用户证据提交 `dd02fbc` 保留不改。

生产实现仍冻结于 `ad54de3dca3819d555ecee0dae4605cff3dba05e`。本轮仅修正 Android 测试的真实 SAF/MediaStore 与输入焦点前置条件、更新证据；没有修改 MainActivity / Back 路由、Provider、Key 存储、AI parsing、权限、依赖或数据模型。最终交付提交由十项 Review Packet manifest 固定。

## Implemented / Inherited

- 纯本地 Recipe Library / CRUD / 图片 / 搜索 / Cooking / Cooking History / Change History / Backup Restore；SQLite v4、Web Preview v7、Backup Format v2（仍兼容 v1）不变。
- 可选文字 / 1–6 张截图 / 组合 → Native HTTP → strict JSON/Zod → deterministic normalization → explicit/inferred/missing → 可编辑 Preview → 用户确认 → 普通 Recipe。不新增 AIRecipe / ImportJob，不进入 APK-5。
- 现有 native protected dialog / FLAG_SECURE / AndroidKeystore AES-GCM / AtomicFile / noBackup；JS 无 plaintext getter。固定 qwen3.8-flash、已批准的 credential-matched 官方端点，不新增 fallback。
- 用户真机反馈：API Key 输入、账号访问、Text Intake、Screenshot Intake、Preview 编辑、保存普通 Recipe 六项 PASS，来源 `checkpoints/2026-10-05-ai-intake-user-acceptance.md`。没有采集其 Key、截图、响应、HTTP、次数、OEM 或安装包指纹。

## Final Closeout Verification — fresh this round

- 真实 Android WebView + WindowInsets IME + KEYCODE_BACK **8 / 8 PASS**，全部包含于 connected **45 / 45 PASS，0 failure/error/skip**；API 36 / Recipio_Backup_36 / emulator-5580。含真实 SAF、生成临时图片、Preview gate 和 Busy 请求数断言；Provider 为 Fake HTTP，真实 AI 调用 **0**。
- APK application suite **50 文件 / 290 PASS**，162.80s；Java XML **11 suites / 95 PASS**，49s 强制重新执行 Test task。这些专项不与旧全仓数字叠加。
- typecheck PASS；Lint **0 errors / 5 inherited img warnings**；local build PASS 12.45s（旧大 chunk 警告）；sync:android PASS（重新构建 1.18s / sync 0.954s）。
- 生成数据专用模拟器：飞行模式手动新增/编辑/搜索/明确做过/Cooking 与两类历史、冷启动持久化 PASS；同一最终 v12 APK `install -r` 后实体、ID/时间/排序、图片 SHA 与恢复元数据保留 PASS。Key 状态为未配置，不声称这次验证了真实 Key 保留。
- 最终 connected 构建通过 142 tasks（1 executed / 141 up-to-date）；Debug 与 AndroidTest 目标随依赖检查。APK 字节与已安装测试包、当前 build 输出一致；新同步的六个 Web 文件逐字节匹配 APK。
- 全仓 **174 文件 / 878**、app Gradle **239 rerun tasks / 5m4s**、Android lint **0 errors / 35 warnings** 是冻结生产提交 ad54de3 的既有证据，**本轮未重新执行，不作为本轮新数字**。生产未变，按本轮第 3 节执行相关回归，而非重复真实 AI/全仓验收。
- 原生对话框、Keystore、Mock Provider、temporary-media/backup faults 等在本轮 connected 中实际执行；静态审计 source/diff、12 packaged text resources / 10 DEX、已保留的生成 Backup v2、compiled manifest/cloud-transfer exclusions PASS。无私人 SQLite/Logcat/手机数据扫描或真实付费请求。

详见 `verification/ai-intake-back-ime-final.md`；旧失败与诊断日志保留，未删测试或降低断言。模拟器启动 SystemUI ANR 和 SAF fixture 失败不改写为生产 Back 缺陷。最终八项已绿，生产不加 delay/debounce/第二键盘状态机。

## Final Artifact / Delivery

- APK：`artifacts/recipio-ai-intake-v12-qianwen-key-debug.apk`，**16573907 bytes**；SHA-256 **3a185094ca316c446d0f2c4c1d6328d07142330bca0d028442e6b4b756eb4214**。
- `app.recipio.local` / versionCode **12** / versionName **0.5.0-ai-intake**；Debug 签名，非商店 Release。生产未改，复用经 hash、资源与安装验证的同一 immutable APK。
- `artifacts/ai-intake/review-packet-apk-4-ai-intake.zip`：十项白名单，包含独立 user-acceptance/provider evidence；manifest pin 最终提交与每项大小/SHA。旧 ad54de3 pending ZIP 归档保留，不覆盖。
- 本轮只在 `feat/recipio-ai-intake` 聚焦提交/正常 push；交付回执报告 remote/local equality、clean tree 与 Packet SHA。无 merge main、PR、deploy 或后续模块。

## Known Limits / Boundaries

- 本轮没有物理 OEM 八场景复验、v11→v12 再测或真实 2–3 图语义/顺序 smoke；未确认暴露 Key 的撤销/轮换。用户六项日常 AI 验收不扩写成这些证据；已有模拟器 v12 同版覆盖不冒称跨版升级。它们不属于本轮重新追加的门禁。
- Key 不在 JS/SQLite/localStorage/Backup/日志/Packet 的安全设计与生成数据回归已复核；静态扫描不证明 root/恶意 OS/注入免疫，也不声称清除了历史聊天中的 Key。已暴露凭据不得再次使用。
- 外部生成测试备份 `ai-intake-generated-1791131128968.recipio` 仅回读/校验，不是本轮新导出或真实个人数据恢复；connected 的破坏性恢复仅在隔离测试根执行。卸载/清数据会丢本机数据，应用外备份仍必要。
- 第一次失败 connected 的默认 UTP cleanup 曾卸载专用模拟器的生成测试应用；不是用户手机/真实数据。最终使用 leaveApksInstalledAfterRun=true 并验证安装保留；未主动 clear-data/wipe。专用 AVD 验证后关闭、数据保留；Mirra 5554 始终未操作。
- 旧图片 Lint 与 chunk 警告未作无关重构；Web 开发 Preview 不能代替 Android 离线验收。

## Current Branch / Next Task

`feat/recipio-ai-intake` / APK-4 Task 10 已按本轮冻结范围完成。停止等待本次交付验收，**不进入 APK-5、不再调用真实 AI**。后续模块需另行批准；本轮正确继承是现有 SQLite4 / Backup2 与经过原生验证的 Back/IME 路由，不是重新开发已完成模块。
