# HC-056 · 整体体型挑选战术正式接入

- 日期2026-11-02；状态`awaiting_device`；1.28.0/code33已实现、审查、验证并安装，人工手势/IME/旋转与偏好操作体验待确认。
- 用户批准[HC-055](HC-055-body-type-tactic-concept.md)最终[效果图](../../artifacts/design/body-type-tactic-concept/overview-v1.png)，明确只用体型写法并开始实现。范围为入口改「挑选战术」、整体体型分类、同人数筛选和局部玻璃战术选单，取消逐个角色确认必经流程。按既定目标验证后保数据安装指定手机、同步现有仓库。
- 现行设计：[整体体型挑选战术](../design/tactic-body-selection.md)。

## 产品与接口

球队入口锁定当前球队mode；3v3只列三人战术，换队后重新核验。独立战术库仍可浏览另一人数；库卡进入挑选页跟随该库卡mode，不暗改球队人数，显示浏览模式/相应人数，不能伪称当前队可用。首屏选择整体体型，查看战术成功后记住该队偏好，下一次进入可沿用且能「更换体型」。无球队时可在独立库内临时选择体型，不造队/写测试成员。

挑选子页重复点击底栏「战术库」回到原库列表；切其他底栏同样关闭子页，不遗留不可见预览。选单打开及收回期间底栏保持锁定。

3v3类型one-big/一大两小、two-big/两大一小、similar/体型接近；4v4类型one-big/一大三小、two-big/两大两小、three-big/三大一小、similar/体型接近。说明只写一名体型较大等，不自动等同内外线位置/能力。分类是浏览索引，一套可多类，保留简短动作说明，不做能力打分/最适合承诺。全部26套攻防保持可达，每个mode×kind×类别均有显式人工归类；真实155帧/ID/顺序/roleVersion与职责元数据保持。

新增shared/tactic-body-types.js（不依赖DOM/存储），导出BODY_TYPES、getBodyTypes(mode)、isBodyTypeForMode(mode,id)、validateTacticBodyTypes(template)、filterTacticsByBodyType(templates,{mode,kind,bodyType})、getTacticBodyNote(template,bodyType)。BODY_TYPES按mode索引数组，项为{id,label,description,largeCount,smallCount,equalCount}。过滤严格mode/kind及bodyTypes包含关系；null可返回同mode/kind全部供独立库，UI必须选明确类别再查看。每套定义bodyTypes非空数组、bodyTypeNotes按这些ID给简短说明，shared/templates透传；角色目录构建gate同时校验体型元数据，缺失不能发布。

新frontend/src/selection/ui.js导出createTacticSelectionUI({document,root,onAction,onInspect,onModalChange,onClose})；root=#tactic-selection-panel，在库原卡位置且不动四页外框。render({state,busy,error,writeLocked})、open({mode,kind='offense',templateId,source='team'|'library'})、close({immediate=false}={})、handleBack()、isOpen、isModalOpen。body.dataset.tacticSelection=true切内容；打开默认球队未选bodyType时体型页，已存可直接战术页，返回/更换体型可重选。

UI onAction异步bool：body-type({bodyType,expectedRevision,profileId})只在「查看战术」提交球队偏好，失败留选择供重试；play-tactic({templateId})从头普通编号演练，可靠清旧来源后沿原load；choose-team进入我的；无队/人数不合的库浏览仅内存偏好直接查看，不调用队保存。新选单仅列当前mode/kind/bodyType候选，标题＋一句用途＋当前勾选，220ms展开160ms收起、outside/Escape/Back取消、内部滚动、焦点/背景锁/快速意图/减少动效/旋转。只挑选不改主Play或进度；真正进入训练场才解除来源并载入。主预览使用真实createLibraryPreview/共用SVG，离开/换战术/弹层/后台暂停并销毁旧RAF。

取消旧roles UI与逐人认领入口，但保留所有纯角色元数据、旧计划读取/校验及安全测试，避免删掉用户已有分工。新训练统一编号讲解，不把旧rolePlans或体型推成新成员分配，旧来源不显示为本队已确认。旧source在新手选/进入训练场前仍须可靠解除；失败不能表面切换成功。

## 数据影响

