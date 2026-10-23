# RECIPIO｜UI V2 G2 正式核心页面接入

执行模型：SOL

本轮任务：

**G2 — Production Core UI Integration**

用户已明确批准 G1 最终视觉方案。

不再重新规划设计，不再制作第四轮隔离样板，不再进行 A/B/C 风格选择。

请直接将已完成的 UI V2 组件和视觉语言接入 RECIPIO 正式 Android 应用的本地核心页面。

## 一、当前冻结基线

Repository：

`cc7279694-debug/menu`

稳定 main：

`649804a8209413f9d682f1079a4fd19ea84cd064`

UI V2 工作分支：

`feat/recipio-ui-v2-glass-minimal`

G1 最终提交：

`9a17b1c369f5567404540ac249379c3063d6284f`

当前 G1 验收：

`UI_V2_G1_VISUAL_ACCEPTED — PASS WITH NOTES`

视觉默认：

**Warm Ivory / Glass Minimal**

Pure Glass、Soft Sage 保留为候选主题，不在本轮新增持久化主题设置。

开始前检查：

- git status
- git worktree list
- git fetch origin --prune
- origin/main SHA
- feature HEAD SHA
- 当前工作区状态

必须确保当前分支仍是已验收的 G1 历史。

存在未知变更、分支漂移或冲突时停止核对。

不允许 reset、clean、stash 丢弃用户工作。

## 二、必须阅读既有资料

优先使用已经存在的：

`docs/ui-v2/RECIPIO_UI_V2_SPEC.md`

`docs/ui-v2/EXECUTION.md`

`docs/ui-v2/UI_V2_SCOPE_MAP.md`

`docs/ui-v2/FINAL_POLISH_VERIFICATION.md`

`docs/ui-v2/FINAL_POLISH_GALLERY.md`

以及：

`docs/PRODUCT_SPEC.md`

`docs/ARCHITECTURE.md`

`docs/CURRENT_STATE.md`

不要重复编写完整设计规格。

本轮严格以已经验收的 G1 视觉和上述产品边界为依据。

Skills 继续复用此前已安装的 HR Product Design System、Product UI/UX 和现有 React 测试能力。

无需重新下载大量 Skills。

## 三、技术架构不变

正式 RECIPIO 技术栈：

React + TypeScript + Vite + Tailwind/shadcn + Capacitor Android。

本轮禁止：

- Kotlin Compose 重写
- React Native / Flutter 迁移
- SQLite 迁移
- Backup 格式变更
- 修改 AI Provider
- 修改 Native KeyStore
- 修改 HTTP/SSRF
- 修改 Finder 来源验证
- 修改 Share Target 协议
- 改动 Recipe 业务模型

必须保持：

SQLite v4

Preview v7

Backup v2

现有 App 包名：

`app.recipio.local`

Logo 和 Launcher Icon 不变。

## 四、UI V2 接入方法

把已经通过 G1 的组件能力复用到正式页面。

包括：

- Design Tokens
- Glass Navigation
- Button
- Input
- Sheet
- Dialog
- Cards
- Typography
- Image presentation
- Empty/Error/Loading states

注意：

G1 Showcase 本身仍然是 DEV-only。

正式 App 不得引入：

- showcase demo-data
- 合成测试菜谱
- G1 生成的食物展示图片
- 预览专用路由
- 样板设置工具条

需要调整原有生产构建隔离测试：

正式 App 可以引用已批准的 V2 通用组件与 Token，但必须继续排除 showcase、测试 fixture 和演示素材。

## 五、Task 1：首页接入

主要现有文件：

`src/native/library-app.tsx`

以及对应 UI V2 组件。

保持最终 G1 首页布局：

- 谱序品牌
- 原始 Logo
- 本地搜索
- 添加菜谱
- 帮我找做法
- 最近加入
- 我的菜谱
- 底部三个导航目标

要求：

首页真实读取 RecipeLibrary。

不得继续使用模拟菜谱。

最近加入：

严格按创建时间倒序。

编辑菜谱不改变加入时间。

搜索：

只查本地菜名和食材。

搜索输入本身：

0 网络请求。

点击“帮我找做法”进入现有 Finder，但不得自动开始付费搜索。

新增入口继续提供：

- 手动录入
- 文字／截图 AI 整理
- 从网页链接导入
- 帮我找做法

以上入口必须继续可用。

本轮允许这些尚未进入 G3 的页面保留原界面，不能因核心页面换肤导致入口失效。

