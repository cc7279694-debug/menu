# XHS-R2-N1 — BLOCKED: Android memory admission

2026-11-03 · `verification/recipio-xhs-r2-n1`。

## 已完成与停止原因

1. 用户提供的XHS-R2限定验收已[单独登记](../xhs-r2-20261103/INDEPENDENT_ACCEPTANCE.md)。固定业务源码仍为c2c55d21，原证据与全部NOTES/NOT_RUN保留。
2. 现有API36、JDK21、Gradle缓存和镜像路径已只读确认，无需安装SDK或Studio。E盘约30.5GiB空闲。
3. 最初资源检查约4.78GiB，准备期间其他任务启动Java进程，随后约2.4–2.6GiB，最终复核仅1.944GiB。低于既有4GiB模拟器启动门槛；[实际环境记录](environment.json)。没有启动、停止或复用其他项目进程/模拟器，也未操作用户手机。
4. 已准备5项新的原生定向测试，但**尚未编译或运行**。没有创建/启动N1 AVD，没有构建或安装测试APK，不把测试代码存在当作执行证据。

这是环境阻塞，不是已确认的产品失败；目前没有Native处理前后参数、实际压缩图片或原生清晰度结论。

## 准备的测试与证据输出

新增 `XhsR2LongImageInstrumentedTest`，只使用生成图片与真实AiTemporaryImages/AiImageCodec：

- 普通1080×1440、600×1800、1080×7200的PNG→实际JPEG处理，导出原图/处理文件、顶部及底部14/24/36px文字裁片、尺寸、大小和SHA-256。
- 合法32,004,000像素PNG与15MiB+1字节输入的拒绝、无源文件残留。
- 图片请求顺序、删除/重新选择的新ID、会话隔离和放弃清理。

在现有 `AiImeBackInstrumentedTest` 添加2项N1测试，并复用其真实WebView/IME/系统ACTION_OPEN_DOCUMENT操作与原生Fake HTTP：

- 合成网页仅标题→原页面截图入口→真实Picker打开/取消→600×1800实际预览→IME首次Back→放弃清理。
- 多图真实选择、前移、删除、重新选择1080×7200→显式模拟整理→请求不含网页标题/URL/分享参数→未审核阻止保存→明确审核保存→清理temp。

网页读取及Provider结果由测试适配器替代；图像选择、真实Native解码、私有临时图片、JS审核和SQLite保存为计划验证的实际路径。用于Fake HTTP的凭据是测试生成的不可用值，绝不读取用户Key，真实AI次数为0。当前这些路径**均NOT_RUN**，不能把计划写成通过。

测试只在ranchu/goldfish模拟器运行。未来证据输出到独占AVD测试App的 `getExternalFilesDir(null)/xhs-r2-n1/` 和 `xhs-r2-n1-ui/`，只含生成媒体。原生文件尺寸与几何断言不自动认定清晰；JSON刻意标注 `NOT_ASSESSED_REQUIRES_VISUAL_REVIEW`，拉取后必须查看原像素裁片。

## 静态发现：不是实测结果

冻结AiImageCodec先限制原文件15MiB/3200万像素，采样至最多4,194,304解码像素，再以最长边2048、JPEG85/75/65处理至最多1MiB。600×1800预期不几何缩小；1080×7200预期约307×2048。后者原14px/24px字高按比例约4px/6.8px，存在明显可读性风险。

上述仅来自代码计算，不是处理后测量或可读性PASS/FAIL。若实图小字不可读，登记限制及裁片证据，不扩大上限、不改冻结生产代码。

## 下一次安全继续的位置

资源重新满足≥4GiB后再执行，不自动后台轮询：

1. 先核对本分支/工作区和正式V28 SHA，保护既有 `android/.idea/`。
2. JDK：`E:/CODEX/Tools/recipio-official-signing-jdk21`；编译SDK：`E:/CODEX/Tools/recipio-official-signing-sdk36`。重建本轮Web资源并Capacitor sync，离线、单工作线程构建 **debug/debugAndroidTest**，不签Release、不覆盖正式候选文件。现有源码及版本配置保持冻结。退出本轮自有Gradle后重新核内存。
3. 镜像与工具只读使用 `C:/Users/CDD/AppData/Local/MirraAndroid/sdk`，镜像 `system-images;android-36;google_apis;x86_64`。在全新N1目录设置独立ANDROID_AVD_HOME/ANDROID_USER_HOME，创建 `Recipio_XHS_R2_N1_API36`，不-force、不复用A2目录。启动前核实端口/设备归属与≥4GiB，建议2560MiB/2CPU/no-snapshot；不操作其他设备或adb server。
4. 仅安装至确认属于本轮的新AVD。定向执行新图像测试3项、新UI测试2项及必要既有临时图片/审核/保存/UUID恢复回归；不直接照搬历史通过数字。instrumentation筛选可用 `app.recipio.local.XhsR2LongImageInstrumentedTest` 与 `app.recipio.local.AiImeBackInstrumentedTest#xhsR2NativePickerCancelLongImageAndBackKeepSourceSafe` / `#xhsR2NativeImagesReorderRemoveReviewAndSaveCleanOwnedCache`。
5. 拉取生成的参数/图像/裁片，逐图判读，保留原始失败及日志。结束只关闭本轮AVD、保留测试数据；按实际结果提交补充证据，送ChatGPT独立验收。

## 本轮检查、保护与NOT_RUN

已实际执行：Git固定输入/远端核对、项目及Native源码检查、环境内存/磁盘检查、测试diff审查、git diff --check、冻结边界diff与正式V28只读SHA核验。

NOT_RUN：新测试javac/Gradle构建/安装、全部N1 Android执行、实际Picker/预览/尺寸/文件大小/清晰度/原生清理、原生IME/Back、真实小红书与真实AI、小米14/OEM/TalkBack。没有产出虚构的前后图像或参数表。

只新增/扩展androidTest和验收文档；生产Native网络、AiImageCodec/临时图片合同、SQLite4/Preview7/Backup2、Provider/Key、三主题、Logo未修改。既有签名APK、私钥和个人数据未触碰；无main合并、Release或新模块。
