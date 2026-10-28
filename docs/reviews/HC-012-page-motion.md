# HC-012 圆形扩散与更衣室手势独立审查

日期：2026-10-23。状态：独立审查完成；首轮 Chrome 发现的 P2 已修复并复验，无剩余 P1 / P2。最终方向为左拖下一位 / 右拖上一位，主控浏览器、APK 校验、新机覆盖安装 / 冷启及 WebView 96 程序点击转场通过；新版物理触摸等完整人工验收仍为 `awaiting_device`。任务：[HC-012](../tasks/HC-012-page-motion.md)，设计：[圆形扩散与更衣室滑动](../design/page-motion.md)。

## 范围与结论

interaction_design 未参与实现，只维护本审查文件。已阅读任务、设计并只读审查 `frontend/src/workspace/{page-transition.js,page-transition.css,controller.js}`、`frontend/src/lineups/locker-room.js`、主样式导入 / 导航层级与 app 集成路径。

实际目标页面同步生效，转场仅保留不可交互的旧页视觉层；使用 closed ShadowRoot 隔离应用查询，并重写 ID、相关属性 / SVG 引用与样式。旧层 z-index 4、真实导航 5；旧导航隐藏但保留布局。动画失败 / 不支持遮罩 / 系统减少动态效果时降级即时切页，没有改变存储、推荐或 Play 协议。

setView 仍同步返回 boolean 并更新真实 view；beforeNavigate 拒绝时不切换、不准备快照，同页不再次触发 onViewChange 或动画。旋转 / resize / visualViewport、后台、减少动态效果、快切和控制器弹窗路径可清理旧层 / rAF / 超时；原生 dialog open 另由 MutationObserver 监听清理。

## reviewer 独立证据

未启动共享 Chrome、构建 APK 或运行 adb。内联 Node 夹具加载实际导出模块，使用最小 DOM 和受控 rAF / 定时器执行，不新增实现或测试文件：

