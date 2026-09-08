# RECIPIO 谱序

## Project

个人菜谱与烹饪引导应用。

## Purpose

把来源杂乱的菜谱整理成可执行步骤，并在厨房场景中快速查看、计时和记录。

## Users

个人用户，优先满足单设备、低网络依赖的使用场景。

## Core Problems

- 菜谱来源分散且难以复用。
- 烹饪时需要稳定、快速、可离线查看。
- 提前准备、购物和营养信息容易遗漏。

## Core Features

菜谱管理、提前准备、周计划、购物清单、烹饪模式、烹饪历史、AI 导入与营养分析。

## Non-goals

当前不做家庭共享、多设备同步、复杂冲突合并和付费营养数据库。

## Tech Stack

过渡期保留 Next.js、React、TypeScript、Tailwind、Supabase、Vercel；本地版本逐步采用 IndexedDB/Dexie、Vite、Capacitor、SQLite 和本机文件系统。

## Architecture Summary

React UI 通过业务服务调用 Repository 接口。浏览器使用 IndexedDB，Android 使用 SQLite；AI 是可选联网能力，备份使用本地 ZIP 文件。

## Constraints

不迁移现有云端数据，不在本阶段删除线上回退版本；核心菜谱操作不应因网络不可用而瘫痪。

## Product Direction

Local-first when possible. Cloud when necessary. 先保证个人单设备离线体验，再评估是否需要重新引入云同步。
