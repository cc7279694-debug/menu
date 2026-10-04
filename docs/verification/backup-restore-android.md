# APK-2 完整备份与安全恢复验收

日期：2026-10-04。分支 `feat/recipio-backup-restore`，基线 `2973893a6edba2dbc0cb76b3cc7aea51f674000a`。固定 SOL 按已批准计划测试先行；仅 APK-2，没有云端、AI、合并恢复、加密、提醒或新烹饪功能。

## 1. 环境与证据边界

- Android：专用 `Recipio_Backup_36` / `emulator-5556`，Android 36 Google APIs x86_64；应用 `app.recipio.local`。所有清除和故障注入只涉及此环境内生成的测试菜谱和图片。
- 现有 SDK/JDK：`C:\Users\CDD\AppData\Local\MirraAndroid\sdk`，`C:\Users\CDD\AppData\Local\RecipioAndroid\jdk\jdk-21.0.12.1+1`；未安装新环境，未修改 Mirra 的模拟器、项目或数据。
- `ANDROID_SERIAL=emulator-5556` 及 `-Pandroid.injected.device.serial=emulator-5556`；检查实际 AGP ConnectedDeviceProvider 过滤逻辑和报告，connected 仅运行在专用 AVD，没有运行在其他设备。
- 宿主内存不足曾导致 worker 超时、System UI ANR 和选择器中断。保留失败日志；只关闭/重启本任务 AVD，未 wipe。最终 AVD 为 2048MB、540×1200/density210；完整 Node 回归时正常关闭本任务 AVD，数据保留。
- 浏览器真实 Chrome 检查 390×844 和 1440×1000 设置页面、无错误/警告、桌面无横向溢出。Web 系统文件操作明确显示原生能力限制，不将浏览器 IndexedDB/页面测试算作 SQLite/SAF 验收。
- 没有物理手机连接；真机/OEM 不宣称通过。用户要求“真机或模拟器”的原生门禁由本次实际模拟器验证满足。

本地完整日志在 `.superpowers/sdd/2026-10-04-apk-2-backup-restore/`（忽略入 Git）；报告和生成样本在 `artifacts/backup-restore/`。路径均相对于 `E:\CODEX\VIBE CODING\recipe-step-app`。

## 2. 新鲜自动验证

| 验证 | 实际结果 | 日志 / 报告 |
| --- | --- | --- |
| 全仓 Vitest | 141 文件、673 项通过，0 失败；387.42 秒 | `task-6-tests.log` |
| 备份专项复跑 | 8 文件、50 项通过 | `task-4-tests.log` |
| 设置/既有库/启动界面复跑 | 3 文件、10 项通过 | `task-5-tests.log` |
| TypeScript | exit 0 | `final-typecheck.log` |
| ESLint | exit 0，0 错误、5 条保留的旧 Next 图片警告 | `final-eslint.log` |
| Vite Web build | exit 0；539.93kB 主 chunk 警告 | `final-web-build.log` |
| Capacitor sync | exit 0，静态资源进入本地 Android 工程 | `final-capacitor-sync.log` |
| 最终 Debug APK 构建 | exit 0，versionCode=10、versionName=0.3.0-backup-restore | `final-apk-v10-build.log`、`final-assemble.log` |
| 全部 JVM 测试 | 29 项通过，0 failures/errors/skipped | `task-3-tests.log`、`android/app/build/test-results/testDebugUnitTest/TEST-*.xml` |
| 完整 connected tests | 7 项通过，0 failures/errors/skipped，只在 Recipio_Backup_36 | `task-3-tests.log`、`android/app/build/outputs/androidTest-results/connected/debug/TEST-*.xml` |
| Android lintDebug | 0 错误、34 警告；未顺便升级依赖或重做图标 | `android/app/build/reports/lint-results-debug.xml` |

实际命令（仓库根目录）：

```text
npm.cmd test -- --pool=threads --maxWorkers=2 --testTimeout=120000 --hookTimeout=120000
npx.cmd vitest run src/native/backup --pool=threads --maxWorkers=1 --no-file-parallelism
npx.cmd vitest run src/native/backup/backup-controls.test.tsx src/native/library-app.test.tsx src/native/native-initialization.test.tsx --pool=threads --maxWorkers=1
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build:local
npm.cmd run sync:android
android/gradlew.bat -p android :app:testDebugUnitTest --rerun :app:connectedDebugAndroidTest lintDebug assembleDebug --console=plain --max-workers=2 -Pandroid.injected.device.serial=emulator-5556 -PapkVersionCode=10 -PapkVersionName=0.3.0-backup-restore
android/gradlew.bat -p android assembleDebug --console=plain --max-workers=2 -PapkVersionCode=10 -PapkVersionName=0.3.0-backup-restore
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-apk.ps1 -ArtifactName recipio-backup-restore-v10-debug.apk -VersionCode 10 -VersionName 0.3.0-backup-restore
```

