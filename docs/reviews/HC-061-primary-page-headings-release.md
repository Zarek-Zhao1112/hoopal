# HC-061 · 训练场与我的一级标题接入审查

日期2026-11-03。审查者未实现本轮应用或正式回归；实现/共享配置/默认测试只读，仅维护本记录、索引和自有QA。依据[HC-061](../tasks/HC-061-primary-page-headings-release.md)与[HC-060图稿](../tasks/HC-060-primary-page-headings-concept.md)。

## 结论与范围

源码与独立真实浏览器审查通过，已检查范围无未修复的可复现P1/P2。10项主审及2项实际玻璃模糊补验均通过。使用自有独立Chrome/HTTP/profile，不将主控测试结果称为审查者重复执行。范围是两一级标题、既有顶部grid空间、卡内标题去重、我的显式grid重排、跨页/完整二级页显示、错误态和玻璃开合；不改战术、持久化、平台或账号能力。

## 独立浏览器证据

主审脚本artifacts/qa/hc061-review/review.mjs，结果[results.json](../../artifacts/qa/hc061-review/results.json)。五尺寸390×844、360×640、360×400、844×390、1024×768均通过：

- 训练场和我的根标题x/y/font一致，文字正确，均在玻璃主卡之外且底部不越过主卡顶线；没有返回/图标/可交互标题元素。我的卡内不重复h1「我的」，主文档无横纵向溢出。
- 逐项比较[HC-059独立修后基线](../../artifacts/qa/hc059-review/navigation-scope-results.json)中同五尺寸的训练卡与球场x/y/width/height，完全相同；新增标题使用既有留白，没有挤占球场。此比较使用真实DOM矩形，不由图片推测。
- 训练库进入完整体型页时两一级标题均无布局矩形，返回库/关闭恢复正确；我的→球队管理隐藏一级标题，保原二级标题/返回，回我的恢复。更衣室无新一级标题残留，原品牌可见。
- 我的账号说明/同步备份/设置/关于四入口、管理入口和二级返回，均以真实鼠标中心命中执行；浮层开关后可恢复。内部表格与卡片未因去掉旧heading挤出底部。
- 空队仍有单一根标题和可达管理入口；未知schema读锁仍有根标题且卡内不重复页名，点击读取重试不覆盖未知原文。
- 4v4长战术标题与库人数正确，取消后档案/选择两原文保持。真实600ms柔光的连续导航最终仅显示正确「我的」，无训练标题残留，未改两份记录。

已图检[390训练场](../../artifacts/qa/hc061-review/training-390x844.png)与[360×400我的](../../artifacts/qa/hc061-review/my-360x400.png)，完整内容/主卡/导航可见。其他尺寸截图同目录；皆使用审查虚构队伍，不含手机用户资料。主审结果包含四份实现文件SHA；零浏览器运行错误/远程请求，自有临时进程与目录已清理。

补充artifacts/qa/hc061-review/blur.mjs，[blur-results.json](../../artifacts/qa/hc061-review/blur-results.json)两项通过：实际库和账号玻璃面板opening阶段，顶部留白内标题仍显示且filter出现约2.57px blur和brightness层次；450ms收回后恢复none，标题内没有可绕过锁的控件。首次账号补验误用关闭选择器account-close，应用实际为lineup-account-close；这是QA前提错误，不是应用缺陷，原记录[保留](../../artifacts/qa/hc061-review/blur-first-selector-precondition.json)，修正选择器后补验通过。没有修改实现来绕过检查。

## 源码检查与验收边界

新primary-page-headings.css位于全局导入末尾，显示同时约束当前tab、lineupRoute与完整体型页；不使用WebView96不支持的:has。我的旧header占用的显式grid行已在不同媒体查询重排。静态审查提醒过readLocked卡内原有「我的」及旧grid行依赖，主控在浏览器验证前同步处理；没有旧版实际浏览器复现，不能标为已复现行为缺陷。

此记录确认上述独立源码/浏览器事实。主控验证及设备证据的只读核对见下节，执行者与证据范围分开。人工手指、硬件Back、IME、旋转和用户观感不由本审查替代；最终任务保留相应awaiting_device边界。

## 主控构建与设备证据终审核对

审查者仅只读核对以下主控记录，没有亲自操作手机或重复运行主控回归。终审重新计算主审四份实现源码SHA，均与独立浏览器实际测试时相同，后续没有功能改动。

- [主控单位/HTTP日志](../../artifacts/qa/hc061-npm-test.log)248项全部通过；[受影响三组同次回归](../../artifacts/qa/runs/1.29.1-1793674071366/run.json)page-layout、account-center、training-viewing实际passed，整run passed=true，errors/remoteRequests为空，tempCleaned=true。不是声称重跑全部13组。
- [构建日志](../../artifacts/qa/hc061-android-build.log)21秒成功；实际读取[APK](../../artifacts/apk/hoopal-1.29.1.apk)为4,838,385B，重新计算SHA256=`6e1724688f81dc545528bfc471832eacbbbb224f9ece66b9f367bea00276de3a`，与[APK验证记录](../../artifacts/qa/hc061-apk/apk.json)相同。记录为1.29.1/code35、30网页同dist、15图标已对比、原v2证书/包名、无server.url。
- 安装记录Success，启动COLD602ms/Wait608ms。before/after同ef473680/M2101K9C，当前1队，球队与选择两原文SHA逐项相同；[after](../../artifacts/qa/hc061-device/device-after.json)版本1.29.1/code35及前台检查通过。before声明只检查已打开/可见草稿，不推断所有关闭草稿都不存在。
- [真实WebView程序结果](../../artifacts/qa/hc061-device/native-results.json)为Chrome96/Android12：两标题x18/y62.5/高32.5/25px一致，训练卡顶116，卡内我的h1数为0；背景blur6px。核对native-headings.mjs确实断言管理页隐藏一级标题、返回恢复、最后回原view/原战术，结果passed且errors为空。没有提交球队配置、偏好或新战术；调试forward在finally移除。此项是主控程序控制DOM证据，不等同物理手势或硬件Back验收。

综合已验证范围无未修P1/P2。任务保留awaiting_device用于用户实际观感、触摸/Back/旋转/IME体验，不能由上述自动/程序证据替代。
