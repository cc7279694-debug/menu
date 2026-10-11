# RECIPIO Video P0 — 独立画面 / 内部声音采集实验

这不是谱序正式视频导入，也不是视频下载器。**不调用 AI，不联网。**
完成状态与实际验证见 [REPORT.md](REPORT.md)。没有真机证据前，三个平台均为 `NOT_TESTED`。

## 安装（Android 10 / API 29 及以上）

安装两个独立 Debug APK，不卸载、不覆盖谱序：

- `artifacts/recipio-video-p0-capture-probe-debug.apk`
  - 包名 `app.recipio.captureprobe`
  - 界面名 RECIPIO Video Capture Probe
- `artifacts/recipio-video-p0-controlled-source-debug.apk`
  - 包名 `app.recipio.captureprobesource`
  - 界面名 RECIPIO Controlled Source

将文件发到自己手机，在文件管理器点安装；系统如询问，临时允许文件管理器安装应用。
也可在已授权 USB 调试的测试设备上使用 `adb install -r <apk绝对路径>`，不要清除任何正式 App 数据。
只需打开实验 App，不需要手机连接 Codex。

## 先验证受控源（不能跳过）

1. 安装并打开 Controlled Source：应看到变色背景、动态时间、移动圆点，并听到交替高低音。先调高媒体音量。
2. 回到 Probe，选择「受控测试源」，点击「开始本次采集」。
3. 允许录音权限和通知权限。Android 会把 `RECORD_AUDIO` 显示为麦克风/录音许可；本程序仅用它接入内部播放采集，**没有麦克风输入路径**。
4. 系统屏幕授权页：Android 14+ 优先选「单个应用」并选 Controlled Source。
   Android 10～13 为整屏采集，请关闭敏感通知、避开私人页面。
5. 手动切换到 Controlled Source，保持变色画面与声音约 15 秒。采集通知提供停止入口，程序也会自动停止。
6. 回到 Probe，点「查看画面样本」「试听内部声音样本」。
7. 确认系统授权范围与目标一致、受控源实际播放，再勾选对应前提。真正看到动态源的画面、听到同一交替高低音后，才勾选内容确认项及「已检查」，记录受控源结果。
8. 点「删除本次全部结果」，确认不能再查看/试听旧样本。
9. 可选负向对照：Controlled Source 中点按钮禁用音频采集，再重新授权一轮。应尊重禁止策略，不尝试换麦克风或抓其他 App 声音。

受控源失败时：先记录设备/系统、授权选择、媒体音量及失败现象。**不能因此判断三个平台不支持。**

## 然后三个平台各测一次

对抖音、小红书、B站分别执行：

1. 用户自行打开有权用于测试的普通公开视频，确保包含清楚的口播。
2. 在 Probe 下拉框选择同一目标，发起新的一次采集。
3. Android 14+ 授权页选择同一个目标应用；声音按目标 UID 过滤，**不能把系统授权选了别的 App 当成该平台的画面证据**。
4. 手动切回目标播放约 15 秒，等待自动结束或从通知手动停止。
5. 回 Probe 检查至少两张画面（是否真的变化、是否黑屏），试听声音（是否真是视频口播，而非静音/杂音/其他声音）。
6. 先勾选「授权范围一致且目标确实播放」前提，再勾选真实观察，记录分类，删除样本。未确认前提时仍为 NOT_TESTED，不是 CAPTURE_BLOCKED。不要给开发者发送私人媒体。

| 分类 | 人工观察 |
| --- | --- |
| FULL_CAPTURE | 目标视频画面和内部口播均可用 |
| VIDEO_ONLY | 画面可用，内部口播不可用 |
| AUDIO_ONLY | 内部口播可用，画面不可用 |
| CAPTURE_BLOCKED | 已获授权且实际播放后，两种内容均不可用 |
| NOT_TESTED | 未实际测试、拒绝授权或测试前提不成立 |

信号峰值、非零 PCM、图片尺寸和系统自带录屏成功均不构成平台成功证据。
若 App 不在默认包名下（分身/另一发行版/工作资料），本轮不支持，不改成全局声音采集。

## 真机生命周期清单（逐项记录，未跑项写 NOT_TESTED）

