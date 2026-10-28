# HC-038 · 球搭品牌与启动展开正式接入

- 日期：2026-10-27；状态：`awaiting_device`。
- 用户要求先检查预览排版，有问题修复，确认后实施。沿用[HC-037预览](HC-037-hoopal-startup-preview.md)与[品牌设计](../design/app-icon.md)，正式接入球搭/HOOPAL与约1400ms启动展开，更新1.22.0/code24，并依既有授权覆盖当前手机。
- 范围：中文系统显示名球搭、网页标题/更衣室品牌HOOPAL/球搭，批准头像不重绘；启动字标/画框/柜体取景适配手机短屏、横屏、平板。更衣室原单柜主卡及其他三页同框保持，不接入预览工具/示例业务或未来全场训练。

## 排版检查与实现约定

先核真实预览初始/中段/结束，检查字标完整、品牌和画框空间、柜体取景与全页面边界；检查扩展到320×568、360×400等短视口。正式动画使用实际已读取的当前更衣室柜位视觉，避免新建示例或用空柜掩盖未知/错误数据。载入中仅显示品牌/读取状态；读取完成并渲染真实界面后开始约1400ms（250/850/300）。仅页面冷启动播放一次，普通切页不播放，后台返回直接结束并恢复现有界面；跳过/减少动效直接结束，载入中跳过记住意图，不能提前解锁未知数据写操作。

保留包名com.halfcourt.tactics、签名、halfcourt存储目录/键、版本schema、旧来源解除和保存失败协议，数据无迁移。系统原生开屏仍用原头像，随后网页动画；APK离线无server.url。致命初始化错误显示真实提示和重新打开入口；阵容读取失败仍进入原读取错误/重试，不能假成功。

## 分工与接口

- engine：独占`frontend/src/startup/timeline.js`、`tests/unit/startup-timeline.test.mjs`。纯时间函数与可取消单RAF时钟，无DOM/存储。`startupProgress(timeMs)`返回expansion/titleOpacity/titleOffset/sceneScale/reveal/overlayOpacity；总1400。`createStartupTimeline({requestFrame,cancelFrame,onUpdate,onComplete})`返回play/pause/finish/destroy/getState，update含timeMs与进度，getState含timeMs/playing/rafActive/completed，finish仅完成一次，旧回调无效。
- ui：独占`frontend/src/startup/controller.js`、`frontend/src/startup/styles.css`；只读审视现有预览，可向主控提排版问题，不改正式app.js/index等共享文件。`createStartup({document})`返回active getter、ready()、skip()、fail(error)、destroy()、getState()。ready等待真实渲染，取得`#lineups-panel .locker-viewport`（有球队）或`.locker-open-empty`（空态）的安全视觉快照并启动时钟；不使用预览的.main-room选择器，无柜体时不造空柜。保留实际页面在后层，末300ms淡出覆盖层交接；snapshot移除业务身份/HTML ID/事件/焦点、保安全SVG引用；resize重测不重播。
- 主控：HTML壳/入口/runtime、app初始化/导航/按键/Android Back门控，版本/Android显示名/共享配置，排版实测、全套验证、APK与保数据安装、文档。平台边界不变，无并行安装依赖。
- interaction_design：集成后只读独立审查，独占HC-038 review和reviews索引；重点冷启动/延迟或错误/跳过/取消、旧机WebView96焦点与点击保护、存储不丢/不伪成功、布局兼容。

HTML约定：`#startup-screen`含`#startup-frame > #startup-media > #startup-cabinet`，另有`#startup-rim`、`#startup-brand`（原头像+HOOPAL+球搭）、`#startup-skip`、`#startup-status`（hidden）、`#startup-error`（hidden，内含`#startup-message`/`#startup-retry`）。UI通过文档获取，root提供`runtime.js`单例，main入口先创建单例再动态导入app，成功调用ready、失败调用fail。active期间背景真实控件不受用户交互；不能通过禁用/恢复旧快照覆盖业务最新disabled状态。WebView96需事件/焦点降级，不能仅依赖inert。

## 验证与交付

排版审核含标题/画框/柜体真实bounds及可见文字，不只控件中心。真实Chrome正式空/3v3/4v4、手机/横屏/平板多尺寸初/中/末采样、自然1400ms/单次/无残留、skip/hidden/resize/reduced、慢读取/读取错误/致命失败与控件保护；保持四页同框、原阵容/进度/创建/库循环/柔光全套回归。执行npm test、最终构建后npm run test:browser，独立审查修复复验后android:build。

真实首轮27组合发现两项同因P2：360×400有三/四人队的原主卡把柜位挤成2px，启动安全快照如实显示出这条细线，铭牌越出取景窗。主控增加≤599px宽/≤500px高真实profile紧凑两列，柜体与双行切人控件在左、详情与动作在右，不只修快照假尺寸；其余屏幕/卡框尺寸保持。最终复验须包含短屏所有启用控件命中和文字垂直bounds。fatal初始化的技术原因保留console，页面只显示真实失败与重新打开的可用下一步。

