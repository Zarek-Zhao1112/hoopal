# HC-037 · 球搭 HOOPAL 启动展开预览审查

- 日期：2026-10-27；状态：`completed`（独立预览审查）。
- 审查者：interaction_design，未参与实现。结论：无阻断或未修 P1 / P2，可交付静图及可播放HTML。
- 范围：[合同](../tasks/HC-037-hoopal-startup-preview.md)内命名 / 启动视觉提案，不代表正式App更名或Android启动效果已接入。

## 独立检查

只读检查 [index.html](../../artifacts/design/hoopal-startup-preview/index.html)、[preview.css](../../artifacts/design/hoopal-startup-preview/preview.css)、[preview.js](../../artifacts/design/hoopal-startup-preview/preview.js)、[overview.html](../../artifacts/design/hoopal-startup-preview/overview.html)及最终报告。

- 自动时钟按250 / 850 / 300ms分段呈现1400ms一次展开，画框扩展、内部缩放、标题上移淡出与末段更衣室出现分别计算。完成后停止rAF，不循环自转。pause / seek / reset / finish递增generation并取消旧帧；继续重建时间锚，不把暂停或后台时间计入进度。resize仅重测几何并按原时间重绘；ready自动播放有手动操作优先守卫。
- 结束前room为aria-hidden，全部按钮真实disabled / tab-1，1400ms才启用；skip直接结束。减少动效默认直达末态，手动seek仍可比较静态阶段。空柜没有伪造用户档案，任意示例业务操作明确说明仅预览、不读取或保存；训练仅为未来方向，没有接入全场 / 训练业务。
- 独立Node夹具直接执行实际时钟函数：重复play仅一条rAF，暂停 / 继续不跨计暂停时长，过期回调不能清新rAF，seek暂停，1400ms自然停止及rAF归零，实际hidden处理分支暂停，reduced播放直接结束均通过。此为函数级验证，不冒充浏览器渲染 / Android生命周期。
- 独立读取production-before.json，对全部92个正式文件重新计算SHA256，均与基线相同。源码无Storage、远程请求、正式模块导入或依赖安装；正式1.21.0 / APK及手机未改。

## 图片及主控浏览器证据

亲看最终 [三阶段总览](../../artifacts/design/hoopal-startup-preview/overview.png)、[横屏末态](../../artifacts/design/hoopal-startup-preview/844-room.png)与[外围工具页](../../artifacts/design/hoopal-startup-preview/preview-page.png)。头像及HOOPAL / 球搭字标清晰，起始窗口、中途展开、最终空柜 / 四导航可区分；末态卡片和入口完整，没有将静图当作动态证明。

核对主控Chrome session94720 exit0的 [verification.json](../../artifacts/design/hoopal-startup-preview/verification.json)：18布局；四尺寸产品舞台起始 / 中途 / 末态均无整页或舞台溢出。外围工具页按合同允许纵向滚动，无横向溢出，逐个scrollIntoView后控件fit / hit通过；实际重播 / 暂停 / 继续 / range输入 / skip / 跳到末尾和演示说明均有路径验证。

自然播放85个实际rAF样本，末样本elapsed约1406.7ms、内部timeMs=1400，画框到全视口、scale归1、标题透明、更衣室opacity=1、playing=false / rafActive=false。真实Target切换后台、seek / resize、快速重复及减少动效通过；errors / remote / failed / Storage均为空，报告92正式基线保持。Chrome和实际交互执行者为主控，审查者只核报告、源码、夹具和静图。

## R1 · P2：短横屏外围工具控件被裁切（主控发现，已修）

原外围工具页在844×390等短窗口沿用body overflow:hidden，说明 / 重播 / 进度区无法完整到达。最终CSS对非embedded、非overview的宽≥701 / 高≤950窗口使用满屏舞台及自然纵向文档滚动，工具区置于其下；手机外围工具页同样可纵滚，embedded产品舞台仍保持一屏。

独立复读最终CSS及合同范围细化，核对第三轮报告844×390工具文档高953px、横宽844px，allowDocumentScroll=true且全部控件实际滚到后fit / hit通过；没有借裁切隐藏控制。R1标为 `verified`，不将外围工具滚动误记为产品舞台溢出。首轮resize即时读旧几何是QA缺少两rAF事件屏障，补后未改产品几何，不另写成业务修复。

## 边界与结论

无剩余需修复问题，本轮无需构建 / 安装APK或设备验收。审查者未运行Chrome、ADB或构建；自然时序、后台Target切换与控件命中由主控执行。预览参数仍是讨论提案，不能将桌面动画、静图或本记录视为Android启动 / 手机物理性能验收。
