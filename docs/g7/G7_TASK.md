# RECIPIO G7 · 可靠收录与快速校对 V1
# 产品交互定稿 + 数据边界 + Codex 连续实施任务书

任务状态：
TASK_AUTHORIZED — RECIPIO_G7_CONTINUOUS_IMPLEMENTATION

用户已认可 G7 方向，并授权 ChatGPT 完成范围定稿后交给 Codex 连续实施。
本任务书即本轮执行依据。

职责：
- ChatGPT：产品规划、技术路线、最终独立验收。
- Codex：授权范围内实现、修复、自测、云端验证、截图、报告、提交和功能分支推送。

执行方式：
G7-A～E 是同一个完整里程碑。
完成必要的起点核对和简短实施计划后，直接连续开发。
不要每完成一个内部模块就暂停等待用户确认。
不要把“计划已写好”当成本次任务完成。
普通可逆修复在本授权内自主完成。

本轮目标：
让用户更容易发现当前菜谱草稿中需要检查的内容，
在不丢失修改的情况下对照已有来源、快速纠错，
最后通过既有保存流程创建普通本地菜谱。

本轮不承诺提高 AI 模型识别准确率。
本轮不新增 AI 请求，不改变 Provider、Prompt、模型或来源校验规则。


==================================================
一、起点、冻结基线与权限
==================================================

1.1 仓库与基线

仓库：
cc7279694-debug/menu

G6 冻结分支：
feat/recipio-g6-serving-adjustment

G6 独立验收登记：
69e221567038e1e32668f882b31e57a589c483de

G6 交付提交：
e295dd20973ec9c20ad21738214b6d5a5981280a

G6 被测源码：
d8f2e3afcaffce886d4a08caec7ce99a97a4531d

G6 对应历史验证：
GitHub Actions Run 40440306979

建议新分支：
feat/recipio-g7-reliable-intake

以上是已核对的起点，不得用旧提交覆盖后续真实进展。

开始时只做一次最小核对：
- 仓库有效指令、当前 HEAD、远端状态、工作区和已有 worktree。
- G6 独立验收记录、CURRENT_STATE、ROADMAP。
- 是否已有 G7 分支或未完成的 G7 工作。
- 基线之后是否有产品源码、测试或 CI 变更。

若已有 G7 工作，识别其状态并承接，不重复创建或覆盖。
若存在未提交修改，不擅自 reset、clean、stash、删除或覆盖。
优先使用独立 G7 worktree，保护 G5/G6 和其他实验工作区。

历史测试数字只作历史证据。
不得把 G6 的 PASS 自动记作 G7 的结果。

1.2 不变契约

继续保持：
- Local-first。
- 现有 Capacitor/WebView Android 工程。
- Android SQLite Schema v4。
- 浏览器 Preview v7。
- Backup Format v2。
- 现有 RecipeDetails / RecipeLibrary / Repository 的持久化契约。
- 既有图片、历史记录、撤销、媒体引用和备份规则。
- 既有 AI 审核、Provider、密钥、网络及 SSRF 安全边界。
- Glass Minimal。
- Warm / Pure / Sage 三主题。
- 原始 Logo。
- G6 临时份量计算、共享状态和不写库语义。

不得新增数据库字段、表、迁移、持久草稿、
来源档案、来源索引、云账号、后台服务或外部依赖。

1.3 用户设备与发布保护

原版 v23、独立体验版 v25、真实菜谱、照片和个人备份保持原状。

禁止：
- 安装、卸载、清除或覆盖用户手机上的任何 App。
- 读取、导入、恢复或修改真实个人备份。
- 生成长期签名密钥、配置签名 Secrets、调用正式签名工作流。
- 合并 main、创建 PR、Tag、Release 或部署发布。
- 操作其他项目的进程、设备、模拟器、端口或工作区。
- 自动进入 G8。

允许：
- 使用明确归属本任务的合成数据。
- 使用新建、隔离的云端浏览器和 Android 测试环境。
- 必要的无长期密钥构建与临时 Debug 测试夹具。
- 普通提交和推送 G7 功能分支。

临时云端 APK 不作为用户安装候选，不宣称具备持续升级身份。

状态继续保留：
G4：PENDING。
R1：R1_SIGNING_MIGRATION_DEFERRED_BY_USER。
G5/G6：既有范围 ACCEPTED / FROZEN — PASS WITH NOTES。


==================================================
二、产品定稿：做什么，不做什么
==================================================

2.1 本轮覆盖的入口

A. 文字／截图 AI 整理后的预览。
B. 网页 Parser 读取后的预览。
C. 网页显式 AI 整理后的预览。
D. Finder 选定做法、整理后的预览。
E. 手动新建菜谱：复用本地填写检查，但不展示 AI 来源标签。

已有菜谱的普通编辑页不做整页重构。
共享 RecipeEditor 的修改必须保持原有调用方兼容。

2.2 默认交互

保留当前编辑和保存流程，不增加强制分步向导。

