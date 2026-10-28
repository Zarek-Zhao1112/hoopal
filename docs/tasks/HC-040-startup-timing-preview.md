# HC-040 · 启动停留与展开节奏预览

- 日期：2026-10-27；状态：`completed`。
- 用户在确认重复开场消失后，希望球搭页面停留更久、动画更慢，要求看效果。仅交付独立效果图及可播放对比，正式1.22.1/手机仍1400ms，不改源码/版本/安装。
- 关联：[命名与节奏讨论](../design/app-icon.md)、[HC-037](HC-037-hoopal-startup-preview.md)、[HC-039](HC-039-single-startup.md)。

## 设计与接口

默认推荐2400ms：品牌静止1000ms、展开1100ms、收尾300ms。画框/画面在前1000ms保持静止，展开15%后名字才开始淡出，75%展开处消失，即1165–1825ms；2100–2400ms交接更衣室。继续使用原smoothstep前后减速、批准头像与冰川蓝/银灰/浅木。对比预设1400ms保原250/850/300及330–890ms标题淡出，避免将新时序套到旧版冒充当前效果。

在`artifacts/design/hoopal-timing-preview/`交付index.html/preview.css/preview.js/overview.html，不覆盖旧预览。主预览默认2.4秒，提供1.4秒/2.4秒切换、重播、暂停、进度拖动、跳过与三静态阶段。`window.hoopalPreview`保play/pause/seek/finish/reset/getState/ready，新增setPreset('current'|'relaxed')（默认reset/暂停，用户切换按钮可自动播放）；getState含preset/holdMs/expandMs/revealMs/durationMs/timeMs/phase/playing/rafActive。

支持?embedded=1纯舞台、?autoplay=0、?preset=current|relaxed、?time=毫秒。静态对照推荐1000/1550/2400ms。四尺寸及360×400的品牌与画框不重叠，已知极短屏用紧凑横排；不把旧HC-037重叠带回新预览。外部说明工具页允许自然纵滚，纯舞台无整页溢出，控件可达。减少动效直接结束，后台暂停、resize不重播、切preset/重播清旧RAF。无真实存储/网络/正式业务导入，不伪造保存。

## 分工与验证

- ui独占新预览四文件；可只读复用HC-037视觉，修复新预览短屏布局。主控独占render-preview.mjs/PNG/基线和任务设计索引，负责真实Chrome验证与打开预览。
- interaction_design独立只读源/报告/图检，独占本任务review/index，不运行Chrome或改实现。
- 验证真实自然播放而非只seek：2400ms实测、前1000ms画框/图标/文字静止、展开/标题/收尾连续中间帧及最终停止；1400ms旧预设实际对比、切换中取消/旧RAF/进度、pause/resize/skip/hidden/reduced。至少四尺寸+360×400三阶段及控件命中，无破图、外网或存储。截图亲看/独立审查，正式源/Android配置/版本基线hash保持，清理仅本轮测试进程/profile。

普通预览不构建APK或重复正式业务回归；交付可打开HTML和阶段图，所选参数仍待用户确认后才实施正式变更。

## 实现与真实浏览器结果

新目录四文件已冻结；默认relaxed 2400ms与current 1400ms切换，按钮与进度max/阶段时间同步，API切换先暂停/归零并取消旧RAF。新的极短屏字标横排/画框保安全区；首次图检又发现360×400空柜被旧空态slot压扁，主控仅在新预览改左右空态和柜体125px高度上限，保可用按钮、只隐藏非交互caption，正式App未改。

最终Chrome11770 exit0，[报告](../../artifacts/design/hoopal-timing-preview/verification.json)21布局通过（五尺寸三阶段、resize、四种外围控制页与减少动效）；推荐自然145 RAF/2413.4ms，前1000ms的60个真实样本画框/画面/品牌位置完全不变且品牌opacity=1，展开/淡出有连续中间态，最终2400停止。current自然85 RAF/1403.6ms通过。实际preset按钮、切换旧RAF取消、1000ms同刻快慢差异、pause/continue/seek/resize、skip、真实后台Target及reduced均通过，errors/remote/failed空。

100项正式前端/数据/图标/原生MainActivity与theme/vector/版本基线hash全部保持。主控亲看[三阶段](../../artifacts/design/hoopal-timing-preview/overview.png)、[极短屏](../../artifacts/design/hoopal-timing-preview/360-start.png)、[工具预览页](../../artifacts/design/hoopal-timing-preview/preview-page.png)，头像/字标/柜体/导航完整。ui静态/内存RAF自查与主控实际Chrome证据分别记录，未冒充APK/真机验收。

[可播放HTML](../../artifacts/design/hoopal-timing-preview/index.html)已用autoplay=0在用户浏览器打开，可点重播/两档对比；[静态对照HTML](../../artifacts/design/hoopal-timing-preview/overview.html)展示1000/1550/2400ms。仅清本轮headless/profile，保留用户可见窗口。独立审查收口后本预览完成；正式1.22.1仍1400ms，不安装或修改手机。

[独立终审](../reviews/HC-040-startup-timing-preview.md)已通过并交权，无未修P1/P2；审查者核两档时序/实际render-clock夹具及前1000ms60真实帧静止、重算100正式hash，亲看overview和极短屏柜体比例，修复已verified。未运行Chrome/ADB或构建，不冒充设备或正式部署；本轮预览必需交付/验证/审查齐，标completed，正式参数仍待用户看效果后确定。
