# Module 6A 来源导入验收记录

## 已交付

- 支持粘贴公开网页链接、粘贴菜谱文字、上传 1–6 张菜谱截图。
- 服务端通过 OpenAI Responses API 的严格 JSON Schema 生成可编辑草稿；密钥只从服务端环境变量读取。
- 草稿包含食材分组、数量/单位、步骤、火候、准备/烹饪分钟数和步骤秒级计时。
- 导入任务有用户归属、强制 RLS、私有 `recipe-imports` Storage、临时文件清理和失败重试状态。
- 网页抓取限制协议、私网/本地地址、DNS 解析、跳转次数、MIME 类型、10 秒超时和 2 MB 正文大小。
- 详情页按主料/调料/其他展示，并保留原始来源链接；保存前仍可在现有编辑器中修改。

## 自动化验证

在 Windows 工作树执行：

```powershell
npm.cmd test -- --pool=forks --maxWorkers=1
npm.cmd run typecheck
npm.cmd run lint -- --no-warn-ignored
npm.cmd run build
```

结果（2026-08-29）：

- Vitest：68 个测试文件、303 个测试全部通过。
- TypeScript：通过。
- ESLint：0 errors；保留既有 4 条 `<img>` 性能 warning。
- Production build：通过。

## 手动验收清单

1. 在非生产 Supabase 项目执行 `20260829035043_recipe_imports.sql`。
2. 在本地 `.env.local` 配置 Supabase 公共变量，以及仅服务端使用的 `DASHSCOPE_API_KEY`（或 `QIANWEN_API_KEY`）和可选 `RECIPE_AI_MODEL`。
3. 登录后打开 `/recipes/import`，分别验证链接、文字和截图三种入口；刷新导入详情页应能继续轮询。
4. 在导入页分别选择“自动推荐”“只用 Qwen 3.8 Flash”和“只用 Gemini”，确认任务按选择调用模型；自动模式仅在 Qwen 可恢复失败时回退一次。
5. 在草稿页检查主料/调料分组、火候和 65 秒显示为 `1 分 05 秒`，确认保存前可以修改并保存。
6. 检查详情页来源链接；删除或保存后确认临时导入图片不会长期留在 `recipe-imports`。
7. 使用 `localhost`、私网地址、非 HTML 页面和超过 2 MB 的正文，确认会被拒绝且不显示上游响应正文。
8. 在 360px、390px、430px 宽度检查输入卡、进度提示、失败兜底入口和横向溢出。

## 当前边界

- 小红书等需要登录、Cookie 或强反爬的页面不会读取私人会话；请改用公开链接、截图或粘贴文字。
- 视频字幕/转写与平台专用适配器保留到后续模块。
- 本工作树无法执行完整 `supabase db reset`，因为本机已有其他 Supabase 容器占用端口 54322；数据库契约已用 PGlite 完成验证，未自动修改任何远程 Supabase 项目。
- 生产环境 Qwen/Vercel 密钥和生产迁移仍需单独授权后配置。
