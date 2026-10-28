# HC-031 · 卡内循环动画正式接入

- 日期：2026-10-25；状态：`awaiting_device`。代码、全部自动回归、独立审查和指定手机安装/程序检查完成；完整物理验收仍待。
- 用户确认[HC-030预览](HC-030-inline-motion-preview.md)，要求采用。正式1.18.0/code20，验证后覆盖更新指定新机ef473680。沿用[纵向九卡设计](../design/stacked-library.md)。
- 26套动画、18进攻规则、ID/顺序和存储键/schema保持；卡内浏览不改变主训练场Play/进度/档案/人员来源，只有「进入训练场」走原持久清来源→载入→自动播放协议。没有个人Play、导入、云或业务服务，也无数据迁移。

## 分工与接口

| 负责人 | 唯一可写范围 | 验收与依赖 |
| --- | --- | --- |
| engine | 新workspace/library-preview.js、纯clock、新unit/library-preview.test.mjs | 真实引擎/材料的独立卡内runtime、26模板不改；循环/暂停/后台/单rAF；不改库组件/app/配置/E2E，不Chrome/ADB/build |
| ui | workspace/library-deck.js/.css/-state.js、unit/library-deck.test.mjs | 接makePreview工厂、lazy runtime、九卡/overlay/焦点/忙碌与失败、可见性、局部CSS；不改新runtime/app/E2E/配置 |
| 主控 | app.js集成、本次所有E2E、版本/共享配置、文档/全验证/构建/安装/设备脚本与产物 | 原来源协议不改；绑定视图/后台暂停、182项基础与新行为检查、真实浏览器与APK/双文件数据保护；runtime首版后将E2E自engine接回以并行推进 |
| interaction_design | HC-031独立审查及审查索引 | 未实现相应源码，独立生命周期/异步/数据保护与实际图/报告审查；不运行Chrome/ADB/build |

makePreview(template,button)返回createLibraryPreview({template,button})的runtime：start续播、pause冻结、reset暂停归零、destroy释放、只读state。构造不自动播放，UI先使球场按钮可用后reset/start。runtime绑定整面button点击和document visibility/pagehide，检查disabled/isConnected/hidden，不用生产globaldebug或测试seek。写button.dataset.previewId/playing/progress/cycle/stepIndex/phase/holderId/rafCount/holdRemaining，真实SVG有data-player/data-ball，供DOM及无障碍状态检查。

库提供setVisible(bool)及pause()；app初始传workspace.view，离库setVisible(false)暂停，入库原reset收起，setVisible(true)不擅自恢复。原API/九卡/overlay/wide保留，同组render和resize不重启或破坏暂停位置；换组destroy旧实例并隔离旧DOM事件。

## 正式行为与保护

展开当前卡从头1倍速自动循环（2400ms/段，18%动作前停/缓动，末帧1000ms）。点球场暂停/继续，保留球员/球位置和末帧剩余时间；角落状态/细进度与批准预览一致。收起/换卡停止并归零，重开从头。后台pause、返回不补时，只有当前一个rAF，旧回调不能覆盖新句柄。防守突出蓝队，参考队/球及路线复用真实帧。

pending/externalbusy锁标题、收回、球场和CTA并先暂停；载入或来源清除失败保持原主Play/非零步骤/两键原文与展开卡，预览保持暂停，可手动继续和重试。成功后主训练场按原逻辑从头自动播放，旧卡rAF停止。共享引擎/存储不与DOM耦合。

## 必需验收

实际runtime/计时和库组件单测、完整npm test、最终Chrome六尺寸九卡/26主训练场/六推荐43帧及旧存储/离线/导出/导航回归。新增自然完整循环含1秒hold、暂停剩余冻结、可见性/后台、仅一rAF、旧实例清理、卡内播放不改主Play/selection/archive、来源失败/重试和“进入训练场”协议；实际SVG与真实数据一致。独立审查、APK构建/资源逐hash/no server.url/v2签名，安装前立刻刷新archive/selection双hash，更新不卸载清数据。

重新识别ef473680，覆盖安装1.18.0，冷启/版本/真实WebView程序播放暂停循环与数据保护分别记录，不最终保存测试档案。物理手指/FPS/系统Back/旋转及原生最终保存未完整验收则awaiting_device。

## 当前实现与验证

独立runtime/纯clock/单测三文件、库组件/CSS/单测三文件已冻结交还。主控app只接工厂及可见性/后台暂停，移除旧静态缩略图helper；不改clear→load→start。`npm test`正常构建，195项（192单元/3HTTP）全过无skip；runtime与clock10项、组件13项专项保留失败重试与焦点等原检查。

首次Chrome在旧全局[data-ball]计数处失败：新增隐藏卡内SVG不属于主训练场；改为#ball-layer保持原显隐硬断言，并补隐藏库rAF合计0。第二次跑到后台专项，共享runner固定focus使文档仍visible；先解除focus override并实际激活新tab、finally关闭恢复后，定向真实Chrome专项退出0。均为测试适配，没有改正式实现来迎合断言。

