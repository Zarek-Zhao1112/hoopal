# 目录与模块边界

## 依赖方向

```text
frontend/src/app.js ──→ shared/engine.js
        │
        └──→ shared/templates.js ──→ data/templates.js
                        └─────────→ shared/engine.js

Vite ──→ dist/ ──→ Android APK（应用内离线运行）
           └────→ backend/app.mjs（电脑和局域网预览）
```

`frontend/` 负责 SVG 球场、阵容交互与播放控制。`frontend/src/storage/builtins.js` 清理用户授权删除的旧个人数据并串行记录内置选择；`lineups.js` 独立保存档案，`lineup-session.js` 协调推荐来源和两个存储键的切换。`frontend/src/platform/` 提供网页与 Android 的存储、指定旧文件副本清理、导出和生命周期适配。业务界面通过接口访问平台能力。旧通用 `storage/repository.js` 保留为历史代码，当前 app 不再引用。

HC-038入口改为`main.js → startup/runtime.js`单例，再动态载入`app.js`。startup/controller负责启动保护层/实际柜体安全视觉快照/错误与跳过，timeline为无DOM的单次帧时钟，styles独立引入。HC-041将时长更新为2400ms，导出冻结的STARTUP_TIMING统一纯进度与controller阶段：停留1000ms、展开1100ms、交接300ms，标题1165–1825ms淡出。app原读取与初始化完成后才调用ready，慢读取/失败不会用默认空柜替代；导航/弹窗/键盘与Android Back共享active门控。后台或减少动效直接结束，普通页面切换不创建新实例；WebView96有事件/焦点降级，无需inert支持。此层不读写存储，不加入账号/服务器；中文球搭/英文HOOPAL更名不改com.halfcourt.tactics或旧存储键/目录。

`frontend/src/workspace/state.js` 提供与 DOM 无关的列表分页、步骤页定位和 Unicode 文本分段；`controller.js` 管理更衣室 / 训练场 / 战术库 / 档案视图，内部 ID 为 lineups/play/library/archives，以及弹窗与焦点、长讲解和完整姓名按真实正文空间分页、旋转阅读位置。视图状态不写入 Play 或存储。CSS 按固定动态视口布局，球场为只读，战术编辑视图、工具、输入和快捷键已移除；阵容配置表单独立保留。

`workspace/page-layout.css` 由主 CSS 引入，以 `body.page-layout` 定向覆盖旧工作台布局。更衣室保留 `#lineup-brand-header`，训练场和战术库显示无交互的 `.page-top-space`，保留主卡上方留白。训练场 `.training-panel` 将原球场、回放与步骤包在同一卡内，内层 `.board-section` / `.board-card` 用 display:contents 参与布局；库使用 `.library-deck-panel` 单主卡。手机竖屏纵向排布，横屏/平板以左球场、右回放与步骤展开；原四/六步数据、步骤分页、人员图例/分页、讲解和播放控件继续使用原节点与逻辑。卡片起线按视口分段设置（390×844为116px、360×640为96px、844×390为68px、1024×768为120px），不缩改球场逻辑坐标。设计与验证状态分别见 [页面适配](design/page-adaptation.md)和 [HC-023](tasks/HC-023-page-adaptation-release.md)。

`app.js` 的 placeModeControl(view) 将唯一 `#mode` select 移到 `#play-header-controls` 或 `#library-header-controls`，保留原节点、change 监听与忙碌状态。库页显示 catalogMode，切人数/攻防只浏览；回到训练场显示 store.play.mode，训练场切人数仍调用原内置载入流程。`#open-menu` 固定在训练场卡片标题旁，导出继续由原菜单处理。隐藏的只读 `#play-title` 保留当前战术元数据，避免页头重复标题；排版不新增存储键或替换来源协议。

`#storage-status`独立为body直属live状态，正常hidden，真实持久化/旧个人数据清理失败才在顶部空白显示；不与只读元数据共用隐藏祖先，不增加常驻离线文案，也不挤动正常主卡。

`workspace/page-transition.js` 与 `.css` 处理主页面600ms柔光揭示，`soft-glow.js` 提供无DOM的三段曲线：同步切换真实视图，旧页视觉副本在fixed/closed ShadowRoot中，CSSOM缓存且ID/SVG引用重映射；全部后代强制无pointer事件、焦点与读屏，导航在上层。反向羽化遮罩露出真实页面，另有不可交互的银白冰蓝光晕层，不依赖较新的View Transition API。快速切页、旋转、后台、弹窗、减少动态效果和异常均同时清理两层或立即降级。设计与兼容证据见 [页面动效](design/page-motion.md)。

