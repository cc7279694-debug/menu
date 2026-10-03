# 日常菜谱库 checkpoint

## What Was Built

共享 Vite 客户端首页/我的菜谱/设置、完整手动编辑与详情、本地图片、菜名/食材搜索、耗时筛选、100 条分页、五秒删除撤销、轻量修改快照。仅菜名仍可保存；未知耗时/份数/热量留空，准备文字不虚构时间，不缩放实际用量。

新增 src/native 的 recipe-model、preview-store、media、local-image、recipe-editor、recipe-detail、library-app 和测试；扩展 recipe-store/sqlite/app/styles。新增 native/main.ts，修复独立 Vite 开发入口；package 添加本地运行别名及 @capacitor/filesystem 8.1.4。扩展既有 Dexie 到 v5，旧云缓存清除保留设备媒体。更新项目事实源；没有删除旧功能或云资源。

## Why / Decisions

用户暂缓 APK，先完善实用性。沿用既有 Android 底座和浏览器数据表，通过 RecipeLibrary 隔离存储。SQLite v2 增量扩展，食材/步骤规范化；保存事务保证不会留下半份菜谱。图片不设人为大小上限，但有实际设备限制。快照引用所需媒体保守保留。

## Actual Verification

- npm run test:apk -- --pool=threads --maxWorkers=1 --no-file-parallelism：6 文件，24 测试通过（真实 Node SQLite + 浏览器适配器/UI/媒体测试）。
- npm test -- --pool=threads --maxWorkers=1 --no-file-parallelism --testTimeout=120000 --hookTimeout=120000 --reporter=verbose：130 文件，612 测试通过。首次默认超时运行因旧 PGlite 数据库测试达到 30 秒而中止；明确延长超时重跑后该用例和全部回归通过，未删测试或改变旧业务逻辑。
- npm run build:local：通过；npm run typecheck：通过；npm run lint：0 错误，5 条旧 Next 图片警告。
- Playwright 独立本地浏览器：390×844、360×800 手机及 1280×900 桌面查看；完整菜谱/封面刷新持久化，食材搜索和耗时筛选，已加载页面断网新增、编辑、五秒删除撤销，恢复网络刷新后备注保留。360 宽度无水平溢出，快速保存按钮首屏可见、44 像素高。
- 浏览器截图位于 output/playwright（忽略文件，不提交）；测试使用独立浏览器资料，不修改用户云端菜谱。
- APK 构建、Capacitor sync、Android SQLite v2/文件系统/覆盖升级：Not Run；原因：用户暂缓打包。旧 APK-0 的原生证据不能算新版验收。
- 无 push、部署、PR、main 合并或真实云端数据变更。

## Known Limitations

备份恢复、AI、烹饪记录和历史界面未实现。Web 冷启动/刷新仍需本地静态服务器，未实现 Service Worker。媒体回收后置；受设备配额和解码限制。依赖审计仍有 21 项既有风险（6 moderate、14 high、1 critical），单独处理。无完整备份前不能作为唯一重要数据来源。

## Next Stage Should Inherit

用户先体验日常库；通过后单独做完整备份恢复，继承当前数据模型、媒体归属保护和事务机制。不要重复初始化、恢复收藏/购物/计划或自行开始 APK 打包。当前分支 feat/recipio-daily-library，仅本地提交。
