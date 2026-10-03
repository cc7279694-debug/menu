# 日常菜谱库原生验收与选图修复

## Goal / contract

完成日常菜谱库剩余 Android 技术验收，修复阻塞选图。继承 IMPLEMENTATION_PLAN 与 2026-10-03 原生/续查检查点；不扩展产品范围，不进入备份、AI、历史界面或云模块。本记录替代当前状态中的阻塞结论，不改写旧失败记录。

## 1. 完成功能与验证

- 系统实际选择 PNG → 原生复制 → 编辑器预览 → 保存 SQLite 路径 → 飞行模式强制停止/重开后显示。
- 封面替换生成新私有路径；移除只清除引用，重新附加、创建时间不变。
- 步骤图片增加、冷启动显示、移除后指令/封面/创建时间不变。
- 系统选择器取消保留旧封面、未保存文本、全部父记录字段，并解除写入锁，无错误提示。
- 仅菜名创建；完整字段编辑；菜名/食材搜索、空结果/恢复；删除五秒撤销/到期删除持久化；改名不改变 created_at 排序；真实 Android 返回键与原生放弃确认。
- 最终 v6 全新安装、SQLite v2 integrity=ok；隔离测试数据库失败迁移保留 v1 行/版本。
- 真实 v5→v6 覆盖安装后 recipes / recipe_ingredients / recipe_steps / recipe_preparations / recipe_key_tips / recipe_changes 逐字段一致；封面字节与 hash 一致，外键检查为空。
- 核心验收在飞行模式进行，所附 WebView 会话未观察到远程核心请求或未捕获 JS 异常；最终合并清单未增加 INTERNET/READ_MEDIA。

## 2. 修改文件

新增：
- android/app/src/main/java/app/recipio/local/LocalImagePickerPlugin.java
- android/app/src/main/java/app/recipio/local/LocalImageCopy.java
- android/app/src/test/java/app/recipio/local/LocalImageCopyTest.java
- src/native/media-native.test.ts
- src/native/recipe-editor-media.test.tsx
- 本检查点；保留此前未提交的 2026-10-03-daily-library-recheck.md 历史记录。

修改：
- MainActivity.java：注册应用内选图插件。
- src/native/media.ts、recipe-editor.tsx：Android 原生路径 / Web File 路径分流；结果路径校验、取消不替换引用。
- scripts/verify-daily-android.mjs：步骤图片、取消专项；系统选择器标签差异兼容；原生 confirm 前异步安排点击，避免测试进程阻塞。
- docs/CURRENT_STATE.md、ROADMAP.md、ARCHITECTURE.md、DECISIONS.md：记录真实实现与验收边界。

未删除产品文件、数据库、旧 APK、模拟器或云资源。

## 3. 数据层与环境变化

SQLite 仍 v2、领域模型/Repository 不变，无 Migration、新同步字段或数据库 Blob。原生图片流式复制到 filesDir/images 的独立 UUID 临时文件；关闭和同步完成后同目录重命名，失败只清理本次部分文件。返回已有相对路径契约，不保留 provider URI。只接收系统选择器返回的 content URI，拒绝自身 FileProvider，MIME 与原支持范围一致。浏览器继续既有 IndexedDB media。

无新 npm 包/权限。无固定单图大小上限；空间预算为采样可用空间减 32MiB，不承诺无限设备资源。备份未实现，旧图片/历史引用保守保留。

经用户明确授权，从官方源下载 Android 36 Google APIs x86_64 rev7，URL 为 https://dl.google.com/android/repository/sys-img/google_apis/x86_64-36_r07.zip 。安装命令解压完成后返回 1，但后续官方 SDK 清单确认已安装 7.0.0，文件存在且实际启动 API36 成功；没有把原安装命令记为 exit0。

专用环境 Recipio_Acceptance_36 用于 v5 复现；Recipio_Acceptance_36_V6 用于最终 v6 全新安装，均使用 -gpu host / 2 cores / 2048MB。旧 Recipio_Acceptance_37 保留真实 v5 数据做升级。逐个启动，结束后正常关闭；未 wipe-data，不改 Mirra 源码/数据。

## 4. 根因证据 / RED → GREEN

稳定 API36 的 v5 通过实际系统选图取得 33,533 字节 PNG，但 WebView FileReader 返回 NotReadableError，编辑器显示图片读取失败。dumpsys activity permissions 确认 app.recipio.local 获得所选 URI 的 read grant；同一 URI 使用原生 Filesystem.readFile 返回 44,712 个 Base64 字符，前缀为 PNG。失败边界是 WebView 文件读取，不足以认定缺少 INTERNET 或具体 WebView 内部原因；未增加权限来猜测修复。

先新增测试：TS 两文件初次 7 项失败/1 项通过，pickLocalImage 尚不存在/编辑器尚未走原生；Java Copy 测试因实现不存在编译失败。加入实现后原生相关 9 文件/34 项、Java 6 项全部通过；最终 v6 实际选择器与封面/步骤图验证通过。取消测试另补了确实调用选图的断言，避免仅依靠未禁用按钮误判。

