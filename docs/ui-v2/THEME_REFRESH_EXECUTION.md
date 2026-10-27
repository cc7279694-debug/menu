# RECIPIO｜UI V2 G1 第二轮设计修订
## 三套主题色板 + 增强玻璃材质 + 视觉精修

执行模型：SOL

本轮是已批准 UI V2 Glass Minimal 的第二轮视觉优化。

**不是重新设计产品，不是正式 App 接入。**

用户已认可 G1 的基本排版与交互结构，但提出新的视觉要求：

- 增加米色、白色、淡绿色三套主题。
- 当前玻璃效果不明显，需要增强透明度、模糊、高光和悬浮层次。
- 保持已经认可的页面布局，只做必要的细节精修。
- 最终要更接近苹果式简洁、精致、通透的高级产品，而不是常见的 AI 模板 UI。

本轮完成后必须停在视觉验收点。

---

## 0. 项目基线

仓库：

`cc7279694-debug/menu`

稳定 main 当前已知：

`649804a8209413f9d682f1079a4fd19ea84cd064`

现有 UI V2 分支：

`feat/recipio-ui-v2-glass-minimal`

G1 已知提交：

`c956e59bc791ed1ea728f2af4092c19e38902eca`

开始前：

1. 检查工作区是否干净。
2. `git fetch origin --prune`。
3. 核对 main 和 UI V2 分支的实际 HEAD。
4. 保留已有 G0/G1 提交与验证证据。
5. 如发现未知并发修改，不要 reset、clean、force 或覆盖。

继续现有 UI V2 分支，不创建另一套设计工程。

现有技术架构：

React + TypeScript + Vite + Tailwind / shadcn + Capacitor Android。

不得迁移 Kotlin Compose 或 SwiftUI。

---

## 1. 本轮唯一目标

把 G1 从单一米色主题升级为：

**RECIPIO Theme System V1**

包含：

- `warm-ivory`：米色
- `pure-glass`：白色
- `soft-sage`：淡绿色

三套主题必须使用：

- 相同布局
- 相同组件
- 相同交互
- 相同间距
- 相同字体层级
- 相同圆角体系

只能改变设计 Token 及其对应的材质表现。

禁止分别开发三套页面。

---

## 2. 三套主题色板：正式冻结

以下色值是 ChatGPT 已批准的设计初版。

### Theme A — Warm Ivory

温暖、精致、轻料理感。

| Token | 色值 |
|---|---|
| canvas | `#F6F4EF` |
| surface | `#FBFAF7` |
| surface-muted | `#F0ECE5` |
| text-primary | `#1B1B1D` |
| text-secondary | `#6E6A65` |
| text-caption | `#716D65` |
| accent-action | `#49684F` |
| accent-pressed | `#3C5742` |
| accent-soft | `#E6EFE5` |
| border-subtle | `#DEDAD3` |
| border-control | `#858A82` |
| cook-solid | `#202420` |

这是当前 G1 的视觉基准，保持原有暖白气质。

### Theme B — Pure Glass

苹果式极简、冷静、清透。

| Token | 色值 |
|---|---|
| canvas | `#F7F9FB` |
| surface | `#FFFFFF` |
| surface-muted | `#EEF2F5` |
| text-primary | `#171B20` |
| text-secondary | `#59616A` |
| text-caption | `#626B75` |
| accent-action | `#2D6266` |
| accent-pressed | `#214B4F` |
| accent-soft | `#E4EFF0` |
| border-subtle | `#DEE5E9` |
| border-control | `#7C8993` |
| cook-solid | `#19242A` |

要求：

- 以干净白色和精确排版体现高级感。
- 不要大面积蓝色。
- 不要做成传统企业管理后台。
- 保持柔和的玻璃层次。

### Theme C — Soft Sage

自然、宁静、柔和的植物气质。

| Token | 色值 |
|---|---|
| canvas | `#EFF5EE` |
| surface | `#FAFCF9` |
| surface-muted | `#E3EDE2` |
| text-primary | `#1B2820` |
| text-secondary | `#56695C` |
| text-caption | `#5B6C60` |
| accent-action | `#365E45` |
| accent-pressed | `#274A34` |
| accent-soft | `#DCE9DB` |
| border-subtle | `#CFDCCF` |
| border-control | `#788F7B` |
| cook-solid | `#1D2B22` |

要求：

- 非常浅、低饱和的绿色。
- 绝不能使用鲜绿色或荧光绿。
- 不要大面积绿色渐变。
- 内容卡片继续使用接近白色的表面。

### 共用状态颜色

三套主题保持一致：

