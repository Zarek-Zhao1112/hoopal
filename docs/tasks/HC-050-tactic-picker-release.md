# HC-050 · 标题下展玻璃战术选单正式接入

- 日期：2026-11-02；状态：`awaiting_device`。实现、独立审查、自动回归、构建和保数据安装已完成，物理操作与人工观感待确认。
- 用户选择HC-049的A方案，并确认220ms展开/160ms收起、当前浅蓝勾选和外部关闭保留战术与进度。接入正式训练场并保数据更新既定手机，目标1.26.0/code31。
- 设计：[训练场观看布局](../design/training-viewing.md)，参考[批准效果](../../artifacts/design/tactic-picker-concept/comparison-v1.png)。

## 分工与接口

主控独占frontend/src/app.js的接线/保护、package.json/锁/Android版本和文档/集成/Chrome/打包/ADB/Git。ui独占frontend/index.html标题选择区域、frontend/styles/app.css最后导入、新frontend/src/training/tactic-picker.js及tactic-picker.css；不改原training view/player/workspace/platform/data/storage。tests agent独占tests/e2e所需可见标题选择断言和新专项/browser-qa注册，不改生产/配置。review agent独占本轮审查与索引，默认只读，不实现相应代码。

保留#template-picker原select及其options/value/change接口，设hidden/aria-hidden/tabindex=-1仅兼容内部载入；真实可见入口新增#training-picker-trigger按钮，覆盖现h1标题区域，保h1和外框尺寸。新组件createTacticPicker({document,beforeOpen,onSelect,onVisibilityChange})提供render({items,activeTemplateId,mode,kind,disabled})、close({immediate=false,reason})、isOpen、handleBack、destroy。items只含同人数同类别真实模板；onSelect(id)在收起结束后调用，原模板不重复载入。公开DOM #training-tactic-picker、data-phase=opening/open/closing/closed、[data-picker-template]选项及aria-selected，trigger有aria-expanded/controls/haspopup。

组件不写select值/存储、不计播放时间，选择通过主控原loadTemplate解除来源→载入→持久化；失败保原战术/非零进度/人员映射可重试。beforeOpen只在训练页、非startup/busy/modal、暂停时允许；保持播放中禁用标题选择，避免本轮更改播放策略。onVisibilityChange用于主控锁背景，关闭动画结束才解锁，标题可再次关闭。组件负责键盘方向/Home/End、Tab/ShiftTab、Escape、外部关闭/焦点恢复、快速开合token清理及reduced。

局部玻璃模糊、透明外部点击层，主体不全屏模糊/不重排；绝对固定在标题下方并限制视口/导航边界。常规屏完整九标题；极矮/横屏仅选单内部可滚动，主页面仍一屏，当前选中自动进入内部可见范围。旋转重新测量不换战术。Android Back先关闭选单；背景/离页保护不让悬挂回调再选战术；关闭/取消不触发原select change或保存。

预审定位选择后快速双击第二下可能落到透明外部层并撤销首选，已修为closing阶段忽略outside/trigger/select重复；Back/Escape/background/destroy/context-change仍可明确撤销尚未提交的选择。普通open状态点外部或标题依旧取消，未改变用户取消语义。

## 验证与交付

新专项先运行以尽早发现布局/焦点/状态问题，再完整16组Chrome；正常/缩短动效真实样本，3/4攻防9/4标题和真实推荐来源、非零进度、当前/其他选择、来源清除失败/重试、外部/原标题/Escape/Back程序分发、开合中快速点击、横竖/低高/缩小视口、内部滚动/每一项可达和背景锁恢复。保原26套、推荐、时钟、四页外框/库内循环/导出和本地协议。

npm test、静态导入/文档、行为基线、完整Chrome和独立审查后构建APK；核30网页/原15图标/原签名/离线配置/版本，再读手机草稿/忙态并备份两原始文件、install-r、双hash与实际WebView选单开合/取消验证。不在真实手机创建测试队伍或替换用户战术作夹具；人工操作另记awaiting_device。生成图不作为功能验收。

## 实现与首轮检查

UI组件、主控接线及tests已交还。npm test225通过，静态149模块/298引用、26模板/18规则/10推荐样本/6身份文件保持。UI自测9状态和独立审查提取的真实函数体9路径均通过；Back五路径仅是实际回调配合替身的程序逻辑，不称原生桥接或物理键验收。

第一轮隔离Chrome [target-1793591116038](../../artifacts/qa/hc050/target-1793591116038/run.json)在动效时长断言退出，首轮未保存失败trace，不能确证产品过快或缺失open样本。生产代码仍是220/160ms。随后只修改测试：补MO阶段时间/RAF实际时间、在断言前保存原始样本、等实际open帧后关闭并等closed帧；保持原170/110ms观察下限并新增220/160 CSS核验。再补真实双击第二击前必须处于closing并命中外部层的证据，不能用第二次已closed的点击冒充原P2复验。待第二轮与完整结果为准。

## 修复后隔离专项

[第二轮target](../../artifacts/qa/hc050/target-1793591614258/run.json)exit0，errors/remoteRequests为空且临时资源清理。[完整专项](../../artifacts/qa/hc050/target-1793591614258/hc050-tactic-picker.json)36布局/6选择（含两真实推荐源失败保留非零进度后重试）通过，六次双击第二击前均确认closing且同坐标命中透明外部层、实际只触发一次载入；取消/同项为零Storage写入和零旧select change。

