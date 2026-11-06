# HC-082 · 连续球场整卡与进度步骤联动正式接入

状态 `awaiting_device`。正式实现、独立审查、自动检查、APK构建与指定手机保数据安装完成；真实WebView程序核对通过，待用户手动体验。用户批准 [HC-081](HC-081-training-capsule-concept.md) 最终修正版并要求正式改动、双外观适配、步骤说明与进度节点联动及手机安装。设计接口见 [训练场整卡](../design/training-scene.md)。

## 设计合同

- 木地板连续覆盖整张训练卡片，标题、球场线与球员、步骤说明、底部胶囊位于同一画面上。无中间矩形底图或上下实色区域。
- 底部胶囊保留完整倍速、当前步/总步数、百分比、带节点进度与播放暂停。移除独立重播、前后步、循环和单独编号行；继续自动循环播放。
- 节点按真实进度位置布置，点击跳至该步；播放/拖动同步更新当前步、节点明暗、标题、说明及球员。原有同队职责说明、交换球员、攻防显隐、战术库和导出保持可用。
- 玻璃浅色与写实暗色共用布局；竖屏参照批准图，横屏/短屏/电脑保完整球场比例、可读说明和可点控制。
- 不改存储格式或键。来源切换、读写失败和生命周期停播沿用原有保护。导出的标准球场图不包含界面浮层。

## 分工与接口

- 主控：`frontend/index.html`、`frontend/src/training/view.js`、`scene.js`、`frontend/src/app.js`，版本构建、文档、浏览器集成与手机安装。
- 样式 agent：新增 `frontend/src/training/scene.css`；接入主控放在全局样式最后。只写此文件，保留旧样式供非训练相关对话框使用。
- 回归 agent：受影响浏览器回归与单元检查，文件范围另发；不得改正式应用文件。
- 独立审查：集成后只读检查真实联动、节点触控、SVG导出、短横屏、球队角色与Android兼容；记录在 `docs/reviews/`。

DOM：`.training-panel.training-scene-card` 下 `.training-floor` 为背景SVG，`.training-header`、`.court-stage > #court`、`.playback-bar` 为内容层。`.playback-bar` 内 `.training-detail` 含原 legend 与说明，`.training-capsule` 由 `#speed`、`.training-timeline`、`#play-toggle` 三列组成。时间线内 `.training-progress-heading` 为 `#frame-counter` / `#play-progress`；`.training-scrub` 内 `#timeline-scrub` 与 `#frame-list` 重叠，后者为实按钮节点，`.frame-number` 只做圆点无数字。`.frame-item` 的 `--step-position` 表示0至100%的节点位置；胶囊 `--training-progress` 表示实际轨道填充百分比。

## 必需验收

1. 单元/集成、战术目录校验及构建。
2. 浏览器双外观、多尺寸、3v3/4v4、攻防与4至8步；节点点击、拖动输入和提交、播放跨节点、暂停、循环、倍速、切换来源、角色交换及导出。
3. 独立功能审查，记录修复和未覆盖边界。
4. APK构建、保数据安装指定手机；真实WebView核对与用户人工体验分开记录。缺少人工体验用 `awaiting_device`。

## 实现与验证

- `scene.js` 生成全卡连续木纹背景，标准球场的两背景矩形仅在界面CSS中透明化；球场原始坐标、纹理和品牌保留于导出。
- HTML移除旧独立控制与编号行；view创建真实节点、保留节点DOM、更新真实进度与辅助说明；app复用播放器控制，支持从轨道与节点起拖、手动暂停/松手保连续位置，自动循环。
- 样式负责人交付 `scene.css`，双主题、竖/短横屏与电脑适配，完整64px倍速。独立审查见 [HC-082审查](../reviews/HC-082-training-scene-release.md)：短竖屏旧grid-row继承导致节点裁切P2已修复，双外观四尺寸共64节点命中复验通过，无未修阻塞。
- 265项单元/HTTP集成通过；26套/91职责/体型/进攻角色偏好目录校验通过，模块导入与文档链接检查通过。首次沙箱HTTP连接EACCES后用允许本机连接的环境复跑通过。
- Chrome主控 [四组回归](../../artifacts/qa/runs/1.36.0-1793936438460/run.json)：training-library / page-layout / glass-sheet / team-main-roles全过，无运行时错误及外部请求；其中本队角色来自当前主副角色分配流程。
- 样式负责人最终20场景（双主题×5尺寸×库/真实4v4本队）无页面溢出，倍速/播放/说明/8节点中心全部命中，本队10场景legend显示，`artifacts/qa/hc082-styles/layout.json`。极短屏右侧说明/球队区域内部滚动。主控亲看393竖屏双主题与本队截图。
- 只读26战术与lineups浏览器组通过；训练观看组记录在下方后续结果。首次360×400失败证据保留于 `artifacts/qa/runs/1.36.0-1793936304117/`，对应上述P2；回归脚本关于原生range空隙和对话框焦点恢复的检查已按真实操作修正，不作为新产品缺陷。
- [最终训练观看回归](../../artifacts/qa/runs/1.36.0-1793936729393/run.json)通过，`hc082-training-viewing.json`包含72个双外观布局、12次真实鼠标/触摸拖动与原生键盘range演练、双外观完整自动循环257/255样本及40张截图；步骤、说明、站位和连续位置同步，暂停/松手无回跳。只读26与lineups通过项见首轮记录的对应groups。合计7个相关浏览器组通过，独占Chrome/临时资料均由会话finally清理。

## Android与真机交付

1.36.0 / code45，`node scripts/android.mjs build`成功（Gradle21秒）。[APK](../../artifacts/apk/hoopal-1.36.0.apk) SHA-256 `f2e423a8e8dbfde8db23813e51e00733129d81a2152e50f5d515ca72464fb728`。核对32份网页资源与dist一致、15张原图标不变、原v2签名、无server.url；证据 `artifacts/qa/hc082-apk/apk.json`。

指定手机M2101K9C / ef473680从1.35.0保数据覆盖安装成功，COLD706ms。更新前停止应用写入，逐份备份原文；安装后与真机操作验证后，两次核对球队/进度哈希均保持：

- 球队：`cc6103d3fd35f00c7a16549a7c3dbaf69a1d83452f6508018af9a86ca77c229f`。
- 战术进度：`fbbec19c9bd474935f66f1e08633b2d707c102ba8d708ed78fd4cd2e3f310623`。

真实WebView96、393×819双外观程序核对：背景覆盖整卡、无整页溢出、可见控件fit/hit；6步「手递手配合」逐节点实际触摸、从当前节点拖至58%、暂停保位置、2倍速完整自动循环（667帧采样，说明与floor步骤一致）通过。恢复原写实外观、原frameIndex3及1倍速，停在训练场；手机没有写入示例球队或改变来源。证据 `artifacts/qa/hc082-device/` 的before/after-install/after-probe、native-checks和截图。手机程序/截图验证与用户物理手势、系统返回/旋转及观感验收分开，后者待确认。
