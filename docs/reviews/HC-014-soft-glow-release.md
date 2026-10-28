# HC-014 600ms 柔光扩散正式接入独立审查

日期：2026-10-23。状态：独立源码、夹具与实际中间帧图检通过，未发现可复现 P1 / P2；主控浏览器、APK 校验、新机覆盖安装 / 冷启与实际 WebView 96 程序点击通过，完整物理交互仍为 `awaiting_device`。任务：[HC-014](../tasks/HC-014-soft-glow-release.md)，设计：[页面动效](../design/page-motion.md)。

## 范围与结论

interaction_design 未参与实现，只维护本审查文档。已只读审查 `frontend/src/workspace/{soft-glow.js,page-transition.js,page-transition.css,controller.js}`、主样式导入与导航层级，并对照用户批准的 `artifacts/design/soft-glow-preview/index.html`。

正式 sampler 与批准预览的三段半径 / 光晕一致，默认 600ms。旧快照使用新页 alpha 的反向羽化，真实新页保持同步、可用；光晕为空的独立 div，和快照同为 z4、插入其后，真实导航仍为 z5。快照全后代 pointer-events:none!important 保留，控件真实 disabled / tabIndex=-1，closed shadow 与 ID / SVG / CSS 引用隔离仍在。没有本轮存储 / 推荐 / Play 迁移。

## reviewer 独立证据

未运行 Chrome、adb 或构建。以下内联 Node 夹具读取实际代码，使用最小 DOM / 受控时钟；未修改实现或新增持久测试文件：

- 直接提取批准最终 HTML 的 inspect，与正式 sampleSoftGlow 在 10001 点逐字段比较，最大误差为 0；阶段、单调半径、0 / 1 端点、首末光晕 0 均一致。100 / 450ms 左右物理速度差小于 1e-7，符合 C1 连续。
- 调用实际 createPageTransition / reveal / rAF：六视口分别采样 100 / 300 / 450 / 525 / 600ms，共 30 个实际 paint 输出，半径、阶段 / 光晕与 sampler 一致，默认 duration=600、起点旧 mask 为 none / 光晕为 0。
- 旧 mask 的 alpha 停点为 0 / .066667 / .623529 / 1，分别与预览新 mask 的 1 / 238÷255 / 96÷255 / 0 互补，误差小于 1e-6；停点位置同为 0 / .32 / .72 / 1。羽化按短边缩放并限于 36–72px。最终半径减去半羽化仍超过全部视口角点，旧页完全透明后再移层，不依赖最后一帧硬切补洞。光晕颜色 / 相对停点与批准预览对应，整体 opacity 来自 sampler。
- 11 种双层取消 / 失败情形：resize、orientationchange、visualViewport resize、pagehide、hidden、motion、超时、主动 cleanup、paint 抛错、无导航原点、支持状态在 prepare 后失效。每种均无 host / glow / rAF / timer 残留。另模拟 body.append 仅插入 host 后抛错，未留下孤立层。
- 快速切换删除旧 host / glow，只保留新 ticket 的一对层，旧 ticket 无效；beforeNavigate 拒绝不改真实 view，接受后同步生效，控制器打开菜单同步清两层。
- 带显式 SVG pointer-events=stroke 的真实快照经过生成样式后，PostCSS 确认全后代 none!important；源 path 仍为 stroke。样式 AST 确认两个视觉层同 z4、pointer-events:none!important，光晕为空且 aria-hidden。最小 DOM 不执行真实 CSS 命中算法。

## 图检与主控浏览器证据

reviewer 亲看 `artifacts/qa/hc014-soft-glow-phone-mid.png`：旧阵容顶部与下方新木球场间可见宽柔化边缘 / 淡光，底部导航清楚、位置稳定，符合批准的 C 柔光方向。图对应 `hc014-motion-metrics.json` 中单独的 sample 项：progress=.5275、radiusProgress≈.641979、glowOpacity=1、stage=expand，实际 computed mask 和光晕均有多停点。截图只证明这一中间帧视觉，不证明整段帧率或精确时长。

root 执行并报告 134 项单元与 3 项 HTTP，共 137 项通过；最终真实 Chrome 原有战术 / NBA / 阵容 / 推荐 / 手势 / 离线 / 导出回归通过。转场 18 个方向 / 六尺寸检查两层、600ms 曲线字段、实际命中与取消 / 清理均通过。reviewer 未独立运行浏览器。

reviewer 只读汇总同一指标文件，排除单独 sample 项后为 18 个捕获样本、每次 815 节点；准备耗时 5.4–20.7ms、平均 10.25ms。这是桌面浏览器的快照准备耗时，不是帧率、动画总时长或手机性能承诺。

## APK 与指定新机证据

以下由 root 执行并报告，reviewer 未构建、安装、运行 Chrome / adb 或亲看本轮设备截图，仅只读核对 JSON：

- 1.10.0 / versionCode 12 构建完成，v2 签名、27 个 dist / APK 资源逐项 SHA-256 一致、无 server.url。APK SHA-256：`49ea5d47d3c7914cfce77a4ddbe3a25394ed401df6a2f0bc8e744f2c00b17a8c`。
- 仅指定新机 ef473680 覆盖安装，install -r 返回 Success，启动返回 `Status: ok` / `LaunchState: COLD`。reviewer 核对 `artifacts/qa/hc014-device-before.json` / `hc014-device-after.json`：设备相同、文件存在且均为 1 份用户档案，更新前后 SHA-256 均为 `c625afadf07cfc09ccccf552e3b5dff77e66ca072d53c4dc9c497166a9759758`；after 记录版本 1.10.0 / code12、前台与档案保留。
- reviewer 核对 `artifacts/qa/hc014-native-motion.json`：真实 WebView 96 通过程序 DOM click 依次切到 play、library、lineups；三例均为 effect=soft-glow、duration=600、maskSupported=true、glow 存在、navHit=true，包含实际多停点 mask / halo 与中途曲线字段；最终 clear=true、reason=complete，两层清除。
- 三次记录均为 731 节点，captureMs 分别 90.7 / 80.6 / 80.7ms。这些是实际设备快照准备耗时，不是 FPS 或物理手势流畅度验收。报告明确执行方式为程序点击，未作为真实手指操作通过。

## 限制与待验范围

当前没有待修 P1 / P2。上述夹具不能替代实际羽化 / 光晕像素、元素命中、读屏 / 焦点遍历、动画合成或手机性能。原生 MutationObserver 的 dialog open 清理路径已读源码，尚未由本夹具模拟通知。实际 WebView 96 的三次程序点击证据已补，但不能由这几次运行、源码或桌面浏览器推断全部兼容与全段流畅度。

完整物理触摸、输入法、旋转、系统返回与原生分享等人工验收仍待执行，任务保留 `awaiting_device`。安装冷启、程序点击、桌面图检与手指操作分开记录，不以其中一种代替另一种。
