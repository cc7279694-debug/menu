# RECIPIO R1-P — 个人正式版执行证据与审查记录

2026-10-27。当前：**RECIPIO_R1_PERSONAL_OWNER_ACTION_REQUIRED**。
无密钥Release及私人辅助工具准备完成；真实私人备份和签名尚未执行，不代表正式APK已生成。
政策和范围见 [R1_PERSONAL_RELEASE_PLAN.md](R1_PERSONAL_RELEASE_PLAN.md)。

**当前唯一工具入口：E:/RECIPIO-Signing/Start-RecipioPersonalSigning.cmd。**
旧E:/CODEX/Tools/recipio-signing/R1-P是下文的历史交付位置；完整公开工具包已迁走，
旧路径不留可执行别名。当前仍无正式签名成功回执，不能把公开预检当作签名成功。

## 已核对的入口

- 远端main：`19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe`，与本次授权相同。
- 工作分支：`release/recipio-personal-signing`；复用已隔离的原G7工作目录。
- 起点干净，旧G7验收登记 `b70617b` 和独立验收文件保留；不覆盖后续主线进展。
- 初始空闲内存3.10GiB，低于4GiB；本地不启动npm安装/完整测试、浏览器、Gradle或模拟器。
- 只读取项目证据和已声明位置，不扫描无关项目、全盘或凭据库。

## 已完成准备 / 私密操作待执行

- 路线A公开身份核对：旧v23 APK SHA-256为
  `522a943fdbc320cace07396a2344b609975c97471724603539257ed64bd96f58`，
  官方apksigner验证成功，公开证书精确匹配
  `29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9`。
  已知旧候选文件存在，本轮不读取其私钥、不代输入密码或测试真实签名。
  用户密码掌握/私钥可用性尚待独立私密工具验证，A仍是候选，不自动切换B。
- 已声明个人副本/备份目录尚不存在；这不是全机不存在其他身份的断言。
- 现代7zip26.05可执行文件SHA-256重新核对为
  `7ddf0a3bc451e166679296be630d6f0573eb386159c04184761c43020c484291`；
  真实工具信息包含7zAES/AES256CBC，与历史已核验工具一致。
- 私人签名辅助工具：36项原安全/真实合成归档测试、22项新增安全回归、2个全FAKE生命周期均PASS；根代理在最终实现重新执行并读取结果。
- 固定main源码的云端unsigned Release26/27：最终CI40483620703三个Job全部SUCCESS，产品SHA19bb不变；详见下文。
- 真实私人副本/加密密钥备份/真实恢复/个人签名：**NOT_RUN — OWNER PRIVATE ACTION**。
- 正式签名APK的安装、旧版升级、同身份26→27及备份/功能增量验证：**NOT_RUN**。
- 实体手机/个人数据/旧版卸载或清理：未操作且未获本轮自动操作授权。
- 真实AI调用：0；长期私钥/密码/可还原签名材料上传GitHub：0。

目前没有可交付正式候选；历史G7调试包不属于R1-P正式Release。
G4整体PENDING，G5～G7限定冻结不变；本次政策不重写历史R1双离线备份要求。

## 路线A必须如实披露的身份性质

候选沿用已有Android调试签名身份，不能把个人副本改强密码描述成生成新身份或吊销旧副本。
正式Release构建的debuggable/testOnly与签名证书名称是不同检查；本轮将分别验证。
旧源密钥不被修改，个人副本/备份不会消除仍持有旧私钥副本的风险。
本方案面向个人自用，不等于商店发布、独立离线灾难恢复或旧手机数据升级已经通过。

## 无密钥工具的测试先行记录

新增APK/manifest契约14例初始全部因未实现的行为stub失败；工作流门禁初始5失败/1通过。
实现后根代理重新执行 `node --test scripts/personal-release/*.test.mjs`，20/20 PASS，
并完成现有actionlint与差异格式检查。未安装本地npm依赖、运行Gradle或调用真实AI。
CI仅由本次无密钥工作流/构建校验脚本变化触发；私人本地辅助脚本单独变更不重跑相同产品构建。

