# HC-041 · 2.4秒启动节奏正式接入

- 实施：2026-10-27；安装与收尾：2026-10-28；状态：`awaiting_device`。
- 用户批准[HC-040](HC-040-startup-timing-preview.md)推荐效果，接入正式1000ms停留/1100ms展开/300ms收尾，总2400ms；标题1165–1825ms淡出，前1000ms字标/图标/柜位保持静止。
- 关联：[品牌与节奏设计](../design/app-icon.md)。目标1.22.2/code26，保数据覆盖当前手机；不带入预览切档按钮/假数据或改版柜体CSS。

## 范围与分工

主控独占startup/timeline.js、controller.js、版本/锁文件/Android versionCode及验证安装/文档；只改时序与阶段阈值，统一导出STARTUP_TIMING供控制器复用，布局/真实快照/读取与存储不改。保HC-039原生静态同色交接，不恢复头像开场；跳过/减少动效/后台直接完成、前台不重播、迟读先等真实数据、失败重试保护继续保持。

engine独占tests/unit/startup-timeline.test.mjs、tests/e2e/startup-flow.mjs与本轮独立定向runner，只更新/补强真实时序和既有失败边界断言，不改实现或配置；验证前1000ms实际静止、2400ms自然结束/阶段、SVG与真实HTML名牌证据不混淆、取消/skip/hidden/慢读/错误/resize。interaction_design独立只读审查，独占本任务review/index，不实现代码、不运行Chrome/ADB/build。

包名/签名/存储键与schema无迁移，26套战术/推荐/NBA/四页/玻璃创建/soft-glow不改。APK本地离线无server.url，原生MainActivity/透明启动vector/桌面图标均保持。

## 验证

npm test及构建后的真实Chrome正式启动专项27组合（九尺寸×空/3/4）、七控制和新增一秒hold/2400自然时长/标题延后；相关四页边界/页面切换/档案操作回归。仅启动时间改动，既有26套长时回放输入不变，不重复完整长回放，明确沿用HC-038完整Chrome证据；如发现关联异常再扩大。

独立审查后android:build，资源逐hash同dist、原v2证书/球搭名/包名/code26/无server.url，原生图标15 PNG同旧包。安装前核当前设备与未保存配置，即时真实档案与进度备份后install-r，核冷启/版本/双hash。实际WebView程序观察自然2400ms和前1000ms静止、加载期skip真实意图/不展开、最终四页fit/hit和同框/数据不变；系统启动/程序/物理体验分别记。无人工新节奏体验确认则awaiting_device，其他授权项继续。清本轮profile/探针/动态forward，保其他连接与用户窗口。

## 实现与自动验证

主控仅将timeline导出冻结STARTUP_TIMING并更新批准曲线，controller用同一对象及STARTUP_DURATION判断阶段，避免视觉已变但dataset仍旧阈值。没有把预览的按钮、样例或短屏CSS复制进正式版；原读取/真实快照/skip/hidden/reduced/单次完成逻辑保持，Native三源码不改。

213检查（210单元/3HTTP）通过；8项时钟单测新增0–1000ms每ms视觉不变、明确批准地标/连续边界与取消/非法timestamp行为。真实[启动专项](../../artifacts/qa/hc041-startup-layouts.json)27组合+七控制exit0，九尺寸×空/3/4均有58–62真实hold paint帧、停留1002.4–1033.2ms、自然结束2402.3–2434.5ms，所有末样本≥2350。前1000ms图标/品牌/柜体rect及transform/clip/opacity完全不变，title≤1165仍为1，展开/淡出和末reveal确实发生。真实HTML非零牌盒/有效文字、极短屏全部按钮及原文双hash保持；慢读skip/0档案写、读throw/retry无假空柜、fatal资源阻断/重试、实际后台/触摸/Tab保护均通过。[runner](../../artifacts/qa/hc041-startup-runner.json)errors/remote为空。