- 14 组转场行为：closed shadow 与原 DOM 查询隔离，快照 ID 前缀、href 片段、CSS ID / 属性选择器与 SVG url(#...) 引用对应，CSS 相对资源 URL 基于原样式文件解析；输入值 / checked 复制，按钮 / 输入真实 disabled、tabIndex=-1，autofocus / 内联事件移除。原节点仍以原 ID 可查询，不出现第二个应用 SVG。
- 同一夹具验证 rAF 完成清理、超时清理、快速切换只保留新 ticket、过期 ticket 无效；resize / orientationchange / visualViewport resize / pagehide / hidden / motion 清理；不支持、隐藏、减少动态、已有弹窗、无样式时不创建快照。控制器拒绝导航不动、真实视图同步更新、同页不重播、控制器打开菜单立即清层。
- 六尺寸 × 三个原点共 18 组纯几何检查：扩散半径覆盖四角，原点限制在视口内。最小 DOM 不计算实际布局或遮罩像素。
- 按用户最终方向重新执行两种人数、球衣 / 铭牌本体 / 姓名 span / 徽章 img 共 8 组双向手势：左拖下一位、右拖上一位，场景位移与手指同向、柜位 DOM 按成员正序、选中后 transform 与索引一致；拖后 click 被抑制且未打开姓名检查。另有 2 组全成员首尾 / 提示语遍历、8 组 pointercancel / resize / 纵向拒绝 / destroy，均不误提交；普通轻点仍检查姓名，号码 23 / 1 / 7 / 99 不影响成员序号。

原生 MutationObserver 通知、浏览器命中 / 焦点遍历、遮罩实际合成、CSS 真实尺寸和设备性能没有由本最小 DOM 模拟；对应路径源码已审查，仍需主控真实浏览器 / 设备证据。CSSOM 缓存与完整旧页克隆的耗时也不能由 Node 夹具代表。

## P2：快照内 SVG 路线仍参与命中

位置：`frontend/src/workspace/page-transition.js:109`；实际来源为 `frontend/src/app.js:258` 的透明路线命中 path，显式设置 `pointer-events="stroke"`。

主控首轮 Chrome 在 360×640 演练 → 战术库期间，以 elementFromPoint 检查真实按钮时，被快照路径遮挡，命中的 shadow host 没有按钮 ID。原实现只有 host / body 的 pointer-events:none；子路径的显式 stroke 能覆盖继承值，故 closed shadow、aria-hidden 和表单 disabled 不足以保证整个 SVG 快照不命中。这是此前最小 DOM 不能覆盖的真实浏览器问题，不能以此前源码 / 夹具无发现掩盖。

root 修复为 shadow 样式 `*,*::before,*::after{pointer-events:none!important;…}`。reviewer 新增内联夹具：真实 SVG path 带显式 stroke 命中属性进入快照；调用实际 prepare 后用 PostCSS 解析实际生成的 shadow 样式，确认全后代与伪元素均有 none + important。该作者样式的 important 声明优先于 SVG presentation attribute，且原真实 path 仍保持 stroke，没有改变实际演练命中。夹具通过；最小 DOM 不执行 CSS 命中算法。root 随后报告真实 Chrome 全部原阵容按钮命中检查通过，并在最终转场专项核对真实导航 / 新页命中。该 P2 记为已修复并复验，浏览器执行者为 root。

## 用户滑动问题与已证明的修复边界

用户起初报告「第一位向右无效、向左才切换」。原方向计算、反序柜位与 translate 自洽，不能仅凭球衣 1 号认定处于序号第一位。早期真机 CDP 曾读到 index 0 / 球衣 1，但当时应用后台，无响应的注入命令没有作为有效手势证据。

另外查明的 DOM 缺口是：原通用 button guard 会拒绝从铭牌 / 徽章起滑。engine 为 `lineup-inspect-locker-name` 开放手势，普通控制仍受 guard 保护，维持点击检查与拖动抑制；该补强独立复验通过，但没有证据将它指定为用户最初操作的唯一根因。

root 后续取得真实用户手势，最新 `artifacts/qa/hc012-device-human-gesture.json` 覆盖末段观察；reviewer 已只读核对完整事件链：旧版右拖 dx 约 +210 后索引 0 → 1，接着从索引 1 左拖约 -177 后回到 0，最终 scene.index 为 0。这排除了当时旧方向下「第二位无法左滑回首位」的底层回滑故障；此前仅首位左拖未换人的观察是早期部分证据，不再作为最终诊断。

用户随后在明确箭头问答中选择「← 手指从右向左拖，切到 2 号」。这项新授权覆盖原右拖下一位约定，最终实现改为 dx<0 下一位、成员正序、transform 为 `12-(index+1)*76%`，首位右拖 / 末位左拖阻尼，边界提示同步为左拖下一位 / 右拖返回。reviewer 已按此标准独立重验；旧版日志只说明旧行为确实工作，不代替用户最终意图或新版本设备验收。

## 主控浏览器与 APK 证据

以下由 root 执行并报告，reviewer 没有运行 Chrome / 构建 / adb：

- 128 项单元（含 9 项 locker）与 3 项 HTTP，共 131 项通过。最终完整 Chrome 按最新方向从球衣、铭牌实际 touch 左拖下一位 / 右拖上一位通过，原 NBA、档案、推荐、20 套战术、离线与导出回归通过。
- 转场专项 18 组尺寸 / 方向覆盖原点、半径、350ms、单层 closed shadow、无重复 ID、真实导航命中、完成清理、快速切换最后意图、同页、resize / pagehide / modal / reduced-motion，全部通过。测试曾调整 resize 事件等待，不记录为产品缺陷。
- APK 1.9.0 / code11 Gradle、v2 签名、27 项 dist / APK 资源哈希与无 server.url 核对通过。SHA-256：`ef7759eea70af0c063ecb729547a7d86b4fa7d261fd22472e0d4bde553c6babd`。

reviewer 亲自查看 `artifacts/qa/hc012-circle-phone-mid.png`：旧阵容页与新演练页之间有从底部导航方向扩展的圆弧边界，玻璃导航仍可见；单帧证明中间视觉，不证明时长或整段流畅度。另亲看 `manager-roster-4v4-390-844.png`，成员第一位、湖人球衣 / 姓名、详情及「第一位 · 向左滑看下一位」提示一致，主要入口仍可见。

reviewer 只读汇总 root 的 `artifacts/qa/hc012-motion-metrics.json`：18 个浏览器样本均为 815 节点，captureMs 最小 6.3ms、最大 48ms、平均约 12.59ms。这是主控桌面浏览器的克隆准备耗时，不是帧率、不是低版本手机耗时，也不能外推所有档案数量 / 页面内容的性能。

## 设备证据与限制

以下由 root 执行并报告，reviewer 未安装、运行设备命令或亲看本轮设备截图，只读核对报告 JSON：

- 仅指定新机 `ef473680` 执行 1.9.0 / code11 install -r，返回 Success；am force-stop 后启动返回 `Status: ok` / `LaunchState: COLD`，版本、PID 和前台归属确认。root 亲看 `artifacts/qa/device-1.9.0-new-phone.png` 为原有鹈鹕档案 / 球衣 1 号，首位左拖下一位提示已显示，没有写入示例。
- reviewer 核对 `artifacts/qa/hc012-device-before.json` 与 `hc012-device-after.json`：同一设备更新前后阵容文件均存在、count 均为 1，SHA-256 均为 `c625afadf07cfc09ccccf552e3b5dff77e66ca072d53c4dc9c497166a9759758`；after 记录版本 1.9.0 / code11 和 foregroundVerified。这是本次已有用户档案的字节保留证据。
- root 在实际 WebView 96 通过程序 DOM click 执行 lineups → play → lineups。reviewer 核对 `artifacts/qa/hc012-native-motion.json`：cssSupported=true，曾为 running，完成原因为 complete、layer=false，返回阵容页后也已清层；statusHidden=true。最终报告为 731 节点、captureMs=71.3；root 另报告一次 63.4ms。这里是快照准备耗时，不是帧率或全段动画耗时。
- root 亲看 `hc012-native-play-settled.png` 为真实演练稳定画面，常驻文案已移除。`hc012-native-circle.png` 实际截到结束画面，不能列为手机圆形中间帧；本轮真实中间帧图检证据仅为桌面 Chrome 的 `hc012-circle-phone-mid.png`。

以上程序 DOM click 不是物理触摸。ADB 标准 input 被系统拒绝 INJECT_EVENTS、CDP Input 无回复的尝试均未记通过；旧版真实用户两方向日志仅为调查证据，新版左拖下一位的实际手指操作尚未再次验收。

任务保留 `awaiting_device`：仍待新版物理触摸、输入法、旋转、系统返回、原生分享及完整人工交互。浏览器模拟、旧页图检、APK 编译、安装冷启、设备程序点击和用户手指操作分别记录，不互相替代。