预览顶部按以下层次组织：

第一层：当前草稿摘要。
例如：
“食材 5 项 · 步骤 6 步 · 原始份量未填写”

第二层：检查提示。
优先呈现真正影响保存或下厨的信息。
默认最多展开 3 项，另有“查看全部检查提示”。
数量来自当前草稿和本轮真实审核信息，不是固定演示数字。

第三层：已有来源入口。
仅在当前会话确有可展示信息时提供。
打开轻量参考面板，不离开编辑页面。

第四层：现有菜谱编辑字段。

第五层：既有审核确认和明确保存按钮。

操作示例：
“原始份量未填写” → 定位份量字段 → 用户填写 3
→ “未填写”提示消失，摘要更新
→ 原来的来源证据不被篡改。

2.3 不引入的功能

本轮不做：
- AI 置信度、菜谱可靠度评分或完整度百分比。
- 自动补齐食材、用量、人数、步骤、时间或热量。
- 根据常识判断做法一定正确。
- 新模型、新 Prompt、自动重试或额外付费请求。
- 视频解析、平台专用抓取、登录网页或绕过验证码。
- 模糊菜谱相似度、批量去重、自动覆盖或合并。
- 购物清单、计时器、菜单计划、收藏、营养建议。
- 保存后的长期来源追溯或持久化校对记录。

“没有检测到问题”不能写成“菜谱已准确”“可以放心照做”。
允许的表述是：
“未发现本轮检查规则覆盖的问题，仍请按实际情况核对。”


==================================================
三、G7-A：当前草稿的本地检查
==================================================

3.1 实现方式

新增纯函数检查模块，建议：
src/native/intake-review/quality.ts
src/native/intake-review/quality.test.ts

输入必须包含“当前正在编辑的内容”，
不能只分析最初的 draft.recipe。

建议核心接口：
buildIntakeQualityReport(input): IntakeQualityReport

input 的职责：
- currentRecipe：编辑器当前值。
- originalRecipe：本轮初始结果；手动新建可为空。
- originalFieldChecks：现有 AI 审核结果；非 AI 入口为空。
- fieldBindings：原始字段与当前编辑字段的会话内对应关系。
- mode：手动、Parser 或 AI 预览。

输出的职责：
- 当前食材、步骤等客观数量。
- 既有 Schema 验证错误。
- 非阻断的补充提示。
- 需要对照来源的原审核信息。
- 稳定的提示 ID 和定位目标。

不得在纯函数中：
- 调用网络、Repository、数据库或文件系统。
- 修改传入对象。
- 自动补值或改变单位。
- 修改 originalFieldChecks。
- 创建做菜记录或修改历史。

3.2 提示分层

第一类：无法保存的错误。
只能来源于既有 Schema 和原有保存门禁。
例如菜名为空、字段超长、非法数值或无效步骤关联。
不能借质量检查新增强制填写要求。

第二类：建议补充的信息。
例如：
- 还没有食材。
- 还没有步骤。
- 已填写的食材缺少用量。
- 原始份量为空，暂时不能使用 G6 人份换算。

这些是建议，不阻止保存。
仍允许只记菜名。
允许“适量”“少许”“半勺”“1～2勺”等合法自由文本保存。

第三类：来源核对信息。
只根据现有 fieldChecks、warnings 和实际编辑状态展示。
没有证据时，不能编造“第 4 步有误”或“盐放得太多”。

热量、照片、备注等可选项缺失，不作为优先问题。
现有 AI 审核列表中的信息仍可查看，不擅自删除。

3.3 提示数量和排序

顺序：
既有验证错误 → 关键缺失 → 来源待核对。

同一当前字段的多个原因合并呈现，避免重复计数。
“当前字段未填写”和“原结果标为 missing”
不能被当成两个不同的待补充字段。

数组整体为空时，使用一个明确提示：
“还没有步骤”，定位“添加步骤”。
不要虚构不存在的某个步骤。

实时更新提示时：
- 不自动滚动页面。
- 不抢走正在输入的焦点。
- 不因列表重排让正在编辑的字段卸载。
- 不把已填写误写成已核实。

3.4 范例验收

只有菜名：
显示可补充提示，仍允许按原流程保存。

食材“盐”，用量“适量”：
不视为缺失，不强行转换成数字。

servings 为空：
提示填写原始份量；用户填写 3 后该缺失提示消失。

已有 4 个步骤：
不得仅凭步骤数量、文字长短就判断不完整。

当前值违反原 Schema：
沿用既有失败关闭规则，不允许绕过保存。


==================================================
四、G7-B：本轮来源对照
==================================================

4.1 基本原则

只展示本轮服务当前已经合法持有的信息。
不为了展示来源重新联网、重新识别或延长来源保留周期。

来源查看与来源核实是两回事。
打开来源不代表来源已验证，不自动勾选审核确认。

新增建议：
src/native/intake-review/source-context.ts
src/native/intake-review/source-panel.tsx

