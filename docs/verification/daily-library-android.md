# APK-1 Android 原生验收记录（2026-10-03）

## 合同与证据边界

基线 `ba4fc89`，分支 `feat/recipio-daily-library`。仅补齐日常库 Android Native Acceptance Gate；没有新产品功能、备份、AI、云数据变更、推送、部署或 main 合并。

浏览器 IndexedDB 不是原生证据。原生检查通过安装 APK 的 WebView 调试接口操作真实 React 界面、Android 系统图片选择器，并从应用私有目录读取实际 SQLite 文件核对。无数据库清空或静默适配器回退。

设备：原有 `emulator-5554`（旧 APK-0 v1 数据迁移）；随后因其他项目使用该设备，转到独立 AVD `Recipio_Acceptance_37` / `emulator-5556`。使用已安装 SDK 创建测试实例，没有下载 SDK 或干预其他项目。Android 17 / x86_64；手机实机未连接，Not Run。不将模拟器流畅度作为真机性能证据。

## 数据来源

- `src/native/app.tsx` 显式判断 Capacitor Android 平台，打开 `openRecipeStore()`；Web 预览才选 IndexedDB。
- SQLite 初始化失败显示可观察错误并可重试，不渲染伪空库。UI 故障测试仅 mock 原生边界，不算原生数据库测试。
- Android 主库 `/data/user/0/app.recipio.local/databases/recipioSQLite.db`，`PRAGMA user_version=2`。v1→v2 保留 UUID/title/created_at，扩展 nullable 字段及规范化关联表。无本轮 schema 修改。
- 图片写入 `/data/user/0/app.recipio.local/files/images/<UUID>.<extension>`。数据库保存相对路径；渲染使用 Capacitor 本地文件 URL，不存 Blob、临时 URI 或在线 URL。
- 图片移除或菜谱删除后文件保守保留，避免损坏修改快照引用；孤立文件回收未实现。数据库当前图片引用更新，删除到期清除关联记录，无回收站。

## 本轮修复

实际发现旧 APK 的 Android 返回键把编辑页直接放到后台。先补失败测试，再在 MainActivity 使用 OnBackPressedDispatcher 分派可取消事件；共享 UI 处理导航，编辑器沿用未保存确认与写入锁。根页面返回将应用放到后台。

参考：[Android 自定义返回导航](https://developer.android.com/guide/navigation/navigation-custom-back)。没有引入新路由或原生 UI 重构。

补齐 Capacitor sync 生成的 Filesystem 插件配置；构建脚本允许独立 artifact/version 参数，并默认输出日常库 APK，旧 APK-0 文件未被覆盖。

## 自动化命令

所有命令在项目根目录执行。完整结果归档于忽略路径 `artifacts/android-daily/`。

| 命令 | 退出码与结果 |
| --- | --- |
| `npm test -- --pool=threads --maxWorkers=1 --no-file-parallelism --testTimeout=120000 --hookTimeout=120000 --reporter=default --reporter=json --outputFile=artifacts/android-daily/test-results.json` | 1；603 项通过，两个 worker 启动超时，不能算全量通过。原始 JSON 保留为 test-results-initial-pressure.json |
| `npm run test:apk -- --pool=threads --maxWorkers=1 --no-file-parallelism`（机器内存不足时） | 1；初始查找超时及 worker 启动失败。断言保留，初始异步查询沿用现有 5 秒等待边界 |
| `npm test -- --pool=forks --maxWorkers=1 --no-file-parallelism --testTimeout=120000 --hookTimeout=120000 --reporter=default --reporter=json --outputFile=artifacts/android-daily/test-results.json` | 0；131 文件、614 项全部通过，无 worker 错误；包含原生相关 7 文件/26 项 |
| `npm run typecheck` | 0；通过 |
| `npm run lint` | 0；0 错误，5 条既有旧 Next 图片警告，没有本轮新增警告 |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-apk.ps1 -ArtifactName recipio-daily-library-v5-debug.apk -VersionCode 5 -VersionName 0.2.0-daily-library` | 0；依次执行 Vite build、Capacitor sync、Gradle assembleDebug |

旧 Vite/Vitest configLoader 提示、旧 Gradle flatDir 提示保留，未顺便升级依赖或无关重构。

## 原生脚本

ADB：`C:\Users\CDD\AppData\Local\MirraAndroid\sdk\platform-tools\adb.exe`。脚本仅接受显式 emulator 序号，不控制物理手机。

```text
node scripts/verify-daily-android.mjs <adb绝对路径> <serial> <mode>
node scripts/verify-native-migration-failure.mjs <adb绝对路径> <serial>
```

mode：baseline/inspect/fresh/create/flows/sort/media/back/upgrade-baseline/upgrade。

`baseline/inspect`：实际旧 APK-0 数据库 v1 的两条 title 数据迁移后 ID/title/created_at 保持一致，v2 完整性检查为 ok。不是使用浏览器或新造空库替代。

故意失败的迁移使用独立 `acceptance_probe_<timestamp>` 测试库：先验证一条真实 v1 数据已写入，再执行非法 v2 迁移，插件拒绝升级，v1 行和版本保留。不会对 recipio 主库注入失败 SQL。

fresh：独立模拟器全新安装，空状态、创建、强制停止后重开、v2 和 integrity_check 已通过。

原有模拟器 v4 的完整菜谱/设备选择封面/断网查看搜索与字段编辑/删除撤销和到期删除/强制停止保持、未保存返回确认已验证。转到独立实例后 fresh 通过，但 create 被 Pixel Launcher ANR 弹窗及反复 WebView Runtime.evaluate 超时阻塞；恢复默认 2GB RAM、全量测试结束后独立运行仍未稳定完成。观察到系统稳定性/调试通信问题，尚未确诊为业务代码故障。

sort、media 最终图片替换/移除、back 最终实际确认按钮流程、upgrade-baseline/upgrade 六表及图片 hash 比对未通过。最终 v5 APK 未实际安装，不由 v4 或浏览器结果代替。已关闭本轮独立模拟器以释放资源，保留 AVD 和测试数据，不控制另一个项目的模拟器。

早期脚本的 aria-label/图片选择完成按钮/启动时序错误不冒充产品缺陷；旧版真实返回键问题已明确修复。原始部分检查 JSON 没有最终 success 字段，复审包将其标为 null，结合本文和实际命令退出码理解，不冒充新版专项通过。

## APK 元数据

- Debug，`app.recipio.local`，versionCode 5，versionName 0.2.0-daily-library。
- `E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-daily-library-v5-debug.apk`。
- 16,433,615 字节。
- SHA-256：`A2FAF542385E8BCE7E4E7AA20300E1F3C61D7A784DC8DCD8E5FA5C09508C3234`。
- minSdk 24，target/compileSdk 36，含 arm64-v8a/armeabi-v7a/x86/x86_64。
- aapt 检查合并后 APK 没有 INTERNET 权限；依赖带入生物识别权限但本模块不使用生物识别或登录。
- 静态资源随 APK 安装，没有 server.url、远程字体或线上网站入口。系统备份关闭，排除云备份与 device-transfer；OEM 行为不承诺，未运行厂商手机转移验证。

最终状态：DAILY_LIBRARY_ANDROID_BLOCKED。下一步用稳定 Android 环境完成剩余原生验证；备份模块仍未实施。初始失败日志保留，不删失败测试或绕过校验。
