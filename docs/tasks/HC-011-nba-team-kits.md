# HC-011 · NBA 球队选择与球衣联动

- 状态：`awaiting_device`（开发、独立审查、浏览器与 APK 已完成，已安装冷启；原生完整交互待验）
- 授权：用户批准队徽、球队颜色替换为 NBA 球队，球衣一起更换，并确认改动效果图。
- 设计：[NBA 球队与更衣室球衣](../design/nba-team-kits.md)
- 基线：1.7.0 / code9；新机 `ef473680` 已安装。旧档案不得删除。

## 分工

| 负责人 | 写入范围 | 工作 |
| --- | --- | --- |
| 主 agent | 设计 / 任务、官方队徽资源、team-assets.js、构建配置 / 版本、E2E、集成文档 | 下载并检查官方资源、集成、验证与指定手机更新 |
| engine | data/nba-teams.js、shared/lineups.js、tests/unit/nba-teams.test.mjs、tests/unit/lineups.test.mjs | 30 队静态数据、可选 nbaTeamId 与旧数据兼容测试 |
| ui | frontend/src/lineups/ui.js、styles.css、新增 jersey.js，可必要修改 locker-room.js | 分页选择器、草稿确认 / 取消、真实徽章和所有球衣联动 |
| interaction_design | docs/reviews/HC-011-nba-team-kits.md | 集成后独立审查，默认只读源码 |

接口见设计；共享文件更改需主 agent 协调，禁止并行构建 / Chrome。

## 验收记录

- [x] 数据与旧存储兼容、所有 NBA 球队 / 素材验证。
- [x] Chrome 前端 30 队分页选择、取消 / 确认 / 保存 / 重启，旧档案保留。
- [x] 3v3 / 4v4 更衣室与配置 / 推荐中的球衣一致，职责不受影响。
- [x] 自动化、六屏真实 Chrome、离线 / 导出验证。
- [x] [独立审查](../reviews/HC-011-nba-team-kits.md)完成，无可复现 P1 / P2。
- [x] 新 APK 签名 / 资源校验、只更新新手机 `ef473680` 并确认包版本与冷启。
- [ ] 原生手机手势 / 输入 / 旋转 / 分享完整人工验收（未做不得声称通过）。

## 当前进度

实现交付：30 队稳定目录和可空 nbaTeamId；旧记录保留且读取不写盘；真实徽章与代表球衣离线打包。选择器 12 队 / 页，确认仅进来源草稿，保存才生效；取消 / Back / 放弃均保留正确来源数据。创建要求显式选队，旧档案保持中性且仍可推荐。界面主题、用户成员、号码、能力与球场职责不变。

主控 119 项单元通过；3 项 HTTP 因沙箱 EACCES 首轮失败，允许本机连接后仅重跑三项通过，共 122 检查。实际 Chrome 完整通过，包含 30 个真实徽章全部加载、三页六尺寸（360×640、390×844、844×390、1024×768、1280×800、1440×900）、按钮中心命中 / 无上下溢出、选队草稿取消 / 确认 / 放弃 / 保存重启、保留姓名号码与旧档案不写盘；原二十套战术、真实触摸更衣室、推荐 / 来源切换故障、离线播放与 PNG / JSON 导出继续通过。无运行异常或远程请求。

独立 reviewer 执行 60 组队别 / 人数 UI 链、60 次推荐不变对照、124 件实际 SVG 及局部定义安全、30 资产 hash / XML、坏档案与读锁夹具，并亲看批准图与六张页面图。Node UI 夹具模拟 Vite URL，实际加载由主控 Chrome 验证；执行者与限制见审查记录。

## APK 与新手机

- 版本 1.8.0 / versionCode 10，包名 com.halfcourt.tactics。
- 产物 `artifacts/apk/halfcourt-debug.apk`，SHA256 `da91e0b3d2b07f604d48431a7b079563d7fdfd244e64a88c147197f9bfdc9054`。
- Gradle assembleDebug、APK v2 签名验证通过；27 个网页资源与最终 dist 逐项 SHA256 相等，没有 server.url。部分小 SVG 内联在 JS 中，其余作为本地资产打包。
- 重新检查 adb devices，仅向新手机 ef473680 / M2101K9C 覆盖安装，返回 Success；强制停止后启动 Status: ok / COLD，版本 / code / PID / 前台核对通过。
- 更新前后该机没有阵容存储文件，均为 0 档案；未写入示例成员，未复制旧手机数据。只读检查报告 `artifacts/qa/hc011-device-before.json`、`hc011-device-after.json`。
- 实际前台截图 `artifacts/qa/device-1.8.0-new-phone.png` 主控图检通过。Chrome 选队图 `artifacts/qa/nba-team-picker-phone-page-1.png` 至 3；更衣室 `nba-locker-BOS-phone.png`。

待用户在新机实际操作选队 / 保存恢复、右左滑动、键盘、系统返回 / 旋转、断网冷启与系统分享。安装 / 截图不替代这些功能验收。

## 后续文案微调（2026-10-23）

用户要求去掉演练标题下「内置战术 · 本地离线演练」。已从 HTML 初始状态和正常保存路径移除，空状态不占行；真实读写 / 清理失败仍显示提示。JavaScript 语法检查及 Vite 构建通过，尚未生成或安装新版 APK。用户同时提出讨论页面切换动画，当前仅讨论圆形扩散等方向，未实现动画；待动效选定后一同打包。上述 1.8.0 APK 哈希与设备证据对应此前已安装的产物。

该文案后续已随 [HC-012](HC-012-page-motion.md) 的1.9.0打包安装，圆形扩散与最终左拖下一位方向同批交付；前段保留当时讨论阶段记录。
