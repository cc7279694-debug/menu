# APK-1 Android Native Acceptance Gate checkpoint

## Status

`DAILY_LIBRARY_ANDROID_BLOCKED`。原生关卡未全部完成，不能进入备份恢复。APK 已构建，完整自动回归通过；剩余原生检查受模拟器系统 ANR / WebView 调试超时阻塞。

## What Was Built / Why

继承基线 `ba4fc89`，仅修复 Android 返回键真实缺陷、补齐 Filesystem 同步配置、参数化并分离 APK 构建产物，增加原生检查脚本、初始化失败 UI 测试和复审包生成工具。无产品扩展、无新数据层、无新依赖、无数据库 schema 修改。

项目状态恢复和检查点技能用于核对仓库并保存本轮事实；没有从旧聊天推断未验证完成项。原浏览器检查点保留，不覆盖历史。

## Verified

- 实际旧 APK-0 的 SQLite v1→v2，保留两条原始记录的 ID/title/created_at，数据库完整性正常。
- 独立测试库故意失败迁移：原生插件拒绝非法 v2 升级，保留已确认写入的 v1 行和版本；未操作主库。
- 已安装 v4 使用 Android SQLite 和私有文件；完整菜谱、设备选择封面、断网查看/搜索/编辑、仅菜名保存、删除撤销/到期删除、强制停止后保持已在本轮原有模拟器验证。
- 返回键修复后实际测试未保存确认保留输入和导航；回归测试覆盖该缺陷。
- 新建独立 AVD 空数据库初始化、创建、飞行模式强制停止后重开、schema v2 与 integrity_check 通过。
- 全量重跑 131 文件/614 项通过，原生相关 7 文件/26 项；TypeScript 通过，Lint 0 错误/5 条旧警告；Vite、Capacitor sync、Gradle Debug 构建通过。
- 最终 APK aapt 检查无 INTERNET 权限，package app.recipio.local，versionCode 5，versionName 0.2.0-daily-library。

## Not Verified / Blocking

- 最终 v5 APK 的实际安装、覆盖安装前后六张业务表及图片字节的完整比对。
- 最终系统选择器图片替换、删除、重新附加回归。
- 本轮新增的原生标题修改/创建时间排序专项流程尚未完成。
- 实机、OEM 备份/转移和真机性能：Not Run，未连接物理设备。

原有 emulator-5554 被其他项目使用后不再争抢控制；独立 Recipio_Acceptance_37 / emulator-5556 发生 Pixel Launcher ANR、首次 WebView 调试接口等待/Runtime.evaluate 超时。测试脚本失败不能算验收通过，未通过清空数据、绕过断言或静默回退解决。

初始全量运行发生两个 worker 启动超时；后续全量顺序 fork 重跑已覆盖并通过全部测试。原始失败 JSON 和本轮原生检查日志在忽略 artifacts 路径保留，复审包不包含原始私有数据或原始设备日志。

## Artifact / Evidence

- APK：`E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-daily-library-v5-debug.apk`，16,433,615 bytes。
- SHA-256：`A2FAF542385E8BCE7E4E7AA20300E1F3C61D7A784DC8DCD8E5FA5C09508C3234`。
- 详情：`docs/verification/daily-library-android.md`。
- Review：忽略路径 `artifacts/android-daily/review-packet.zip`，manifest 记录基线、实际 head、范围、文件 hash 和证据边界。APK 二进制、数据库、私有图片、密钥及日志不进入复审包。

## Git / Next Stage Should Inherit

分支 `feat/recipio-daily-library`，本轮仅本地提交，实际提交见 review manifest。无推送、部署、PR、main 合并或云数据操作。

用稳定的 Android 测试环境继续剩余 modes：create（如果该实例没有可乐鸡翅）→ flows → sort → media → back → upgrade-baseline → 同包覆盖安装 v5 → upgrade。必须确认脚本 success/退出码和实际图片路径，保留现有数据库，不重新初始化。关卡通过后暂停，由用户确认是否进入 APK-2。

仍没有完整备份；卸载/清数据会丢失本地内容，不存唯一重要数据。图片保守保留，孤立文件回收和依赖审计旧风险后置。
