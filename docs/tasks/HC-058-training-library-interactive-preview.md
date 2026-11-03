# HC-058 · 训练场战术库与二级标题交互预览

- 日期2026-11-02；状态`completed`（独立交互预览交付）。用户看过[HC-057两组图](HC-057-training-library-header-concept.md)，现要求可点击网页体验交互。
- 仅独立本地预览，不改正式1.28源码/存储/APK或手机，不发布外网。使用Sites技能的local-only流程，复用现有本地JS/SVG，不安装依赖。主控协调/启动/验证/Git，preview_ui实现独立页面，preview_review只读审查。

## 所有权与接口

preview_ui独占frontend/previews/training-library/（index.html、preview.css、preview.js及必要局部模块），可只读import共享模板/体型分类、现有SVG绘图/播放器/球衣/衣柜，无正式app/storage/platform入口。主控独占scripts/qa/check-training-library-preview.mjs、新本地启动脚本scripts/preview-training-library.mjs、任务/设计/文档和artifacts/qa/hc058；review独占docs/reviews/HC-058-training-library-interactive-preview.md及索引，不实现生产/原型/测试。

用HTTP提供原生ESM，支持?embedded=1全视口测试。默认桌面居中手机尺寸并提供页面外少量体验说明，手机自适应一屏，页面不纵向滚动、面板/长列表内部可滚。window.hoopalPreview={ready,state()}，state至少含view（locker/training/my）、route（main/body/teams）、modal、phase（closed/opening/open/closing）、teamId、mode、bodyType、templateId、framePosition、playing、expandedId、previews数组（id/playing/rafCount）。只暴露预览内存，不访问真实数据。

可验证控件统一data-action：nav[data-view]、library-open、library-close、library-kind[data-kind]、library-card[data-template-id]、library-use、body-open、body-type[data-body-type]、body-apply、back、teams-open、team-use[data-team-id]、team-manage、team-create、training-toggle/restart/speed/loop/step；可加语义清晰的局部action。稳定根#preview-app、#library-dialog、#secondary-header、#page-card，主训练场/各卡预览有真实SVG。所有可见按钮应有有效行为或明确示例说明，不伪造真实保存/账号/云功能。

## 必需体验

三底栏更衣室/训练场/我的，无独立库tab。训练场静态战术名旁单一战术库按钮，真实26套模板可播放、暂停、步骤/倍率/循环；打开库暂停并保当前位置。玻璃库450ms浮起/背景逐渐模糊，顶部固定标题/关闭，人数+整体体型、攻防、默认收起的叠卡，展开一张即真实循环预览，换卡停旧RAF；明确选用才改变主训练战术并从头，取消不改变主战术/步骤。

更衣室含一柜/虚构队员球衣及挑选战术快捷入口。更换体型进入独立二级页：标题/返回在主玻璃卡上方、保状态栏下留白，卡内只内容；纯体型3人/4人选项，应用仅在预览内存记住该示例队偏好，返回取消保原偏好/训练状态。我的→球队管理同样卡外标题，使用虚构三人/四人球队，切队使库按当前人数筛选；管理/创建可用内存示例表单或明确预览说明，不能写正式Storage。

浮层关闭期间继续背景锁、Tab隔离、Escape/返回优先关顶层，恢复触发控件焦点；遮罩/关闭与快速连续点击不留下幽灵层，减动效即时或极短完成。后台/离页暂停时钟，不catch-up；关闭销毁卡内RAF。固定页标题和面板自身固定标题区别清楚，不重复同一大标题。

## 保护与验收

根组件不访问Storage/IndexedDB/Capacitor，不fetch用户记录/发送网络消息。所有队伍仅内存示例，示例修改不能被称为用户真实保存。正式代码/素材/配置先取SHA，完成后逐项一致；不构建覆盖dist、不装APK、不碰ADB。新增页面源与QA随既有Git同步，生成截图/本地工具和私有备份不入库。