组件只消费只读展示上下文。
清理、取消、释放和会话有效性仍由现有服务负责。

4.2 各入口的具体范围

文字／截图 AI：
- 可显示当前会话已有的输入文字。
- 可显示当前会话已有的临时截图。
- 截图沿用现有受控 URI 和预览方法。
- 说明它是“本轮提供的截图”，不承诺是未经处理的原始大图。
- 不复制到正式媒体目录，不作为封面或步骤图。
- 不新增 OCR，不获取额外图片权限。

网页 Parser：
- 可显示现有 visible.text 清洗后的网页文字。
- 保留 wasTruncated 等真实截断说明。
- 可展示当前选中 Parser 候选的已有信息。
- 不把清洗正文称为完整原网页。
- 不显示原始 HTML，不执行网页脚本。
- 不加载远程图片或嵌入网页。

网页 AI：
- 可展示原网页会话仍持有的清洗文字。
- 明确“网页文字”和“AI 整理结果”不是同一份内容。
- 不把为了请求而拼接的结构化提示伪装成原文。

Finder：
- 只展示当前 selected 候选已有的标题、来源站点和已有摘要。
- 标注“本轮选定来源信息，非完整正文”。
- 若没有正文，明确说明“本轮未保留来源正文”。
- 现有 sourceText 一次使用后不保留的规则不变。
- 禁止把 sourceText 新增进服务状态、缓存、日志或数据库。
- 禁止重新抓取来源页面来补齐对照视图。
- 候选摘要不是原文逐字引述，不伪装成原文证据。

手动新建：
- 不展示不存在的外部来源。
- 不虚构“来源明确”或 AI 审核状态。

4.3 展示与生命周期

使用现有 NativeV2Sheet 或既有等价组件。
不要建立第二套导航、焦点陷阱或 Android 返回状态机。

打开、关闭来源面板必须：
- 保留已修改字段和输入值。
- 保留当前审核状态。
- 不触发重新整理、保存或来源读取。
- 关闭后恢复合理的原焦点和滚动位置。

来源文字、站点、标题、摘要均按不可信纯文本渲染。
不使用 dangerouslySetInnerHTML。
不自动将其中的 URL 转成会触发加载的资源。

会话切换、重新整理、取消释放、成功保存、
服务失效或恢复操作使旧会话失效后：
- 面板关闭或显示明确的来源不可用状态。
- 不继续显示上一轮来源。
- 不让迟到回调重新挂回旧内容。
- 不把新结果绑定到上一轮截图或文本。

来源面板中的图片放大尽量在同一面板内完成，
避免无必要的多层弹窗。


==================================================
五、G7-C：快速纠错与证据不串位
==================================================

5.1 当前草稿只能有一个所有者

复用现有 RecipeEditor。
不要另做一份“校对编辑器”和一份“正式编辑器”。

可以为 RecipeEditor 增加可选的：
- 当前编辑值的只读渲染接口。
- 检查区域插槽。
- 字段定位能力。
- 会话内字段身份信息。
- 实际用户修改事件回调。

接口默认关闭或保持原行为，避免影响无关页面。

检查摘要、提示列表和最终保存必须读取同一份编辑状态。
不能出现：
页面显示已填写，保存却提交旧值；
检查提示消失，但底层仍为空；
切换面板后用 initial 覆盖用户修改。

5.2 两类状态必须分开

第一类：原结果的来源证据。
沿用原来的 explicit / inferred / missing。
语义及安全判定不变。

第二类：当前字段的编辑状态。
可以显示：
“未修改”
“已填写”
“已编辑”
“本轮新增”
“原条目已移除”

两者不能互相替代。

例如：
原结果为 inferred，用户修改 20 毫升为 15 毫升：
显示“已编辑；原结果为 AI 推断”。
不能自动变成 explicit。

原结果为 missing，用户填写 3 人份：
当前缺失提示可以消失；
原结果的 missing 证据保留在原审核信息中。
不能称为“来源已证实”。

原结果为 explicit，用户改成另一内容：
不能继续让用户误以为新值已被来源证明。
应明确“原结果来源明确；当前值已人工修改，未重新核对来源”。

这些状态只存在本轮内存中，不写入菜谱字段或备注。

5.3 数组增删与重排

这是本轮重点验收项。

现有审核 path 可能使用：
ingredients[0].amount
steps[1].instruction

新增、删除、重排后，不能把原下标机械地套到新条目。

建立会话内稳定的 UI 行身份和字段定位映射：
- 原始行绑定稳定 rowKey。
- 重排保留 rowKey。
- 新增行得到新的 rowKey。
- 删除行后，旧审核信息不转移给替代该位置的新行。
- 原始 path 和当前路径分别维护。
- rowKey 和映射不进入 RecipeDetails、SQLite、Backup 或历史。

点击提示必须定位到正确的当前字段。
原条目已删除时，不再提供错误的定位按钮；
可保留“原条目已移除”的说明。

