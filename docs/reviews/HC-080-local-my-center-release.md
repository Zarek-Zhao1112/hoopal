# HC-080 独立审查

日期：2026-11-06。审查者 `hc080_review` 未实现本轮页面、样式或测试，仅修改本记录。

## 范围与方法

静态读取正式 HTML、外观协调与设置适配、档案视图、本机说明卡 / 面板、local-center 与原页面 / 主题样式、向导创建 / 取消 / 保存控制器、读取锁入口、Vite 版本 define 和 npm / Android 版本。本轮不运行 ADB，不进行设备操作；浏览器执行结果由主控提供，不能记作审查者独立实测。

## 发现与处置

### P2 · 宽屏工具区继承旧 grid-row 造成按钮不可命中

- 位置：`frontend/src/lineups/views/local-center.css` 的 `@media(min-width:600px)` 工具区规则，与 `frontend/styles/primary-page-headings.css` 原「我的」工具区 `grid-row:3` 规则。
- 触发：1024×768 打开「我的」，主控正式 Chrome page-layout 发现本机使用按钮 `fit:true`、`hit:false`。
- 原因：新工具区行号选择器 `.lineup-local-center > .lineup-account-tools` 优先级低于带 body 外观路由条件的旧 `.lineup-account-page > .lineup-account-tools`；工具区进入新两行布局的隐式第三行。
- 影响：桌面 / 平板「本机使用」按钮可能被遮挡，页面表面可见但无法点击。
- 建议修复：对新布局工具区使用带 `#lineups-panel` 的选择器，明确位于第一行，检查横屏与平板。
- 修复：宽屏工具区规则改为 `#lineups-panel .lineup-local-center > .lineup-account-tools { grid-column:2; grid-row:1; }`，优先级覆盖旧路由规则。
- 复验：审查者重新读取修复源码与主控正式 [Chrome 三组结果](../../artifacts/qa/runs/1.35.0-1793930100274/run.json)，page-layout / glass-sheet / account-center 全部通过。样式负责人 [24 页布局证据](../../artifacts/qa/hc080-styles/layout.json) 在 1024×768 的玻璃 / 写实、空队 / 4v4 四种组合均为 toolsGridRow=1，全部按钮 fit / hit 为 true，未发现文字越界；P2 已修复并复验。

另发现新增回归辅助函数曾选择第一个 `.appearance-toggle:not(:disabled)`，高手机屏会取到隐藏的 header 按钮。已向主控反馈；主控确认改为可见选择器。此为验证脚本定位问题，不属于正式功能缺陷。

## 其余静态结论

- 新创建按钮直接调用原 `beginCreate`，记录入口 section / route。取消恢复来源页面，已有草稿由原 draftStore 继续；保存后仍走原持久化与转到更衣室。UI、控制器和 session 都保留 20 队上限。
- `ui.js` 在 `readLocked` 下优先展示读取失败 / 重试页，新增创建入口不会在未知旧数据时出现。新视图只读 model 和 draftStore，不调用存储。
- 队员名与号码来源为当前真实球队，用 DOM 文本写入而非 HTML 拼接；四人队按 players 全量呈现。长名 CSS 省略并保 title。
- 账号身份、备份入口及对应面板内容已从正式源移除；两个保留说明入口无网络 / 存储调用，仍沿用共享面板背景隔离、关闭和复焦机制。内部 account 命名保留不代表存在身份状态。
- 外观逻辑保先读取 / 单次保存 / 成功后更新；失败不切换界面，不改球队或进度。纯图标有随目标更新的 aria-label / title，symbol 和根 SVG 都保 24×24 viewBox，按钮 flex 居中。
- 新样式用 lineup-local-center 限定，球队管理主列表布局未被套用；写实色彩覆盖与原按钮状态共用。新增样式没有使用 WebView 96 不支持的 :has() 等选择器。
- package / lock 1.35.0、Android versionName 1.35.0 / versionCode 44 一致；Vite 从包版本生成说明页版本文案。

## 边界

当前没有未修复的发布阻塞。审查者读取并核对正式 [本机中心证据](../../artifacts/qa/runs/1.35.0-1793930100274/hc046-account-center.json)：48 页布局按钮均 fit / hit、无整页溢出，35 次说明面板开合与隔离 / 复焦，说明页不写存储、球队切换失败重试、保留草稿与取消均记录通过。正式三组的 errors / remoteRequests 为空，独占临时目录已清理。另读取主控 `artifacts/qa/hc080-release-capture.mjs`，确认 4v4 双外观截图使用正式页面，20 队禁用创建的断言直接读取真实按钮。

这些浏览器动作由主控 / 样式负责人执行，本审查仅核对其证据，没有重复运行。主控报告 1.35.0 / code44 APK 已构建；设备安装、原文 hash 与真机功能由主控后续在任务记录分项补充，审查者未进行 ADB 操作。用户手动观感与触摸体验另记。