JVM 分布：Archive 13、ExportState 3、Session 6、既有 ImageCopy 6、模板 1。connected 包括文件描述符真实读写/回读拒绝、删除失败提示、staging 空间失败保留旧图、陈旧 journal 保护已提交 generation、真实私有路径 reopen 和修正的既有模板测试；没有过滤掉旧测试。

Android 警告：AndroidGradlePluginVersion 1、GradleDependency 1、IconDipSize 4、IconDuplicates 1、IconDuplicatesConfig 1、IconLauncherShape 10、IconLocation 1、MonochromeLauncherIcon 2、NewerVersionAvailable 2、ObsoleteSdkInt 1、UnusedResources 7、UsableSpace 3。不是把 34 条全说成历史警告；空间采样仍捕获真实 IO 失败。

全仓测试另保留 Vite 对未来默认 `configLoader: native` 的配置兼容提示（当前 `vitest.config.ts` 的 CommonJS/ESM 组合），不影响本次退出码；未靠关闭提示、改测试配置或升级工具隐藏问题。

## 3. 原生系统选择器与数据安全

| 场景 | 验证方式及结果 |
| --- | --- |
| 空库备份 | 真实 ACTION_CREATE_DOCUMENT 输出 `empty.recipio`；所有数量 0，关闭回读及主机独立 ZIP/SHA 验证通过；恢复空库仍提交 restore metadata |
| 仅菜名及完整菜谱 | Golden 含 2 道菜、3 食材、3 步骤、1 提前准备、1 关键事项、2 修改记录、3 PNG 资产；包含中文、换行、Emoji、空字段 |
| 历史旧图片 | 当前封面/步骤图及 before/after 历史旧封面均进入包；实际私有图片字节 SHA 与独立解包 SHA 一致 |
| ID、时间与顺序 | 比较全部六表源数据与恢复后的便携投影，每个实体字段一致；只允许图片路径重映射为新 generation；未经过编辑器重新保存 |
| 清除生成数据后恢复 | 专用 AVD 的生成测试 App 清除后 0 行；选择 Golden/取消仍 0 行，明确确认 Replace 后完整恢复 |
| 同库 Replace/取消 | 取消预览保留全部六表和旧图片字节；明确二次确认后替换，不合并；安全副本创建并校验后才进入事务 |
| 损坏包拒绝 | hash、未来版本、数量不符、缺媒体、路径穿越、重算 hash 后的悬空关系，共 6 个实际系统文件输入均拒绝；旧行/旧图片哈希不变 |
| 数据库插入失败 | 在专用实际 Android SQLite 添加临时 ABORT trigger；Replace 插入失败后全部旧数据和媒体不变，移除测试 trigger |
| 图片 staging 失败 | connected 真实 Android 文件/Bitmap，受控空间失败；旧图片 SHA 不变，不留下已发布 generation |
| 进程中断 | staged 后 force-stop，重开保留旧库，清理本次未提交 staging；实际 commit 后注入旧 staged journal，重开不能删除新库引用的 generation |
| 提交响应丢失 | 真实 Node SQLite/文件服务测试验证提交成功但桥接响应失败时读取事务元数据；不是以 journal phase 判提交 |
| 导出提前失败 | 实际 SAF 创建新文档后令生成测试记录的图片引用失效；归档前失败，新外部文档被删除，旧数据恢复为原值；未动既有备份 |
| 离线冷启动 | 飞行模式、force-stop/reopen，数据、搜索、封面/步骤图解码可读；SQLite integrity_check=ok，foreign_key_check 为空 |
| 覆盖升级 | 实际 v6→v7 install -r，六表/时间保留、SQLite v2→v3；实际 v9→v10 install -r 全部行/媒体 SHA 保留，随后旧 v9 Format v1 包在 v10 验证/恢复成功 |

主要证据：`android-full-resume-result.json`、`android-upgrade-result.json`、`android-coverage-resume-result.json`、`android-export-failure-result.json`、`android-final-restore-result.json`、`golden-inspection.json`，以及 ledger 中 `android-full-scrolling-fixed.log`、`android-final-coverage-settled.log`（仅首项 install 通过，后续系统 ANR 失败保留）、`android-final-coverage-resume.log`、`export-picker-green-retry.log`、`android-final-restore.log`。

完整 connected runner 结束后自动卸载测试 App，专用数据随之消失。随后实际重装交付 v10，通过系统文件选择器从应用外 Golden 再恢复全部数据并冷启动验证；未将自动卸载后的空库当作产品数据损坏。最终 `restored-final-home.png` 与 `restored-final-detail.png` 截图确认绿色生成封面和步骤图显示；早期尚未解码的截图不作为最终图片失败或成功证据。本任务模拟器正常关闭、数据保留。

