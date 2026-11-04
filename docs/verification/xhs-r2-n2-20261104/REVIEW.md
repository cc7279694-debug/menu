# XHS-R2-N2 — 源码交付与 Android 资源阻塞

2026-11-04 · **BLOCKED — ANDROID_MEMORY_ADMISSION**。

本轮已经实现并编译长图模式，但没有启动Android、没有实际分段图片或清晰度结论。
不能把源码、JVM或浏览器组件测试视为1080×7200小字问题已解决。

## 固定身份及验收登记

- 用户转达N1：**ACCEPTED / FROZEN — PASS WITH NOTES（限定验证）**。N1的1080×7200→307×2048，14px不可靠/24px退化仍为原始清晰度FAIL。
- XHS-R2业务源码 `c2c55d21c8328e6f78aa7f738bf9d1eba9f1423d`；N1测试源码 `b38f82d7f005f28c3af3ef0fbd934b8d162f0b08`；N1证据 `f552d142d678868b739dff9a7eecda070a319df3`。这些固定提交、原图片和失败证据不变。
- 独立分支：`feat/recipio-xhs-r2-n2-long-image`，直接从f552d14派生。
- **新源码提交：[`51a2d92d1417cc99bbba9547bcbb2497b8757949`](https://github.com/cc7279694-debug/menu/commit/51a2d92d1417cc99bbba9547bcbb2497b8757949)**，只含14份生产/测试文件。[精确diff](evidence/source.diff)。后续证据提交不改变此源码。
- [机器回执](RECEIPT.json)、[逐文件大小与SHA-256](EVIDENCE_SHA256.json)。原始日志按字节保留；局部 `.gitattributes` 避免CRLF被转换。手写文档/源码diff检查通过，原工具日志的空格不为消除格式提示而修改。

## 已实现

1. 截图页增加明确的“文字长图分段导入”，点击以后才打开系统Picker；普通“添加截图”原算法保留。
2. 新 `AiLongImagePlan` 先检查剩余名额，再规划原图坐标。`AiLongImageCodec` 从授权原文件进行sample=1区域解码，每段最长2048、64px重叠，逐段回收Bitmap，不从已缩小JPEG放大切图。
3. `AiTemporaryImages` 独占预留批次，逐段暂存，删除原文件后整批注册。部分失败/取消/线程中断清理所有新文件，保留既有图片；同批处理中阻止并发修改。Plugin检查在store锁外，避免锁顺序倒置。
4. Native `pickLongImage` 返回完整有序批次；JS严格校验元数据、归属、唯一ID及会话总预算，一次加入现有预览列表。沿用排序、移除、放弃、显式AI、审核和UUID保存。
5. 增加重试后清理旧错误提示的最小修复，先复现stale alert再修；无页面重构。

原图15MiB/3200万像素、输出1MiB/段、最多6张/6MiB、AI请求上限保持。单段解码不超过4,194,304像素；按两个ARGB缓冲及8MiB余量检查当前可用Java堆，预算不足拒绝。没有提高任何全局上限。

有意的兼容边界：宽度>2048、EXIF方向非0/1、所需段数超过剩余名额或资源不足，返回 `long_image_limit` 提示手动分图。不会丢掉末尾凑名额，不对旋转图静默错排。普通流程不受这些新模式限制。

## 实际验证

| 项目 | 结果及范围 |
| --- | --- |
| 新功能RED→GREEN | 初始10项TS/UI缺少入口/方法、4项planner、4项batch失败；内存预算新用例与重试旧错误用例也先失败，原日志保留，不累计次数 |
| JS/TS相关回归 | **55 PASS / 9文件**；[回执](evidence/ts-long-image-final-regression.txt)。修正 `solid={false}` 后受影响UI5项另跑通过，不与55重复相加 |
| 全量本工程JVM | **208 PASS / 24类，0失败、0跳过**；[`jvm-results.json`](evidence/jvm-results.json)和实际XML。含新增planner5及batch8，不与208重复相加 |
| TypeScript | PASS；初次缺少测试夹具solid必填属性的失败保留，修正后[重跑通过](evidence/typecheck-final.txt) |
| Lint | 全仓0错误/5项既有警告；最后6份改动TS文件再次检查0错误 |
| Web build + Capacitor sync | PASS；[原日志](evidence/web-sync.txt) |
| Android构建 | `:app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest`，offline/no-daemon/max-workers1，**PASS**；[完整日志](evidence/gradle-build-1.txt)，4m14s |
| APK只读检查 | app.recipio.local，28 / 0.11.1-personal.1 / target36；debug测试产物。[元数据](evidence/test-app-badging.txt)与[归档文件名检查](evidence/apk-name-check.json)。后者仅查显式fixture/敏感文件名，**不替代生产module graph隔离** |
| Android运行 / 实际分段导出 / 字片判读 | **NOT_RUN**，内存门禁阻塞；没有模拟器安装或启动，不产生虚构图片 |
| 更广JS/生产graph隔离/全历史connected | **NOT_RUN**，后续资源门禁不足；未把已有历史数字作为本轮结果 |

JS定向验证包含明确选择/取消、三主题组件、剩余名额、非法批次、并发/迟到回包、显式请求ID与顺序、审核及现有保存失败/UUID恢复保护。JVM批次覆盖处理中discard、线程中断、部分失败、原始字节/输出大小、并发及清理。纯JVM不执行真实Bitmap区域解码，组件测试不证明系统Picker或原生像素效果。

55项的实际命令（Node heap512MiB；最后 `long-image-screen.test.tsx` 单文件5项复验不另加总）：

```text
npx.cmd vitest run src/native/ai/long-images.test.ts src/native/ai/long-image-screen.test.tsx src/native/ai/images.test.ts src/native/ai/intake-screen.test.tsx src/native/ai/request-bridge.test.ts src/native/ai/native-bridge-lazy.test.ts src/native/ai/service.test.ts src/native/ai/service-save.test.ts src/native/ai/save.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

## 尚未验证的关键目标

设计对1080×7200的计划为4段：`[0,2048)`、`[1984,4032)`、`[3968,6016)`、`[5952,7200)`，宽1080。**这是已测试的坐标规划，不是实际JPEG尺寸、哈希或可读性结论。**

`XhsR2SegmentedImageInstrumentedTest` 已编译，准备4项实际Android测试：复用N1三种合成图并增加中部/边界关键文字；导出原图、所有段JPEG、源坐标、尺寸、字节/SHA及14/24px裁片；验证名额、取消和上限。现有真实WebView/Picker测试新增2项：长图Picker取消保留已有图；4段预览、重排/删除、Fake HTTP明确触发、ID顺序、审核与保存清理。**这6项目前均NOT_RUN**。

本轮没有N2“原图/分段实际对照”。[N1原像素失败证据](https://github.com/cc7279694-debug/menu/tree/f552d142d678868b739dff9a7eecda070a319df3/docs/verification/xhs-r2-n1-20261103/evidence/geometry)继续有效；14px/24px是否真正改善必须等Android导出后逐图判断，不能由不缩放公式推断为PASS。

## 资源阻塞与安全保护

初查约3.159GiB，后来回升至5.986GiB，构建前4.331GiB，符合4GiB准入。构建退出后再次下降至3.081/2.957GiB；确认本轮Gradle已退出，最终[记录2.647GiB](evidence/environment-blocked.json)。因此没有启动N2 AVD，也未启动更广JS测试或生产graph检查，没有轮询或操作其他项目。

新专属AVD `Recipio_XHS_R2_N2_API36` 只创建配置，**从未启动**；路径 `E:/CODEX/Tools/recipio-xhs-r2-n2-20261104/avd`，2560MiB/2CPU，已有API36镜像，无SDK下载。保留其目录及既有 `android/.idea/`，不清理其他任务文件。

本轮仅本机debug测试签名，没有读取/创建/替换正式私钥或密码。已签名V28仍为15,194,675字节、SHA：
`52dfed4ef23afb5aa0dc6fb2b6089921af240993627aec9479ff69ea3d94b59b`。
SQLite4、Preview7、Backup2、Provider/Key、Native网络/SSRF/DNS/TLS、权限、三主题、Logo与版本配置没有改变。源图/段图设计仅属于现有私有temp，不进入Recipe media/Backup；新的Native端到端清理仍待实际运行。

真实AI/XHS次数0；没有操作小米14、私人媒体、数据库或备份。没有main合并、发布或新模块。

## 继续位置及停止点

见[可直接继续的checkpoint](CHECKPOINT.md)。资源满足后，先核对51a2d92、测试APK哈希与独占设备，再运行已有新测试并导出图片，不重复开发。代码不变时208JVM/55定向JS、类型与构建证据保留；必要的新运行分开记录。当前仅交付源码和可复验静态/JVM证据，**停止为BLOCKED，等待资源条件与独立审查**。