[动效原文](../../artifacts/qa/hc050/target-1793591614258/hc050-picker-motion.json)28实际RAF、MO观察visible→open224.1ms、closing→closed171.3ms，CSS220/160ms保持，开合均有透明度中间帧，背景全程锁住。键盘/原标题/外部/快速关闭、窗口重定位+真实wheel、reduced立即切换、后台撤销尚未提交选择、播放禁用均通过。该轮没有修改产品时长，首次失败原因仍只能记录为未保存trace、补齐采样后通过；不将假设当已证明事实。

主控已亲看竖屏九项和推荐四人横屏图：主体无全屏blur，局部面板和内部滚动符合A方向。随后冻结129份产品输入并开始完整16组，最终以完整回归/设备/独立审查为准。

## 完整回归首轮与环境隔离

[完整首轮](../../artifacts/qa/runs/1.26.0-1793591687045/run.json)的选单、startup和26战术组通过，在旧library流程的4v4掩护者再获掩护预览中心命中断言失败（按钮高度65px），当轮未记录具体命中元素，不能断言根因。library生产代码和CSS没有本轮变化，失败保留。

检查发现新首组专项finally硬编码390×844，改变了后续startup入场viewport（旧默认1440×1100）；已仅修测试为记录/还原真实入场viewport、恢复两原键和lineups，添加恢复报告。该环境泄漏是已确认问题，但尚不能证明是库命中失败原因。旧library断言不变，增加失败时真实命中元素/卡片/选单状态、原始几何和截图，产品129份冻结输入未改；第二次完整回归据实际结果记录。

## 最终验证与手机更新

- [最终完整run](../../artifacts/qa/runs/1.26.0-1793592269540/run.json)exit0，16组全部通过，errors/remoteRequests为空、独占临时浏览器/服务器清理。旧library点击与尺寸原断言通过且无新诊断触发；首轮原因保持未确定，不将环境漏恢复修复倒推为已证明根因。
- 最终[选单专项](../../artifacts/qa/runs/1.26.0-1793592269540/hc050-tactic-picker.json)36布局/264行可达、6次真实双击单次载入/两推荐失败重试通过；[33个开合样本](../../artifacts/qa/runs/1.26.0-1793592269540/hc050-picker-motion.json)及MO重算visible→open229.4ms、closing→closed173.1ms，CSS220/160保持，与隔离28样本分记。[入场1440×1100恢复](../../artifacts/qa/runs/1.26.0-1793592269540/hc050-picker-restoration.json)及两原始键恢复通过，原15组/96四页边框保持。
- npm test225、149模块/298引用、26模板/18规则/10推荐样本/6身份文件及129冻结产品SHA保持。独立[审查](../reviews/HC-050-tactic-picker-release.md)核实际代码/原始报告/图，重复点击问题修复，无已识别未修P1/P2。
- 构建19秒；[APK](../../artifacts/apk/archive/hoopal-1.26.0.apk)4832365字节，SHA256 `fdbfe93514819a3c16b501de80b3be3a7cfa02464bd53aee9fb9d3b5c9126054`。[核验](../../artifacts/qa/hc050/apk/apk.json)1.26.0/code31、球搭/原包名、30网页同dist/15图标同1.25.0/原v2证书/无server.url通过。
- ef473680/M2101K9C重新识别并核打开配置/可见草稿提示/忙态后备份，install-r Success，COLD640ms/Wait649ms。实际0队，档案SHA `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`、进度SHA `dfa4ce4e079dcd3e3f58e5b3b994d3399dd19aded2e66f2e9c3b90905412493e`前后保持，见[before](../../artifacts/qa/hc050/device-before.json)/[after](../../artifacts/qa/hc050/device-after.json)。这是用户原frameIndex3，未还原为上轮frame0；草稿检查不证明所有关闭内存草稿不存在。
- 实际WV96/Android12/393×819的[选单检查](../../artifacts/qa/hc050/native-picker.json)两组几何/九标题及当前选中、局部blur18px/主体filter none、全部可见项命中、无整页溢出通过。322真实RAF覆盖四次开合；外部/当前项/原标题/DOM-Escape关闭，主Play与双文件SHA不变，当前仍4 / 6、60%。主控与审查者查看[手机打开图](../../artifacts/qa/hc050/native-picker-open.png)及[收起图](../../artifacts/qa/hc050/native-picker-closed.png)，未在手机选其他战术、写测试队伍或直接恢复存储。探针与独占ADB转发清理，errors为空。
- 1.24.0及侧SHA归archive且内容逐hash保持、历史链接修正；顶层保1.26.0和1.25.0，图片/APK/QA原文不进源码仓库。代码与设计审查文档按既定GitHub同步方式提交，最终同步SHA留本机QA记录。

手机现停在新版训练场。物理手指、系统Back、物理旋转与原生最终球队CRUD未作为本轮新增验收；Back的九条组件逻辑/五条实际回调VM、浏览器键盘和手机DOM-Escape分别记录，不假称实际Android返回桥或硬件操作。