不能通过修改原审核 path、原状态或原稿来伪造对应关系。
步骤重排时，保留现有 keyTips 步骤关联的正确更新规则。

若无法安全映射某个来源字段：
显示无法定位的真实限制，不猜测定位目标。
不得因无法定位而移除现有审核确认要求。

5.4 原有审核门禁

继续使用现有 requiresAiReview、confirmed 和服务端口门禁。
不创建第二份独立的“已审核”权威状态。

本轮 UI 规则：
- 原本需要确认的 AI 草稿，仍须用户明确确认。
- 确认后又实际修改菜谱内容，应取消该次确认，提示重新检查。
- 仅打开来源、滚动、聚焦或展开提示，不取消确认。
- 新结果、新会话不继承上一轮确认。
- Parser 和手动录入不被伪装成 AI 审核。
- 不因为本地提示清零就自动调用 setConfirmed(true)。

不要求用户逐项打卡，不增加必须填写完全部内容的流程。
原本不需要 AI 确认的草稿，不因新增面板擅自改变底层审核规则。

5.5 返回与键盘

复用既有 Android IME 及页面 Back 所有权。

新来源面板必须满足：
- 键盘打开时，首次系统 Back 只关闭键盘。
- 键盘关闭后，Back 优先关闭最上层来源面板。
- 不同时触发编辑器放弃草稿或退出页面。
- 面板关闭后，后续 Back 才进入原有离开／脏数据保护流程。

检查 RecipeEditor 与现有 NativeV2Sheet 的事件配合。
如需要修正对已消费 Back 事件的处理，只做最小兼容补丁，
补充回归证据，不重建原生键盘逻辑。


==================================================
六、G7-D：同名提醒与保存保护
==================================================

6.1 同名处理范围

复用既有 hasExactTitle 和同名确认逻辑。
使用当前编辑后的最终标题，保持已有 trim 和匹配语义。

不新增：
- 模糊相似度算法。
- 模型判重。
- 自动覆盖、自动合并。
- 全库逐条详情扫描。
- 新 SQL 接口、搜索索引或数据库字段。

现有导入入口的同名保护必须保持一致。
已有菜谱编辑不能被误判成“新建重复菜谱”。
不借本轮改变无关入口的既有保存规则。

6.2 用户看到的结果

发现同名：
明确说明“继续将新建另一条，不覆盖或合并原菜谱”。

选择“返回检查”：
不写库，不清空草稿，不显示保存成功。

选择“仍然新建菜谱”：
只调用当前入口既有的保存流程一次。

查询失败：
不能当作没有重复。
保持失败关闭，允许用户明确重试，保留当前输入。

不要在每次输入菜名时进行同名查询。
优先在原有明确保存环节执行，避免不必要的查询和竞态。

6.3 保存与异常

保留现有：
- 忙碌互斥。
- 明确保存。
- 创建 ID / generation / 当前会话检查。
- 幂等和保存结果不确定时的恢复路径。
- 取消、重试和迟到结果保护。

保存结果 uncertain 时：
不得绕道手动创建、重新分配 ID 或自动再次新建。
只能沿现有“核对保存结果”流程处理。

失败、返回检查或打开来源面板不能丢失编辑内容。
异步同名查询或保存回调不能作用于另一轮草稿。

新增 UI 不改变：
- 来源信息不进入正式菜谱和 Backup。
- AI 临时截图不转为永久图片。
- 保存后仍是普通本地 Recipe。
- 不自动生成做菜记录。

保存成功继续使用既有跳转。
进入详情后，G6 以实际保存的原始份数初始化，
不能带入审核面板的其他临时状态。


==================================================
七、数据边界与最小修改范围
==================================================

7.1 允许的新内存信息

仅为本轮 UI 使用：
- 本地检查结果。
- 稳定行身份和定位映射。
- 当前字段已编辑等展示状态。
- 来源面板开关、当前图片索引及焦点信息。
- 对既有来源的只读展示引用。

这些内容不得进入：
SQLite、IndexedDB、localStorage、sessionStorage、
文件、Backup、修改历史、菜谱备注、日志或分析埋点。

不得延长既有临时文件和来源内容的生命周期。
界面只读不代表可以绕过服务所有者。

7.2 建议代码位置

新增建议：
src/native/intake-review/quality.ts
src/native/intake-review/field-bindings.ts
src/native/intake-review/review-panel.tsx
src/native/intake-review/source-context.ts
src/native/intake-review/source-panel.tsx
相应纯函数和组件／集成测试。
src/native/ui-v2/g7-intake.css

必要时最小修改：
src/native/recipe-editor.tsx
src/native/ai/preview.tsx
src/native/ai/review-panel.tsx
src/native/ai/intake-screen.tsx
src/native/link-import/screen.tsx
src/native/find-recipe/screen.tsx
src/native/library-app.tsx
src/native/main.tsx

实际文件拆分可以按项目既有风格调整，
但不要把整个模块堆进 LibraryApp 或 RecipeEditor。

