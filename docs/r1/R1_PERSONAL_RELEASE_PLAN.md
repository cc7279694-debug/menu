# RECIPIO R1-P — 个人自用 Release 与本地签名执行基线

日期：2026-10-27。授权：**AUTHORIZED — PERSONAL RELEASE PREPARATION AND SIGNING**。
本次只调整签名交付策略，不重开 G5～G7 产品设计，不改写旧验收记录。

## 已批准的政策替代

用户主动接受一套本人持有密码的长期签名身份、仓库外受限私人目录、至少一份
独立文件形式的 AES-256 加密本地备份，以及真实解密/恢复/证书和签名验证。
主副本和加密备份可在同一电脑的不同受限目录；不再要求先准备两件离线介质。

**单台电脑损坏、丢失、感染恶意软件或存储同时故障时，两份本地文件都可能失去作用。
本方案不具有独立离线介质的灾难恢复能力。** 两个目录不能登记为两份物理离线备份。
将来复制已验证加密备份至独立介质属于可选补强，不是本轮构建前置条件。

旧 [R1_OWNER_SIGNING_PLAN.md](R1_OWNER_SIGNING_PLAN.md)、R1执行/独立验收保留历史；
其中双离线介质及云端Secrets流程不作为本次个人本地签名的执行政策。
本轮不向GitHub上传私钥，不启用原 `recipio-signed-next.yml` 真实签名Job。

当前公开工具包入口为E:/RECIPIO-Signing/Start-RecipioPersonalSigning.cmd。
完整同版本公共工具与原摘要绑定，bundle及依赖仅owner/SYSTEM可写；卷根独立目录
避开Codex的AppData重定向和可写共享祖先。该位置只存公开工具、unsigned输入、
公开回执和签名APK候选，绝不作为私人密钥或密钥备份目录。旧路径保留在历史证据中。

## 固定工程与任务边界

- main产品基线：`19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe`，PR#4合并G3～G7。
- 功能分支：`release/recipio-personal-signing`，从上述origin/main创建。
- 复用既有隔离工作目录 `E:/CODEX/VIBE CODING/recipe-step-app-g7`；旧G7分支和其他工作目录不改写。
- Local-first、SQLite4、Preview7、Backup2、Logo、Provider/AI边界及G5～G7产品语义不变。
- 普通非敏感工具/构建问题连续处理；真实密码/私钥操作由用户独立窗口亲自执行。
- 不安装或操作用户手机，不恢复个人数据，不合main、不建PR/Tag/Release，不启动G8。

## 路线与身份判定

路线A候选为原包 `app.recipio.local`，v23公开证书SHA-256：
`29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9`。
只检查本项目公开APK/证书及已声明签名位置。已知旧候选文件为
`C:/Users/CDD/.android/debug.keystore`；不扫描全盘、无关项目或凭据库。

公开证书/文件存在不等于本轮已验证私钥可用。用户必须在独立私密工具中输入旧密码、
确认真实证书、实际签名成功并验证恢复副本，才将A从候选升为确定路线。
工具可以把同一旧身份导入受强密码保护的私人PKCS12副本，不能改写原密钥或更换证书。
已存在私人副本或备份时必须验证复用，不覆盖，不因读取失败重建身份。

只有证实A无法安全复用、且不存在应继承的新包正式身份后，才按任务授权考虑
路线B `app.recipio.local.next` / 既有 `-PrecipioSignedNext=true`。
本轮A候选工具失败即停，不自动猜密码、切B或生成新身份。

## 执行安排与验证

1. **入口核对**：main/分支/状态/历史公有证书/已声明位置，保留所有原密钥和数据。
2. **私人工具**：双击启动独立NoProfile控制台；安全输入、无日志/命令行明文密码；
   仅子进程env或已验证stdin传递。强制转录策略存在则失败关闭，不修改系统策略。
   现代7zip26.05固定工具摘要，先生成普通测试文本验证AES256/加密文件名/真实解密/错误密码拒绝。
3. **云端无密钥正式构建**：产品checkout固定main SHA，生产WebView及隔离检查；
   构建A路线unsigned Release26/`0.11.0-personal.1`及27/`0.11.0-personal.2`。
   26仅为合成升级种子，27是唯一最终候选；公开manifest固定实际字节哈希、包名及版本。
   检查非debuggable、非testOnly、确实unsigned，无Showcase/Fake夹具混入。
4. **用户私密步骤**：旧身份验证、受限个人副本、独立密码AES256备份、真实恢复、
   恢复密钥签名。先zipalign后apksigner，证书精确绑定；失败/取消不产生假成功或换身份。
5. **签名后独立回读**：证书、包名、版本、哈希和非debug/testOnly；只读取非敏感公开结果。
6. **纯合成设备增量验证**：归属明确的干净模拟器、Release安装/核心入口、
   可安全执行的旧版升级、同真实身份26→27、备份预览/取消/恢复、G5/G6/G7与IME/Back。
   内存不足4GiB不启动本地重型构建/模拟器；不操作其他项目的设备或进程。
7. **集中交付**：唯一最终APK路径和小型报告，区分历史证据、新unsigned构建与真实签名APK运行。
   不自动发送安装包、安装手机或开始真实迁移，等待ChatGPT独立审查。

## 状态与停止规则

执行证据、RED→GREEN、构建Run和精确状态写入
[R1_PERSONAL_RELEASE_REVIEW.md](R1_PERSONAL_RELEASE_REVIEW.md)。
本轮不把G7 Debug重签包冒充正式Release，不把历史1503/189/25当本次Release运行证据。
真实手机/OEM、TalkBack、系统字号、性能、飞行模式进程冷启动及个人迁移未执行时保留NOT_RUN。
G4整体继续PENDING；旧R1双离线/云签名方案仍为历史延期项，本次R1-P另行授权。

最终只按真实结果使用：`RECIPIO_R1_PERSONAL_SIGNED_APK_READY_FOR_REVIEW`、
`RECIPIO_R1_PERSONAL_OWNER_ACTION_REQUIRED`或`RECIPIO_R1_PERSONAL_BLOCKED`。
