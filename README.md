# 食序

食序是一个中文优先的个人菜谱与分步烹饪 PWA。模块 1 已完成项目基础、邮箱验证码登录、认证路由保护和手机/桌面响应式导航；模块 2 已加入私有菜谱数据模型、菜谱编辑、搜索筛选、收藏、回收站和详情页。

## 本地要求

- Node.js 22 或兼容 Next.js 15 的较新 LTS 版本
- npm
- 一个非生产 Supabase 项目（只有实际验证登录、数据库和 Storage 时才需要）

## 开始运行

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

首次使用菜谱数据时，需要在已授权的非生产 Supabase 项目中执行 `supabase/migrations/20260823132418_recipe_management.sql`。当前仓库只提供迁移文件和本地 PGlite 迁移测试，不会自动连接或修改任何 Supabase 项目。

然后打开 <http://localhost:3000>。

`.env.local` 只填写非生产 Supabase 的公共变量：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

不要提交 `.env.local`，也不要把 service-role key 放进前端或仓库。

## 验证命令

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

模块 1 不包含数据库迁移、Storage Bucket 创建或生产部署。真实邮箱验证码登录需要经授权的非生产 Supabase 项目和测试邮箱；没有这些输入时，只运行代码级验证。

## 设计文档

- [产品规格](docs/superpowers/specs/2026-08-23-personal-recipe-cooking-app-design.md)
- [模块 1 实施计划](docs/superpowers/plans/2026-08-23-module-1-foundation-auth-navigation.md)
- [模块 2 实施计划](docs/superpowers/plans/2026-08-23-module-2-recipe-management.md)
- [模块 2 验收记录](docs/testing/module-2-recipe-management-acceptance.md)
