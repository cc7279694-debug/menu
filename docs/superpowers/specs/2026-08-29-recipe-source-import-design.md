# 食序 ORDINE 多来源 AI 菜谱导入设计

**日期：** 2026-08-29

**状态：** 已确认

**适用范围：** 个人菜谱，不包含家庭共享

## 1. 目标

用户可以粘贴公开网页或图文链接、上传菜谱截图、粘贴文字，或在后续模块中粘贴做饭视频链接。系统读取来源内容，生成一份清晰、可编辑的菜谱草稿，整理出主食材、调料、步骤、火候、分钟与秒数、份数和分类建议。用户必须检查并确认后，草稿才会保存为正式菜谱。

核心价值是减少反复拖动视频进度条和手工抄写菜谱的成本，同时保留用户对最终内容的控制权。

## 2. 非目标

- 不绕过小红书、抖音等平台的登录、验证码、反爬或访问控制。
- 不读取或保存用户在第三方平台的账号、密码、Cookie 或登录会话。
- 不保证所有网页和视频都能自动解析；失败时必须提供粘贴文案、上传截图等降级入口。
- 不把 AI 生成内容直接写入正式菜谱。
- 不在第一阶段生成医学、减肥或营养功效结论。
- 不为了本功能更换 Next.js、Supabase、Vercel 等现有技术栈。

## 3. 方案选择

采用“来源适配器 + 结构化 AI 提取 + 人工确认”的模块化方案。

相比只支持粘贴文字，该方案保留了“复制链接直接生成”的产品价值；相比通用浏览器自动化抓取，它不依赖用户登录态，也不会把易失的平台抓取逻辑耦合进菜谱业务。

## 4. 交付拆分

### 模块 6A：基础导入与菜谱草稿

- 输入公开普通网页链接、粘贴文字、上传 1–6 张截图或图片。
- 安全读取公开 HTML 页面正文和元数据。
- 使用多模态 AI 生成结构化菜谱草稿。
- 显示来源、置信提示和缺失信息警告。
- 在现有菜谱编辑器中检查、修改并保存。
- 支持主食材/调料分组、步骤火候、分钟和秒数。
- 自动建议一个主分类和多个标签，但不自动创建分类或标签。

### 模块 6B：平台图文适配

- 为小红书等常见平台增加独立来源适配器。
- 公开页面可读时提取文案、标题、作者和图片。
- 平台阻止读取时切换到截图、图片或粘贴文案入口。
- 记录平台级成功率和失败类型，不记录第三方登录信息。

### 模块 6C：视频导入

- 优先读取视频平台公开字幕。
- 没有字幕且来源允许时，提取音轨并转录。
- 长视频使用异步任务和阶段化进度。
- 对无法处理的视频提示用户上传短片、音频、字幕或文案。

三个模块分别完成、测试、推送和验收，不一次性修改全部系统。

## 5. 用户流程

1. 用户在菜谱列表点击“从链接/图片导入”。
2. 用户选择链接、图片或文字；三种输入只需提供一种。
3. 系统创建私人导入任务并显示进度：读取来源、识别内容、整理菜谱。
4. 系统生成草稿；若来源信息不足，明确标出需要确认的字段。
5. 草稿载入现有菜谱编辑器，所有字段均可修改。
6. 用户点击“保存菜谱”后，系统调用现有 `save_recipe` 流程。
7. 系统保存来源记录，并删除导入任务中的临时正文和临时图片。

失败状态必须提供明确下一步，而不是只显示“生成失败”：

- 网页受限：上传截图或粘贴文案。
- 图片不清楚：重新上传更清晰图片。
- 内容不是菜谱：更换内容或手动新建。
- AI 服务暂时不可用：保留输入并允许重试。

## 6. 信息模型

### 6.1 生成草稿

`RecipeImportDraft` 与现有 `RecipeSaveInput` 对齐，但使用名称形式保存分类建议：

```ts
type RecipeImportDraft = {
  title: string;
  description: string | null;
  baseServings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  personalNotes: string | null;
  suggestedCategoryName: string | null;
  suggestedTagNames: string[];
  ingredients: Array<{
    name: string;
    groupType: "main" | "seasoning" | "other";
    quantity: number | null;
    quantityText: string | null;
    unit: string | null;
    preparationNote: string | null;
  }>;
  steps: Array<{
    instruction: string;
    heatLevel: string | null;
    timerSeconds: number | null;
    ingredientNames: string[];
  }>;
  warnings: string[];
};
```

草稿转换为 `RecipeSaveInput` 时生成本地 UUID，通过名称匹配用户已有分类和标签。不存在的建议只显示给用户，不自动创建，避免 AI 污染分类体系。

### 6.2 数据库变化

新增 `recipe_import_jobs`：

| 字段 | 类型 | 用途 |
| --- | --- | --- |
| `id` | uuid | 导入任务 ID |
| `user_id` | uuid | 所有者 |
| `source_type` | text | `url`、`text` 或 `images` |
| `source_url` | text nullable | 原始链接 |
| `source_title` | text nullable | 来源标题 |
| `source_author` | text nullable | 来源作者 |
| `source_platform` | text nullable | `web`、`xiaohongshu` 等 |
| `source_text` | text nullable | 临时正文，保存后清理 |
| `image_paths` | jsonb | 私人临时图片路径 |
| `status` | text | `queued`、`fetching`、`extracting`、`review`、`failed`、`saved` |
| `draft` | jsonb nullable | 通过 Zod 校验的草稿 |
| `warnings` | jsonb | 用户可见警告 |
| `error_code` | text nullable | 稳定错误码，不存机密错误细节 |
| `recipe_id` | uuid nullable | 保存后的菜谱 |
| `expires_at` | timestamptz | 临时输入清理时间，默认 24 小时 |
| `created_at` / `updated_at` | timestamptz | 生命周期 |