优先通过已有服务 snapshot 和 UI 参数接入，
不要为来源展示重写 AiIntakeService、
LinkImportService 或 FindRecipeService。

7.3 禁止顺带修改

不更改：
- recipe-model 的持久化 Schema。
- recipe-store、preview-store 的存储语义。
- Backup 和 media-lifecycle。
- AI JSON 合约、normalizer 的来源判定规则。
- Provider、Prompt、请求模型、Native 密钥桥。
- 网络来源白名单和图片 URI 安全校验。
- 生产 Manifest、权限、签名流程。
- 依赖和锁文件，除非确有独立明确授权。
- G6 计算算法和临时份量生命周期。

若实现发现确实必须触及上述冻结边界：
暂停该受影响路径，说明原因和最小需求；
继续不受影响的已授权工作。
不能为了让页面完整而放宽安全规则。


==================================================
八、视觉与可用性
==================================================

保留 Glass Minimal 和三主题。
本轮不是新的 UI 改版。

要求：
- 检查摘要简短，优先提示不淹没编辑表单。
- 已有来源信息和 AI 推断清楚区分。
- 不仅依靠颜色表达错误、提醒和编辑状态。
- 中文长文本、Emoji、长字段名和长来源摘要可换行。
- 320 / 390 / 412px 下无新增横向溢出。
- 浏览器 200% 字号下主要按钮和面板关闭入口可达。
- 检查提示和来源面板不能挡住保存主操作。
- 继承既有触控尺寸、focus 样式和 reduced-motion。
- 通过已有纯色回退样式，不新增主题。
- 不用新的装饰性图表、评分环或虚假进度表示可靠程度。

来源信息很多时可以滚动或分组，
不能为了减少高度静默截断重要内容。
已经由服务截断的正文必须保留截断提示。


==================================================
九、验收用例：必须覆盖
==================================================

将以下场景转成自动化测试和必要的真实页面／原生验证。
测试名称与报告应能对应场景，不预设最终测试数量。

T01 最小菜谱
只有合法菜名，允许保存。
本地缺失建议不升级为新的强制门禁。

T02 当前草稿更新
补充份数、食材用量、步骤后，当前提示和计数正确更新。
不是只检查 initial 或原始 AI draft。

T03 自由文本不误判
适量、少许、半勺、范围等合法原文不被判为必须数字化。
不自动补值，不改 G6 解析规则。

T04 原证据不被编辑洗白
inferred/missing 字段经用户编辑后不自动成为 explicit。
原 explicit 字段修改后不继续冒称新值已证实。

T05 数组重排和删除
食材、步骤及关联字段增删／重排后：
提示指向正确条目，旧证据不串位，
步骤关联提示仍符合现有规则。

T06 编辑与来源切换
修改多个字段后反复打开、关闭来源面板，
编辑值、脏数据状态、合理焦点和滚动位置保持。
不重新请求，不保存，不重置表单。

T07 来源能力分层
文字、截图、Parser、网页 AI、Finder 分别展示真实可用信息。
Finder 无全文时明确说明，不新增抓取或正文留存。
手动新建不显示伪造来源。

T08 来源失效与迟到结果
切换候选、新结果、取消、保存完成或会话失效后，
旧来源不能显示到新草稿，旧回调不能回写。

T09 审核确认
需审核草稿未确认不能保存。
确认后实际修改使确认失效。
仅查看来源不使确认失效。
新会话不继承确认，本地提示清零不自动确认。

T10 同名提醒
查询使用最终标题。
返回检查零创建、草稿保留。
确认新建只新增一条、原菜谱不变。
查询错误不当成无重复。

T11 保存失败和 uncertain
确定失败保留草稿。
不确定结果沿原 ID 恢复。
重复点击不重复创建。
不能通过新面板绕过忙碌、恢复或审核门禁。

T12 数据不泄漏
保存前新增 G7 查看／编辑操作不写业务库。
保存后的普通 Recipe 及合成备份数据中，
没有来源正文、临时 URI、rowKey、提示列表、审核 UI 状态或 Provider 元数据。
不把这些信息塞进 notes。

T13 Android IME / Back
真实云端 Android 中验证：
键盘优先关闭 → 来源面板关闭 → 原有离开保护。
不得一次 Back 同时关闭面板并丢失草稿。

T14 G5/G6 回归
收录后可正常进入本地详情和厨房。
G6 份量调整仍只读，原始份数语义不变。
浏览、校对、来源查看和份量调整均不生成做菜记录。

T15 长内容与边界
覆盖项目允许的长文字、多食材、多步骤、长 warnings、
重复显示名称、无效定位 path 和来源读取失败。
不崩溃、不串位、不因折叠隐藏审核门禁。

T16 视觉与隔离
三主题、深浅色面板、窄屏、CSS 200%、纯色回退、
reduced-motion 和正式构建隔离通过实际检查。