原 back 脚本同步点击“取消”触发 native window.confirm，使 CDP Runtime.evaluate 阻塞超时；改为先安排点击并返回，再操作实际 Android 确认按钮。没有削弱确认框或 SQLite 断言；新 back 专项通过。

稳定文档选择器使用文件 content-desc 而非旧 Photo taken/text 标签，初次 create 脚本未点中。仅扩大匹配同一测试 fixture 的系统标签，重新实际选图后通过；未注入 Blob/代写业务路径替代 UI。

## 5. 实际执行的验证

仓库目录：E:\CODEX\VIBE CODING\recipe-step-app。

- `npm.cmd test -- --pool=threads --maxWorkers=2 --testTimeout=120000 --hookTimeout=120000 --reporter=default --reporter=json --outputFile=artifacts/android-daily/test-results-post-fix-2026-10-04.json`：133 文件/622 项通过，0 失败。修复前独立全量 131/614 也通过，二者不混算。
- `npx.cmd vitest run src/native --maxWorkers=1 --no-file-parallelism`：9 文件/34 项通过。
- `npm.cmd run typecheck`、`npm.cmd run lint`：exit0；ESLint 0 错误/5 条旧 Next 图片警告。
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-apk.ps1 -ArtifactName recipio-daily-library-v6-debug.apk -VersionCode 6 -VersionName 0.2.1-daily-library`：Vite 静态构建、Capacitor sync、Gradle assembleDebug 通过。最后一次构建产物 hash 见下文，不沿用中间构建 hash。
- `./android/gradlew.bat -p android :app:testDebugUnitTest assembleDebug lintDebug --console=plain --max-workers=2 -PapkVersionCode=6 -PapkVersionName=0.2.1-daily-library`：通过；JUnit LocalImageCopyTest 6 项，0 失败。Android App lintDebug 0 错误/30 警告，其中新增 UsableSpace 优化建议未隐藏。
- `node --check scripts/verify-daily-android.mjs`、`git diff --check`：通过（只有既有 CRLF 转换提醒）。
- `node scripts/verify-daily-android.mjs <adb> emulator-5558 <mode>`：fresh / create / flows / media / step-media / cancel-media / sort / back 全部 exit0；另独立确认首页封面异步解析后 naturalWidth=192。
- `node scripts/verify-native-migration-failure.mjs <adb> emulator-5558`：exit0，隔离 acceptance_probe 数据库，没有操作业务库。
- `node scripts/verify-daily-android.mjs <adb> emulator-5556 upgrade-baseline` → `adb -s emulator-5556 install -r <v6.apk>` → `upgrade`：最终 exit0。旧 API37 首次升级后 CDP 超时，日志有 Google 系统服务 ANR/渲染资源警告；只做一次有界重跑，冷启动和原生数据/图片断言通过，不声称旧环境完全修好。

证据：
- artifacts/android-daily-api36-red-2026-10-04：原 FileReader 失败阶段；目录中历史文件不能整体当作本次通过证据。
- artifacts/android-daily-api36-v6-2026-10-04：上列八个 mode 的 success=true/serial=emulator-5558 报告、migration-failure.json、home-v6.png、最终全量测试报告。
- artifacts/android-daily-api37-v6-upgrade-2026-10-04：upgrade-baseline/upgrade 报告、before-overwrite.db / after-overwrite.db / overwrite-baseline.json。
- Java XML：android/app/build/test-results/testDebugUnitTest/TEST-app.recipio.local.LocalImageCopyTest.xml。

实际保留封面：33,533 字节，SHA-256 `82fe25182aeb559118c100561b433efd119ca2af17cca607dd52ffed2be3162f`。

Not Run：物理手机/OEM 测试、四种格式在各 Android 版本上的视觉兼容、磁盘真的耗尽/进程强杀中途清理、Release 签名/AAB、旧 Next Production Build、推送/部署。原因分别为无真机、不扩大该验收范围/不破坏设备空间、交付 Debug；旧 Web 非本模块。

## 6. 交付与 Git

最终 APK 绝对路径：E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-daily-library-v6-debug.apk。

版本：app.recipio.local，versionCode 6，versionName 0.2.1-daily-library；16,439,275 字节。

SHA-256：`8087A68F79B404A25508D291691B3F9ABE9588B0FE8F84D591D51B3971B90F97`。

分支 feat/recipio-daily-library；提交前继承 aa21516；本轮限定本地提交，准确新 SHA 见交付回复/git log。不推送、不合并 main、不部署，不提交 APK/SDK/设备数据库或密钥。

## 7. 当前问题 / 下一步

技术验收关卡通过，状态 DAILY_LIBRARY_ANDROID_VERIFIED，停止等待用户体验验收。无此模块阻断项。

边界：完整备份尚未实施，不能作为唯一重要数据来源；强杀复制可能遗留 .part，图片回收后置；32MiB 余量是尽力保护；API37 系统测试不稳定，后续优先 API36；旧依赖审计风险没有顺手升级。真实 PNG 流程通过不等于所有手机/图片格式都已验证。

用户确认本模块后再单独授权 APK-2 完整备份恢复；不自动进入。