首轮CI `40481320300` / 工具提交 `64fb9db8ce5eb3cd77e8fa029a3027b404ca5e81`：
固定main的17文件/347项定向测试PASS，TypeScript/Lint（5既有警告）/构建隔离PASS；
G6浏览器33与G7浏览器29组PASS。Android Release26编译成功，但独立ZIP条目校验以
UNSAFE_ENTRY拒绝继续；未发布该轮未通过检查的输入。后续通过有界诊断定位具体条目，
没有按猜测跳过检查。正式签名、真实密钥备份和设备验证仍未运行。

诊断轮CI `40482951579` / 工具提交 `6eac3cbf8623c761ef1db24b48aaa51c91d67432`
明确定位为Release资源 `res/9N.9.png` 与 `res/9n.9.png` 被检查器错误折叠。
APK ZIP按原始大小写区分路径，且不提取为Windows文件树；新增这两个真实字面路径的用例
观察RED后，最小修正为按原始路径检测重复。完全相同条目、遍历、非法字符、过长、
签名/测试项等拒绝仍保留，23项契约测试GREEN。未修改生产APK内容或备份容器白名单。

私人辅助工具预审发现并已修补三项：PowerShell JSON日志策略未覆盖、复用已有私人文件
的叶子reparse/显式ACL未独立检查、复用已有AES容器未证明头部加密。
新增22项测试先6PASS/16真实RED，修补后22GREEN：使用合成策略JSON、实际生成的
EveryoneAllow文件/junction及真实mhe=off负例，不修改实际系统策略或接触真实私钥。
两级JSON与注册表策略在密码输入前失败关闭，语义参照
[PowerShell官方配置说明](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_config?view=powershell-7.5)。
私有叶检查在修改父目录ACL之前执行，现有备份/新备份/恢复叶均接入；原始旧源不改ACL。
无密码、错误密码均不能列出备份条目，随后才用正确密码验证恢复。
限定内部安全复核无新增阻断；这不是ChatGPT独立验收或真实密钥保管证据。

## 最终固定main的云端证据