真实浏览器检查3导航/库面板/选卡取消保主Play/明确选用/体型取消和记忆/3与4过滤/卡外标题/快速关闭/Tab/Escape/焦点/自然中间帧与背景blur/真实循环与后台暂停，覆盖390×844、360×640、360×400、844×390、1024×768，实际控件中心命中和主页面无溢出；拦截记录Storage/IndexedDB/外部请求为空。独立审查后给用户本地URL并实际打开，保留用户预览服务器（与QA临时服务器分开），提供重启命令；QA自有Chrome/临时服务完成清理。

## 交付结果

- 源码：[HTML](../../frontend/previews/training-library/index.html)、[样式](../../frontend/previews/training-library/preview.css)、[交互](../../frontend/previews/training-library/preview.js)。默认训练场，底栏更衣室/训练场/我的；战术库同一面板，三/四人示例队、纯体型、进攻/防守和26套真实内置战术。卡片默认收起，单卡展开循环、点球场暂停/继续；明确选用才重置主训练，取消保精确进度。
- 体型选择与球队管理标题在主卡上方；玻璃浮层标题在面板内。球队创建、管理与成员姓名配置均实际更新预览内存，刷新重置。更衣室成员用箭头/圆点切换；本原型未增加球衣手势拖动，不作为该手势的验收。
- [启动脚本](../../scripts/preview-training-library.mjs)：`node scripts/preview-training-library.mjs`，默认4188，冲突自动换空闲端口，以打印URL为准。原生ESM须HTTP访问，不直接双击HTML。已实际打开`http://127.0.0.1:4188/frontend/previews/training-library/index.html`并得到HTTP200；仅绑定本机。用户预览服务保留供体验，与已清理的QA临时服务分开。
- [可复用浏览器检查](../../scripts/qa/check-training-library-preview.mjs)由独立16项断言整理，执行`node scripts/qa/check-training-library-preview.mjs`；每次自建正式源SHA基线，报告/截图进artifacts/qa/runs，finally清理自有Chrome/HTTP/profile。独立补验的真实完整周期、26套目录与真实切tab隐藏证据另见审查记录，不用合成pagehide替代。

## 验证、审查与限制

[独立审查](../reviews/HC-058-training-library-interactive-preview.md)16项＋补充3项＋真实后台2项有效检查通过，无未修P1/P2。五种指定尺寸实际中心命中及无页面溢出通过；450ms开合自然中间帧、closing背景锁、Tab/Escape/焦点、旧RAF销毁和非零小数进度取消保持均有浏览器证据。完整周期cycle=1/RAF1；实际document.hidden=true时主训练/卡片暂停、返回不追赶。Storage/IndexedDB/fetch/XHR/Beacon拦截调用、远程请求与浏览器错误均为空。

创建表单4v4显示与提交人数不一致的静态问题在浏览器验证前已修，修后实际创建4v4通过；不声称有旧版浏览器复现。首次切tab在focus emulation开启时未真正隐藏，是测试前提失败，原证据保留；关闭focus emulation后实际隐藏补验通过。主控另图检390×844与360×400截图。

正式206份代码/素材/配置与开始前SHA逐项相同。未改存储键/数据、默认打包入口、dist、APK或手机；没有迁移、真实保存、登录/云接入或原生Back/物理手势验收。当前任务完成指网页可供讨论，不将正式接入或真机验收算作完成。

主控复用检查16项通过，记录artifacts/qa/runs/hc058-2026-11-02T09-50-52-752Z/results.json；随后只将合成pagehide项目的报告名称标清，无行为修改。文档检查142份Markdown/1264个本地链接、导入检查158模块/358相对依赖均无错误。用户预览HTTP200，服务继续保留用于本轮体验。

2026-11-03用户要求继续，正式接入由[HC-059](HC-059-training-library-release.md)跟踪；本预览源码仍仅内存示例，不混称正式数据验收。