`workspace/library-deck-state.js` 按测量区域计算四/六张标题卡矩形；`library-deck.js` / `.css` 管理当前展开ID、真实hidden内容、焦点隔离、错开位移与busy/pending锁。默认全部收起，同卡再点关闭，换卡仅打开一个，入库/筛选重置。同组render不重建或复位，缩略图按内置ID延迟构建缓存。标题卡在库主卡的可用区域中布局，无旧模板分页。库页的catalogMode/catalogKind仅筛选，不改当前Play/来源，只有明确「开始演练」调用原loadTemplate并在成功后播放；来源清空失败保留卡和旧演练。详见[标题卡设计](design/stacked-library.md)。

`frontend/src/lineups/ui.js` 管理更衣室、档案、推荐和 create/edit 任务状态。HC-033在同一`#lineups-panel`通过`setView(lineups|archives)`和`onNavigate`协调内容与workspace路由，`data-section`供样式隔离；更衣室只显示当前队柜位，档案三卡分页与创建/管理独立。所有操作通过onAction访问真实session，选队成功后才进入更衣室；当前队重开不重复select以保留合法来源。`archives.css`提供卡与owned管理菜单，菜单加入isModalOpen/handleBack/背景隔离与焦点返回。编辑、改名和换球队锁定所点ID，复用三任务并记住来源页；新建完整保存、面板关闭后进入更衣室。新建/编辑共用名称人数、NBA球队、逐人资料与标签；已有档案人数固定，新建需球队及完整体型/移动，旧中性或未完整档案仍可显式保存。长姓名和错误全文可分页查看，面板内说明由自身状态管理，其他检查通过onInspect接入工作台；用户文本不拼入HTML。

`frontend/src/lineups/sheet.js` / `sheet.css` 隔离玻璃面板壳与样式。原生 `dialog#lineup-wizard-dialog` 标记 `data-lineup-owned=true`，以约 450ms 由底部浮起、关闭反向，遮罩与背景模糊渐变；减少动态效果时直接切换。`onModalChange(open)` 通知 app 取消主页面转场、暂停播放并更新控件，`isModalOpen` 包含打开与关闭过程，导航/快捷键/返回逻辑据此保护面板。工作台通用弹窗关闭逻辑跳过该 owned dialog，由阵容 UI 统一处理遮罩、Escape、返回和草稿确认，退出后恢复触发焦点。

主控向阵容UI独立传递`session.writeLocked`，不把普通操作错误当作读锁。读锁时两页常显读取错误与真实重试入口，无合法空态、未知档案计数或创建；切页清理临时反馈不会清除此状态。只有session.reload读取成功才恢复档案内容；存储层读取/写入保护协议不变。

HC-035的`creation-layout.css`由sheet.css引入，将建队步骤/大球衣与标签布局限制在wizard内。UI复用稳定`.lineup-sheet-content`，内层`.lineup-wizard-page`每次重新渲染，仅显式步骤/成员切换交给`wizard-motion.js`；其他错误/标签/忙态重绘取消旧动效。capture在转盘销毁前复制旧视觉，play只对内容做320/280ms横移，壳/头/进度/底控固定；SVG局部ID/URL重映射，HTML ID/业务data清理、旧控件disabled/tab-1/aria-hidden和pointer隔离，不参与业务查询。布局用class保留退出页样式。token、RAF/timer及监听器处理快速切换、断开DOM、resize/hidden/pagehide/reduced；独立滑动模块回调成员delta，取消/忙态/解绑不提交。输入只更新当前球衣、caption和成员标记，保留同一input节点与光标。存储session/两键格式没有修改。

面板兼容路径面向 WebView 96：背景控件显式 disabled/tabIndex 隔离并约束 Tab 焦点，不只依赖 inert；无 showModal 时使用 open 属性。玻璃滤镜有前缀增强，基础渐变底色保持可读；视口使用 visualViewport/innerHeight 测量，低高度及输入聚焦时压缩布局，不依赖较新的 :has 选择器。这里说明实现路径，不替代浏览器或真机验收，结果见 [HC-021](tasks/HC-021-lineup-glass-release.md)。

创建草稿及按档案 ID 隔离的编辑草稿只驻留 UI 内存，包含稳定档案/成员 ID。任务和成员切换不写盘；关闭时可继续、保留会话草稿关闭或放弃，没有跨进程草稿恢复键。`styles.css` 保留阵容与推荐基础样式，面板样式由 `sheet.css` 定向覆盖，不把任务状态写入主页面路由或 Play。

NBA 球队选择是同一面板的第二个任务，`team-carousel.js` / `team-carousel.css` 管理平整队徽的浅弧转盘、左右拖动、低惯性吸附、取消/打断/生命周期清理和全部球队分页入口。组件通过`onChange`更新当前内存草稿与真实球衣，`onAllChange`让UI隔离外层任务控件，列表内焦点由组件约束，Back先关闭列表。初始null使用中性占位且不回调，明确选队后进入30队循环；取消可回滚到初始null。render前销毁旧组件，不让旧RAF写新草稿；最终保存才生效。设计与验收见[队徽转盘](design/team-carousel.md)。

