# HC-059 · 训练场内战术库与二级标题正式接入

日期2026-11-03，状态`awaiting_device`（正式实现、自动检查、APK及指定手机安装/程序检查已完成，人工手势与观感待确认）。用户在[HC-058交互预览](HC-058-training-library-interactive-preview.md)后要求继续，正式接入该交互。

## 范围与保护

三底栏更衣室/训练场/我的；训练名称静态，旁边战术库按钮。相同玻璃库支持更衣室挑选入口，450ms浮起/背景模糊，固定标题/关闭、人数/体型/攻防、默认收起单卡真实循环，明确选用才切主战术并归零暂停；打开先无取整暂停，取消保精确进度。无队或独立浏览允许3/4切换，不向错人数队写偏好；球队入口严格同人数。未知体型可先浏览全部，再独立页选体型；按HC-056保存成功才返回候选，失败保选择与错误。

更换体型完整二级页、球队管理完整二级页的标题/返回/上下文置主玻璃卡之外，上方留白。浮层标题仍在浮层里。球队CRUD、草稿/脏编辑、原生Back、后台暂停与来源清除协议沿用。保26套动画/角色元数据/版本、存储键/schema2/旧计划；不加账号/云/个人战术或数据迁移。

## 所有权与接口

- 主控：app.js、frontend/index.html、workspace/controller.js、全局布局、构建/版本、文档、最终集成与安装证据。
- library_ui：selection/内JS/CSS，可新建其子模块；不改app/index/存储。保持createTacticSelectionUI参数/render/open/close/pause/setVisible/handleBack/isOpen/isModalOpen接口，新增isBodyPage及只读state可选。root是workspace内完整二级页，玻璃dialog由组件建到body并标data-lineup-owned=true以避开workspace普通弹窗管理。onModalChange整个开合隔离期为true；onClose仅最终退出流程调用，内部换体型不调用。onAction沿用body-type与play-tactic并以布尔成功为准；onInspect沿用。source=team锁人数；source=library可切人数且不同队不落盘。默认展开目标为空，不自动更换主战术。
- headers_ui：lineups/ui.js、views/archives.js及新局部样式；球队管理独立route，保持真实CRUD/草稿/返回，标题卡外。不改共享配置/app/selection。
- tests：tests/e2e/与新scripts/qa/check-training-library-release.mjs；基于新可见交互更新既有流程，保留真实断言与数据保护，不改实现/共享构建。浏览器执行待主控完成构建后协调，不同时修改dist。
- review：集成后由未实现相应代码的agent只读审查，独占docs/reviews/HC-059-training-library-release.md。

## 验收

单元/构建/HTTP、完整浏览器及五尺寸实际中心命中；真实循环/旧RAF销毁、后台暂停无追赶、取消精确位置保持、来源解除失败不换战术、偏好写失败保选择/重试、3/4过滤与异人数不落错队。Tab/Escape/焦点/closing隔离与快速点击、减少动效；卡外标题真实几何、短屏内部滚动。原生APK离线配置/版本/签名检查与设备验收分别记录；未取得真机确认保留awaiting_device，不以浏览器替代。

构建目标1.29.0/code34。先完成可审查源码/浏览器，再构建APK；不清除用户数据，安装如设备条件允许沿用保数据更新。源码/文档按既有约定Git同步，artifacts不入库。

## 实现与验证进展

已接入真实三tab与库面板，不复制示例数据。selection/body-figures提取原体型SVG；未知体型可直接浏览完整目录，匹配当前队才调用原setBodyType。主训练无取整暂停，事务改为可靠清旧来源→记录明确新选择→替换Play，任一记录失败保持旧Play/小数时钟/实际SVG。我的新增teams管理route，向导保originRoute；新增两项单测保护创建取消/编辑成功返回且不丢另一草稿。

`npm test`248项通过（245单元＋3HTTP）；构建实际校验26模板/91职责/155帧及14分类。首次沙盒HTTP EACCES保留hc059-npm-test.log，提升权限同命令成功见hc059-npm-test-retry.log，不当产品故障。

