# 日常菜谱库剩余验收续查

## Goal / baseline

补齐图片替换/移除、标题与创建时间排序、返回键、最终 APK 覆盖升级六表及图片字节保留。继承 `2026-10-03-daily-library-android.md`，不进入备份或 AI。

分支 `feat/recipio-daily-library`，HEAD `aa21516`，续查前工作区干净。

## Fresh evidence

- 最终 v5 APK SHA-256 重新核对为 `A2FAF542385E8BCE7E4E7AA20300E1F3C61D7A784DC8DCD8E5FA5C09508C3234`；没有重新构建或安装。
- `adb devices -l`：已有其他项目的 emulator-5554；未连接物理设备。
- 启动现有专用 AVD，参数为 `-avd Recipio_Acceptance_37 -port 5556 -no-window -no-snapshot -no-audio -gpu swiftshader_indirect -cores 2 -memory 2048`。没有 wipe-data 或重新初始化。
- 5556 能进入 ADB device 状态，但 `getprop sys.boot_completed` 未返回 1；`dumpsys package app.recipio.local` 输出 `Can't find service: package`；bootanim 仍 running。未达到应用专项验收的前提。
- 主机 `FreePhysicalMemory=1059160` KB（约 1GB）。资源压力可能相关，未证明是系统启动故障的唯一原因。
- `adb -s emulator-5556 emu kill` 返回 OK；仅关闭本轮启动实例，保留其磁盘和数据，未控制另一个项目。

## Not Run

`create / flows / sort / media / back / upgrade-baseline / upgrade` 专项均未重新执行。完整测试、类型检查、Lint、Build 与实际安装本轮未运行，因本轮没有业务代码变化且设备前提阻塞；历史通过结果仍只在旧检查点中有效，不冒充本轮通过。

## Changes / data safety

仅补充当前状态及本续查记录；业务代码、数据库结构、AVD 配置和 APK 没有变化。未清数据、卸载、删除媒体、停止其他项目或写入云端。

## Status / next

`DAILY_LIBRARY_ANDROID_BLOCKED`。待用户允许释放其他模拟器资源，或提供稳定 Android 测试环境，再继续原检查脚本。未提交、未推送，不进入下一模块。

## 用户通知可续验后的第二次检查

- 开始时 emulator-5554 仍在线，主机空闲物理内存 2190460 KB。未控制该实例。
- 以现有 AVD 和相同安全参数再次启动5556，仅本轮进程参数将内存设为1536MB，未改 AVD 配置或清数据。系统成功完成启动（sys.boot_completed=1），原有安装 versionCode=4、versionName=0.2.0-daily-library。
- 实际运行 `node scripts/verify-daily-android.mjs <adb> emulator-5556 create`，退出码1。应用确认为 Android 平台、https://localhost/ 内置页面，显示谱序与“正在读取本地菜谱…”，随后 Runtime.evaluate 15秒超时；没有已完成专项断言。`artifacts/android-daily/create-verification.json` 为 success=false、checks=[]。
- 此时主机空闲物理内存645256KB。不能仅凭资源压力判定产品正确或错误；没有改业务或放宽超时掩盖失败。
- 仅关闭本轮5556（emu kill返回OK），保留磁盘。未安装v5，未执行sort/media/back/upgrade专项，无新增通过结论。
- 继续需要用户确认5554可停止或手动关闭它，以便进行单模拟器验证。仍不提交、不推送、不进入备份。

## 用户授权关闭5554后的单实例验收

- 先检查5554的进程列表未发现test/instrument匹配项，用户明确允许后通过emu kill正常关闭（返回OK），未删除Mirra数据。随后仅启动谱序5556（2048MB、2核心），成功启动并读取旧测试菜谱。
- create首轮退出1：Runtime.evaluate超时；UIAutomator现场显示Android自身“System UI isn't responding”。当时空闲内存1715672KB，不能继续把失败单独归因于双实例或内存。
- 选择系统Wait后只做一次受控create复查，退出1：选择器返回但编辑器显示“图片读取失败”，封面为空。独立读取同一input.files[0]确认name=19.png、type=image/png、size=33533、FileReader.error.name=NotReadableError；错误说明为文件引用取得后权限读取失败。此为未通过的真实图片路径，尚未确定最终根因；没有修改业务代码或替代选图方式。
- 保存完整文字测试菜谱（没有封面）供独立检查，不冒充完整图片流程通过。sort专项退出0：名称冷启动保持、created_at保持、编辑旧菜谱不提升到新菜谱前、无远程核心请求和JS异常。
- back专项退出1，已通过无修改返回与取消确认保留未保存输入，但脚本通过Runtime.evaluate同步点击“取消”进入原生confirm后等待超时。现场UIAutomator确认弹窗存在；用真实Android确认按钮继续，独立脚本退出0，验证SQLite已保存notes仍为“原生离线编辑已保存”以及详情→列表→首页返回。保留自动脚本失败，不改写成自动全量PASS。
- 原始create/back失败JSON、sort通过JSON及image-read-failure.png保留在忽略的artifacts/android-daily目录。未进行v5覆盖安装、media完整替换移除、升级图片hash比对；不能跨过图片失败进入下一模块。
- 没有新的产品代码、测试断言、Schema或依赖变化。仍BLOCKED，未提交/推送。下一步定位原生选择器FileReader读取问题后重复图片及升级检查。

## 用户要求修复后的根因排查

- 检查了 `src/native/media.ts`、`recipe-editor.tsx`、MainActivity、Manifest 及当前 Capacitor 8.5.2 文件选择器/WebView 初始化源码。失败发生在 FileReader、Filesystem 写入之前；未据此认定具体权限根因。
- 启动5556后，首次系统启动期间 activity/package 服务未就绪；就绪后可以打开旧菜谱编辑器。系统选图前后反复出现 Pixel Launcher ANR、System UI ANR、Gboard 崩溃，UIAutomator 现场可见；实际点击返回缺少文件的状态，未再次获得可分析的失败 File 对象。
- 按已有授权正常关闭5554一次，后续发现其他项目再次启动了5554。没有继续循环关闭其他项目。仅重启5556一次、不清数据；第二次启动仍受同时运行的环境干扰，未完成稳定选图检查。最终关闭5556，保留 AVD 磁盘和已有SQLite数据。
- 没有生产代码、测试、Schema、权限、依赖或APK修改。未执行RED→GREEN、构建、覆盖安装或全量回归；没有可报告的修复成功证据。当前HEAD仍aa21516，文档改动未提交/推送。
- 下一次从协调独占模拟器或稳定实机开始，读取实际系统URI授权/文件读取错误证据，再做最小修复；不要直接增加存储权限、替换FileReader或删除数据来猜测修复。
