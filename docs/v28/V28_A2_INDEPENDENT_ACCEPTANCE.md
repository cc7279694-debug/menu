# V28-A2 独立验收登记

登记日期：2026-11-02（Asia/Shanghai）。依据：用户本次正式授权及其提供的
ChatGPT 独立验收结论，非 Codex 自行宣布通过。

**V28-A2：ACCEPTED / FROZEN — PASS WITH NOTES。**

| 固定依据 | 身份 |
| --- | --- |
| 仓库 | `cc7279694-debug/menu` |
| A1 冻结源码 | `cf806554ac38346644613dd8b3bf700aeb48b14f` |
| A2 最终证据 | `081f98f8e31c9d280fc68388c760635a8d1e446d` |
| [固定验收入口](https://github.com/cc7279694-debug/menu/blob/081f98f8e31c9d280fc68388c760635a8d1e446d/docs/v28/V28_A2_REVIEW.md) | 原始送审报告保持原样 |

用户确认 ChatGPT 已独立检查固定 GitHub 提交、签名回执、模拟器升级记录、
截图及实际提交的三个合成备份，并核对升级前后业务数据和媒体一致性。
本文件仅登记该结论，不声称 Codex 在 A3 重新执行或代替独立验收。

## 接受的限定范围

- A1 固定源码对应的唯一签名候选身份；包名 `app.recipio.local`，版本28 /
  `0.11.1-personal.1`；与 v27 相同证书。
- 全新专属 API36 模拟器上的实际 v27 安装、合成数据恢复、正常 `install -r`
  覆盖升级；appId 和首装时间保持。
- 实际应用导出的 before/after：7 类集合的字段、类型、ID、UTC 时间、顺序及
  `data.json` 原始字节一致；3 张图片字节/SHA 一致，包括共享及历史独占引用。
- 非默认主题另以冷启动、实际截图和局部像素对照验证，不混入 Backup v2。
- 受控离线搜索、基础 IME Back、Focus/历史/图片、明确编辑后的冷启动持久化，
  以及只输入合成小红书形状链接并取消的入口检查。没有真实网页或 AI 调用。
- 第三个 post-smoke 备份只包含预期的标题/更新时间变化和新增1条修改记录；
  原实体、历史、3张图片保留，做菜记录仍为1条。

## 原始 NOTES 与失败尝试全部保留

固定证据中的以下文件不改写、不删除，也不将失败重标为 PASS：

- [A2 原始报告](V28_A2_REVIEW.md)、[checkpoint](V28_A2_CHECKPOINT.md)、
  [签名阶段历史](V28_A2_SIGNED_VERIFICATION.md)。
- [首次系统事件](a2-evidence/upgrade/initial-system-events.txt)、
  [最终系统事件](a2-evidence/upgrade/final-system-events.txt)及
  [System UI 无响应截图](a2-evidence/upgrade/v27-first-launch.png)。
  5项系统 ANR 均早于 v27 首装；选择 Wait 一次后继续。后续无新增 ANR/应用崩溃
  仅是该日志窗口的观察，不证明系统全程无故障；初始系统 ANR 精确原因未确定。
- [测试工具失败记录](a2-evidence/upgrade/TEST_HARNESS_NOTES.md)：首次启动超出
  等待窗口；三个 radio 的 checked 属性均为 false 的失败断言；旧/空可访问树；
  IME 重开后的坐标误点及重试；被拒绝作为成功证据的 splash 帧；本地 Pillow
  不可用及后续已有 System.Drawing 对照。实际截图与断言边界分开保留。
- 原始包信息文本仅为 Git 规范化行尾/尾空白，原工具文件保留；不改字段。
- A1 JS/TS、JVM、TypeScript、Lint、构建等记录是历史提交方证据；A3未重跑。
  原有5项 Lint 警告保留，不把来源不同/重叠的测试数相加。

## NOT_RUN / UNKNOWN 与不可推导的结论

- 小米14、其他实体 OEM、TalkBack、系统字号及实体设备性能：NOT_RUN。
- 真实个人数据的手机覆盖升级、手机离线进程冷启动、真机图片呈现：NOT_RUN。
  模拟器已执行对应的部分检查，不等于手机通过。
- 原始 SQLite 文件字节、PRAGMA 和私有物理路径身份：NOT_RUN；备份业务内容
  对照不能代替这些检查。SQLite4 / Preview7 / Backup2 契约不变。
- 全历史 connected/Guided 测试、完整三主题及不支持 `:has()` 的回退矩阵：NOT_RUN。
- 真实小红书/DNS/TLS/网页读取、真实 AI 调用和模型质量：NOT_RUN，真实 AI 调用0。
- 最初手机 `dns_blocked` 原因：UNKNOWN；没有宣称 VPN 导致或已修复真机连接。
- 登录、验证码、平台访问限制及仅图片/视频/口播包含步骤的内容仍受能力限制。
  不绕过限制，不放宽公网/DNS/SSRF/TLS 保护，不凭空补齐步骤或用量。

这是 A2 限定冻结，不是小米14升级成功、整体 G4 冻结或正式发布通过。
G5/G6/G7既有冻结、G4 PENDING及R1更广范围的长期签名/个人迁移
DEFERRED_BY_USER 保留。A3只准备用户本人后续操作，不授权 Codex 操作手机。

下一门禁：ChatGPT 审查 [A3 用户指南](V28_A3_XIAOMI14_OWNER_GUIDE.md)，用户明确
授权后，才由用户本人开展真机升级；真实链接/AI测试另需明确触发及同意。