注意：
新增功能的“零写入”观察区间应与测试夹具准备、
既有选图缓存、既有明确保存操作区分。
不能把必要的夹具创建当成产品写入缺陷，
也不能利用夹具准备掩盖 G7 引入的额外写入。


==================================================
十、连续实施顺序与工程验证
==================================================

10.1 内部实施顺序

先读取必要代码，记录一份简短计划，
随后直接执行：

A. 当前草稿检查纯函数及字面预期测试。
B. 编辑器会话字段映射与动态提示。
C. 来源只读展示及面板切换。
D. 纠错、确认、同名和保存异常联动。
E. 三主题整合、集中验证、截图与交付。

每个内部任务：
先加入有意义的失败测试，
确认失败是缺少行为而非环境或导入错误，
实现最小变更，使测试通过。
普通问题直接修复，不逐项请求用户审批。

10.2 最终源码门禁

围绕最终固定源码执行：
- 新增 G7 纯函数、组件和实际应用集成测试。
- 受影响的 G5/G6、AI Preview、Parser、Finder 和 Back 测试。
- 当前完整 JS/TS 测试。
- TypeScript。
- ESLint。
- 本地生产 WebView 构建。
- 既有生产隔离检查。
- Capacitor sync。
- Android JVM、Lint、Debug 和 AndroidTest 构建。
- 与新交互有关的云端 Android 定向运行。
- 实际浏览器页面检查与截图。

沿用项目现有命令。
相关已知命令包括：
npm run typecheck
npm run lint
npm test -- --pool=threads --maxWorkers=1 --no-file-parallelism
npm run build:local
node scripts/verify-ui-v2-isolation.mjs
npm run sync:android

Android 命令和环境以当前工程及已有云端工作流为准，
不要盲目复制过期版本参数。

可以新增 G7 专属非签名验证工作流。
不修改冻结的签名工作流或依赖它运行 G7。

10.3 Android 验证范围

本轮共享编辑器、审核面板和 Back 受到影响，
需选择真正覆盖新增风险的原生用例。

至少包括：
- 在预览中编辑，真实 IME 打开后按 Back。
- 来源面板关闭不导致草稿丢失或双重退出。
- 当前会话临时截图通过既有受控路径查看。
- 确认、同名返回检查和明确保存的关键路径。
- 保存后普通本地数据仍可正常读取。

图片仅使用生成的非私人夹具。
不放宽 URI 校验来适配测试包名。
仅在全新空云端 AVD 内使用既有允许的测试身份。

无需重跑全部历史 connected 类。
但受本轮修改直接影响的门禁不能用历史 PASS 代替。

10.4 真实 AI 与网络

自动化外部能力继续使用 Fake Provider / Fake HTTP。
真实 AI 调用必须为 0。

正式生产入口不得包含 Fake、测试来源或 Showcase。
必须保留构建隔离检查。

“没有真实 AI 调用”不妨碍验证 UI 和保存保护，
但最终不得宣称本轮证明了真实模型识别质量提高。

浏览器的额外外部请求应被记录并拒绝。
构建工具安装和云端依赖下载不等于产品联网，
在证据中区分，不混用统计。

10.5 资源与证据真实性

重型浏览器、Gradle、模拟器优先云端运行。
本地资源不足时不强行启动、不误杀其他进程。
继承已有设备归属和资源门禁。

不能通过：
删断言、跳过失败、延长到失去约束的超时、
更换弱测试替身或放宽安全校验制造 PASS。

浏览器 CSS 200% 不等于 Android 系统字号。
浏览器键盘事件不等于真实 IME/Back。
Activity 重开不等于进程冷启动。
Fake 输出不等于真实 AI 正确性。
静态截图不等于完整动态交互验证。

未执行如实写 NOT_RUN。
资源中断与产品断言失败分别记录。


==================================================
十一、交付和文档
==================================================

建议只建立以下必要文档：
docs/g7/G7_TASK.md
docs/g7/G7_REVIEW.md

前者记录本任务书与内部实施安排。
后者记录最终结果、测试、截图索引、失败修复和限制。
需要 checkpoint 时追加简短执行记录，不堆积重复报告。

最终更新：
docs/CURRENT_STATE.md
docs/ROADMAP.md

G7 只能登记为送审或待补验证状态，
不得自行写 ACCEPTED / FROZEN。
G5/G6 的历史结论与 NOTES 保留。
G4 PENDING、R1 DEFERRED_BY_USER 不变。

交付必须包含：

1. 实际实现范围
说明相对 G5/G6 新增了什么，而不是重复罗列旧功能。

2. 关键实现与数据边界
说明当前草稿所有权、原证据与编辑状态分离、
数组身份映射、来源可用性和保存保护。

3. 少量真实截图
至少覆盖：
- 当前草稿摘要和优先检查提示。
- 补充／修改后提示更新。
- 文字／截图来源对照。
- Finder 无全文时的真实限制。
- 同名返回检查。
- 代表性三主题及窄屏大字号场景。