## 六、Task 2：我的菜谱

保留现有全部功能：

- 完整菜谱列表
- 本地搜索
- 全部耗时筛选
- 30 分钟内
- 30～60 分钟
- 超过 60 分钟
- 现有分页和加载逻辑

不要增加分类系统。

不要增加收藏。

不要自动加载全部数据库数据到内存后自己分页。

进入详情再返回：

必须恢复原搜索词、筛选状态、分页及合理的滚动位置。

## 七、Task 3：菜谱详情

主要文件：

`src/native/recipe-detail.tsx`

复用已经验收的 G1 Detail 排版。

显示真实：

- 封面图片
- 菜名
- 总耗时
- 份量
- 每份约热量
- 食材
- 提前准备
- 关键事项
- 完整步骤
- 备注
- 做菜记录和修改历史入口

严格保持内容顺序。

未知耗时不能随意推断。

热量只作为辅助信息。

无封面时：

不显示空白大图。

只填菜名的普通 Recipe：

必须能正常查看。

原步骤图片可以查看大图。

底部：

“编辑” + “开始烹饪”。

没有步骤时按既有产品规格提供“补充做法”，不得制造虚假步骤。

更多操作中的编辑、记录做过、历史和删除，全部调用现有真实业务能力。

删除继续保留 5 秒撤销。

## 八、Task 4：手动新建与编辑

主要文件：

`src/native/recipe-editor.tsx`

使用统一 V2 样式重构表单。

字段全部保留。

仅菜名必填。

食材、准备、事项、步骤、备注仍为可选。

必须保护：

- 未保存的文字
- 已选择的本地图片
- 图片选择取消
- 食材增删
- 步骤增删
- 步骤前后顺序
- 关键事项与步骤关联
- 保存失败
- 保存结果不确定
- Android Back / IME

返回时存在未保存修改：

必须继续保留放弃确认。

不能直接清空页面。

无实际变化的编辑：

不得新增修改历史。

禁止重新实现第二套表单数据模型。

## 九、Task 5：Focus 与 Guided

主要文件：

`src/native/step-viewer.tsx`

`src/native/recipe-step-content.tsx`

复用已经验收的深色烹饪页面。

保持：

- 真实菜名
- 当前步骤
- 步骤正文
- 当前步骤图片
- 对应关键事项
- 上一步／下一步
- 返回完整步骤
- 只读食材 Sheet

必须明确区分：

Focus：

查看指定步骤，不记录做菜完成。

Guided：

从第一步开始，用户自行前进或后退。

只有用户明确点击：

“完成这道菜”

才触发原有做菜记录能力。

浏览、返回、切换步骤均不得自动写做菜记录。

不增加计时器、步骤勾选、Wake Lock 或后台通知。

## 十、Task 6：完成记录与历史

主要文件：

`src/native/cooking-completion.tsx`

`src/native/cooking-history.tsx`

`src/native/recipe-change-history.tsx`

统一接入 V2 视觉。

继续使用原业务接口。

保留：

- 最小做菜记录
- 可选成品照片
- 好吃／一般／下次调整
- 可选备注
- 设成品照为封面
- 查看做菜记录
- 删除单条记录
- 查看只读修改历史

必须继续保护共享本地图片引用。

不能因为视觉改动重复写入做菜记录。

不能新增评分系统、积分或打卡功能。

修改历史只读，不增加版本树或回滚操作。

## 十一、导航及状态保护

这是本轮最重要的工程门槛之一。

UI V2 接入后必须保留：

- Android Back
- IME 首次返回只关闭键盘
- 返回详情原位置
- 未保存编辑确认
- 保存中禁止危险跳转
- 未知保存结果核查
- Backup Restore Busy Gate
- Android Share pending
- AI 请求期间的导航保护

尤其不能因为新的 Sheet / Dialog 更漂亮，就重新实现一套不兼容的弹层状态机。

优先复用原来的 Base UI、现有服务状态与所有权边界。

不要出现新的页面重复挂载导致请求重复发送。

## 十二、设计约束

Warm Ivory 作为本轮正式候选的默认视觉。

核心色彩：

- Canvas `#F6F4EF`
- Surface `#FBFAF7`
- Text `#1B1B1D`
- Action `#49684F`

三套主题继续共用布局。

只在导航、底部操作条和必要浮层使用轻玻璃。

不要对每个内容卡片加毛玻璃。

不要增加大面积渐变、发光阴影或多余装饰。