`jersey.js` 使用 `data/nba-teams.js` 代表风格渲染原生 SVG，`team-assets.js` 经 Vite 导入 `frontend/assets/nba/` 的官方队徽。目录与素材来源见 [NBA 资源说明](../data/nba/README.md)。`nbaTeamId` 是可空的档案字段，旧记录缺省为 null，读取不写盘、保留旧 crest/color 以兼容，不改 schemaVersion 1、存储键、推荐职责或 Play 格式。

`shared/lineups.js` 白名单校验档案，允许未完成配置的成员存档；`shared/recommendations.js` 对同人数内置进攻枚举一对一职责分配，生成理由、条件与稳定排名。`data/recommendations/offense.js` 保存十八套实际动画的职责需求，独立于原始站位；资料依据和有限推论见 [规则说明](../data/recommendations/README.md)。推荐不修改 Play，也不依赖 DOM、存储或网络。HC-027将六套进攻追加在旧20套之后，不改变旧ID/顺序或存储协议；HC-029库组件一页显示全部9进攻或4防守，短屏展开覆盖当前卡、其余标题不可聚焦并提供收回入口；纯布局与存储隔离，页面浏览不写入选择或推荐来源。

`shared/engine.js` 负责比赛模式、完整场上快照、战术校验、撤销重做和动画插值。它不依赖 DOM、HTTP 服务或内置战术，可以独立测试，并可由未来的后端复用。

`data/templates.js` 汇总二十套内置配合，`data/tactics/legacy.js` 保留原四套，`three-on-three.js` 和 `four-on-four.js` 保存其余进攻；`defense-three-on-three.js`、`defense-four-on-four.js` 各提供四套独立防守。`helpers.js` / `defense-helpers.js` 提供纯数据路线辅助函数。定义包含名称、人数、分类、难度、分步站位、路线和讲解。`shared/templates.js` 使用引擎将这些定义转换成完整战术，保证每次载入获得独立的数据副本。

模板包装元数据 `kind` 为 `offense|defense`，缺省 offense；kind、分类、难度不进入 Play 或导出格式。app 分别维护实际来源类别与库筛选类别，浏览分类不替换演练；从持久化 ID 推导类别。防守模式以蓝方为可见性和命中的主队，隐藏开关只作用于橙方。动画球的可见性取相邻真实帧的球权，避免插值期间临时空 holderId 被误判为真正自由球。详见 [独立防守库](design/defense-library.md)。

Vite 把前端、共享逻辑、内置数据和 Capacitor 客户端打包到 `dist/`。`backend/server.mjs` 启动电脑预览服务；`backend/app.mjs` 只提供 `dist/`，不公开源码目录。Android 工程把相同的 `dist/` 拷贝到 APK，运行时不依赖 Node 服务或网络。打包配置没有 `server.url`，构建和验收说明见 [Android 离线版](android.md)。

## 战术数据

导入导出的战术结构保持兼容：

```text
Play
├── id, title, mode             mode 为 3v3 或 4v4
├── frameIndex                 当前选中的步骤
└── frames[]
    ├── mode
    ├── players[]              id, team, number, x, y
    ├── ball                   x, y, holderId
    ├── paths[]                id, type, points[], playerId（可选）
    └── note                   这一步的讲解
```

所有位置采用球场的逻辑坐标。路线类型为 `run`、`pass`、`screen`、`dribble`。每步存完整快照；动画使用相邻快照与匹配路线计算中间位置。导入时通过 `validatePlay()` 校验并复制允许的字段。

## 存储位置

`halfcourt-builtin-selection-v1` 只保存内置模板 ID / 步骤；新 `halfcourt-lineups-v1` 保存 schemaVersion、多档案、activeProfileId 与可空 playbackContext（profileId / profileRevision / templateId）。网页使用 localStorage、Android 使用应用私有文件。档案和选择读取失败均保护原数据；档案未知 schema 锁写，可解析的坏条目隔离，损坏原文在替换前备份，写入捕获快照并串行执行。

`storage/lineup-session.js` 的 `create(options)` 在调用时复制输入，支持完整 `players` 快照：先用 createLineup 建立白名单元数据，再合并成员并 validateLineup；在串行队列内检查二十档容量与重复档案 ID，最后一次 commit 保存完整档案、当前档案 ID 和清空后的来源。不会先存空档再 update；无 players 的旧调用仍兼容，session 层不强制体型或 NBA 完整。创建 UI 使用稳定草稿 ID、防重复提交与最终完整性校验。只有 repository.save 成功才替换 session 状态，写失败保留原状态和表单以便重试；读失败锁写，不用空初始状态覆盖未知档案。编辑仍使用原 revision 校验与递增、来源解除协议。