截图来自实际应用和合成数据，
标明源码 SHA、主题、视口和外部能力是否 Fake。
不使用设计效果图冒充实现截图。

4. 测试与运行
最终产品／测试／工作流 SHA。
CI Run ID 和对应源码。
实际数量、失败、跳过和 NOT_RUN。
定向子集不要与全量重复相加。

5. 差异与保护检查
相对 G6 冻结基线的文件清单。
Schema、Preview、Backup、Provider、媒体、依赖、
原生生产代码、签名、Logo 等冻结路径的差异核查。
如存在例外，不隐藏，明确列出原因与授权依据。

6. Git 状态
分支、交付提交、远端一致性和工作区状态。
只普通推送 G7 功能分支。
不强推、不合 main、不建发布。

不生成：
大型 ZIP、整仓快照、大型 Manifest、
重复历史 APK、私人媒体包或来源正文日志。

若最终 CI 后只修改文档和截图，核对并写明。
若又修改源码、测试或工作流，重新验证受影响门禁。


==================================================
十二、完成条件与停止点
==================================================

本轮成功不是“页面出现了检查提示”。
必须证明：

- 提示对应当前真实草稿。
- 可选内容没有被变成强制填写。
- 原证据不被人工编辑洗白。
- 增删重排后提示和来源不串位。
- 来源展示没有扩大访问和留存权限。
- 切换来源面板不丢修改。
- 审核、同名和保存恢复没有被绕过。
- 未明确保存前不产生新的正式菜谱。
- G5/G6 和存储契约没有确认回归。
- 关键交互有真实运行和截图证据。

核心实施和必需门禁完成后报告：
RECIPIO_G7_READY_FOR_REVIEW

实现完成但必需验证尚缺时报告：
RECIPIO_G7_PENDING_VERIFICATION
同时列明已完成内容与具体缺口，不写“全部完成”。

发生数据安全、授权范围或无法继续的确定阻断时报告：
RECIPIO_G7_BLOCKED
只停止受影响操作，保留已安全完成的成果。

Codex 不宣布独立验收通过。
最终由 ChatGPT 集中审查后决定是否冻结。

现在直接开始：
最小基线核对 → 连续实施 G7-A～E →
集中验证与修复 → 截图和报告 →
提交并推送 G7 分支 → 停在最终独立审查点。

不得自动进入 G8、恢复 R1、安装用户 APK或合并 main。
==================================================
Codex implementation plan / execution ledger — 2026-10-27
==================================================

For agentic workers: execute this approved task continuously with TDD;
independent pure/source tests may be delegated under the interfaces below.
One final whole-branch internal review; ChatGPT retains independent acceptance.

Goal: current-draft checks and read-only session sources with safe correction.
Architecture: RecipeEditor remains sole owner of current value plus transient
row bindings. Read-only renderIntake context projects current checks; original
checks remain immutable. Existing services/Repository keep save/session authority.
Tech: existing React/TypeScript/Vite/Capacitor; no dependencies or persistence.

Verified start: local/remote G6=69e221567038e1e32668f882b31e57a589c483de,
clean; no G7 branch/worktree existed. Parent delivery e295dd2 changes docs only
since tested d8f2e3a. G5/G6 acceptance inherited, G4 pending/R1 deferred.
Native worktree creation returned Not a git repository from projectless chat;
explicit Git fallback created E:/CODEX/VIBE CODING/recipe-step-app-g7 on
feat/recipio-g7-reliable-intake. G6/G5/video worktrees remain untouched.
Free RAM3.88GiB: no local npm/browser/Gradle/adb/emulator. Cloud-only heavy QA.

[x] A. field-bindings.ts + quality.ts literal tests/STUB -> observed cloud RED
    -> pure implementation. Stable originalRows/currentRows row keys; explicit
    located/removed/unlocatable/unknown mapping. Schema-only canSave/errors,
    current missing advice and original immutable evidence kept separate.
[x] B/C. Real AiPreview/Editor tests -> observed RED -> shared editor hooks,
    current report/3 priority hints, stable React row keys and correct locate.
    SourcePanel uses existing NativeV2Sheet and source-context snapshot factories.
[x] D. Confirm reset only for actual edits; same-name query and confirmation
    recheck mounted/current-draft identity after each await. Existing uncertain
    recovery/creation IDs and service gates unchanged. Manual-new advice opt-in;
    ordinary edit remains compatible. No source data in DTO/notes/Backup.
[x] E. G7 cloud browser/native QA, three themes/320-412/CSS200/solid/motion;
    affected G5/G6/Preview/Parser/Finder/Back plus full JS/type/lint/build/isolation,
    sync/JVM/lint/Debug/AndroidTest and real API36 IME/source/confirm/save tests.
[x] Final read-only whole-branch review, representative actual screenshots,
    G7_REVIEW/CURRENT_STATE/ROADMAP, normal G7 commit/push, clean remote equality.