| 状态 | 文字 | 背景 |
|---|---|---|
| 成功 / 来源明确 | `#49684F` | `#E6EFE5` |
| 警告 / AI 推断 | `#815A23` | `#F7EEDD` |
| 错误 / 危险 | `#A2433D` | `#F8E9E7` |

注意：成功色不替代普通主按钮主题色。

---

## 3. 增强玻璃材质

用户明确表示当前 G1 玻璃效果过弱。

这一轮必须改善材质辨识度。

### 主题玻璃参数

| 参数 | 米色 | 白色 | 淡绿色 |
|---|---|---|---|
| 导航玻璃 | `rgba(251,250,247,.74)` | `rgba(255,255,255,.70)` | `rgba(248,252,247,.74)` |
| Sheet 玻璃 | `rgba(251,250,247,.88)` | `rgba(255,255,255,.86)` | `rgba(248,252,247,.88)` |
| Backdrop Blur | 24px | 26px | 24px |
| Saturate | 120% | 125% | 120% |

可以为各主题增加极轻微的边缘高光和悬浮阴影。

必须在实际滚动背景上验证玻璃效果，而不是只展示静止在纯色背景上的卡片。

### 必须增强的区域

1. 底部悬浮 Tab Bar
2. 顶部导航与操作按钮
3. 搜索框
4. Bottom Sheet 和 Dialog
5. 菜谱详情顶部返回 / 更多操作
6. 烹饪模式底部控制区

### 禁止玻璃化的区域

- 大面积正文
- 食材长列表
- 完整步骤文本
- 菜谱编辑主体
- 普通设置内容主体

遵守：

**玻璃属于导航与交互层，实体表面属于内容层。**

不得添加 WebGL、持续动态折射、大面积追光、闪耀动画或廉价发光边框。

同屏大面积模糊层原则上不超过两层。

---

## 4. 玻璃视觉必须真实可感知

这次不是单纯改透明度数值。

请重点核对：

- 导航条是否明显悬浮在内容上。
- 内容滑过玻璃导航下方时，是否能感受到模糊与材质层次。
- 高光边缘是否精细、轻微。
- Sheet 与背景能否形成空间距离。
- 搜索栏是否有透明而清晰的边界。
- 白色主题是否比米色更清透。
- 淡绿色主题是否具有柔和的色彩映射。

如果效果依然像普通半透明白色卡片，不视为本轮视觉目标完成。

但不得牺牲可读性追求透明。

---

## 5. 主题系统实现方式

优先在现有：

`src/native/ui-v2/tokens.css`

扩展语义 Token。

建议在 G1 根容器使用：

`data-v2-theme="warm-ivory"`

`data-v2-theme="pure-glass"`

`data-v2-theme="soft-sage"`

通过 CSS Custom Properties 切换。

不要为不同主题复制整份页面 CSS。

所有按钮、卡片、输入框、文字和玻璃都应读取 Token。

特别注意：

Base UI Dialog / Portal 可能不在普通页面 DOM 父级下。

必须让 Portal 也获得当前主题 Token，避免主页是淡绿色，但打开 Sheet 又变回米色。

---

## 6. G1 主题切换入口

在已有“样板设置”中新增：

**外观主题**

- 米色 · Warm Ivory
- 白色 · Pure Glass
- 淡绿色 · Soft Sage

建议展示三个小色板预览。

点击后：

立即切换。

不得：

- 刷新整页
- 重建整个 React App
- 丢失当前查看的菜谱
- 清空搜索框
- 重置烹饪步骤
- 强制关闭当前弹层

允许 URL 预览参数：

`?theme=warm-ivory`

`?theme=pure-glass`

`?theme=soft-sage`

这样用户可以快速比较。

未知参数回退：

`warm-ivory`

G1 只保留内存状态，不写：

- localStorage
- sessionStorage
- IndexedDB
- SQLite
- Backup

正式 App 的主题偏好持久化留待 G2/G3 后续授权阶段接入。

---

## 7. 深色烹饪模式

三套主题继续共用深色沉浸式烹饪布局。

区别仅在：

- 深色背景细微色调
- 顶部和底部玻璃 tint
- 焦点轮廓
- 次级文字及分隔线

必须确保：

当前步骤清晰。

食材 Sheet 可读。

上一/下一步操作明显。

保持原有 Guided / Focus 行为。

不要新增：

- 计时器
- 食材持久勾选
- 份量换算
- 自动步骤完成
- 后台通知

本轮为视觉修订，不新增业务功能。

---

## 8. 排版规则

用户已经认可当前 G1 的总体排版。

因此不进行大型布局重构。

只允许适当精修：

