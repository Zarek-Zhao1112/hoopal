# HC-011 NBA 球队与球衣独立审查

日期：2026-10-23。状态：独立源码、夹具与图检完成；未发现可复现 P1 / P2。主控已完成 APK 校验与指定新机覆盖安装 / 冷启核对；完整真机交互仍为 `awaiting_device`。任务：[HC-011](../tasks/HC-011-nba-team-kits.md)，设计：[NBA 球队与更衣室球衣](../design/nba-team-kits.md)。

## 范围与结论

interaction_design 未参与实现，只维护本审查文件。已阅读设计、任务、项目协作规则与批准效果图；只读审查 `data/nba-teams.js`、`shared/lineups.js`、NBA 资源 / 来源清单 / 获取脚本、`frontend/src/lineups/{team-assets.js,jersey.js,ui.js,styles.css,locker-room.js}`，以及原有 session / repository 与 app 集成路径。

新界面要求明确选队；旧档案缺失字段规范化为 null，继续使用中性球衣，不自动选队。保留原 crest / color 字段与 schemaVersion、存储键，不在读取时迁移写盘。球队只参与外观，未进入推荐职责、Play 或球场橙蓝职责色。选队确认仅修改绑定的创建 / 编辑草稿，保存仍走原 session 校验和持久化流程。上述范围未发现实际需求冲突、数据丢失或草稿串改问题。

已对照 [NBA 官方球队目录](https://www.nba.com/teams) 核对球队范围，并结合来源清单和实际页面图核对 30 个本地队徽的名称对应。球衣为代表性自绘版型 / 近似配色，不是当前赛季的精确复制；没有把数据文件内的近似 HEX 解释成官方色值认证。

## reviewer 独立检查

没有启动共享 Chrome、构建 APK 或操作设备。以下使用实际模块和只读内联夹具执行，不新增实现或测试文件：

- 30 队 × 3v3 / 4v4，共 60 组真实 UI 操作链。逐组验证跨页暂选、取消、重新打开、确认仅进草稿、切成员 / 分区仍保留球队、保存失败保留草稿、保存成功后成员不变，以及全部三件 / 四件球衣显示同队字样。源档案在保存前没有改变，也未触发 onAction 写入。
- 两种人数的旧档案缺失 nbaTeamId：取消 / Back 不加球队，正常配置保存后仍为 null；确认新球队后离开放弃恢复原状态。另检查未选球队的新建被拒绝，以及保留创建草稿 → 修改并放弃旧档案 → 返回创建时原名称 / 球队仍在，未串删另一来源草稿。
- 对两种人数各一份完成能力配置的阵容，分别更换 30 支球队，共 60 次推荐结果 JSON 严格相等。检查非法球队输入拒绝、缺省字段为 null，不以体型或球队名生成能力。
- 30 支球队加中性球衣，分别用号码 0 / 7 / 88 / 99，共 124 件实际 `createJerseySvg` 输出：保留号码和含 emoji、标签样式字符的姓名文本；372 个局部定义 ID 唯一，所有 url(#...) 在本 SVG 内解析，姓名没有变成 HTML / 脚本节点。
- 30 个真实队徽逐文件核对字节数、SHA-256、球队 ID / NBA 数字 ID / 官方 CDN 路径与清单一致；检查 SVG 有实际形状、无脚本 / 事件 / 外链 / 外部图片或 CSS 外部引用，并用 PowerShell XML 解析器全部解析成功。资源通过 img 使用，本地构建导入不注入外部 SVG 标记。
- 实际 repository 夹具：无效 NBA ID 的档案隔离，健康旧档案保留且 load 不写盘；备份失败不覆盖原始字节，重试后先备份原文再写；读取失败后即使适配器恢复，未成功重读前仍拒绝保存。

UI 夹具采用最小 DOM；为在 Node 加载 UI，仅将 Vite 的资源 URL 入口替换为明确的模拟本地 URL。它没有证明 Vite 实际产物能加载图片，也没有浏览器布局 / 触摸引擎；真实资源加载与六屏可达性由主控 Chrome 证据补充。SVG 文件检查覆盖实际资产，不依赖此 URL 模拟。Python 不可用后，XML 解析改用本机 PowerShell，无安装或下载。

## 图检与兼容边界

reviewer 亲自查看批准效果图和以下六张实际页面图：

- `artifacts/qa/nba-team-picker-phone-page-1.png`、`-2.png`、`-3.png`：30 个队徽分三页，名称与图形对应，选择提示、预览、取消 / 确认与玻璃导航可见；末页六队占前两行，其余留空。
- `artifacts/qa/nba-locker-BOS-phone.png`：档案与柜位为凯尔特人徽章，球衣为绿色 BOSTON，用户姓名 / 23 号与详情对应。
- `artifacts/qa/manager-roster-4v4-844-390.png`、`manager-roster-4v4-1024-768.png`：湖人队徽、黄色球衣和用户名字 / 7 号对应，横屏与平板的详情、换人和主要入口可见。

静态图片不证明所有按钮可点击。新增代码未引入 :has 或依赖原生 inert 的隔离方式；仍沿用 HC-010 输入焦点类、实际 disabled / tabIndex 和 vh 回退。WebView 96 的实际球队选择 / 图片加载 / 输入交互尚未在本轮手机上验证，不能由桌面 Chrome 或源码支持推断为全面通过。

## 主控执行并报告的证据

以下由 root 执行，reviewer 未亲自运行：

- 119 项单元检查通过；3 项 HTTP 检查在沙箱 EACCES 后于允许本机网络环境重跑通过，共 122 项。
- 首轮完整真实 Chrome：新建三人 / 四人、显式选队、取消 / 确认只入草稿 / 放弃 / 保存重启、保留成员，30 个真实队徽全部加载；六尺寸三页选择器无溢出，按钮中心命中；旧档案缺失球队字段时不写盘。原 20 套战术、触摸、离线与导出回归通过。

## APK 与设备证据及未验证范围

以下由 root 执行并报告，reviewer 未构建、安装、操作设备或亲看本轮设备截图：

- 1.8.0 / versionCode 10 Gradle 构建成功，apksigner 核对 v2 为 true，27 个 dist 资源与 APK 内资源逐项 SHA-256 一致，未配置 server.url。APK SHA-256：`da91e0b3d2b07f604d48431a7b079563d7fdfd244e64a88c147197f9bfdc9054`。
- 重新核对 adb devices 后，仅向指定新机使用 `-s ef473680 install -r`，返回 Success；am force-stop 后 am start -W 返回 `Status: ok` / `LaunchState: COLD`，版本名称 / 代码、PID 与前台归属均确认。
- root 保存并亲自查看稳定真实截图 `artifacts/qa/device-1.8.0-new-phone.png`，新界面为 0 档案空更衣柜，未注入示例档案。
- reviewer 只读核对 `artifacts/qa/hc011-device-before.json` 与 `hc011-device-after.json`：同一设备 ef473680，更新前后 lineupsPresent 均为 false、count 均为 0、sha256 均为 null；after 记录版本 1.8.0 / code10 及 foregroundVerified。原先没有阵容文件，这证明文件未凭空生成，不能称作已有用户档案哈希相等或已验证真实档案升级保留。

手机手势、球队选择 / 保存重启、输入法、系统返回、旋转、离线使用及原生分享的完整人工验收尚未执行；本轮设备证据限于安装、版本 / 冷启及空档案页显示，任务保留 `awaiting_device`。当前没有待修 P1 / P2，后续仅在实际新证据或代码变更需要时复验。