## 4. RED → GREEN 与自查

- 格式、Repository、原生 ZIP、Service、UI 按计划先失败再实现；真实 SQLite/IndexedDB 回滚与文件字节测试，不用 UI 假成功代替数据证据。
- 一次独立 SOL 安全审查发现：选择保存位置后，在构建 ZIP 之前失败会漏清零字节新文件。新增 ExportState 三项 RED → GREEN 与真实 SAF 提前失败测试；只有未验证的新文档才尝试删除，provider 拒绝删除时明确残留提示。
- 专用 Android 私有目录使用系统可信根路径别名，原严格比较错误拒绝自己的 operation。先加可信根别名 RED，规范化可信根；继续拒绝操作子目录和媒体子路径符号链接。JVM 与 connected reopen 均通过。
- 首次全仓回归有 1 条旧测试仍期待 Dexie v5；实际新增元数据为 v6。更新该既有期望并断言新 store 后，最终 673 项全部通过；保留初次失败日志。
- connected test provider 独立进程不能加载目标 App 的 helper，初次 NoClassDefFoundError。只修改测试 provider 为自身严格 UUID 校验，不改生产逻辑、不跳过测试；最终 7 项全部通过。
- 测试选择器 Recent/Downloads、背景标题与滚动位置导致脚本找不到文件；只修正 UI 选择/有界滚动。系统 ANR、首次 bootstrap/CDP 超时没有记为通过，最终有界续验及数据校验通过。

## 5. 实际产物

| 文件（绝对路径） | 字节数 | SHA-256 |
| --- | ---: | --- |
| `E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-backup-restore-v10-debug.apk` | 16,513,423 | `37e51d2f2801a45d8f7a1060ec5cb850911ec02a49b66309b9c7b56102957703` |
| `E:\CODEX\VIBE CODING\recipe-step-app\artifacts\backup-restore\golden.recipio` | 2,761 | `6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313` |
| `E:\CODEX\VIBE CODING\recipe-step-app\artifacts\backup-restore\empty.recipio` | 584 | `1ee4345f279975e80647498a797133093a7f468a91a524f17b4a58e5cd50c4ff` |

Golden manifest appVersionCode=9、schema=3、format=1，最终交付 App 为 v10。这是实际旧构建包兼容恢复证据，不把测试 manifest 改成 v10。原名和资产逐字节 metadata 见 `artifacts/backup-restore/external-files.json` 与 `golden-inspection.json`。

审查包：`E:\CODEX\VIBE CODING\recipe-step-app\artifacts\backup-restore\review-packet-backup-restore.zip`，最终生成时回读全部 8 个白名单文件、大小/哈希；冻结提交和包 SHA 见包内 manifest 及最终交付报告。不会包含 APK、数据库、照片字节、凭据或原始设备日志。

## 6. 纯本地审计与未验证项

最终 v10 编译 APK 的清单与 XML 已实际读取：`allowBackup=false`；新 cloud-backup 和 device-transfer 各 5 域排除，旧 full-backup-content 5 域排除。没有 INTERNET 或 READ_MEDIA/MANAGE_EXTERNAL_STORAGE 权限。仍有既有 SQLite 插件 biometric/fingerprint 及 AndroidX receiver signature permission，不宣称“零权限”。核心没有登录、Supabase、Vercel 或远程请求。SAF 的 EXTRA_LOCAL_ONLY 是请求，不是控制其他 provider 行为的云沙箱；应选设备本地位置。

Not Run / 限制：

- 物理手机及不同 OEM、其他 Android API 版本、所有第三方文件 provider 的全流程；本模块不以此冒称普遍兼容。
- JPEG/WebP/AVIF 的所有设备视觉解码：文件签名/字节映射已自动测，实际系统 UI 图片验收为生成 PNG。
- 真正硬件掉电/存储介质故障及厂商迁移工具：测了进程中断、空间/IO/事务故障，不承诺硬件级耐久或所有 OEM 禁止迁移。
- 4GiB 实际巨型包/1 万图片真机压测：限制和实际计数路径已测，不等于极限规模硬件压测。
- 旧 Next.js Production build、线上部署、真实用户/云端数据测试：Not Run，非 APK-2 原生范围。

已验证安全副本与旧媒体保守保留，可能占用空间，本轮不实现全库 GC；私有副本不能防卸载/清数据。外部 `.recipio` 未加密，应妥善保管。浏览器预览无 Service Worker，不承诺未加载时断网冷启动。无架构阻塞；下一步只等待用户 APK-2 验收，不进入 APK-3。
