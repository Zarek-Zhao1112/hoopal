# HC-007 独立内置防守战术库

日期：2026-10-22。状态：`completed`。设计：[独立防守库](../design/defense-library.md)。审查：[HC-007](../reviews/HC-007-defense-library.md)。

## 用户确认范围

用户确认独立防守库效果图：防守战术与进攻战术并列，独立命名、选取和播放，不绑定某套进攻配合。第一批 3v3 / 4v4 各四套：半场盯人、区域联防、夹击、协防轮转，每套六步及中文讲解。保留原十二套进攻，合计二十套。

维持手机竖横屏和平板一屏工作台、仅内置来源、临时编辑不持久化 Play；不恢复个人库。构建新版 APK 并沿用已授权的设备更新流程。

## 分工与接口

| 负责人 | 独占可写范围 | 内容 |
| --- | --- | --- |
| 主 agent | app.js、board/hit-test.js、测试（除下述数据测试）、文档、版本及构建 | 分类联动、防守呈现、手势可见性、集成与交付 |
| engine | data/**、shared/templates.js、tests/unit/templates.test.mjs、tests/unit/defense-templates.test.mjs | 八套独立防守数据、元数据、数据动画验证 |
| ui | frontend/index.html、frontend/styles/app.css | 分类按钮、防守标识、缩略图 / 蓝色强调及三屏布局 |
| interaction_design | 只读 | 战术表达与独立源码审查，配合实现者修复 |

模板新增 `kind: 'offense'|'defense'`，默认 offense；kind 仅属于模板包装，不进入 Play。原十二套 ID、顺序、站位与帧数保持。防守 ID 以 defense-3v3-/defense-4v4- 开头，独立数据无对手进攻模板 ID。

新增 DOM：`[data-kind-target="offense|defense"]`（库内两按钮），`#tactic-kind-label`（球场上方当前战术标识），`#opponent-toggle-label`（原 checkbox 相邻文字）；body 用 `data-tactic-kind` 表示实际加载来源，`data-catalog-kind` 表示库筛选。保留 #toggle-defense / template-picker 等现有接口，移除个人功能的规则继续有效。

分类筛选仅改变库，不自动丢弃本次演练；选取卡片后加载并返回演练。球场 picker 始终列出实际来源 kind / mode 的全部模板。恢复来源从已有内置 ID 推导，仍仅保存 ID / 步骤。

## 验收

- [x] 八套防守独立可选，各六步，含完整蓝方跑位、对手参考和中文讲解。
- [x] 原十二套进攻继续可用且数据不变，20 套合法、独立构建及动画坐标有效。
- [x] 库支持进攻 / 防守与人数分类，数量、分页、卡片、picker、恢复 ID 一致。
- [x] 防守模式突出蓝方与蓝色路线，对手淡化；显示对手开关只隐藏对手，隐藏球员不会被手势误选。
- [x] 临时编辑、导出和一屏布局回归，个人数据不会恢复或重新保存。
- [x] 数据 / 交互检查和独立审查完成，新 APK 构建签名，记录实际设备安装与显示结果。

真机触摸、键盘、旋转等仍与模拟 / 静态截图分开记录。

## 交付与验证

版本 1.4.0（versionCode 5），12 进攻 + 8 防守。新增 `defense-3v3/4v4-{man-to-man,zone,trap,help-rotation}` 八个独立 ID；每套六步。最终 79 单元 + 3 HTTP 集成检查通过，真实 Chrome 二十套动画及六屏三视图通过。独立审查的四项 P2 均修复并复验，40,040 帧密采样证据见审查记录。

Gradle `assembleDebug`、APK v2 签名、九个网页资源 SHA256 比对均通过；无 server.url。产物 `artifacts/apk/halfcourt-debug.apk`，SHA256 `e3dfb463db418ccdf54797ab55f59331ff5a8dc7970cc7df4af19077dbd28f3b`。

手机 USB 覆盖安装返回 `Success`，包管理器为 code 5 / 1.4.0，冷启动 `.MainActivity` 返回 `Status: ok`。`artifacts/qa/device-1.4.0-ready.png` 实际截图确认页面初始化、增加类别标识，原「无球背掩护」第 3/4 步保留；没有擅自替换用户内置选择。私有文件只读检查旧草稿 `null`、个人库 `[]`、遗留副本 0，选择仅合法内置 ID / 步骤。

浏览器截图：`artifacts/qa/defense-play-phone.png`、`defense-library-phone.png`；用户批准的概念图 `artifacts/design/hc007-concept-v1.png`。这些模拟截图不冒充手机实际防守交互；手机防守选择 / 播放、键盘、返回键、旋转与分享接收等完整验收仍在 HC-001 / HC-005 跟踪。
