# HC-061 · 训练场与我的一级标题正式接入

2026-11-03，状态`awaiting_device`（实现、自动验证与指定手机安装/程序检查已完成，人工观感待确认）。用户批准[HC-060效果图](HC-060-primary-page-headings-concept.md)，将两页标题放进现有顶部留白，卡外左对齐/同字号/同起线，无图标/返回/副标题；训练卡保战术名/库入口，我的卡不重复页名。更衣室品牌、二级标题及浮层标题沿用。

范围仅标题DOM/显示与响应式样式，不改26套战术、播放策略、存储键/schema/偏好/旧计划或平台接口。完整体型页/球队管理出现时隐藏一级页标题，避免重复；readLocked也要有对应页标题。保一屏/横屏/平板，不靠增加外部滚动容纳标题。

主控独占index.html、lineups/ui.js与views/archives.js、styles/primary-page-headings.css及app.css导入、版本与文档、既有受影响E2E断言。独立review agent只读实现，独占docs/reviews/HC-061-primary-page-headings-release.md/索引，可写自有QA到artifacts/qa/hc061-review，负责五尺寸标题几何/中心命中/跨页与错误态审查；不是实现负责人。无需为了小改拆分更多实现模块。

接口：#primary-page-header包含#primary-training-title与#primary-account-title，利用现有.page-top-space。lineups draw发布body.dataset.lineupRoute为只读展示标记，CSS按当前tab/route/完整体型页同时约束，不使用WebView96不支持的:has。

验收：两一级页标题卡外且几何一致，主卡/球场不因新增grid行被挤，标题在顶安全留白内；移除我的卡内重复h1，真实管理/体型二级页与更衣室无残留一级标题。390×844、360×640、360×400、844×390、1024×768，含空球队/有球队/读锁/三四人/长战术名/弹层/快速切换。针对受影响页面浏览器回归、单位/HTTP、独立审查、APK离线资源签名和保数据设备检查分别记证据。目标1.29.1/code35，人工手感未知保awaiting_device。源码/文档按既有约定Git同步，artifacts不入库。

## 实现与浏览器结果

静态标题放原spacer，保body原三行及训练卡位置/球场空间；我的账号卡去内部heading后把身份/球队/工具的各断点grid行上移，消除空行；未知schema/读取失败页也改成卡内h2读取提示，卡外仍有「我的」。route展示标记不进入存储。新标题随450ms玻璃库/账号/建队背景同步6px blur，减少动效关闭滤镜过渡。

[单位/HTTP记录](../../artifacts/qa/hc061-npm-test.log)248项通过；受影响的page-layout/account-center/training-viewing三组浏览器[同次回归](../../artifacts/qa/runs/1.29.1-1793674071366/run.json)全部通过，errors/remote为空，自有QA进程清理。首次误把--group写逗号分隔，被runner启动前严格拒绝；改为三个独立--group参数后通过，原错误hc061-browser.log保留，不作为产品失败或放宽断言。

[独立审查](../reviews/HC-061-primary-page-headings-release.md)10主项＋2个实际blur补验通过，五尺寸标题同x/y/font，训练卡/球场矩形逐项等于HC059基线；含二级页/更衣室隐藏、账号/管理入口实际中心、空队/未知schema读锁、4v4长名、真实连续600ms导航及两键原文保护。主控图检390×844训练场、360×400我的截图。首次补验关闭按钮选择器误写仅QA前提错误，修正后补充两项通过；未发生实现缺陷修复，无未修P1/P2。

## APK与手机

[1.29.1 APK](../../artifacts/apk/hoopal-1.29.1.apk)4,838,385B，code35，SHA256 `6e1724688f81dc545528bfc471832eacbbbb224f9ece66b9f367bea00276de3a`。21秒[构建](../../artifacts/qa/hc061-android-build.log)，[APK验证](../../artifacts/qa/hc061-apk/apk.json)30网页逐hash同dist、15图标同1.29、原v2证书/包名及无server.url通过。

再次确认ef473680/M2101K9C，安装前即时备份/编辑检查通过（1队，无打开向导/可见保留草稿提示/进行中操作；不证明所有关闭草稿都不存在），install-r Success，COLD602/Wait608。[真实WebView96程序检查](../../artifacts/qa/hc061-device/native-results.json)两标题均x18/y62.5、字号25px、高32.5px；训练卡top116、无内部重复我的h1；库展开标题背景blur6px，管理页隐藏一级标题、返回恢复、回更衣室正常。未提交队伍/偏好或新战术选择。

[安装后严格检查](../../artifacts/qa/hc061-device/device-after.json)确认1.29.1/code35前台正常、球队与选择两原文SHA分别仍为`ef9b870c7ae4beb46d8dd6ee275388f83d13ceb51a98a27a1d1c520070acf3b4`与`116a20169ddd85f2ba67bbba685cba48d0511536b8ea48430595074ea142d1b0`，与即时备份完全相同。原文仅留本机忽略目录；自有调试forward已清理。

人工手指/硬件Back/旋转与观感仍待确认，因此保awaiting_device；不是测试失败或未完成代码。旧1.29包保留回退，源码与记录按既有约定Git同步，图/APK/私人资料不入库。

收尾文档147份/1342本地链接、156模块/342相对依赖及差异空白检查通过。独立终审核对实现SHA/主控APK及设备证据无误，不冒称审查者亲自操作手机。战术/存储/平台/训练引擎源码未修改，QA临时Chrome/服务/profile和原生调试转发均清理；用户本地预览服务继续保留。
