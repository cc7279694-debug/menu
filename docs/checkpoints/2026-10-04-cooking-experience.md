# APK-3 模块完成报告 — 烹饪体验与个人菜谱演进

2026-10-04；技术交付状态：`APK_3_COMPLETE`。实施及最终 Android 36 模拟器闭环通过，等待用户验收；不进入 APK-4。物理手机/OEM 未执行，不冒充真机证据。

## 1. 实际完成功能

在已有日常库和 APK-2 安全备份上增量增加可选单步查看/引导、明确完成、轻量做过记录、成品照片/评价/备注、当前做法调整、只读修改历史及首页最后做过时间。空/错误/重试/取消/删除确认/未保存返回均保留有效操作路径；没有新账号、云端或计时系统。

## 2. 数据模型 / Migration

Android SQLite **v4**，Preview Dexie **v7**；Repository 隔离二者。SQLite3→4 只新增 `cooking_records`、记录和修改历史的游标排序索引；旧 migration1–3、旧行和恢复元数据不改。Preview保留v6声明，v7增加 `nativeCookingRecords` 和历史索引。

做过记录包含 id/recipeId/cookedAt/finishedPhotoPath/evaluation/note；cookedAt 为精确 UTC 毫秒文本。FK级联、评价枚举和备注长度有约束及正式输入校验；UI不执行SQL。记录/修改历史每页20、时间+ID稳定游标，最近3条和计数在详情，首页批量计算真实最后做过时间，不改变原创建排序。

成功/失败增量迁移、原生FK/枚举/级联、空记录、旧全部字段/恢复事实/图片字节保留均有最终自动及实际Android证据。不靠重建库/清数据通过迁移。

## 3. Full Steps / Focus / Guided 行为

完整步骤始终为直接默认主路径，食材→耗时→准备→关键事项→步骤顺序不变。Focus只放大任意一步，Guided是可选顺序浏览；二者共享步骤、仅持有查看索引，没有持久会话或第二套烹饪状态机。打开/浏览/停留/退出不记录做过。真实Android返回恢复原位置和焦点；窄屏、大字体和≥44px按钮检查通过。

## 4. Cooking Record 行为

只有用户点“完成这道菜”才持久化最小记录，先记录再显示可选补充。无补充也能直接完成；操作UUID重试幂等，丢失确认不会重复创建或改首次cookedAt。照片、评价、备注独立可选；未保存退出有确认。补充失败保留最低记录和输入，提供重试/只保留记录。最小保存期间统一保护返回、编辑、历史和主导航，避免异步完成覆盖未保存编辑。

## 5. Recipe Change History

当前 Recipe 始终为认可的最新做法。正式before/after只包括可编辑字段，不保存卡片派生信息；实质无变化不写时间或历史。糖30g→15g原生闭环验证当前15g与只读旧30g；不提供回滚、版本编号/切换或版本树。

## 6. 图片引用策略

“设为封面”共享同一本地不可变Asset路径，不复制。引用闭包覆盖当前封面/步骤、历史before/after、成品照片、5秒Undo期软删除、导出pin。删除单记录或移除封面只清理经重新查询确认无引用的候选；删除菜谱到期才级联子记录并回收最后引用。查询/IO失败保留文件或显示清理警告，不误报数据事务回滚；草稿/替换旧图/未知孤立文件保守保留，不做全目录GC。

真实PNG选择器、取消、冷启动解码、共享路径、取消删除、仍被封面/历史引用时保留、Undo与最后引用到期删除均通过。原生startup facts增加烹饪照片（包括Undo期）以保护staging恢复核查。

## 7. Backup Format 升级及兼容

**写严格Format v2/schema4，读严格原v1/schema3与v2/schema4。** v1校验器、required changes、原manifest/data hash不改；仅有效v1的内部模型补空cookingRecords。v2备份包含七实体和全部当前/旧/成品图片；共享字节按SHA去重，数量/大小/hash回读验证。

APK-2的staging→确认替换→安全副本→七表及恢复事实单事务→提交事实核查原子协议不退化。插入故障回滚所有表，staging失败不先删旧图，丢失回应/进程中断按事实恢复，未知引用保守保留。v1 Replace经用户确认及完整v2安全副本后将记录置空；旧APK-2不能导入v2。

验收发现真实原生桥“先回复、后释放busy”竞态；2个原生测试RED→GREEN。修补3处worker先释放再回复，不在回复后的finally重置下一次请求锁；未改SQL/文件原子协议。

## 8. 最终测试

同一最终业务实现 `0c55e3d` 后重新执行：

- 全仓 **154文件/739项通过**；原生相关 **30文件/151项**为该总数子集，不重复加总。
- TypeScript通过；ESLint **0错误/5旧警告**。
- Vite Web build、Capacitor sync、Gradle Debug/测试APK通过；完整重跑239构建任务。
- JVM **5文件/30项**通过；Android lint **0错误/34警告**。
- 完整connected Android **14项、0失败/0错误/0跳过**。新增5项SQLite迁移/约束/引用、2项回调竞态，保留6项provider/backup和1项app-context。
- migration、v1→新版、v2 round-trip、共享图片/导出pin/失败回滚/Preview事务、游标同时间稳定排序、完成幂等和延迟导航均在最终测试中覆盖。