[卡内报告](../../artifacts/qa/hc031-inline-playback.json)已验证自然完整1倍循环、1000ms末停及暂停剩余、真实SVG/球位置对实际引擎、离库/换卡/resize/后台手动继续与主Play/两键原文不变；最终完整Chrome57379已退出0，预览历史不代替正式证据。

在首轮Chrome退出后预构建APK23秒成功，与195检查相同最终源。版本1.18.0/code20，[安装包](../../artifacts/apk/halfcourt-1.18.0.apk) SHA256 `4e1e5e20b1ec061420b39ffba789f6186b3879ee59199eb2eb0189e527a9d3f8`；[28网页资源检查](../../artifacts/qa/hc031-apk-assets.json)逐hash=dist、无server.url，v2签名通过、证书保持e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26。完整回归/独立代码审查通过后覆盖安装；构建、安装和物理验收分开记录。

## 完整浏览器与独立审查

195项无skip；完整Chrome全26主训练场实际播放、6推荐43帧及全部人员图例，原有存储/失败读锁/来源失败两键原文与非零主步骤、重启、导出、离线、NBA转盘、玻璃配置、柜位触摸和柔光快速/取消/减少动效回归通过。新增来源失败后卡内playing=false/rafCount=0、当前位置保持及可重试断言；原主场显隐硬断言与隐藏库RAF0同时保留。无运行时异常或远程请求。

[库报告](../../artifacts/qa/hc031-library-metrics.json)255项含六尺寸双模式108组真实开收与球场按钮命中/overlay收回/wide分区/resize焦点/同组保节点；[统一页面](../../artifacts/qa/hc031-page-layout-metrics.json)49项保持品牌/留白/主卡起线/共享人数节点。六新回放与推荐的hc027命名报告由本轮执行重写，不冒充旧结果。root亲看[390循环图](../../artifacts/qa/hc031-390x844-3v3-expanded.png)与[360覆盖图](../../artifacts/qa/hc031-360x640-4v4-expanded.png)。

[独立审查](../reviews/HC-031-inline-motion-release.md)核正式runtime/clock与真实库联合夹具，lazy启用后start、busy先pause/解除不续、false/throw保位、旧句柄/旧DOM/换组destroy、hold剩余、可见性/后台及实际引擎/球/防守蓝路线均无P1/P2；正式E2E作用域/真实hidden与定向报告已核，最终原生图检另收口。测试浏览器/profile/临时服务已清理。

## 安装与真实手机

再次核对ef473680/M2101K9C，安装前即时刷新[档案与选择双摘要](../../artifacts/qa/hc031-device-before.json)，install-r Success、COLD启动851ms，1.18.0/code20前台/版本确认。[安装后](../../artifacts/qa/hc031-device-after.json)实际0档案SHA256 dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253，selection SHA256 397c6cb369a367c0cf5b7d4a2a047c2748becc85e1af744731323b2b75ebd9eb，两者前后相同；未卸载清数据或最终保存测试阵容。

[实际WebView96报告](../../artifacts/qa/hc031-native-library.json)393×819：give-go可见棋子/球运动，点球场冻结、完整自然cycle1及末帧剩约745.72ms暂停冻结/继续；Android HOME到真实启动器后收到暂停状态，返回本App仍暂停、手动继续。全部26张进攻/防守卡程序打开、自动1RAF、暂停0RAF、收回、控件fit/hit无溢出和「进入训练场」文案通过，原主Play与两文件保持。只浏览未点原生CTA/最终保存；[3v3暂停图](../../artifacts/qa/hc031-native-3v3-paused.png)、[4v4进攻图](../../artifacts/qa/hc031-native-4v4-offense.png)、[4v4防守图](../../artifacts/qa/hc031-native-4v4-defense.png)。已恢复原视图/人数/类别，清理本轮9228转发；既存13000转发未动。

首次真机脚本在HOME后固定300ms即断言已pause，失败。后续加-W确认启动器真实前台、记录事件前visible/playing快照并等待实际原生事件，同一源码/APK完整复查通过；没有修改生产源码，不把异步检查时序适配写成已修产品缺陷。诊断保存在hc031-native-background-diagnostics.json，最终有效结果以完整报告为准。

## 剩余验收

手机物理手指/FPS、系统Back/旋转及原生「进入训练场」/最终档案保存未完整验收。真实HOME与DOM程序不能代替这些证据；自动/独立图检收口后保持`awaiting_device`，用户可直接使用新卡内循环。

最终独立审查已核本轮255/49/12报告、native26及即时双hash/APK摘要，并亲看两张正式及两张原生图，无未修P1/P2。90份Markdown/518个本地链接检查通过；本轮浏览器/profile/临时服务、9228转发均清理，未改既存13000转发。
