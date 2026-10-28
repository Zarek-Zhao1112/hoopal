# HC-038 · 球搭品牌与启动展开正式接入审查

- 日期：2026-10-27；审查者：interaction_design，未参与实现。
- 状态：代码 / 定向及完整浏览器审查通过，1.22.0已保数据覆盖安装并完成原生程序核对；两项短屏P2已修并复验，无未修P1 / P2，物理与真实CRUD验收仍 `awaiting_device`。
- 范围：[合同](../tasks/HC-038-hoopal-startup-release.md)，本记录与索引为审查者写入，产品源码只读。

## 独立源码与控制器检查

检查 startup/controller / timeline / runtime / styles、main动态入口、app门控、HTML / Android显示名及极短更衣室CSS。

- main先创建同一startup实例，再动态导入app；真实读取和渲染后ready等两rAF准备实际柜体。skip加载中只记意图，不提前解锁。致命初始化错误保持active、通用用户提示及重新打开入口，技术原因保留console；阵容非致命读取失败仍进入原读锁 / 重试，没有柜体时不伪造空柜。
- snapshot只捕获实际当前viewport或真实空柜，冻结小范围paint并实体化柜体伪元素；移除业务class / data / 旧身份与事件，ID和SVG局部url / href按前缀重写，去掉非当前bay。视觉层禁止指针和焦点，原业务数据 / DOM留在后层。
- 文档捕获事件与焦点保护补充CSS门控，兼容WebView96，不通过保存再恢复过期disabled值改变业务状态。app导航 / 模态 / Escape / Android Back共享active门控；后台跳过、减少动效、完成清层及解绑保持，resize只重测不重播。系统显示名球搭、页面品牌HOOPAL / 球搭，包名 / 签名 / schema / 键与批准头像不改。
- 独立Node夹具执行实际controller + timeline：加载中skip保持active、背景click被拦；业务disabled动态改变后不被旧值覆盖；ready后意图结束且无剩余动画帧 / 计时；prepare中fatal保错误与retry焦点、skip不能伪成功；hidden早于ready只在真实ready后结束。此为控制器级验证，不冒充真实paint / Android性能。

## 排版与两项P2修复

主控先对旧预览做九尺寸[排版审核](../../artifacts/qa/hc038-preview-layout-audit.json)，360×400品牌 / 画框重叠5500.8px²；正式compact将品牌改横排并预留顶部带。独立核对正式27组intro，品牌 / 画框无交叠。

### R1 · P2：真实短屏柜体被压到2px

首轮正式27组合中360×400三 / 四人实际主卡柜位只有2px，启动复制因此成为细线并导致铭牌越框；这是后层真实布局缺陷，不能换造空柜掩盖。主控仅在宽≤599 / 高≤500的真实profile卡改为双列，左柜+两行切人控件，右详情及推荐 / 配置；保原主卡外框与其他尺寸。

独立复读最终CSS，核对修后真实viewport高86px（≥70px），并亲看[短屏真实更衣室](../../artifacts/qa/hc038-3v3-360-400-end.png)：柜体、成员选择、箭头、名号、详情与两个主要动作完整。R1 `verified`。

### R2 · P2：旧190px柜体撑开网格，下一员按钮被CTA覆盖

第一次紧凑调整后，左场景auto网格仍按旧190px柜宽撑出约133px列，下一员按钮落到右侧CTA区域。主控补场景 `grid-template-columns:minmax(0,1fr)` 及viewport宽 / 最大宽100%、min-width0，没有隐藏按钮或弱化命中断言。

独立复读约束并核对最终短屏三 / 四人按钮记录：next命中true、各3 / 4个dot高24px、全部启用按钮在视口内且真实可命中；文字竖界在主卡内。仅隐藏滑动说明，箭头 / dot / 位置及业务动作都保留。R2 `verified`。

## 铭牌定位的验证覆盖补正

独立审查发现早期TreeWalker只取首个同名文本，实际先命中球衣SVG昵称：360×400约12.36×2.26px，不能当作HTML铭牌证据。已同步主控并由engine增强为HTML BUTTON / 空柜SPAN实际牌盒，跳过SVG和零尺寸隐藏昵称；另存Range / 文本容器 / 有效可见文字，保留90% camera覆盖硬断言及竖向完整性，横向ellipsis沿用已有兼容。

