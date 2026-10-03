# RECIPIO 谱序

## Project

个人菜谱库：收进来、整理好、找得到、做得顺，逐渐形成自己的做法。

## Purpose

把来源杂乱的菜谱整理成可执行步骤，并在厨房场景中快速查看和记录自己的做法。不内置计时器。

## Users

个人用户，优先满足单设备、低网络依赖的使用场景。

## Core Problems

- 菜谱来源分散且难以复用。
- 烹饪时需要稳定、快速、可离线查看。
- 提前准备和关键操作容易遗漏。

## Core Features

本地搜索与菜谱管理、实际用量、提前准备、关键事项、完整步骤与可选单步/专注模式、轻量做过记录、完整备份。AI 仅在显式录入阶段使用，热量是带「约」的辅助信息。

## Non-goals

不做账户、云同步、社区、收藏、购物清单、菜单规划、通知提醒、推荐算法、复杂标签/版本树、营养管理。旧 Web 模块仅作回退，不代表新版需求。

## Tech Stack

Android：Vite + React + TypeScript + 现有 Tailwind/shadcn + Capacitor + SQLite。静态资源随 APK 安装，不加载线上网站。旧 Next.js/Supabase/Vercel 在迁移期保留；浏览器已有 Dexie 成果可复用。

## Architecture Summary

React UI 通过业务服务调用 Repository 接口。浏览器使用 IndexedDB，Android 使用 SQLite；AI 是可选联网能力，备份使用本地 ZIP 文件。

## Constraints

不迁移现有云端数据，不在本阶段删除线上回退版本；核心菜谱操作不应因网络不可用而瘫痪。

## Product Direction

No Account + Local-only。基线见 docs/PRODUCT_SPEC.md；日常库实现后先验证 Android 权威存储，再单独确认备份恢复。每个模块独立验收，不重复规划；当前原生验收来自用户新要求，而非自动恢复旧 APK-0 提示。