推荐结果 / 映射不落盘。恢复时校验实际模板、人数、档案 ID / 版本，再按当前规则重算。普通选战术先成功清空来源引用才切换；推荐播放先清旧引用，再写内置选择，最后写新引用。中间失败宁可恢复普通演练，不能误套旧队伍姓名。后台保存等待当前操作完成，避免用旧界面模板覆盖切换中的新选择。

按用户授权，初始化将旧 `halfcourt-draft-v1` / `halfcourt-library-v1` 及 WebView 原始键写为空，清理同前缀备份 / 临时副本，不备份或恢复旧个人 Play；失败可见、下次启动重试。详细范围见 [内置唯一来源](design/builtins-only.md)。

Android 导出先写应用缓存，再通过系统分享交接，取消或失败单独处理；不再提供导入，外部已导出文件不在删除范围。当前目标是手机离线运行，无业务服务器或账号系统。

## 测试与产物

App图标母版位于 `resources/app-icon/curry-approved.png`，原提示词/来源/哈希在同目录README；`scripts/generate-app-icons.ps1`做确定性缩放，输出Android五密度图标与 `frontend/assets/app-icon.png`。26+自适应XML使用108dp前景中央72dp原图，24/25使用传统PNG；`app_window_background`与图标色分离。母版不依赖Codex生成目录，验证与真实桌面证据见[图标设计](design/app-icon.md)。

`frontend/src/lineups/locker-room.js` 保留 createLockerRoom 接口，并导出 `createEmptyLocker({document})` 返回空柜 DOM。每个真实柜位占 viewport 的 100%，静止时只显示一个柜，无相邻露边；track 按成员索引横移，左拖下一位、右拖上一位，箭头/圆点同步，边界不环绕。非当前柜的姓名按钮实际 disabled/tabIndex 隔离，保留 pointer capture、取消手势及点击保护。`ui.js` 按档案 ID / 成员 ID 管理本次焦点并更新详情/配置。

`locker-open.css` 在阵容基础样式之后引入，提供灰蓝哑光柜框、姓名牌、真实镂空木衣架、柔光、柜内木板与下层格。场景由本地 HTML/CSS/SVG 组成，不使用远程纹理；空柜与有球衣柜共用结构。`frontend/src/board/appearance.js` 继续为球场、棋子、缩略图和 PNG 提供显式 SVG 外观，本轮不改球场坐标或动画。玻璃导航在主 CSS 中有滤镜增强和不透明回退，不参与存储。

- `tests/unit/`：状态、帧编辑、数据校验、持球和路线动画、模板生成，以及阵容完整成员单次创建、失败重试、读锁与单柜手势/焦点边界。
- `tests/integration/`：入口页面、前端与共享模块资源路径、HTTP 方法及目录访问边界。
- `tests/e2e/`：共享 browser-qa 驱动只读播放、阵容、标题卡、玻璃面板及页面转场流程；page-layout-flow 定义六尺寸的主卡/品牌/留白、真实控件命中、共享人数节点身份及浏览不改数据检查。阵容流程覆盖三任务创建/编辑、面板导航隔离、会话草稿、单次保存/失败重试、推荐/来源恢复、导出、手机尺寸与触屏。这里只列检查范围，执行结果由任务/验证记录单独记录。旧 builtin-flow / defense-flow 保留历史实现记录，不再作为当前含编辑功能的验收。
- `artifacts/qa/`：截图、下载样本、浏览器临时目录；不作为源码提交。

`npm test` 会先构建再运行单元和 HTTP 测试。`npm run test:browser` 针对已构建资源自动启动临时服务，包含网络断开后的交互验证。原生接口 mock、浏览器模拟和 Android 真机结果分别记录。

## 卡内独立循环（HC-031）

`workspace/library-preview-clock.js`以纯毫秒状态管理2400ms段与1000ms末停，`library-preview.js`复用实际引擎、材料和可见性规则，生成button内SVG并维护单rAF、暂停/重置/销毁与DOM状态。`library-deck.js`懒创建当前预览，保留九卡/短屏覆盖，忙碌先暂停再禁用，解除忙碌不自动续播，换组销毁旧实例。`app.js`注入makePreview、绑定页面可见性与后台即时暂停；卡内时钟不碰主PlayStore、保存进度或推荐来源。只有进入训练场沿原clear→load→start，失败保持原文与原主状态。无schema/键迁移、无远程视频或业务服务，源与设备证据在[HC-031](tasks/HC-031-inline-motion-release.md)分别记录。