沿用halfcourt-lineups-v1/schema2和所有原键；profile新增可选bodyType，缺省null。基础validator验证同mode合法ID；schema1仍按HC054原文备份迁移，schema2读取不为默认bodyType自动写盘。遇到坏bodyType只隔离该字段/null并保原文备份，不丢球队及旧rolePlans。旧schema2计划/来源保存兼容，旧版本降级可能忽略新增偏好字段（仅偏好不影响成员/原计划），不声称降级保新偏好。保存捕获快照/串行/读锁/失败重试保持。

session新增setBodyType({bodyType,expectedRevision,profileId})，调用前捕获当前档案身份，执行时校验mode/成员原样与revision，成功递增profile.revision，保所有计划；合法旧ctx若保留需跟新revision，或明确解除，不自动重新映射。改名/号码保bodyType，其他人数另建；新创建默认null。UI只提交查看时最终选择，不逐点击落盘。

## 所有权与并行

- body_data：独占data/tactics/**体型元数据/辅助、shared/templates.js、shared/tactic-body-types.js、shared/tactic-roles.js目录gate、scripts/qa/check-tactic-roles.mjs、tests/unit/tactic-body-types.test.mjs；不改动画帧/ID/roleVersion或旧plan API。完成回报后可另领测试。
- body_ui：独占frontend/src/selection/**、旧frontend/src/roles/**退役（保基本建队聚焦样式迁移到wizard样式）、frontend/src/lineups/views/locker.js入口名/文案、frontend/index.html新panel、frontend/styles/app.css导入。除必要样式不改wizardJS、app/storage/shared/data/config。全部短屏/横屏/4人卡可达，主卡与四页一致。旧roles CSS中的基本编辑器/聚焦修复必须保留。
- 主控：app.js/共用预览接线、shared/lineups.js、storage、所有版本/构建配置、测试集成/文档/浏览器/APK/设备/Git。团队/库不同入口mode由主控传入。
- review：未实现相关代码的独立agent只读审查生产/测试，独占docs/reviews/HC-056及索引。查人数/空候选/筛选错配/旧来源/读取迁移/异步快照/玻璃焦点/RAF/短屏。

## 验证与交付

有意义单元覆盖26分类完整性、每类攻防可达、过滤人数/类别、未知bodyType保护、schema1/2零写读与备份失败、setBodyType陈旧/换队队列/失败重试/保成员计划/改名继承。退役三态UI流程断言，替换为真实挑选流程，不删除迁移/来源/草稿/旧角色纯逻辑保护。

浏览器覆盖3v3与4v4各类别/攻防/同人数严格选单、库自由浏览与队伍入口差异、选择取消不写主Play、偏好失败重试、source清除失败保原状态、真实循环预览/离开暂停、220/160ms/双击/Back/focus/四页/短横屏/旋转/减少动效。保155帧基线、启动、原库卡循环、建队草稿和NBA、导出/offline；npm test与完整browser通过后必要APK构建及签名/资源检查。安装前即时备份两原文并核设备无打开草稿，install-r不重置/不写测试球队，真实WebView与人工手势分开记录。未完人工项awaiting_device。

## 实现、问题与自动验证结果

已接入bodyTypes/bodyTypeNotes和14组可达校验，全部26套155帧/91职责/roleVersion/原顺序保持；[data原帧对比](../../artifacts/qa/hc056/body-data-result.json)与审查者实施前独立快照逐字段复核均通过。入口、纯体型卡、按队偏好、同人数玻璃选单与真实预览已实现；旧roles UI与专属role-requirements-flow退役，新body-type-selection-flow替代，旧纯计划与安全存储测试保留。

- [npm test最终日志](../../artifacts/qa/hc056/npm-test-final.log)：246项全过（含新增9分类单元、13偏好/存储单元及原安全覆盖）。首单元仅因legacy测试夹具来自新版createLineup多出bodyType:null而不等于原schema1输出，已明确在旧夹具删除新字段，不改严格旧数据校验。
- [实际构建门槛](../../artifacts/qa/hc056/build-gate-negative.json)：原入口影子副本的npm build/Android sync对缺分类和空组合各拒绝一次，4次exit1，无dist/android生成，源hash不变，临时目录清理。
- 首新E2E发现360×400 tactics的说明/按钮因固有最小高度总和超过主卡，落入底栏不可点；[原失败](../../artifacts/qa/hc056/body-e2e-before-short-fix.json)与[真实命中定位](../../artifacts/qa/hc056/short-tactics-hit-probe.json)保留。修短竖屏四行grid/左右预览与footer，短横屏压明确行高，保全部操作；[8反馈组合复验](../../artifacts/qa/hc056/short-tactics-fix-check.json)说明和CTA实际centerhit，独立审查再次命中通过。
- [新完整挑选专项](../../artifacts/qa/hc056/body-e2e/hc056-body-type-selection.json)：14组/16布局、取消0写、偏好保存fail/retry、分队记忆、跨人数库不写错队、无roleplan直接编号、旧source清除fail保状态/retry、真实loop/后台tab/离页RAF释放通过。纯RAF采样首次漏瞬时open保[旧观察日志](../../artifacts/qa/hc056/body-e2e-before-motion-observer.log)，加MO观察真实phase不改时序，MO/RAF实测223.6/169.6ms，门槛210/150及CSS220/160保持。
- 最终[完整17组](../../artifacts/qa/runs/1.28.0-1793607069188/run.json)从头全过，零runtime错误/外部请求，自有Chrome/profile/server清理。保原启动27组合/7控制、26只读/导出、九标题/卡内循环、96四页边框、六扩展43帧、档案/建队草稿/NBA/触摸/玻璃/训练场等回归；修改5个旧E2E只替换已退役角色UI与姓名图例期待，来源失败/原文/取消保护保留。
- [独立审查](../reviews/HC-056-body-type-tactic-release.md)及[独立最终复算](../../artifacts/qa/hc056/independent-final-evidence-review.json)通过，无未修P1/P2。一次审查脚本把多CSS属性时长误当单值失败，修观察后逐项严格160ms验证，不是产品时序修复，原记录保留。

## APK与真实手机

[最终APK](../../artifacts/apk/hoopal-1.28.0.apk)4,845,725B，SHA256 `9dc9137ec94f69f386720cfbca0f986a132054134b7a666e063d77b966990d11`。[构建](../../artifacts/qa/hc056/android-build.log)原生24秒；[APK报告](../../artifacts/qa/hc056/apk/apk.json)1.28.0/code33、30资源同dist、15原图标、原v2证书/包名/无server.url通过。旧1.26与SHA保hash归archive，1.27留作回退；[归档](../../artifacts/qa/hc056/apk-archive.json)引用已更新。

指定ef473680/M2101K9C重新核对devices，[安装前](../../artifacts/qa/hc056/device-before.json)即时备份真实1支3v3球队、pick-roll/frameIndex0，未开新旧向导/分类草稿/忙态；检查只覆盖当前可见指标，不证明所有闭合会话草稿不存在。install-r Success，COLD846ms/Wait853ms。[真实WebView96](../../artifacts/qa/hc056/native-selection.json)程序检查：当前三人体型草稿更改后取消不写、另一人数四人4类×攻防8组仅浏览不写错队、选单锁/暂停、真实预览推进和离页RAF=0、主Play/步骤/成员保持。起始与结束双hash均等于即时备份，不造测试队、不写真实偏好、不直接恢复存储。

后续通用device-state after严格原文相等检查拒绝：档案hash已从`80faa883e3dcfd5ac1c600373d1f3c6c639e577bf200234b9a44c44b3c3fd716`变为`ef9b870c7ae4beb46d8dd6ee275388f83d13ceb51a98a27a1d1c520070acf3b4`。[字段差异](../../artifacts/qa/hc056/device-data-diff.json)与[最终状态](../../artifacts/qa/hc056/device-after.json)确认唯一变化是bodyType缺省→similar、revision1→4；去除这两字段的整个state含成员/旧plans/当前球队/其他属性相同。进度原文hash`116a20169ddd85f2ba67bbba685cba48d0511536b8ea48430595074ea142d1b0`仍相同。原native探针已在变化前以精确字节完成；后来变化来源未观察，不归因为用户操作、不推定人工偏好保存验收。保最新偏好，没覆盖/还原旧文件；没有放宽通用严格after工具来假报双hash不变。最终报告lineupsAndSelectionUnchanged=false、installationAndNativeProbeBytesUnchanged=true如实分列。

## 交付边界

源码/文档同步既定私有GitHub，APK/截图/真实存储备份不入Git。功能、独立审查、自动检查与安装已完成；人工手指/系统Back/IME/旋转及操作过程未观察的真实偏好体验待用户验收，故awaiting_device，不宣称这些人工项已完成。全场/5v5与账号后台不在本轮范围。
