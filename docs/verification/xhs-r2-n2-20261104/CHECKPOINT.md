# N2 — Android执行前断点

2026-11-04 · **BLOCKED / ANDROID_MEMORY_ADMISSION**，不是清晰度PASS。

- 分支 `feat/recipio-xhs-r2-n2-long-image`；最终源码 `51a2d92d1417cc99bbba9547bcbb2497b8757949`。
- 14份源码/测试文件及精确diff已完成；[回执](RECEIPT.json)记录源码blob、APK大小/SHA。后续证据提交仅文档，不改变编译源码。
- 实跑55定向JS、208JVM，Typecheck、Lint、Web/sync及debug+instrumentation构建通过。资源最终2.647GiB<4；N2 AVD已创建但未启动，0 Android执行/0真实AI/0真实XHS/0手机操作。
- 新段图、尺寸/SHA、原像素字片和清晰度均未产生。N1高长图小字FAIL保留。

## 安全恢复，不重新开发

1. 核对分支/状态/源码blob和[APK回执](RECEIPT.json)；保留原 `android/.idea/`。不重签、不重建正式V28。
2. 新鲜≥4GiB才能启动；不足立即保留阻塞，不操作其他任务/设备。N2目录 `E:/CODEX/Tools/recipio-xhs-r2-n2-20261104`；设置独占ANDROID_AVD_HOME=其avd、ANDROID_USER_HOME=其android-user。已有镜像/模拟器 `C:/Users/CDD/AppData/Local/MirraAndroid/sdk`；编译JDK/SDK在 `E:/CODEX/Tools/recipio-official-signing-jdk21`、`recipio-official-signing-sdk36`。无需SDK下载。
3. 端口5690/5691空闲时，启动且仅使用 `Recipio_XHS_R2_N2_API36`，2560MiB/2CPU/no-snapshot/no-audio/hidden。确认实际AVD名、API36、设备归属；不启动adb-server重置，不连接手机，不清旧数据。
4. 只在这个新合成测试AVD安装 `test-app-debug.apk` 与 `test-instrumentation.apk`，路径和SHA见回执；不安装正式签名V28。启用飞行模式、关闭数据/Wi-Fi，Native Provider只用测试Fake。
5. 使用Tools中的 `run_native.py <class> <new-label>`（也随[证据](evidence/run_native.py)提供）；脚本核对AVD/API，拒绝覆写日志。先运行 `app.recipio.local.XhsR2SegmentedImageInstrumentedTest`；再运行 `app.recipio.local.AiImeBackInstrumentedTest#xhsR2NativeLongPickerCancelKeepsExistingImage` 及 `#xhsR2NativeLongSegmentsKeepOrderUntilExplicitReviewAndSave`。
6. 回归既有 `AiTemporaryImagesInstrumentedTest`、必要N1普通codec/IME流程；按实际唯一测试数报告，不累加重跑。新失败保留并先定位，不能清库或删测试。若修源码，按影响重编译及回归。
7. 从App外部文件目录拉取 `xhs-r2-n2/`、`xhs-r2-n2-ui/`。必须查看全部段原像素，比较顶部/中部/底部14/24px与N1原图；坐标覆盖及几何断言不等于清晰。不要上传真实用户图片；自动可读性字段保持未评估直到真实判读。
8. 在资源安全时补 `npx vitest run src/native/ai src/native/link-import src/native/share src/native/backup --pool=threads --maxWorkers=1 --no-file-parallelism` 和 `node scripts/verify-ui-v2-isolation.mjs`。已有55/208不是这些未跑项目的替代证据。
9. 结束只关闭此AVD并保留数据；更新原始日志/参数/字片及当前报告，普通提交/push当前功能分支。保持N1冻结证据不动，无main/签名/新模块。

## NOT_RUN必须继承

N2实际Android/Picker/原生IME/段图和清晰度；真实AI/模型正确率；真实小红书；小米14/OEM/TalkBack；全量历史connected、真机性能及新增Native保存失败注入。G4整体PENDING/R1延期不变。
