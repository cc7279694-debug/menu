# RECIPIO G7 · 独立验收登记与冻结收口

登记日期：2026-10-27。

**RECIPIO_G7_ACCEPTED / FROZEN — PASS WITH NOTES**

独立验收负责人：ChatGPT。正式结论由用户通过
`RECIPIO_G7_ACCEPTANCE_REGISTRATION` 授权本次登记。
Codex 只核对既有证据并登记结论，不重新执行产品验收，不以内部代理核对代替 ChatGPT 独立验收。

## 固定验收依据

- 仓库：`cc7279694-debug/menu`。
- 功能分支：`feat/recipio-g7-reliable-intake`。
- G6 起点：`69e221567038e1e32668f882b31e57a589c483de`。
- G7 被测源码（产品、测试及工作流）：`e8c2f948544d8650919456bd2421b7a04ea218b4`。
- G7 已验收交付：`6f1df12806318d19ebe06d07068717d58a44d70b`。
- 最终云端验证：[40460260275 / attempt1](https://github.com/cc7279694-debug/menu/actions/runs/40460260275)，四个 Job SUCCESS，headSha 与固定被测源码一致。
- 登记前本地/最新远端 HEAD 均为上述交付提交，工作区干净，未发现已有同名验收文件。
- 被测源码至交付提交的差异仅在 `docs/`，包含文档及截图，无生产源码、测试、CI、依赖或数据契约变化。本轮在该交付上仅增加本记录并更新 CURRENT_STATE、ROADMAP。

[G7_REVIEW.md](G7_REVIEW.md) 和 [G7_TASK.md](G7_TASK.md) 是既有交付与执行证据。
原报告中的 READY_FOR_REVIEW 是独立验收前的历史状态；本记录登记其后续正式结论，
不改写原报告、失败、修复、截图来源或测试记录。

## 五个模块的限定验收结论

| 模块 | 已接受范围与结论 |
|---|---|
| G7-A：当前草稿的本地检查 | **PASS**。基于当前唯一编辑值计算数量、现有 Schema 错误及非阻断建议；不评分、不自动补值，不把可选字段变成必填，合法仅菜名仍可保存。 |
| G7-B：本轮来源对照 | **PASS WITH NOTES**。只读展示当前会话已有文字/受控临时截图、清洗网页正文或 Finder 已选候选信息；不重新抓取或扩大留存，查看来源不自动确认审核。 |
| G7-C：快速纠错与证据不串位 | **PASS**。原始 explicit/inferred/missing 与当前编辑状态分离；稳定行身份覆盖同名、增删重排和删除后新增，来源切换保留草稿，不建立第二个当前编辑 DTO。 |
| G7-D：同名提醒与保存保护 | **PASS**。同名查询失败拒绝继续保存，返回检查不写库；明确确认仅新建普通菜谱、不覆盖旧菜谱。既有 uncertain、creationId、幂等及过期回调保护保留。 |
| G7-E：三主题整合、集中验证、截图与交付 | **PASS WITH NOTES**。三主题、相关浏览器与 API36 定向门禁通过，真实截图和来源边界已记录；未执行项目不扩展为通过。 |

模块名称按任务正文 G7-A～D；G7-E 的整合交付范围对应任务书10.1的 E 项。
正文 B/C 与内部执行清单的 B/C 排序不同，本表沿用产品章节含义。

## 已验收测试证据

| 项目 | 固定结果 | 范围 |
|---|---|---|
| 完整 JS/TS | **1503 PASS / 221文件** | 0失败、0 pending；225/122定向子集均已包含，不重复相加 |
| JVM | **189 PASS** | 0失败/错误/跳过；JVM_ONLY，不替代设备运行 |
| Android API36 | **25 PASS** | 0失败/跳过；全新受控云端AVD：存储11、原IME8、G5 UI2、G6份量2、G7 Intake2 |
| G7 浏览器 | **29组 PASS** | 39项几何检查、16张实际截图；外部源/页面/console错误均0 |
| G6 厨房浏览器回归 | **33组 PASS** | 同一被测源码重新执行的既有厨房流程，非G6历史结果的重复使用 |
| TypeScript / Lint | **PASS** | 0错误，保留5项既有Lint警告 |
| Web构建及生产隔离 | **PASS** | Showcase和fixture资源未混入正式构建 |
| Capacitor sync / Android lint / Debug及AndroidTest构建 | **PASS** | 构建与云端定向运行分别记录，不等于真机或长期签名验收 |

这些数字来自固定交付及用户已确认的 ChatGPT 独立核实结果，不是本次登记重新运行所得。
本次只回读历史 CI 状态/源码身份并核对 Git 差异，不启动工作流或产品测试。

## NOTES（非阻断，全部继续保留）

1. **检查不等于识别质量提升。** Provider/HTTP 为 Fake，真实付费 AI 调用0；不宣称模型识别准确率提高。合法自由文本和可选缺失不升级为新的强制门禁，原始证据也不因手改变成已重新核实的 explicit。
2. **来源有明确边界。** Finder 只保留已选标题、站点、摘要，没有原文全文；已有网页正文截断提示保留。来源查看不等于来源核实，不自动勾选审核。临时截图不成为正式封面、步骤图、媒体引用或备份数据，不新增留存周期。
3. **外部能力与运行层分开。** 浏览器临时图片为受控 Native 格式 URI 到生成 blob 的适配；不能当成原生文件/像素证据。Android 使用生成私有临时图片和受控选择注入，不声称本轮执行真实 SAF；DOM complete/naturalWidth/naturalHeight 不替代像素呈现验收。
4. **截图状态如实保留。** 两张 source 命名原生诊断 PNG 只捕获到弹层合成前的底层编辑器，不能改称来源弹层或图片视觉通过。浏览器同名截图在点击“返回检查”之前；返回后的草稿保留和零创建另有流程断言，不改写为返回后截图。
5. **布局覆盖有限。** 三主题320/390/412px、CSS100%/200%、长文本、reduced-motion及现有实体玻璃属性回退通过；CSS200%不等于Android系统字号。极窄大字号及面板纵向滚动仍需观察；回退属性验证不等于所有OEM或不支持blur的WebView设备验收。
6. **原生范围有限。** 25项为明确选定的云端API36测试，不是全量历史connected测试。此前旧 intakeDraft_survivesImeBack 曾失败一次，未删除或修改该旧测试，最终25项全部通过；不能由单一API36推断所有IME/OEM稳定性。
7. **历史问题与警告保留。** 原始RED、真实Chromium/WebView返回键缺陷、最小UI修补及测试预期调整记录继续保存在未修改的G7_REVIEW.md/G7_TASK.md。保留5项既有Lint警告，不在本次登记中顺带修复。
8. **本地数据与保存权威不变。** RecipeEditor是唯一当前草稿所有者，行身份与原证据仅为瞬态UI元数据；已有Service/Repository继续管理确认、保存、恢复及清理。共享Sheet监听时序的已验收UI修补不被隐藏，也不扩展为修改Native IME或G6计算语义。

## NOT_RUN / 未扩大的验收边界

- 实体手机及OEM。
- TalkBack。
- Android系统字号。
- 实体设备性能。
- 飞行模式下的进程冷启动；Activity重建或浏览器重载不能替代。
- 原生临时图片像素级呈现。
- 全量历史connected测试中未实际执行的项目。
- 长期同签名升级。
- 真实个人数据迁移。

SQLite Schema **v4**、浏览器 Preview **v7**、Backup Format **v2** 和既有数据安全边界不变。
本结论仅覆盖G7可靠收录与快速校对V1，不是RECIPIO整体正式发布验收。

## 继承状态与本轮边界

- G7：本次正式登记 **ACCEPTED / FROZEN — PASS WITH NOTES**。
- G5、G6：继续保持既有 **ACCEPTED / FROZEN** 及全部NOTES。
- G4整体：继续 **PENDING**，不由G7限定冻结推导为整体冻结。
- R1长期签名与个人迁移：继续 **DEFERRED_BY_USER**。

本轮只新增本文件并更新 docs/CURRENT_STATE.md、docs/ROADMAP.md；原G7_REVIEW.md保持不变。
不修改生产源码、测试、CI、依赖或数据契约，不重跑完整产品测试，不构建或重复生成APK。
不安装、卸载或更新用户App，不操作个人菜谱、图片、数据库或备份，不恢复签名或迁移。
仅普通提交并推送原G7功能分支；不合main、不创建PR/Tag/Release，不启动G8。
完成登记后停止，等待ChatGPT规划并由用户授权下一阶段。
