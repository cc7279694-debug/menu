# G5 日常做菜体验 — 集中审阅

状态：`RECIPIO_G5_READY_FOR_REVIEW` — 2026-10-26。实现、测试和自查完成，等待 ChatGPT 独立验收；不是 G4/G5 验收或冻结。

起点：`d3846b62b620f5a2a3bce0708473ce6b6bad3c06`。
工作分支：`feat/recipio-g5-daily-cooking`。R1 长期签名及个人迁移继续延期。

## 实际体验变化

| 路径 | 原先的问题 | 本轮变化 |
| --- | --- | --- |
| 找菜 | 搜索/筛选无匹配容易与空库混淆；长标题占用过多首页空间 | 区分空库、无匹配、后续空页和读取失败；分别清除查询/筛选，保留另一条件；最近卡片显示真实耗时，紧凑预览限三行，列表/详情/无障碍名称保留全名 |
| 录入 | 入口说明、输入限制、审核与出错恢复层次分散 | 四种既有入口添加简短说明；统一输入计数、限制、字段错误关联和审核层次；手动保存失败保留草稿并聚焦错误，审核拒绝仍由审核区域接管焦点 |
| 做菜 | 食材、准备和关键事项在厨房中查看不够集中 | 完整步骤仍为默认；在原有食材 Sheet 中同时展示实际准备与关键事项，优化步骤、图片、控制区及窄屏阅读；不建立新状态机 |
| 做完 | 可选内容与再次查看记录不够突出 | 明确照片/评价/备注可选；先展示真实上次下厨，再展开较早记录；保留直接调整做法、真实修改历史和原有图片引用/完成幂等规则 |

## 数据和安全边界

- SQLite4、Preview7、Backup2、Repository、历史/媒体规则、Provider/Key/网络门禁、Logo、生产 Manifest/Gradle 和依赖均未修改。
- 没有新计时器、收藏、追踪、推荐、持久烹饪进度或生成式总结。
- 没有真实 AI 请求、个人数据操作、手机安装、长期签名、主线合并或发布。
- 云端 APK 仅为新建空 API36 AVD 内的短期测试夹具，使用 `app.recipio.local`；不是可交付给用户的持续升级版本。

## 验证及证据分层