同一正式源码 / 构建增强定位后重跑全部27+7专项exit0，独立读取最终[布局报告](../../artifacts/qa/hc038-startup-layouts.json)：27组实际证据均HTML BUTTON或SPAN，重算初始camera横 / 竖覆盖最小均100%。360×400三人牌盒93.51×22.60px，文字Range77.16×15.82、有效可见53.96×15.82，完整落入画框。此为QA覆盖补正，不伪称旧断言早已验HTML，也不另列产品缺陷。

## 自动验证与独立图检

主控213检查（210单元 + 3HTTP）通过；九尺寸 × 空 / 三人 / 四人27组自然冷启动，七控制包括skip / 背景touch与Tab、reduced、resize、真实Target隐藏、实际getItem异步慢读中skip不早解锁且零档案写入、读取throw / retry无假空柜、动态app chunk阻断fatal / retry。[专项runner](../../artifacts/qa/hc038-startup-runner.json)passed=true、errors / remote为空。档案 / 进度原文保持、结束无残留快照 / 门控；强定位测试在相同构建另过。

最终完整Chrome session16331 exit0，核对[浏览器日志](../../artifacts/qa/hc038-browser.log)末尾 `Browser QA passed`，保留26战术 / NBA / 柜位touch / 推荐 / 重启导出断网 / 六布局 / rapid-cancel-reduced及96边界检查。产品源码与最终定向一致，没有用HC-037预览冒充正式证据。

独立亲看短屏末态、[四人手机启动取景](../../artifacts/qa/hc038-4v4-390-844-intro.png)、[空柜横屏取景](../../artifacts/qa/hc038-empty-844-390-intro.png)。实际球队 / 号码与柜体一致，字标、skip及画框清楚，末态操作无裁切。真实浏览器操作由主控 / engine执行，审查者只核源码、控制器夹具、报告重算与图检。

## APK与原生设备证据

以下构建、安装和原生程序操作执行者为主控；审查者只读证据并亲看设备图，未运行Chrome / ADB / 构建。

- 1.22.0 / code24构建成功（27秒），[资源报告](../../artifacts/qa/hc038-apk-assets.json)记录30项dist资源逐哈希匹配、无server.url、appName球搭及包名 `com.halfcourt.tactics` 保持；APK SHA256 `771cb1603ae913cedeaa01c58492fe549cd004cad76bf2a74e688b168e51b5d3`。[签名](../../artifacts/qa/hc038-apk-signature.txt)v2有效且沿用证书SHA256 `e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26`，[compiled badging](../../artifacts/qa/hc038-apk-badging.txt)确认系统标签球搭与code24。
- 即时[preflight](../../artifacts/qa/hc038-device-preflight.json)确认无正在编辑草稿。指定ef473680正常install-r Success，主控报告COLD启动700ms；[安装前](../../artifacts/qa/hc038-device-before.json) / [安装后](../../artifacts/qa/hc038-device-after.json)实际均零档案，档案SHA256 `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`、内置选择SHA256 `7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c`前后保持，没有写入测试档案。
- [原生启动报告](../../artifacts/qa/hc038-native-startup.json)为实际WebView96 / Android12 / M2101K9C / 393.09×819.27的文档启动 / 重载程序检查。自然启动63记录后active=false，加载中实际DOM skip的第二轮10记录；最终runtime ready=true / skipRequested=true / timeMs=1400 / playing=false / rafActive=false / phase=complete，errors / captureNotes为空，双文件保持。snapshotMs一次实测16.8ms，不是FPS或全部设备性能结论。
- 首轮程序只等HTML skip节点，控制器未建立时点击未送达；主控增强为等startup-active及phase，再核skipRequested=true、所有ready样本<250后复验，产品和APK未改。本次skipTrace在加载期结束，没有ready阶段中间帧，不把它写为点击已播放中段。期间一次他应用前台保护安全退出，回本应用后完成，未操作 / 截图他应用。
- [原生四页报告](../../artifacts/qa/hc038-native-frames.json)独立重算最大差0px：均x18 / y116 / 宽357.0909 / 高620.2728px，fit / hit、无overflow / errors，主Play与档案 / 选择保持。亲看[WebView启动取景](../../artifacts/qa/hc038-native-startup-intro.png)及[实际更衣室末态](../../artifacts/qa/hc038-native-lineups.png)，HOOPAL / 球搭、真实空柜、按钮与四栏完整。主控已清本轮动态转发，其他现存连接保留，不沿用历史连接列表。

## 最终证据边界

代码 / 自动验证 / APK及原生程序证据已收口，无未修问题。系统COLD与WebView重载动画是两类证据，不能将程序点击或静图当作手机物理手势、原生Back、IME、旋转、真实CRUD或FPS验收；人工项目仍待验，任务保持 `awaiting_device`。