新增 `recipe_sources`：保存正式菜谱的来源平台、URL、标题和作者。它不保存网页全文、视频或第三方登录信息。

现有表增加：

- `recipe_ingredients.group_type text not null default 'main'`，约束为 `main`、`seasoning`、`other`。
- `recipe_steps.heat_level text null`，最大长度由应用层限制为 60 个字符。

`save_recipe` RPC 同步接收以上两个新增字段。旧菜谱自动采用 `group_type = 'main'`，因此不存在数据回填风险。

### 6.3 Storage

新增私有 bucket `recipe-imports`：

- 每个对象路径以 `user_id/import_id/` 开头。
- 只允许 JPEG、PNG、WebP；原图单张不超过 15 MB，上传前压缩到 5 MB 以内，最多 6 张。
- RLS 只允许当前用户读、写和删除自己的路径。
- 保存或放弃时删除临时对象；过期任务在用户再次进入导入页时清理。

## 7. 服务边界

### 7.1 来源读取

`SourceAdapter` 统一返回：

```ts
type SourceDocument = {
  platform: string;
  title: string | null;
  author: string | null;
  canonicalUrl: string | null;
  text: string;
  imageUrls: string[];
};
```

模块 6A 只实现：

- `PlainTextSourceAdapter`
- `PublicWebSourceAdapter`
- 用户上传图片

平台适配器和视频适配器在后续模块实现，不改变上述接口。

### 7.2 AI 提取

定义 `RecipeDraftExtractor` 接口，将来源文字和最多 6 张图片转换为 `RecipeImportDraft`。首个实现使用 OpenAI Responses API 和结构化输出，默认模型为 `gpt-5-mini`，通过 `RECIPE_AI_MODEL` 可替换。服务端密钥只读取 `OPENAI_API_KEY`，绝不进入客户端 bundle。

模型输出必须再次通过 Zod 校验；非法、超长或空结果一律视为失败。来源文本放在明确的数据边界中，提示模型忽略其中包含的指令，降低提示注入风险。

## 8. URL 安全

公开网页抓取必须满足：

- 只接受 `http:` 和 `https:`。
- 拒绝用户名密码 URL、localhost、`.local` 和字面私有 IP。
- DNS 解析后的所有地址都必须是公网地址。
- 每次跳转重新检查，最多 3 次跳转。
- 请求超时 10 秒，正文最多读取 2 MB。
- 只接受 HTML 或纯文本内容。
- 删除脚本、样式、表单、导航等无关内容，正文最多保留 60,000 个字符。
- 不转发用户 Cookie、Authorization 或浏览器请求头。

## 9. 权限与隐私

- `recipe_import_jobs`、`recipe_sources` 和 `recipe-imports` bucket 全部开启并强制 RLS。
- 客户端只使用 Supabase anon key；不增加 service-role key。
- 用户不能查询、更新或删除其他用户的导入任务与来源。
- 日志只记录任务 ID、状态、平台和错误码，不记录完整正文、图片地址、API 密钥或模型响应。
- AI 原始响应不长期保存，只保存通过校验后的菜谱草稿。

## 10. 分类规则

- 一个主分类用于菜品类型，例如家常菜、主食、汤羹、甜品、烘焙。
- 多个标签用于烹饪方式、场景和饮食目标，例如蒸、炒、空气炸锅、快手菜、减脂、增肌、高蛋白。
- AI 只给出建议名称；匹配已有分类或标签时自动预选。
- 不存在的名称显示为“建议新建”，由用户主动确认后复用现有创建分类/标签动作。
- “减脂”“增肌”等仅作为个人整理标签，不构成营养或医学结论。

## 11. 性能与体验

- 导入入口和处理 UI 不进入菜谱列表首屏包，按路由加载。
- 图片在客户端复用现有压缩能力后再上传。
- 处理页只轮询当前任务，成功或失败后停止。
- 页面离开后允许再次通过任务 URL 查看结果。
- 不在 React 渲染过程中执行正文解析或大型数组转换。
- 进度动画遵守 `prefers-reduced-motion`。

## 12. 测试与验收

### 自动化

- Zod：合法草稿、部分缺失、超长字段、非法枚举和空菜谱。
- URL 安全：私有 IPv4/IPv6、localhost、重定向、超时、超限正文和错误 MIME。
- HTML 解析：标题、正文、作者、脚本清理和字符上限。
- AI 客户端：结构化成功、HTTP 错误、无输出、非法 JSON、schema 不匹配。
- 草稿映射：UUID、食材分组、火候、计时、分类和标签匹配。
- 数据库：迁移、默认值、约束、RLS、跨用户拒绝和 Storage 路径策略。
- UI：三种输入方式、上传限制、处理中、失败降级、草稿预览和确认保存。

### 人工验收

- 桌面端和 360、390、430 px 移动端。
- 一个公开菜谱网页、一段粘贴文字、1 张截图和 6 张截图。
- 网页无法读取、图片模糊、AI 服务失败和未登录场景。
- 草稿编辑、创建建议标签、保存后来源展示。
- 控制台无错误；类型检查、Lint、完整测试和生产构建通过。

## 13. 发布边界

- 数据库迁移必须先在本地或非生产环境验证，再单独取得 Supabase 正式写入许可。
- `OPENAI_API_KEY` 和 `RECIPE_AI_MODEL` 先配置 Preview；Production 环境变量与正式部署需要单独确认。
- 功能分支推送后先验收 Preview，不直接合并或发布 Production。