实际命令、原始输出和最终JSON见 `verification/cooking-experience-android.md`；未复用APK-2数字。已有chunk>500kB及旧lint警告记录，不通过禁用规则隐藏。

## 9. Android 验收结果

专用 `Recipio_Backup_36`、Android16/API36、x86_64；明确serial并核对alias，真实安装APK的WebView/SQLite/系统选择器。**21项闭环断言**通过（其中1项原v10基线，20项最终v11），全部最终v11报告匹配交付SHA：旧版覆盖增量升级、默认/Focus/Guided、明确轻量记录、共享照片、30g→15g历史、删除取消/Undo/到期、取消/坏包/SQL故障、v1真实恢复、v2导出→清除生成数据→恢复、照片SHA/解码、搜索、飞行模式两次冷启编辑/完成、320px大字/返回、同最终APK覆盖安装。

测试runner会卸载测试目标；仅专用AVD的生成数据受影响，已先外部备份，然后用原v10真实UI恢复原Golden并重做最终版升级和所有流程。没有清真实数据、动其他AVD或用浏览器替代原生验证。资源压力/SystemUI ANR如实留证；等待系统恢复后继续，无产品语义/超时放宽。测试环境关闭后保留AVD和测试数据。

实际APK无INTERNET/宽泛媒体权限；禁用自动备份及cloud/device-transfer规则未退化。真机和OEM迁移不宣称通过。

## 10. 交付路径 / 大小 / SHA-256

- APK：`E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-cooking-experience-v11-debug.apk`；**16,523,535字节**；SHA-256 `2dc868bb72b537798e17471e1a2621bc46cf4b9f2c15b9045f6590a3e02fb82d`。package `app.recipio.local`，versionCode11，name `0.4.0-cooking-experience`，min24/target36。Debug签名，不是商店发行版。
- 测试v2：`E:\CODEX\VIBE CODING\recipe-step-app\artifacts\cooking-experience\cooking-v2-1791107599943.recipio`；**3,154字节**；SHA-256 `efe5d4d014ac81031c985213dff3e778926e10e2817f96d54bde15f763013ded`。3道菜/4食材/5步骤/1准备/1关键事项/3修改/3做过记录/3图片；生成测试数据，无个人内容。
- 原v1 Golden：`E:\CODEX\VIBE CODING\recipe-step-app\artifacts\backup-restore\golden.recipio`；**2,761字节**；SHA-256 `6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313`，完全未重写。
- 审查包：`E:\CODEX\VIBE CODING\recipe-step-app\artifacts\cooking-experience\review-packet-apk-3-cooking-experience.zip`；最后提交后按9项白名单生成并回读校验。最终SHA/字节数在生成报告；不放APK、数据库、媒体、私人数据、导出或签名密钥。

## 11. Git / 修改文件

分支 **feat/recipio-cooking-experience**。批准计划 `fa6aa4bb2b87289982d3806448a644c119b5f5f5`，接受APK-2 `b541d8acfb2aec75dd139705030f3e647fc5a24a`。业务提交 `8137b6c`（数据/图片/v2）、`66af2a1`（可选查看/记录/历史）、`f220986`（保存期导航保护）、`0c55e3d`（原生备份回调顺序）；随后聚焦测试工具与实际交付文档提交。最终提交由冻结packet `manifest.headCommit`、本报告所在最终提交及最终交付回复准确给出，避免文档提交自身SHA的循环引用。

新增：`src/native/cooking-*`、`record-validation`、`media-lifecycle`、`step-viewer`、`recipe-step-content`、`recipe-change-history/summary`、正式history模型与测试；v2/compatibility/新backup测试；Android迁移fixture/两类instrumentation；两个验收/packet脚本和本报告。

修改：native Library/Detail/App/RecipeStore/PreviewStore/Media、backup service/repository/reference/archive/controls及相关测试；Dexie local-db和版本测试；Android LocalBackupArchive/Plugin及原测试；PROJECT/README/CURRENT_STATE/DECISIONS/ARCHITECTURE/ROADMAP/格式兼容文档。无删除生产模块、无依赖升级、无云表/数据改动。原v1文档只补后继格式链接，未修改冻结定义。

普通push本功能分支并验证远端=本地最终HEAD、工作区干净。未merge main、force push、PR、部署或APK-4。

## 12. 未验证项 / 已知限制

- **Not Run**：物理手机/OEM全流程、所有Android版本/所有图片MIME、硬件掉电、极端规模。模拟器原生证据不等同真机体验。
- 浏览器已有页面可离线操作，但本预览未加Service Worker，不能承诺浏览器断网冷启动；Android静态资源随APK安装，飞行模式冷启已验证。
- 草稿/替换/未知孤立文件保守保留；巨大图片受设备配额/解码/内存约束。备份未加密，私有安全副本不能防卸载/清数据。
- 5条既有Web lint警告、34条Android lint警告、现有bundle大小警告；未顺便升级历史依赖。没有未解决的本模块功能测试失败或安全恢复架构阻塞。

## 13. 下一模块

停止等待用户验收。若有问题先修APK-3；验收通过后再单独授权APK-4文字/图片AI录入，仍保留无登录、本地核心、不可信AI校验原则。本轮不规划或实现APK-4。
