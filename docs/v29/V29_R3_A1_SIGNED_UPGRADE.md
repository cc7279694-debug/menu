# V29 正式签名候选与隔离升级验收

2026-11-05 · **READY_FOR_INDEPENDENT_REVIEW**

所有者已在私人窗口完成签名。Codex 独立校验 V29 的 v2/v3 签名，确认单一证书与 V28 一致，并逐项比较签名后的 ZIP 内容与冻结的未签名输入。原始 `SIGN_FAILED` 的原因仍未知，诊断助手的修改仅涉及报错分类。

- 包名 `app.recipio.local`，版本号 29，版本名 `0.11.2-personal.1`。
- 正式签名 APK 位于 `E:/CODEX/RECIPIO-Signing/recipio-personal-release-v29/recipio-personal-v29.apk`。
- 大小 15,198,771 字节，SHA-256 `b7226af457af39fcf049d082cfe82813a0ad120957d562b9ee5c908e06f3ae4d`。
- 证书 SHA-256 `5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d`。
- 产品源码 `747f80a38761882a19522e4c8f61a5f09a90068d`，R3 限定验收登记 `3998147dcd5d68f8284a6529a2f0660e69d30e6b`。

[签名与包身份回执](signed-upgrade-evidence/signed-verification.json) · [官方签名输出](signed-upgrade-evidence/v29-signature.txt) · [原构建及定向回归](V29_R3_A1_REVIEW.md)

## Android API 36 覆盖升级

专属 AVD `Recipio_V29_R3_A1_API36` 在 4.613 GiB 空闲内存时启动。实际安装冻结的 V28 并校验设备内的 `base.apk`。恢复仓库既有合成种子时，应用确认当前有 0 道菜谱。恢复成功后设置 Soft Sage 主题并冷启动，通过应用界面导出第一份备份。

用 `adb install -r` 安装已核验的 V29，返回 `Success`。前后 appId 均为 `10216`，首次安装时间一致，安装后的 `base.apk` 与正式候选哈希一致。应用测试期间保持飞行模式。V29 冷启动首页显示两道合成菜谱及封面图，设置页保留 Soft Sage。再次由应用导出备份，两次导出均显示保存并回读校验成功。

- 七个业务集合的字段、类型、值和数组顺序一致，`data.json` 逐字节相同。
- 两道菜谱、三项食材、三个步骤、两项准备、两条关键事项、一条修改历史、一条烹饪记录均保留。
- 三张合成 PNG 的路径引用、实际字节和 SHA-256 一致。
- 备份清单只改变版本号、版本名和导出时间，ZIP CRC、内部哈希、SQLite 4 和 Backup 2 契约均通过校验。
- 设置截图的背景、选中按钮及主题面板三个比较区域均为零差异像素。

[运行回执](signed-upgrade-evidence/runtime-summary.json) · [安装回执](signed-upgrade-evidence/v29-upgrade-install.json) · [严格数据比较](signed-upgrade-evidence/upgrade-content-comparison.json) · [V28 导出](signed-upgrade-evidence/before-v28.recipio) · [V29 导出](signed-upgrade-evidence/after-v29.recipio)

[V29 冷启动](signed-upgrade-evidence/v29-cold-initial.png) · [V28 主题](signed-upgrade-evidence/v28-theme-before-upgrade.png) · [V29 主题](signed-upgrade-evidence/v29-theme-after-upgrade.png) · [主题比较](signed-upgrade-evidence/theme-comparison.json)

## 本轮环境与边界

E 盘两次创建数据分区均因磁盘空间不足终止。改用 C 盘独立临时目录后启动。首次读取界面树时得到无效 XML，开机阶段 Google 服务和输入法曾报 ANR。V28 首次滚动到备份操作时发生触摸无响应，单次 Wait 后仍有弹窗。随后对该 AVD 使用 540×960、210 dpi 和关闭系统动画的配置，强制停止并冷启动 V28，恢复和升级流程完成。最终事件记录中的 RECIPIO ANR 发生在 V28 阶段。专属 AVD 测试后已关闭，测试状态留存。

[资源准入](signed-upgrade-evidence/cdrive-admission.json) · [显示配置调整](signed-upgrade-evidence/rendering-recovery.json) · [事件记录](signed-upgrade-evidence/final-anr-events.txt)

本轮实际验证覆盖同证书升级及合成数据。R3 解析回归仍采用已提交的 JS 定向证据，签名 APK 中的 Android 解析注入测试未运行。小米 14、OEM、TalkBack、真实小红书请求及付费 AI 均待验证。原手机 DNS 拦截原因仍未知。真机步骤见[所有者实测清单](V29_R3_A1_OWNER_CHECKLIST.md)的手机阶段，须先完成独立验收及对应授权。N2 保持暂停。
