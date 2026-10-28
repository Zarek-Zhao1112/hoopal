# HC-041 · 2.4秒启动节奏正式接入审查

- 日期：2026-10-27；2026-10-28追加包与安装核对；审查者：interaction_design，未参与实现。
- 当前结论：代码、相关自动验证、APK及最终原生程序核对通过，无未修P1 / P2；保留一次未明来源的bridge异常及严格复验记录。新节奏人工体验仍awaiting_device。
- 范围：[合同](../tasks/HC-041-startup-timing-release.md)，仅已批准2.4秒正式时序与阶段阈值，不带入预览UI或样例。

## 独立源码与控制器核对

正式timeline导出冻结的STARTUP_TIMING：hold1000 / expand1100 / reveal300、title1165–1825，总STARTUP_DURATION=2400。controller只从同一导出计算intro / expanding / reveal / complete阶段，没有遗留1400阈值；布局、真实柜体快照、就绪 / 失败 / 存储保护不变。

skip / reduced / hidden仍直接finish，与新时长无额外等待；读取未完成只记意图，真实ready后结束，致命失败保持保护及重试。独立实际controller + timeline夹具复验：加载中skip不早解锁、background capture保护、动态disabled不被旧值覆盖、fatal不能skip伪成功、hidden早于ready安全完成，末时刻为2400且无剩余动画rAF / 计时。不是以预览函数代替正式执行。

独立重算HC-040保留的100项正式基线，仅timeline / controller及package.json / lock / Android版本文件五项变化；其余原生MainActivity / theme / 透明vector / 图标、前端UI及数据均保持。HC-039原生透明交接、包名 / schema / 键、26战术 / 推荐继续保持；正式保存及来源解除不因延长开场改变。

## 主控专项与独立实帧重算

读取最终[27组合布局报告](../../artifacts/qa/hc041-startup-layouts.json)及[专项runner](../../artifacts/qa/hc041-startup-runner.json)，passed=true、failures / errors / remote为空。九尺寸 × 空 / 三人 / 四人正式自然播放；七控制保真实skip / 背景touch与Tab、reduced、resize / Target隐藏、getItem慢读跳过不早解锁、读错误重试与fatal恢复。

独立重算27组ready且time<1000实帧，每组58–62条，画框 / 柜体矩形及transform / 品牌矩形与opacity / clip / 覆盖层opacity的唯一组合均为1；time≤1165的标题opacity均为1。自然时长范围2402.3–2434.5ms，与2400ms端点及绘制采样容差相符；报告保展开 / 标题中间值及末overlay淡出。真实HTML名牌BUTTON / SPAN和90%取景 / 有效文本检查沿用增强定位，未重新混入SVG昵称。360×400三 / 四人viewport高86px、next与全部启用按钮命中，原档案 / 选择双hash保持。

亲看正式[一秒停留](../../artifacts/qa/hc041-3v3-390-844-hold.png)、[展开中](../../artifacts/qa/hc041-3v3-390-844-middle.png)与[短屏末态](../../artifacts/qa/hc041-3v3-360-400-end.png)：品牌、真实球队 / 名牌 / 球衣一致，短屏切人、详情与主要动作完整。静图用于排版，真实停留和时长以实帧重算为证。

首轮报告wall=0为observer结束记录晚一rAF的QA时序，增强屏障后同生产源码全27+7重跑；不将它记为产品修复或沿用失败数据通过。

## 相关业务回归

主控同源码213检查通过。相关runner16052 exit0，[结果](../../artifacts/qa/hc041-regression/hc041-regression-runner.json)passed=true、errors / remote为空。独立核对执行脚本实际import并调用runLockerRegression，覆盖原PageLayout / Lineup / PageMotion完整相关流程；日志沿用“startup”字样不代表只跑启动，也不代表重跑全26长时回放。

本轮仅时序，按合同不重复未改动的全部26套长回放，明确沿用[HC-038完整浏览器证据](HC-038-hoopal-startup-release.md)。没有以历史预览或网页重载代替系统冷启动验证。

## APK与安装证据（2026-10-28）

