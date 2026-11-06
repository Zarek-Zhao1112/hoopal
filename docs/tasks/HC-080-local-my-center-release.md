# HC-080 · 本机「我的」与纯图标外观按钮正式接入

状态 `awaiting_device`。2026-11-06 用户批准 HC-079 图标居中修正版；1.35.0 / code44 已保数据安装手机并核对实际界面，等待用户手动体验。

## 范围与接口

- 设计依据：[HC-079](HC-079-local-my-center-concept.md) 及其居中修正版截图；最新产品决定覆盖旧账号中心方向，见 [本机中心设计](../design/local-my-center.md)。
- 三个主页右上角统一纯图标外观按钮。保外观独立键、先读后写、串行与失败保护；提供可访问名称及目标外观提示。
- 「我的」突出真实当前球队、人数和队员，等宽管理 / 创建按钮，创建走原向导，草稿、上限和读取失败保护保持；下部只提供本机使用、关于球搭，去掉账号和云备份占位。
- 主控负责 JS、HTML、版本 / 文档、回归、APK 和设备；样式 agent 独占 appearance-locker.css / appearance-theme.css / account-center.css / 新 local-center.css。集成后另派未实现代码的 agent 独立只读审查。

## 数据与验收

不改变档案 schema / 键、角色、来源或战术存储，不新增业务服务器。沿用说明面板的隔离 / 返回 / 焦点机制。

核对玻璃 / 写实、3v3 / 4v4 / 无球队 / 多球队、长名、短屏 / 横屏 / 平板的可点击布局，真实创建取消 / 保留草稿、球队切换失败重试与面板不写盘；外观切换无文字、居中、保存失败保旧值。运行相关检查与独立审查，构建 APK，安装前备份手机真实档案与进度，覆盖安装后核版本 / 原文 hash，检查实际 WebView 和截图。设备人工体验另记，未获用户反馈保留 awaiting_device。

## 实现与检查结果

- HTML 与协调器接入纯 SVG 按钮，两个根 SVG 及 symbol 均保 viewBox；辅助名称跟随目标外观。新页面显示真实 current profile 和所有队员，直接复用原管理 / 创建 / 草稿入口。两说明面板删除账号和云备份内容，版本从 package 经 Vite define 生成。
- 主控 JS / 版本、样式 agent 独立 CSS，随后 [独立审查](../reviews/HC-080-local-my-center-release.md)。发现 1024×768 工具区旧 grid-row 选择器覆盖，已修选择器优先级并复验。没有未修发布阻塞。
- 265 项单元 / HTTP 集成检查通过；26 套 / 91 职责 / 体型和进攻偏好校验通过。
- [正式 Chrome 三组](../../artifacts/qa/runs/1.35.0-1793930100274/run.json) page-layout / glass-sheet / account-center 全过，errors / remoteRequests 为空。包含 48 个双外观页面布局、35 次说明面板、创建保留 / 继续 / 丢弃、外观失败保原值与重试后刷新恢复、原球队选择失败重试等。第一次旧 CSS 导致平板入口失败已保留记录 `artifacts/qa/runs/1.35.0-1793929929468/`。
- 样式负责人源码 Chrome 独占会话 24 页覆盖空队 / 长名四人队、六尺寸、双外观，记录 `artifacts/qa/hc080-styles/layout.json`。主控另拍 [正式玻璃4v4](../../artifacts/qa/hc080-release/glass-4v4.png) / [写实4v4](../../artifacts/qa/hc080-release/realistic-4v4.png)，亲看与批准图一致，并实际加载 20 队验证新创建入口禁用。各会话临时目录 / 进程均已清理。
- Android 最终构建成功；[1.35.0 APK](../../artifacts/apk/hoopal-1.35.0.apk)，SHA-256 `b9a429d4aa63023e029cfa654301fc01f0de72c7756dcfc243ee17bb1fedc8fe`。

## 真机交付

指定 M2101K9C / ef473680，1.34.0 → 1.35.0 / code44，install -r 成功，冷启动 615ms。安装前确认无打开向导 / 已显示的保留草稿 / 忙态，并即时备份一支真实球队。证据 `artifacts/qa/hc080-device/`。

安装前后球队原文 SHA-256 均为 `cc6103d3fd35f00c7a16549a7c3dbaf69a1d83452f6508018af9a86ca77c229f`；战术进度均为 `fbbec19c9bd474935f66f1e08633b2d707c102ba8d708ed78fd4cd2e3f310623`。没有写入示例队或测试角色。

实际 WebView 393×819 核对两外观，图标中心偏差约 0px，管理 / 创建均 132×40px，四入口均 fit / hit，无整页溢出；两说明可开闭、管理返回正常。已亲看 [玻璃手机截图](../../artifacts/qa/hc080-device/native-glass.png) 与 [写实手机截图](../../artifacts/qa/hc080-device/native-realistic.png)，恢复原写实偏好并停在「我的」。这些为真机程序 / 截图证据，4v4 使用浏览器样例验证；物理手势、系统返回 / 旋转及用户观感仍待手动确认。