- 拒绝录音 / 通知 / 屏幕授权：不开始采集，没有采集服务残留。
- 正常启动、约 15 秒自动结束：通知消失，旧授权不能重复开始；再次采集要新授权。
- 通过系统共享控件中途停止 / 从通知手动停止：不再产生新帧/声音，资源释放。
- 采集中切换应用：单应用采集范围由系统限定；音频仍只匹配选定 UID。
- 采集中旋转 / 重建 Probe Activity：不重复使用 token，不产生第二服务，当前状态仍能查看。
- 锁屏、系统停止共享、来电/通知打断：检查是否停止；如系统未自动终止，用明确停止入口结束。不要拨打真实电话制造干扰。
- 强制停止 **实验 App** 后再打开：旧缓存清理，无自动继续录制；不要强停或清除谱序。
- 连续开始/结束至少 3 次：每次独立授权、输出不混用、不能重复启动。
- 查看/试听后删除：结果不可再读取；冷进程重启同样清理遗留缓存。
- Controlled Source 禁止音频的对照：不得把其他声音或麦克风作为替代。

## 安全边界与已知限制

- 每次授权只创建一次 VirtualDisplay，旋转/窗口变化使用原 display resize；注册 Callback 并处理 onStop。
- 仅私有 `cache/video-capture-p0/`，最多 3 张长边不超过 960 的 PNG，以及 16 kHz 单声道 PCM16 WAV（最多 480,000 字节 PCM / 15 秒）。
- 第 2 / 7 / 12 秒附近取帧；系统卡顿时可能晚取或少取，不补抓历史内容。
- 所有写入都有单调时间截止检查，声音有硬字节上限。主线程独立自动停止并撤销 projection，样本线程随后释放文件/音频/显示资源。音频初始化或读取不可用时不改用麦克风，仅继续检查画面；文件 I/O 失败会安全停止。
- Android 调度、设备冻结、进程被系统杀死不是通用 App 可保证的硬实时条件；正常运行下 15 秒自动结束，实际时序需要真机验证，不宣称在任意 OS 冻结下都能按墙钟准时响应。
- 通知权限/通知渠道不可用时不开始（隐私上的保守选择，不是 Android 强制要求）。Service 不黏性、不自启动。
- 拒绝缺失、声明 sharedUserId 或可见共用 UID 的目标；包可见性会过滤兄弟包，因此不单靠可见包数量判断。只过滤 `MEDIA / GAME / UNKNOWN` 的可捕获内部播放，不采集麦克风。
- 没有 INTERNET、广泛存储、无障碍或 root 权限，不读取 Cookie，不自动化平台 UI，不抓视频直链。
- Android 及目标 App 的录屏/音频保护不可绕过。静音可能是播放策略、声音用途、暂停、设备环境等原因，应记录现象，不能仅靠静音断言平台整体不支持。
- 帧可能包含私人通知（旧系统整屏尤其如此）。只用有权测试的内容，并及时删除。样本不导出、不进入谱序 SQLite / Backup / 正式媒体库。
- 实验缓存不是长期保存，Android 可随时回收；不是备份或菜谱数据。

## 本地构建与验证

从仓库根目录使用已存在的 Gradle wrapper，仅作为只读构建工具；这是独立 settings/project，不构建谱序：

```powershell
$env:JAVA_HOME = '<JDK 17+ 的绝对路径>'
$env:ANDROID_HOME = '<已有 Android SDK 的绝对路径>'
./android/gradlew.bat -p experiments/video-capture-p0 :probe:testDebugUnitTest :probe:lintDebug :source:lintDebug :probe:assembleDebug :source:assembleDebug --no-daemon --max-workers=1
```

本次使用已有 JDK21 / SDK36 / AGP8.13.0，离线构建，不安装新 SDK 或 npm 依赖。
Java 单元/Fake 测试只能验证逻辑与文件约束；不能代替 Android 授权、真实 MediaProjection 或平台测试。

官方依据：[MediaProjection](https://developer.android.com/media/grow/media-projection)、[AudioPlaybackCapture](https://developer.android.com/media/platform/av-capture)、[前台服务类型](https://developer.android.com/develop/background-work/services/fgs/service-types)。

## 回报模板（不含真实 URL 或媒体）

```text
设备型号 / Android 版本：
授权方式：单个应用 / 整个屏幕
受控源：NOT_TESTED / FULL_CAPTURE / VIDEO_ONLY / AUDIO_ONLY / CAPTURE_BLOCKED
抖音：
小红书：
B站：
自动停止 / 手动停止 / 系统停止：
旋转 / 重启清理 / 重复采集：
异常现象：
已删除采集结果：是 / 否
```

本轮停止在 `VIDEO_P0_PENDING_DEVICE_TEST`，不进入正式视频导入。