首轮wall=0为QA读到body结束而observer尚未追加done的竞态，补观测完成屏障后保持2350–3000硬断言重跑通过，生产未改。另[相关回归](../../artifacts/qa/hc041-regression/hc041-regression-runner.json)session16052 exit0，实际运行原PageLayoutFlow/LineupFlow/PageMotionFlow三个完整流程，覆盖真实建队/编辑/写失败/来源、原库和四页排版、柔光rapid/cancel/reduced；没有重跑26长时回放，不冒称新证据。主控亲看[850ms完整停留](../../artifacts/qa/hc041-3v3-390-844-hold.png)和[展开中](../../artifacts/qa/hc041-3v3-390-844-middle.png)，正式视觉符合批准方向。两个独立Chrome/profile均已清。

## APK与当前手机

[Android构建](../../artifacts/qa/hc041-android-build.log)成功28秒；[1.22.2/code26 APK](../../artifacts/apk/hoopal-1.22.2.apk) SHA256 `00694ba7cbb6df5c1b8e93f0a2ebe1331fc86b2bb996e284c8f5af8925267437`。[包资产](../../artifacts/qa/hc041-apk-assets.json)核30网页逐hash同dist、15编译图标PNG同1.22.1、Native三个启动源码同HC-040基线；无server.url、原包名、球搭显示名。[v2原签名](../../artifacts/qa/hc041-apk-signature.txt)与[版本/label](../../artifacts/qa/hc041-apk-badging.txt)通过。

2026-10-28重新核对ef473680/M2101K9C；即时preflight无运行草稿，备份真实0档案和进度后正常[install-r Success](../../artifacts/qa/hc041-device-install.txt)。[before](../../artifacts/qa/hc041-device-before.json)/[after](../../artifacts/qa/hc041-device-after.json)核1.22.2/code26/前台，档案SHA `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`、进度SHA `7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c`完全相同，未清数据或创建测试档案。

首次启动时手机Asleep/NotificationShade锁屏，前台保护阻止截图和原生检查；用户明确解锁并打开球搭后继续。初次am start记录UNKNOWN/Wait3025，不能记作COLD；后续在解锁状态force-stop并确认旧PID消失，取得明确[COLD483ms/Wait489ms](../../artifacts/qa/hc041-device-unlocked-cold-launch.txt)。该系统耗时不等于2.4秒网页动画时长。

首轮程序检查在首次Runtime.enable接收到context1旧页的`window.Capacitor.triggerEvent`桥接TypeError，末尾严格errors断言退出；[失败日志](../../artifacts/qa/hc041-native-first-attempt.log)和[当轮样本](../../artifacts/qa/hc041-native-first-attempt-startup.json)保留。框架Bridge.java含该注入，具体触发未确定，不将其宣称已修或归因于时序。解锁冷启后一次复验因前台已是其他应用，被[开头保护](../../artifacts/qa/hc041-native-foreground-guard.log)拦停、未采集他应用画面；重新打开球搭立即用原脚本复验，未过滤异常或修改产品，最终exit0/errors[]。

最终[实际WebView96启动](../../artifacts/qa/hc041-native-startup.json)134记录/118就绪样本，自然2415.3ms；24个静止hold实帧覆盖至996.384ms，品牌/画框/柜位的矩形、clip与transform不变。DOM跳过到达真实单例，skipRequested=true/time2400/active、playing、rafActive均false，数据双hash同。[四页](../../artifacts/qa/hc041-native-frames.json)全部x18/y116/w357.09/h620.27px，按钮fit/hit、无溢出，仅更衣室显示品牌，原mainPlay与资料进度保持，errors[]。主控亲看[手机完整停留](../../artifacts/qa/hc041-native-startup-intro.png)和[更衣室末态](../../artifacts/qa/hc041-native-lineups.png)。WebView重载/DOM点击是程序证据，未冒充Android冷启录像或物理滑动/FPS验收。

专用探针及动态forward在finally移除，最终forward列表空，未改全局动画/屏幕设置、未结束他应用。独立审查见[记录](../reviews/HC-041-startup-timing-release.md)；代码、自动、安装与原生程序验证完成，用户尚未反馈新节奏的实际观感，维持awaiting_device。下一步仅待用户实际打开确认停留和展开速度是否合适，历史物理/原生CRUD待办不扩称本次已验。

interaction_design终审独立复算最终134/118/24样本与四页，并亲看原生图；无未修P1/P2，失败桥接记录与未复现边界明确保留。110份Markdown的831个本地链接核对通过，错误为空；任务、设计、版本说明、使用指南与审查索引已同步。
