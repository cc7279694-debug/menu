# 模块 2：菜谱管理验收记录

## 已交付

- 私有菜谱、分类、标签、食材、步骤和步骤食材关联表，全部启用强制 RLS。
- 私有 `recipe-media` Storage Bucket、所有权路径约束和签名 URL。
- `save_recipe` 原子保存 RPC，以及标题/食材/标签搜索 RPC。
- 新建/编辑菜谱表单，支持封面和步骤图片选择、压缩、上传失败清理。
- 我的菜谱、我的收藏、搜索、分类/标签筛选、分页和回收站恢复。
- 菜谱详情页、编辑入口、收藏和移入回收站确认。

## 本地验证

在当前工作树执行：

```powershell
npm.cmd test
npm.cmd run test:db
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

本模块的数据库测试使用 PGlite 执行迁移和 RLS/RPC/Storage 策略验证；它不能替代真实 Supabase Data API、Storage 或认证环境验证。

## 真实环境边界

尚未连接、迁移或修改任何 Supabase 项目，也未执行真实邮箱登录、真实 Storage 上传或 Preview 部署验收。后续如需验证，必须使用独立的非生产项目和测试账号。