独立[审查](../reviews/HC-059-training-library-release.md)先检查15项实际浏览器：五尺寸中心命中、真实完整周期/隐藏、Tab/closing/焦点、精确position＋球员/路线SVG保持，旧来源清除失败、选择记录失败、偏好失败/重试和异人数不落错队。源动画/数据/存储平台模块未改；原始独立结果artifacts/qa/hc059-review/results.json及safety-results.json。

完整回归另发现真实P2：球队管理根选择器未限定当前tab，离开管理切训练时旧标题仍显示并挤球场。失败证据artifacts/qa/runs/1.29.0-1793670141606/hc008-failure-390-844.png；已给team-management.css的管理root规则限定body[data-view=archives]并重构建，六尺寸管理→训练/更衣室已复验，独立复验另记。旧档案测试假设横屏同时容纳三卡，迁移为只滚内部列表后逐卡检查真实中心；create/pager/nav固定控件保原断言，不与真P2混记。

已开启本机实际构建网页`http://127.0.0.1:4188/dist/index.html`供查看，HTTP200；原HC058示例路径仍保留对照。此次正式网页读写浏览器本机档案，与手机资料分离。用户预览服务保留，QA临时资源分别清理。

## 最终浏览器覆盖与审查

13个大组分段全覆盖，不能表述为一次不中断的整套通过。[汇总](../../artifacts/qa/hc059-browser-coverage.json)逐组列来源：1793669658096前四组（库/启动/26套只读导出/布局）；1793670141606的档案/创建/更衣室/队徽/玻璃组队五组；修后1793670464560的六尺寸布局；1793670623581的阵容CRUD/柔光/我的/训练四组。业务JS源码与业务app bundle保持，中间仅前述管理CSS范围修复使入口资产哈希更新；受影响跨页/原管理页另由六尺寸主回归及五尺寸独立复验。所有run的errors/remote均空，自有Chrome/服务/profile已清理。失败原记录保留，不将失败run整体称为通过。

定向库12项与独立内置键失败补验分别见artifacts/qa/runs/hc059-library-1793669499354与hc059-library-1793670666721；可复用新默认库流程包含13子项。[独立审查](../reviews/HC-059-training-library-release.md)原15项＋修后五尺寸复验通过，无未修P1/P2。原列表前提失败、真实串页P2、独立夹具route前提错误分别记录；未放宽真实中心或存储保护断言。

## APK与指定手机

[1.29.0 APK](../../artifacts/apk/hoopal-1.29.0.apk)，4,837,885B，code34，SHA256 `2a9cb83508496dd07d23dee82feaebd52ae37b8975f848066d623d4d33b2ee36`。[原生构建](../../artifacts/qa/hc059-android-build.log)32秒；[APK核对](../../artifacts/qa/hc059-apk/apk.json)30网页逐hash同dist、15图标同1.28、同原v2证书/包名、无server.url通过。1.28保留作回退，未改签名或数据格式。

重新确认目标ef473680/M2101K9C，安装前即时[备份与编辑检查](../../artifacts/qa/hc059-device/device-before.json)通过（当前1队，无打开编辑/可见保留草稿提示/进行中操作；不是所有关闭草稿都不存在的证明）。install-r Success，COLD645ms/Wait652ms。真实WebView96[程序验证](../../artifacts/qa/hc059-device/native-results.json)：三导航、主训练按钮打开库、展开卡完整cycle=1/RAF1、关闭保原template/position、球队管理标题在卡外且返回，零runtime/remote，调试转发清理。未提交体型/新战术/示例球队。

[安装后严格检查](../../artifacts/qa/hc059-device/device-after.json)确认1.29.0/code34前台正常；球队原文SHA `ef9b870c7ae4beb46d8dd6ee275388f83d13ceb51a98a27a1d1c520070acf3b4`、进度SHA `116a20169ddd85f2ba67bbba685cba48d0511536b8ea48430595074ea142d1b0`均与即时备份相同。原文仅在本机忽略的QA目录，不提交仓库。

尚待用户实际触摸/硬件Back/旋转/IME与真实创建保存体验；浏览器与WebView程序检查不代替人工验收，因此保留awaiting_device。源码与文档按既有约定同步Git；不将APK/截图/本机资料入库。

收尾检查：144份Markdown/1305个本地链接、156模块/342相对导入均无错误，git差异无空白错误。用户本机预览服务保留供体验，其他自有QA服务/Chrome/profile与原生调试转发均已清理。