- 标题与副信息的距离
- 搜索栏与功能入口的留白
- 卡片内部上下间距
- 食材名称和用量的对齐
- 菜谱详情标题、耗时与步骤的层级
- 烹饪模式中的文字行宽及控制条间距

保持现有三个根页面：

首页 / 菜谱 / 设置。

不恢复设计概念图里未授权的：

收藏、推荐、通知、视频、标签、计时器、购物清单。

---

## 9. 无障碍与实体回退

三套主题都必须验证：

- 普通正文对比度不低于 4.5:1
- 重要控件边界及状态图形不低于 3:1
- 主按钮白字具有足够对比度
- Focus Ring 清晰
- 200% 字号不裁切
- 320px 宽度不横向溢出
- `prefers-reduced-motion`
- 实体玻璃回退模式

透明玻璃上的文字必须在实际合成背景下检查。

必要时增加不透明保护层，而不是降低文本颜色对比度。

不能仅凭 Token 静态对比度宣称整个界面已达到无障碍要求。

---

## 10. 必须展示的样板

G1 第二轮交付：

### 三套主题 × 三个页面

| 页面 | 米色 | 白色 | 淡绿 |
|---|---|---|---|
| 首页 | 必须 | 必须 | 必须 |
| 菜谱详情 | 必须 | 必须 | 必须 |
| 烹饪模式 | 必须 | 必须 | 必须 |

至少提供九张实际浏览器渲染截图。

另外提供：

- 三套主题的 Sheet 截图或组件状态对照
- 玻璃与实体回退的对照
- 主题切换后的实际效果

截图必须来自运行的 HTML/CSS 界面，不得使用 AI 生成图片冒充最终实现。

保留现有 G1 生成食物图片，仅供演示。

---

## 11. 自动测试

新增或调整测试，至少覆盖：

1. 三套主题正确应用。
2. 未知主题安全回退。
3. 主题切换不清空搜索。
4. 主题切换不重置烹饪步骤。
5. 主题切换不破坏 Dialog / Sheet。
6. Portal 色彩与页面主题一致。
7. 三主题在 320/390/412/768 宽度下布局稳定。
8. 三主题 200% 字号无关键内容裁切。
9. Reduced Motion 正常。
10. Solid Fallback 正常。
11. 本地搜索保持零外部请求。
12. 页面不访问正式 Recipe 数据库。
13. 无新的运行时异常。

重跑原 G1 浏览器验收矩阵，并追加主题相关用例。

执行：

- 全仓 Vitest
- Native 相关测试
- Typecheck
- ESLint
- build:local
- UI V2 production isolation
- Playwright / 浏览器可视化验证

所有测试结果以最终 HEAD 实际运行数字为准。

不能直接复用旧 G1 的 1049 / 41 项作为新修订的最终证据。

---

## 12. 生产隔离

本轮绝对不得：

- 将 G1 样板设为正式 App 首页
- 修改正式 Android 页面
- 修改正式 Logo
- 修改 SQLite v4
- 修改 Preview v7
- 修改 Backup v2
- 修改 Qwen / Finder / Link Import / Share
- 新增产品功能
- 构建正式 RC APK
- 进入 G2/G3/G4
- 合并 main
- 创建正式 Tag
- 部署或发布

G1 仍然是独立 DEV Showcase。

正式 production build 不得包含 G1 演示页面及其生成图片资源。

---

## 13. Skills 使用

优先复用当前 G1 已经使用的：

- HR Product Design System
- Product UI/UX Design
- Design System Extraction
- Refinement
- Production Validation
- React / shadcn 相关验证工具

不重复安装已经具备的技能。

不为了主题功能下载新的复杂动效库或 UI 框架。

如果有 Skill 缺失，如不影响本轮实施，可以使用现有设计规格和测试流程完成，明确记录即可。

---

## 14. Git 与交付

继续：

`feat/recipio-ui-v2-glass-minimal`

允许正常 commit / push。

工作区最终保持干净。

交付：

1. 三套主题最终 Token 表。
2. 玻璃效果改动说明。
3. 九张实际三屏截图。
4. 组件及 Sheet 状态对照。
5. 新浏览器样板地址与主题切换方法。
6. 最终测试结果。
7. 原 G1 与新 G1 的关键视觉差异。
8. Git 完整 SHA、远端一致性及工作区状态。

不要制作整仓 ZIP 或重复 APK。

---

## 15. 完成门禁

本轮完成后输出：

`UI_V2_G1_THEME_REFRESH_READY_FOR_REVIEW`

停止。

等待用户与 ChatGPT 进行第二次视觉验收。

**未经明确批准，不进入 G2 正式页面接入。**