Interface rulings:
- Editor optional renderIntake(ctx) receives currentRecipe, fieldBindings,
  locate(currentPath). onActualChange runs in actual event handling, never as
  a side effect inside a React state updater. Value+bindings update together.
- Array identity never matches by content/name. Original paths stay original;
  new/current paths are resolved via keys. Existing step-tip reindexing remains.
- buildIntakeQualityReport/currentFieldId/resolveOriginalField are pure;
  3 hint classes merge by current field ID. Original evidence remains visible
  including edited explicit, filled missing, removed or unlocatable fields.
- Source-context factories expose existing snapshot references only: AI input
  text/images; web visible text+truncation (never buildAiText); Finder selected
  title/site/summary (never retain one-shot sourceText). No raw HTML/resources.
- AiPreview sourceContext/isCurrent are optional compatible props. Production
  callers pass real snapshot/draft identity validity; SourcePanel never owns
  cleanup or extends cache lifetime. No second editor/confirm/Back state machine.
- Minimal Back compatibility patch: editor respects defaultPrevented after
  NativeV2Sheet consumes the event. Keep existing native IME handling unchanged.

Review focus: duplicate row names, delete-then-replace, edited explicit sources,
stale same-name completion after session change, immutable source release,
uncertain save recovery, keyboard/Sheet/dirty Back precedence, no hidden writes.

Evidence: final counts and source SHA come only from actual fresh runs.
No real AI, physical phone, personal backups, signing/main/PR/tag/release/G8.

### Test-first evidence and current integration ruling — 2026-10-27

Initial source fd1a602bc5335c72b1094f89872559dfd23906fb, cloud run
40447931345/job122003537570: existing7files/217tests PASS; new G7
5files/113tests:103 RED and10PASS. Actual failures were explicit implementation
stubs, missing current-review/source UI and unguarded stale saving; no missing-import
or test-loader failure. This is RED evidence, not final verification.

Existing AiIntakeService.save replaces draft.recipe with the attempted edited DTO,
but preserves the review object. A UI-only editing session therefore borrows the
initial recipe and remembers transient row bindings across the existing uncertain
screen. It owns no second current editable DTO and changes no service/save identity.
The actual current draft remains exclusively in RecipeEditor. Parser uses the
same metadata rule, cleared on leaving its preview; all metadata is cleared with
the corresponding UI session and never enters persistence. Current checks show
three issues initially; complete original evidence is an explicit expansion,
without changing confirmation. Existing audit tests retain assertions and now
perform that deliberate expansion.
### Specific Back regression RED — 2026-10-27

Source9082441c9563c5303a6345eaed36575b3caf0ffd/run40451105345:
existing217PASS and G7 115PASS; only the2new duplicate Back cases RED.
Both failures were the still-visible same-name Dialog after cancelable page Back,
not a loader/mock error. Child editor's bubbling listener consumed the event while
its save lock awaited the decision. Move only both duplicate listeners to capture,
along the existing Sheet routing, retaining defaultPrevented. No IME state machine,
delay/debounce, global Back disable or business save rule change.
### Real renderer Back ownership evidence and minimal fix — 2026-10-27

ff0c533/run40454243810 native platform probes showed a settled hidden IME,
focused window/WebView and focused Source button. One system Back reached the
page (0→1), but Source stayed open. The real Chromium browser also reproduced
Source staying open after a page Back. This is a UI failure, not an IME/network
excuse. LibraryApp already documents Chromium window-target registration order
and explicitly defers to the current Sheet; Editor had lacked that deferral.

817905c/run40458519166:225 prior tests PASS,122 G7 targeted tests with120PASS
and exactly2RED: later-modal ownership and reopen-commit registration. Optional
missing evidence tests are now GREEN without changing the original audit/gate.
Fix only UI routing: Editor defers to a live nonhidden/noninert data-open modal;
Editor/NativeV2Sheet register/clean up during layout. Closed/hidden modal markup
does not disable page Back. No second keyboard state, delay or Native change.

Earlier1498 whole-suite/sourcef2de75e was PASS with5existing lint warnings,
and189 JVM/build plus G6 browser33 PASS. These are intermediate evidence only,
not final numbers. ff0c533 also exposed an old intakeDraft_survivesImeBack
failure (0 expected/1 page Back); it remains unmodified and must pass fresh final
native execution. No failure is removed, skipped or counted as final PASS.

### Final execution checkpoint — 2026-10-27

Source e8c2f948544d8650919456bd2421b7a04ea218b4/run40460260275 completed
all4jobs:1503JS/TS,189JVM,25Native, G7 browser29 and G6 browser33 PASS.
0failures/0skips; earlier old IME test passes unmodified in the final25.
Final documentation and9selected synthetic screenshots are delivery-only changes.
Exact commands, provenance, resolved failures and NOT_RUN: G7_REVIEW.md.
Status is RECIPIO_G7_READY_FOR_REVIEW; ChatGPT independent acceptance pending.
No G8/main/release/signing/user-device action is authorized by this checkpoint.