只读核对主控[构建日志](../../artifacts/qa/hc041-android-build.log)、[资源报告](../../artifacts/qa/hc041-apk-assets.json)及[签名结果](../../artifacts/qa/hc041-apk-signature.txt)：28秒构建成功，1.22.2 / code26，30网页资源与dist一致、15图标与1.22.1一致、三份Native启动源保持、无server.url；v2有效且证书仍为e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26。APK SHA256为00694ba7cbb6df5c1b8e93f0a2ebe1331fc86b2bb996e284c8f5af8925267437，显示名球搭、包名不变。

指定ef473680覆盖安装Success。[before](../../artifacts/qa/hc041-device-before.json)与[after](../../artifacts/qa/hc041-device-after.json)均为实际0档案，档案SHA256均为dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253，选择SHA256均为7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c；after版本1.22.2 / code26。首次启动记录Status ok但LaunchState UNKNOWN、WaitTime3025，不能称为COLD；当时锁屏 / NotificationShade前台保护中断，未据此截图或运行原生专项。

用户解锁后的首轮原生专项在末尾严格errors检查发现context1旧TypeError（读取triggerEvent），保留[失败日志](../../artifacts/qa/hc041-native-first-attempt.log)及[该轮实帧](../../artifacts/qa/hc041-native-first-attempt-startup.json)。异常在首次Runtime.enable时接收；主控在本地Capacitor Bridge.java找到window.Capacitor.triggerEvent原生注入，但具体触发不能证实。不能称产品已修、不能以首轮部分断言替代整轮通过，也不能将其确定为动画错误。

解锁后主控force-stop并确认PID不存在，再次启动的[独立记录](../../artifacts/qa/hc041-device-unlocked-cold-launch.txt)为COLD、TotalTime483 / WaitTime489ms，与上面的UNKNOWN记录分开。之后一次原生复验被他应用前台保护拦停，保留[保护日志](../../artifacts/qa/hc041-native-foreground-guard.log)，未操作或截图他应用。重新打开球搭后，同源码 / 同APK原脚本严格复验exit0，未过滤errors、未改产品修复；首轮bridge异常未复现，原因仍未定。

## 最终原生程序复验与独立图检

只读核对[最终启动报告](../../artifacts/qa/hc041-native-startup.json)与[四页报告](../../artifacts/qa/hc041-native-frames.json)，实际WebView96、393.09×819.27。独立重算134条自然记录中118条ready，前1000ms的24条ready样本最后为996.384ms，画框 / 柜体 / 品牌 / clip / transform / opacity等除时间外视觉字段唯一组合为1；自然时长2415.3ms。程序skip最终skipRequested=true、timeMs=2400、active / playing / rafActive均false，errors与captureNotes为空。snapshotMs26.9仅一次快照准备测量，不是FPS结论。

四页主卡独立重算均x18 / y116 / w357.0909 / h620.2728，差值0；全部已记录控件fit / hit，无overflow，品牌仅更衣室可见，mainPlay与档案 / 选择双hash保持。未创建或保存测试档案。系统COLD启动和WebView文档自然播放 / DOM skip是不同证据，未混称为系统逐帧录屏。

审查者亲看[原生启动初态](../../artifacts/qa/hc041-native-startup-intro.png)与[原生更衣室](../../artifacts/qa/hc041-native-lineups.png)：头像 / 球搭文字、跳过按钮和真实空柜完整，末态四栏及建队入口清楚。时间停留以实帧重算为证，图片不证明物理操作体验。主控已清理本轮探针与专属动态转发。

## 证据边界

代码、相关自动、APK及最终原生程序阶段收口，无未修P1 / P2；一次bridge异常未明且严格同APK复验未复现，保留记录，不宣称完全未出现异常。人工新节奏体验尚未确认，任务仍awaiting_device。审查者仅独立读源、夹具、报告重算与图检；Chrome / 构建 / 安装 / 原生程序操作由主控或指定测试agent执行。程序点击不代表手机物理体验 / IME / Back / 旋转 / 真实CRUD或FPS通过。