逐hash离线资源/同证书v2/显示名；安装前重新核设备并即时备份真实档案和进度，正常install-r，冷启/版本/前台及双hash保持；原生WebView按实际数据检查启动/skip/最终布局与无残留，程序和物理验收分别记录。当前手机ef473680已在线，安装前仍重新核对。清理仅本轮测试进程/profile/动态forward，保留其他连接和用户窗口。缺人工验收使用awaiting_device，不阻断其他授权工作。

## 实现与最终浏览器验证

main/runtime在任何本地读取前建立同一启动实例，app原读取/真实渲染/初始化完成后ready；当前柜体的只读视觉快照脱离业务祖先并冻结paint，移除业务身份与交互、重写SVG引用，不复制示例队伍。末300ms覆盖层淡出交接原页面；单RAF时钟仅冷启动一次，skip/hidden/reduced安全结束。显示名、网页标题/更衣室和球场字标使用球搭/HOOPAL，原头像/包名/签名/数据键保持。旧短屏字标重叠、真实柜位2px挤压，以及紧凑布局auto grid按旧190px宽越列导致next被CTA遮挡均修复；操作未被隐藏以通过检查。

最终213检查（210单元/3HTTP）通过；[完整Chrome](../../artifacts/qa/hc038-browser.log)session16331 exit0，含26套战术、NBA/柜位真实touch、推荐、创建/档案、重启/离线/导出、玻璃/柔光、96组四页边界和原有完整回归。新[启动专项](../../artifacts/qa/hc038-startup-layouts.json)27组合（九尺寸×空/三人/四人）及七控制项通过：自然阶段与结束清理、品牌/画框≥12px、skip实际命中、读写原文保持；360×400三/四人柜位≥70px、启用按钮真实fit/hit、文字垂直bounds、next和三/四dots通过。控制含背景click/真实touch/Tab保护、实际skip、resize不重播、真实Target后台、减少动效、真实异步getItem慢读/skip不早解锁/零档案写、读throw/retry无假空柜、动态app资源阻断fatal/retry。

审查指出最初TreeWalker同名文本可能取球衣SVG昵称，继而仅限定HTML仍可取隐藏0×0昵称；最终专项严格取非零实际HTML BUTTON/SPAN牌盒，保90%camera覆盖，另核文字与裁切span的有效可见交集及垂直完整，兼容原长名ellipsis。最终重跑27+7通过，同一生产源码/构建，未用旧错误定位冒充真牌证据。审查独立重算实际牌盒横竖最小覆盖均100%。主控亲看390四人intro、844空柜intro和360×400三/四人末态。见[独立审查](../reviews/HC-038-hoopal-startup-release.md)。

## APK与安装

[球搭1.22.0 APK](../../artifacts/apk/hoopal-1.22.0.apk)27秒构建成功，30网页资源逐hash同dist、无server.url；编译label球搭/code24，包名com.halfcourt.tactics。[资源核对](../../artifacts/qa/hc038-apk-assets.json)、[签名](../../artifacts/qa/hc038-apk-signature.txt)、[badging](../../artifacts/qa/hc038-apk-badging.txt)通过，v2原证书e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26。APK SHA256为771cb1603ae913cedeaa01c58492fe549cd004cad76bf2a74e688b168e51b5d3。

安装前重新核设备ef473680/M2101K9C，并[检查无未保存球队配置](../../artifacts/qa/hc038-device-preflight.json)。即时备份实际0档案/当前进度，正常install-r Success、COLD700ms。版本/前台及[安装前](../../artifacts/qa/hc038-device-before.json)/[安装后](../../artifacts/qa/hc038-device-after.json)双hash同：档案dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253，进度7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c。没有在手机写入测试队伍或清除用户资料。

## 原生程序检查与验收边界

实际Android12/WebView96/393.09×819.27的[启动记录](../../artifacts/qa/hc038-native-startup.json)：页面重载自然启动63条记录，含47条就绪播放样本，阶段展开后清理；第二轮加载期DOM点击skip产生10条记录且无就绪播放帧，最终同一runtime状态skipRequested=true、time1400/complete、active/playing/rafActive=false，快照16.8ms，errors/captureNotes空。主控亲看[真实intro](../../artifacts/qa/hc038-native-startup-intro.png)和[最终更衣室](../../artifacts/qa/hc038-native-lineups.png)。系统COLD与WebView重载动画是不同证据；未将63条记录当作60FPS承诺。

第一次native skip脚本仅等静态HTML按钮便click，早于控制器监听，旧skipRequested=false不能算跳过通过；修QA为等startup-active/phase并新增实际intent=true与不进入展开断言后复验通过，产品/构建未改。中间一次前台保护发现已切他应用而退出，重新打开球搭后继续，只操作/截图本应用。最终[原生四页](../../artifacts/qa/hc038-native-frames.json)主框均x18/y116/w357.09/h620.27px，启用控件fit/hit、无整页溢出、主Play与两文件字节保持。探针、专属forward与测试profile清理，保其他连接/用户窗口。

代码/自动验证/独立审查、APK安装和真实WebView程序检查已完成。物理手势、系统Back/输入法/旋转及真实原生CRUD仍无本轮人工验收，状态保持awaiting_device；不把程序点击或既有业务历史验收代替这些证据。

最终独立审查已交还，无未修P1/P2。104份Markdown/728条本地链接检查无错误；本轮测试profile与专属连接已清理。生产输入与已验证APK无再变更，无需重复构建或业务回归。