[Run40483620703](https://github.com/cc7279694-debug/menu/actions/runs/40483620703)，
工作流/校验工具提交 `81aa1a29353ac87350c07831e46c0fbe75f458db`，三个Job全部SUCCESS。
产品checkout始终为 `19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe`；后续仅添加本地工具/文档。

| 项目 | 本轮实际结果 |
|---|---|
| G5/G6/G7定向JS/TS | 17文件/347 PASS，0失败/跳过；不是重新执行全仓1503 |
| TypeScript/Lint/Web构建/隔离 | PASS；5项既有Lint警告，正式模块324、Showcase/fixture资源0 |
| 当前main浏览器 | G6厨房33组、G7收录29组PASS；外部Provider/HTTP均Fake，非签名APK运行 |
| Release variant JVM | 22 suites/189 PASS，0失败/错误/跳过；JVM_RELEASE_VARIANT_ONLY |
| 正式Release26/27 | sync、lintRelease、assembleRelease及官方aapt/apksigner/apkanalyzer检查PASS |
| Release属性 | app.recipio.local，debuggable=false、testOnly=false、allowBackup=false，确实unsigned；无测试定义/夹具或Showcase混入 |
| 非敏感签名工具验证 | 36原测试+22安全回归+2个FAKE owner流程PASS，与产品测试分开登记 |

历史G7的1503JS/189JVM/25Android是已冻结证据，不冒充本次正式签名APK结果。
公开输入元数据保留于 [personal-unsigned-manifest.json](evidence/personal-unsigned-manifest.json)。
下载后重新计算两份文件的实际大小和SHA-256，与云端元数据完全一致：

| 内部构建输入 | 实际bytes | 实际SHA-256 |
|---|---|---|
| 26 / 0.11.0-personal.1 | 15145000 | 76332b9f9d48d01c1482d0b200a1b09046f1709f825211fe2e48e83dbfad7973 |
| 27 / 0.11.0-personal.2 | 15145000 | bd2f8de400bda3714e006f4421eff494516bc8668b048a4a0222b07c77678e17 |

两份文件真实位于工作目录 `output/playwright/r1p/ci/40483620703-unsigned/unsigned/`，
不是可安装交付物；26仅内部升级种子。最终只输出签名后的27，**目前未生成，故没有最终签名APK大小/哈希**。
没有从G7 Debug重签包制作Release，没有执行旧的云端真实签名Job，没有使用或上传GitHub签名Secrets。

## 用户独立私密工具交付点

工具包：`E:/CODEX/Tools/recipio-signing/R1-P`。
入口：`Start-RecipioPersonalSigning.cmd`，由用户本人在文件资源管理器双击。
密码不得交给Codex/ChatGPT，不能在Codex捕获终端中代输、写入argv/配置/日志或剪贴板。
不用技术命令；私密窗口会逐项提示旧密码、新副本密码和独立备份密码。
若不知道旧密码，Ctrl+C取消，只反馈错误类别或不知道旧密码，不猜测、不换身份。

运行文件实际SHA-256（复制后逐一回读一致）：

- 模块：`dd6621bc2884e1d6aa23d378f035e4c39d94cc43ec5f7f5b49789af24d12d55a`。
- `.ps1`入口：`bf0e7f9f41024deb75a62c05809f9525472a026010a5851f446a49e77cc1ec80`。
- `.cmd`入口：`8a475fa71114bb6e9886d7ad91174f8fd1947699b06cc295d3a018dbe42babad`。

实际构造公开manifest并验证三运行文件、6个静态工具与两份unsigned APK哈希、包名、版本、
unsigned状态及仓库外位置，结果PASS。没有调用真实owner入口；个人副本根目录、
加密备份根目录及OWNER_RESULT均尚不存在。一次本地验证命令因相对模块导入方式失败，
未当作通过；已改绝对路径、Stop错误策略重新验证成功，不涉及真实密钥。

用户成功操作后，只读取 `delivery/OWNER_RESULT.json` 和公开签名APK做独立回读。
该工具结果仅为SIGNED_LOCAL_STATIC_VALIDATED_PENDING_DEVICE，不能代替下列签名后门禁。

## T01～T06：剩余门禁与NOT_RUN

### Owner follow-up — 2026-10-27

后续真实重试现已留下公开失败回执：UTC2026-10-27T12:45:24.5435346Z，
类别 `R1P_TOOLCHAIN_HASH`。没有OWNER_RESULT、签名APK或既定私人根目录。
根代理重新逐一读取manifest内六个**公共工具**的SHA-256，当前全部与原pin一致；
运行文件与bundle摘要也一致，直接Get-R1Toolchain通过。未改任何pin或更换工具。

另外分别在捕获环境和新-NoProfile独立Console对实际公开前缀连续复测3次，
以及局部名字/默认值污染对照，均未复现。工具条目/路径/摘要类型和长度正常；
非管理员检查进程与Explorer同SID，六文件及27个相关祖先无Deny/reparse/EFS，
当前该用户可读。以上是本轮只读证据，不证明失败时的窗口状态相同，
也不能将失败解释为算法污染、权限差异或工具已被改写。
**真实错误已知，但具体工具、失败分支与根因仍UNKNOWN / NOT_REPRODUCED。**
因此仅增强固定工具/原因诊断；不跳过校验，不盲目更新摘要，不把诊断增强称为根因修复。

限定诊断增强已完成：Get-R1Toolchain仅拆分为固定六工具名及ENTRY/PIN_FORMAT/
MISSING/READ/HASH类别，READ丢弃原异常；原SHA算法、六pin及固定7zip身份不变。
原实现上先观察2PASS/35FAIL，修订后37PASS；原75项工具回归也重新PASS，合计112。
根代理独立重跑37项、核对实际结果和真实公开六工具通过；限定安全静态复查无新增阻断。
记录见辅助工具目录TOOLCHAIN_DIAGNOSTICS_TEST_RESULTS.txt，不是产品测试或签名证据。
新模块摘要为 `c94f0699c1ca47af0fdfc1861eb98b78b9b8c29ba823793e609c2c0289bbe65c`；
PS1/CMD仍为16eedcf2/47fb555b。已复制到仓库外工具包并验证公开manifest/运行文件摘要，
所有工具路径及pin保持原值。私人签名、备份、设备等仍NOT_RUN。

### Latest owner retry: Java path missing — 2026-10-27

真实公开回执UTC2026-10-27T14:59:11.6780283Z明确为
`R1P_TOOLCHAIN_JAVA_MISSING`；用户确认没有密码提示。仍无OWNER_RESULT、签名APK或
既定私人根目录。原C盘Java/keytool在Codex中存在且摘要正确；不能据此声称已解释
owner窗口为何不可见。未读私钥、未修改权限、未改原SDK、未盲目改变任何摘要。

为移除对外部C盘公共SDK路径的依赖，在仓库外工具包内准备完整同版本工具快照：
JDK490文件、Android Build Tools36的170文件、独立7za一文件，合计661文件/
488418625bytes；E盘事先有约69GB可用。来源和目标树拒绝reparse及意外身份文件扩展，
每一复制文件的大小/SHA-256与来源逐一匹配，保留JDK/Android相邻DLL、配置及许可证。
所有六工具的版本和原pin均未改变，manifest仅将六个公共工具路径改至
E:/CODEX/Tools/recipio-signing/R1-P/toolchain；没有在仓库提交这些二进制。

更新后全新独立Console的完整公开预检PASS，包含真实unsigned APK及普通测试文本归档；
另在与owner相同的受限子进程环境执行便携keytool-help和apksigner-version，均PASS，
未提供keystore参数。Source/helper不变，不重跑或冒充112项工具/原产品历史结果。
公开摘要见[personal-portable-toolchain.json](evidence/personal-portable-toolchain.json)。
这只是已验证的公共工具配置修复，不能证明真实owner步骤已成功。
进一步对两份**公共java.exe**使用GetFinalPathNameByHandle，并在打开的公共句柄上计算
摘要：逻辑C:/Users/CDD/AppData/Local/RecipioAndroid/...实际指向
C:/Users/CDD/AppData/Local/Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/RecipioAndroid/...；
E盘快照的请求路径与实际路径一致。两者公开Java摘要都匹配原pin。
已观察到Codex侧AppData重定向，结合owner窗口JAVA_MISSING支持本次路径修复；
未在owner窗口执行相同句柄API，不扩大为所有私有目录的结论。
**上文历史“私人根目录不存在”仅是Codex逻辑视图的Test-Path结果，不能独立证明
owner侧目录或密码流程状态**；继续以用户反馈、公开成功/失败回执作为验收依据。

快照初始继承Authenticated Users:Modify，连相邻JDK DLL/modules也可被其他本机用户写入；
六exe/jar pin不能替代依赖目录保护。已只对自己创建的整个公开bundle789对象建立
owner/SYSTEM-only受保护ACL并逐项回读，随后重新校验全部661快照文件，摘要均匹配。
不修改原SDK、私人密钥目录或共享祖先的权限。为避免共享祖先可被重命名替换，
经卷根ACL核对后将整个公开包同卷Directory.Move到**E:/RECIPIO-Signing**：
目标原先不存在、不覆盖、不留旧可执行别名；E:对非受信用户没有DeleteChild/
WriteDac/WriteOwner，全部789对象的owner/DACL/reparse及文件摘要迁移后再次通过。
manifest仅更新工具绝对路径，版本、六工具pin、三runtime及APK摘要均未变。
最终新独立Console公开预检PASS。私人密码/备份/签名及T01～T06仍NOT_RUN，
下一步仅由用户在新受保护目录普通双击CMD并在私密窗口完成操作。

用户最初报告私密操作完成，随后明确更正：未看到结果路径，仅按Enter关闭了窗口，
可能并未成功。实际回读：既定公开delivery中没有OWNER_RESULT或签名APK，
预定个人副本和备份根目录不存在。未读取原始私钥或私人备份内容，不将关窗记为成功。

另用全新独立Console执行严格限定的**无密钥公开预检**：Console/日志政策、
仓库外路径、公开manifest/运行文件/静态工具摘要、两份unsigned APK及合成普通文本
归档预检全部PASS；在Get-R1OwnerPaths及任何私人目录创建之前停止，privateOperations=0。
这排除了本次该公开预检路径的确定性失败，但不能倒推用户第一次窗口的错误类别。
第一次错误未留存，具体类别仍UNKNOWN；不猜密码、不生成或更换身份。

已确认的辅助工具交互缺陷是失败仅显示于瞬时窗口且共用Enter关闭提示；需保留
严格脱敏的失败类别并明确区分失败/成功。原隐私门禁、身份绑定和签名后T01～T06
不降低；真实备份、恢复、签名、Android安装与升级仍全部NOT_RUN。

已在辅助工具范围内测试先行修补：4项行为RED（独立控制台启动、明确失败关闭提示、
捕获入口失败记录、fake异常失败记录）→ 新增15项GREEN；36原契约/合成归档、
22安全回归及2个FAKE生命周期重新运行均PASS，合计75项工具检查。
根代理独立重新执行15项新增检查PASS，并读取其余实际执行结果。
测试入口均使用临时副本与fake owner替换，不运行真实owner；CMD启动仅静态检查。
公共失败记录严格限制为formatVersion/status/category/createdAtUtc，不写异常原文、
行文本、私人路径、密码或Native输出；GUID+CreateNew防覆盖，拒绝仓库、网络和reparse路径。
原Console/日志政策/身份/私钥边界未放宽；限定内部静态安全复查无新增阻断。

本机公开工具包已更新并回读manifest及三运行文件摘要一致：

- 模块：`96ec6de5a57f0c800ba1cea36fec4d3ffe5c4d706c7e11b6e097a31c282388b8`。
- PS1：`16eedcf22eaaa6e2611226f334cc6202adc8a3cfef471aa828b1bc9a095d3631`。
- CMD：`47fb555bfdb0b57286c6031cd1b8c763e209f9ca2dd5a06c0c3da0de51528b7f`。

上文dd6621等摘要是首轮公开交付的历史快照，本段为本次重试工具的实际摘要。
产品/工作流/两份unsigned APK及其摘要不变，不重复原产品云端构建。
此时内存复测3.20GiB，未启动本地Gradle、浏览器、模拟器或任何设备操作。
下一步仅由用户本人双击仓库外CMD，等待提示后输入密码；无论成功或失败，仅回复
已重试，由Codex读取公开结果。没有OWNER_RESULT仍不能认定已签名。

| 验收项 | 当前状态 |
|---|---|
| T01包名/版本/Release属性 | unsigned输入检查PASS；真实私钥对应证书、签名、恢复验证尚NOT_RUN |
| T02正式签名版安装与启动 | NOT_RUN，等待owner生成真实签名候选后在归属明确的合成设备执行 |
| T03旧版同证书合成数据升级 | NOT_RUN；当前手机版本、备份及旧手机实际升级均未确认，不自动安装 |
| T04同真实个人身份26→27覆盖升级 | NOT_RUN；不能用云端临时签名或纯模型测试替代 |
| T05正式签名版Backup2合成数据导出/预览/取消/明确恢复 | NOT_RUN；旧R1/原G7相关测试是历史证据，不冒充此项 |
| T06正式Release增量体验 | 上述main JS/浏览器/构建PASS；真实签名APK设备运行仍NOT_RUN |

实体手机/OEM、TalkBack、Android系统字号、实体性能、飞行模式进程冷启动、
原生图像像素呈现及真实个人数据迁移均NOT_RUN。真实个人.recipio备份不进入聊天、日志或CI。
旧v23/v25未被安装、卸载、覆盖或清除；源密钥不改写，未生成新身份、未作真实签名。
G4继续PENDING；旧R1双离线/云签名方案作为历史延期项保留，本轮R1-P另行授权。

下一次继续：用户本人完成私密工具 → 核对公开签名/恢复结果 → 在安全资源和归属门禁下
执行合成设备T02～T06 → 只交付唯一正式候选供ChatGPT独立审查。
没有合并main、创建PR/Tag/Release、公开下载链接或自动向用户发送APK；没有进入G8。