最终代码/测试基线：`e5fbe1b75c97295b214dea9ed0f0ad202b2b6b60`。
最终[云端运行40313302175](https://github.com/cc7279694-debug/menu/actions/runs/40313302175)的四个 Job 全部 PASS。后续交付提交只含文档和生成截图；不更改已验证代码、测试或 CI。

| 范围 | 当前证据 | 边界 |
| --- | --- | --- |
| JS/TS、类型、Lint、构建、隔离 | 210文件/1184测试 PASS；TS PASS；Lint 0错误/5项既有警告；build/isolation PASS | 定向5文件/20项包含在全量内，不重复相加；生产313模块、13共享V2模块、0样板/fixture模块 |
| 原生 JVM / Android 编译与 lint | 189测试 PASS，0失败/错误/跳过；Capacitor sync、原生lint、assembleDebug及assembleDebugAndroidTest PASS | [JVM结果](evidence/jvm-results.json)；JDK21/SDK36；构建不等于设备执行 |
| 浏览器实际页面 | 16组 PASS；20项几何检查 PASS；25张实际截图；0外部origin/页面错误/console错误 | Preview7；三主题390px截图和状态保留；Warm核心320/390/412×16/32px字号18组布局，另含solid/reduced及候选结果触达；保存/取消/真实历史/加载后离线浏览 |
| 外部能力界面 | 审核未确认禁止保存、明确搜索、Parser不自动AI全部 PASS | AI/Finder/Link 使用 Fake Provider/HTTP；不是账号或真实联网识别证据；真实AI调用0 |
| 云端 Android | 实际执行21项/21 PASS，0失败/跳过 | 新建空 `Recipio_G5_Fixture`、API36；11存储/备份 + 8真实IME/Back + 2 G5编辑/做菜；[逐项记录](evidence/native-results.txt) |

Android 已验证：图片选择后首次 Back 只关闭 IME且图片/文字/Preview/确认门禁保留；第二次 Back 执行既有离开流程；重复 Back 不双跳、Busy不重复请求。实际手动草稿取消离开后保留；Focus/Guided浏览退出0记录，明确完成双击仅1记录；Activity重开后保留菜谱ID、创建时间、步骤和做菜记录。存储用例含原生迁移回滚、引用审计、历史/共享照片、真实备份流和哈希保护。

实际命令与步骤由本分支 `.github/workflows/recipio-g5-cloud.yml` 固定：定向/全量 `npm test`、`typecheck`、`lint`、`build:local`、生产隔离、浏览器工具、Capacitor sync、Gradle JVM/lint/两项assemble，以及独立模拟器中的 `am instrument`。未重跑或冒称全量历史 connected 套件。

已保留的失败与修正：

- `40295123278`：仅测试提交的初始 RED，15 项中12项暴露缺失体验，3项原有行为通过。
- `40296024535`：测试查询参数类型不兼容；同时自查修正审核拒绝的焦点所有权，未绕过审核。
- `40298292479`：浏览器评价字段的严格 label 查询不匹配；Android 图片等待在 Back 前失败，未改图片断言。
- `40306242741`：浏览器16组、20项几何检查、25张截图通过；1184 JS/TS、189 JVM通过；Android20/21。脱敏诊断明确请求仍在 Photos 选择器 pending、0 Provider posts，尚未返回 Native/JS 图片校验。修正仅补真实系统确认操作，原15秒期限及图片/Back断言不变。
- 后续受控失败截图证明：网格中心点击打开 Photos 查看器，根本没有确认控件；改为精确文字行后又证明该图片网格隐藏文件名。最终移除已证伪的确认猜测和缩略图点击，在真实系统列表中选择完整生成文件名；原图片/IME/Back断言与15秒期限保留，生产代码及安全校验未改。Android16 [官方List view定义](https://android.googlesource.com/platform/packages/apps/DocumentsUI/+/refs/tags/android-16.0.0_r2/res/values/strings.xml#47)用于控件定位；成功证据是最终21项实际设备结果。

## 明确未执行

TalkBack、实体手机/OEM、Android 系统字体缩放、设备级性能认证、Android 飞行模式进程冷启动、其他未选中的历史 connected 类、长期证书/同签名升级和个人数据迁移：NOT_RUN。R1事项是用户延期，不是本轮安全阻断。

浏览器 CSS 200% 不等于 Android 系统字体缩放；浏览器加载后离线不等于原生飞行模式冷启动；Activity 重开不等于进程重启。

## 实际截图

以下20张选自最终云端运行 `40313302175` 的25张实际浏览器截图，均为生成测试数据；不是 Showcase 或设计稿。截图代码 `e5fbe1b`，`src` tree 为 `0cae01b8b6266043ebde42832532e4486a53e510`。完整浏览器记录见 [browser-results.json](evidence/browser-results.json)，其中 NOT_RUN 仅描述浏览器自身的证据边界，IME/Back 的设备证据另见 native-results.txt。

| 主题/状态 | 首页 | 菜谱详情 | 烹饪 |
| --- | --- | --- | --- |
| 修改前 Warm / d3846b6 | [查看](evidence/before/warm-ivory/home-390.png) | [查看](evidence/before/warm-ivory/detail-390.png) | [查看](evidence/before/warm-ivory/cooking-390.png) |
| Warm | [查看](evidence/after/warm-ivory/home-390.png) | [查看](evidence/after/warm-ivory/detail-390.png) | [查看](evidence/after/warm-ivory/cooking-390.png) |
| Pure | [查看](evidence/after/pure-glass/home-390.png) | [查看](evidence/after/pure-glass/detail-390.png) | [查看](evidence/after/pure-glass/cooking-390.png) |
| Sage | [查看](evidence/after/soft-sage/home-390.png) | [查看](evidence/after/soft-sage/detail-390.png) | [查看](evidence/after/soft-sage/cooking-390.png) |

另见[手动编辑](evidence/after/warm-ivory/editor-390.png)与[320px/CSS 200%](evidence/after/warm-ivory/detail-320-css200.png)。同尺寸对照使用相同菜谱、食物素材和390×844视口。另见 [AI 输入](evidence/after/warm-ivory/ai-input-390.png)、[保存前审核](evidence/after/warm-ivory/ai-preview-390.png)、[Finder 来源候选](evidence/after/warm-ivory/finder-results-390.png)、[网页 Parser 预览](evidence/after/warm-ivory/link-preview-390.png)、[可选完成内容](evidence/after/warm-ivory/completion-390.png)、[再次打开的上次记录](evidence/after/warm-ivory/latest-record-390.png)。AI/Finder/Link 截图的外部结果均为 Fake，不是真实 Provider 证据。

## 文件与交接

主要实现位于 `src/native/ui-v2/g5-*.css`、既有 library/detail/editor/step/cooking/history/intake 页面及四项 G5 定向测试；云端工具独立于生产入口。

- 页面：`library-app.tsx`、`ui-v2/library-screens.tsx`、`recipe-editor.tsx`、`recipe-detail.tsx`、`recipe-step-content.tsx`、`step-viewer.tsx`、三个 cooking/history 页面、既有 AI/Link/Finder screen、AI review-panel；`main.tsx` 只接入四份 scoped G5 CSS。
- 验证：四项 `g5-*.test.tsx`、两项新 `G5DailyCookingInstrumentedTest`、修正既有 `AiImeBackInstrumentedTest` 真实选图动作、独立 G5 workflow 及两个 QA script。
- 证据：[原生逐项结果](evidence/native-results.txt)、[JVM计数](evidence/jvm-results.json)、[仅云端构建收据](evidence/cloud-build-receipt.txt)；没有交付 APK、私钥、私人媒体或大型 ZIP。
- 保留原分支 `feat/recipio-ui-v2-glass-minimal`=`d3846b6`；`origin/main`=`4a26b88` 未改。最终报告/截图是文档提交，测试基线始终以上述完整 SHA 和运行号为准。

完成本轮后仅等待 ChatGPT 一次性独立验收；不自动进入后续模块或恢复 R1。