现有 G1 最终精修结果作为视觉基准，不得退回第二轮的大卡片、厚导航和过大通用步骤标题。

## 十三、测试先行

在修改正式页面前，先建立真实行为保护测试。

至少覆盖：

`localSearch_doesNotStartNetwork`

`recentlyAdded_preservesCreationOrder`

`recipeTitleOnly_remainsValidRecipe`

`detailBack_restoresQueryFilterAndScroll`

`stepNavigation_doesNotCreateCookingRecord`

`explicitCompletion_createsExactlyOneRecord`

`dirtyEditor_survivesDialogAndNavigationCancel`

`deleteUndo_preservesOriginalFiveSecondWindow`

同时覆盖：

- 真实数据而不是 DemoRecipe
- 无图
- 图片损坏
- 长菜名
- 长步骤
- 200% 字号
- 320px 小屏
- Sheet 焦点返回
- 输入法显示
- 保存失败
- 记录与历史
- Share pending 不被 UI 路由覆盖

测试必须针对生产页面与真实服务接口的 Fake/受控实现，而不是只验证 Showcase。

## 十四、视觉验证

使用受控生成测试菜谱，不读取或修改用户私人菜谱。

检查：

首页 → 菜谱详情 → Guided

首页 → 菜谱库 → 搜索 → 详情 → 返回

手动新建 → 编辑 → 保存

完成烹饪 → 做菜记录

修改菜谱 → 修改历史

每条路径必须有真实交互与状态反馈。

至少提供：

- 首页实际截图
- 我的菜谱实际截图
- 菜谱详情实际截图
- 新建／编辑实际截图
- Guided 实际截图
- 完成记录／历史实际截图

不需要重复生成大型视觉海报。

不需要重新制作 Demo 食物图片。

## 十五、Android 构建与验证

G2 需要形成一个可供体验的内部候选 APK。

先读取现有版本和签名链。

使用不冲突的递增 versionCode。

建议版本名：

`0.10.0-ui-v2-g2-rc1`

具体 versionCode 以实际仓库版本为准，不擅自覆盖旧候选。

必须保持包名和原 Debug 签名，支持覆盖安装。

至少执行：

- 本轮新增行为测试
- 相关 Native UI 回归
- 全仓 JavaScript/TypeScript 测试
- typecheck
- lint
- build:local
- sync:android
- :app:testDebugUnitTest
- :app:lintDebug
- :app:assembleDebug

如有可安全使用的 RECIPIO 专用模拟器，再进行定向安装与 UI Smoke。

真实 Android 测试不能用浏览器测试替代。

没有设备时标注：

NOT_RUN

本轮不强制重新完成 G4 所规划的全部真机与全链路验收。

不要触碰 Mirra、Vectra、砺石的模拟器或数据。

## 十六、G3 页面暂不改造

本轮不重做：

- AI 输入／审核页面
- 网页导入页面
- Finder 搜索结果页面
- Backup／Restore 设置页面
- Share Target 内部流程

但必须保证这些现有功能仍能从新的首页及路由进入，并能正常返回。

如果必须修改 G3 业务逻辑才能使 G2 工作：

停止并说明最小阻塞，不允许顺手扩张。

## 十七、Git

继续使用：

`feat/recipio-ui-v2-glass-minimal`

正常小提交和最终 push。

禁止：

- merge main
- force push
- tag
- deploy
- Play Store
- 视频开发
- G3/G4 自动实施

保持 G1 验收提交的历史。

G2 的完成不意味着整个 UI V2 已验收。

## 十八、交付和停止

完成后报告：

1. 正式接入的页面
2. 实际修改的文件
3. 与 G1 视觉基准的差异
4. 真实功能保护情况
5. 测试通过数量
6. 浏览器／模拟器／真机分别执行情况
7. APK 路径、大小、SHA-256、包名及版本
8. 关键页面实际截图
9. Git 分支和提交
10. 未解除的问题及 NOT_RUN
11. main 是否保持不变

如果核心页面已接入、必要自动化及构建通过，等待独立验收：

`UI_V2_G2_READY_FOR_REVIEW`

如果代码和构建完成，但 Android 定向验收受环境限制：

`UI_V2_G2_PENDING_ANDROID_TEST`

如果存在业务数据安全、导航所有权或架构阻塞：

`UI_V2_G2_BLOCKED`

完成后停止，等待 ChatGPT 独立验收。

**不得自动进入 G3。**
