# HC-054 · 战术条件、三态认领与替换旧推荐

- 日期：2026-11-02；状态：`awaiting_device`。实现、独立功能审查、自动验证与手机安装完成，人工手势/IME/真实球队认领保存待验。用户批准HC-053效果，授权正式替换旧能力自评/打分分工流程，并要求全26套及未来新增覆盖。
- 目标1.27.0/code32；设计：[角色认领](../design/tactic-role-assignments.md)，[批准视觉](../../artifacts/design/tactic-requirements-concept/overview-v1.png)。保原26动画/155帧、四页/220-160标题选单/2.4秒启动/图标/离线能力，完成后更新既定手机并同步GitHub。

## 实现接口（先固定再并行）

战术新增roleVersion=1与roles数组，每项{id,playerId,number,title,task,actionIds,stepHints?}：id在战术内稳定，playerId是动画attack-N或defense-N，number为职责号；actionIds是动作条件标识，不是队员能力评分。纯shared/tactic-roles.js提供validateTacticRoles(template)/validateTacticCatalog(templates)、createRolePlan(template,profile)、validateRolePlan(plan,template,profile)、getRolePlanState(plan,template,profile)、setRoleResponse(plan,roleId,{status,memberId},template,profile)、swapRoleMembers(plan,roleA,roleB,template,profile)、suggestRoleAlternatives(template,roleId,templates)。plan={templateId,roleVersion,assignments:[{roleId,status,memberId}]}，status为unknown/available/missing，只有available且有效唯一memberId才计确认，其他两态memberId=null；不把意愿或默认沿用当已确认。getRolePlanState至少返回{ready,confirmedCount,needsReview,roles:[...角色元数据,status,memberId]}；新/旧版本未确认不得套本队姓名。

同一动作条件确认为本套职责，不跨战术自动转成已确认。其他候选可按缺少动作与actionIds差异筛选并明确仍需确认，不展示最佳匹配/胜率/自评得分。全部注册战术统一校验人数/ID/阵营/各帧存在/非空文本；角色元数据随单套定义传递，构建入口真实调用校验。

## 写入所有权

- role_data独占data/tactics全部单套/辅助元数据、shared/templates.js、新shared/tactic-roles.js及其tests/unit/tactic-roles.test.mjs、scripts/qa/check-tactic-roles.mjs。保原ID/顺序/frames逐字段不变，手写91位完整职责及动作条件；不改旧data/recommendations或shared/lineups/storage/config。交还后可另领测试工作，不能并行改共享配置。
- role_ui独占frontend/src/lineups/**/*中基本资料简化（不再必填体型/擅长/弱项）、更衣室找战术入口/旧推荐页退出，以及新frontend/src/roles/**/*、frontend/index.html新条件区域、frontend/styles/app.css新增末尾导入。基本档案字段仍{id,name,mode,crest,color,nbaTeamId,revision,players:[{id,name,number}],recentTemplateId}，旧标签可兼容内部读取但不再用于产品。不得改app/storage/shared/data/platform或构建配置。四页与基本建队三步/NBA选择动效尽量保持，第三步只填名号；更衣室单柜及滑动保持。
- 主控独占app.js、shared/lineups.js、storage、构建/版本、旧推荐退役、测试集成及文档/Chrome/APK/手机/Git。review独立只读审查，独占HC-054 review及索引，不实现相应代码。

## 新角色界面接口

createTacticRolesUI({document,root,onAction,onInspect,onModalChange,onClose})，root为新增#role-requirements-panel，主视图置library页面原主卡位置、保原导航；body.data-role-conditions=true时只藏库卡、不动外框。API render({state,busy,error,writeLocked}) / open(templateId) / close({immediate=false}={}) / isOpen / isModalOpen / handleBack()。state为下述schema2。onAction(kind,payload)异步bool，kind=confirm-role({templateId,roleId,status,memberId,expectedRevision})/swap-roles({templateId,roleA,roleB,expectedRevision})/reset-role-plan({templateId,expectedRevision})/play-roles({templateId})/play-generic({templateId})/choose-team。onClose只恢复库布局，不写盘。

主条件页按当前模板展示所有角色及其确认状态；每角色点开复用玻璃浮层风格，三态与队员选择明确、有人可以必须选择未被占用成员；保存失败保输入和重试，成功才收起。unknown/missing可通用示范，全部available且唯一成员才本队演练。无队伍/人数不合显示选队入口，不伪造人员。角色面板时背景锁/Back/焦点/减动效/旋转/短屏可达；普通条件页可切导航并保已保存计划，未提交面板关闭不落盘。更衣室提供onAction('conditions',{templateId?})或onNavigate('roles')入口，主控统一打开当前队同人数战术条件；onNavigate('roles')为命令不是新增底栏路由。

## 持久化与迁移

沿用halfcourt-lineups-v1键，新payload schemaVersion=2，{profiles,activeProfileId,rolePlans:{[profileId]:{[templateId]:plan}},playbackContext}。新ctx={source:'role-confirmations',profileId,profileRevision,templateId,roleVersion}，可进攻/防守且必须plan完整有效。旧v1读取保球队/成员稳定ID与基础资料，旧推荐ctx清为null，rolePlans为空；不据旧标签或自动算法产生确认。读成功先内存迁移，首次写回前将原始v1原文备份到独立migration键，备份失败禁止覆盖；读取失败/未知schema锁写，不当空队。损坏原文备份、调用时快照、串行写/重试保持。

旧标签退出新UI与打分算法，旧原文由备份保留，非本轮恢复旧个人Play。v2无效计划隔离且备份原文，不丢其他球队；角色版本变动保旧计划待重新确认，禁止自动套用。revision做并发保护，认领依据成员ID/roleVersion，改名/号码保持分工（当前source随新revision核验更新），更换成员让相关绑定未确认。profile.recentTemplateId可同人数攻/防。跨队/模板手选先可靠解除旧source，任何失败不显示虚假成功。

## 验证与交付

先定存储/纯函数接口，单元验证迁移备份失败/读失败/unknown/快照并发/三态/重复成员/旧版本/rename和source失败，再做真实三屏+全26/91位、3/4攻防、各尺寸/玻璃层/未知及缺条件的候选/通用示范与本队映射。旧推荐/体型界面专属测试按明确产品变更退役，存储和编辑保护不得以删除断言替代；新测试覆盖替换行为，保26帧基线/启动/标题选单/卡内循环/四页布局/导出及离线回归。

构建门槛用于npm build及android:build真实入口，新增缺roles战术必须阻断。完整browser、独立审查、APK身份/原图标/签名/资源、备份保数据安装、真WV和人工分别记录。本轮若schema2迁移导致档案hash变化，验收比较原始备份及基础身份/进度保护而非谎称字节不变；手机上不写测试队或非当前战术作夹具。

## 实现与阶段验证记录

已实现26套/91职责共置数据及纯API、基本资料建队、更衣室与库的条件入口、三态玻璃面板、显式交换、通用/本队演练与攻防来源映射。schema2迁移与备份、版本过期保留/显式重置、稳定成员与revision保护已接线；旧shared/recommendations、data/recommendations/offense及lineups/views/recommendations实现退役，保留历史算法说明。

旧recommendations.test与offense-expansion-recommendations.test专属自评排名断言退役，以tactic-roles与新版lineup/session/storage测试替代；原创建快照、读锁、备份、串行、容量和来源失败保护保留并扩展。E2E账号/档案/标题选单/训练场使用显式认领schema2夹具，保原命中/几何/动画和source写失败断言；创建专属旧体型tabs用基本名号替代，NBA与草稿/触摸/动效继续检查。原155帧逐字段、26顺序及6身份文件仍与HC043基线相同；旧加权排名输出不是本轮兼容要求。

- npm test：224项通过（221单元+3HTTP）；[日志](../../artifacts/qa/hc054/npm-test.log)。
- [真实入口负例](../../artifacts/qa/hc054/build-gate-negative.json)：复制未改入口到唯一影子目录，缺roles模板让实际npm build/Android sync都exit1，未生成dist/android，正式文件hash相同，临时目录已清理。
- [独立集成](../../artifacts/qa/hc054/independent-integration-review.json)与[独立迁移](../../artifacts/qa/hc054/independent-migration-review.json)：取消零档案写、失败保选择/重试、3v3防守与4v4进攻真实SVG姓名、schema1零写读/备份失败原文保持、roleVersion999显式reset前原文备份均通过。
- [角色专项](../../artifacts/qa/hc054/roles-e2e/hc054-role-requirements.json)：26/91、三态/重复人/3-4攻防四组合、无队/人数不合、4尺寸与结束精确还原两键/viewport通过。
- 首完整回归[记录](../../artifacts/qa/runs/1.27.0-1793600048750/run.json)：前9组通过，creation-motion在844×390聚焦姓名时中心命中被球衣遮挡而停止；原失败证据保留。定位为旧横屏hero/tabs定位与新focused单列冲突，修复与复验继续记录，不能用前9组冒充完整通过。
- 首中间APK17秒构建成功；等待界面修复后重打与正式安装，未以中间包冒充交付。

新增/修改战术职责须在单套维护完整roles，职责身份、绑定或具体动作条件发生实质变化时显式递增roleVersion；纯文字错字可保版本。结构检查不能自动判断语义变化，必须内容审查。不得仅沿用defineRoles默认1来让旧确认适用新职责。

横屏P2已修复并独立真实中心点击复验（844×390/360×400/390×844共6输入），[证据](../../artifacts/qa/hc054/independent-creation-hit-review.json)。建队专项通过，后续七组[独立续跑](../../artifacts/qa/hc054/follow-on-1793600896796/run.json)全部通过；最终17组从头连续重跑中，最终状态待写入。

## 最终APK与指定手机

- 最终构建[日志](../../artifacts/qa/hc054/android-build-final.log)：21秒，214 tasks；[APK核验](../../artifacts/qa/hc054/apk/apk.json)确认1.27.0/code32、球搭/com.halfcourt.tactics、30资源同dist、15编译图标同1.26、原v2证书、无server.url。
- [可安装APK](../../artifacts/apk/hoopal-1.27.0.apk)：4,895,395字节，SHA256 `0bd11d5169082cf17cda969a05f7e4892e0abceafaf31c5932b8b6df3bd95b26`。保留1.26回退包；1.25与sha安全归archive，迁移前后hash相同，[归档记录](../../artifacts/qa/hc054/apk-archive.json)，引用已更新。
- 指定M2101K9C/ef473680重新devices核对，安装前[即时备份与编辑检查](../../artifacts/qa/hc054/device-before.json)无开着的向导/忙态/当前可见继续草稿提示；只代表这些可见指标，不能证明所有关闭的会话草稿不存在。
- install-r Success，COLD620ms/Wait630ms；[安装后](../../artifacts/qa/hc054/device-after.json)确认版本、前台及两原文hash保持。真实0球队，进度是即时的baseline-backdoor/frameIndex4（第5步），不是以前记录的第4步，不恢复过期备份。
- [真实WebView96](../../artifacts/qa/hc054/native-roles.json)程序浏览全部26套/91职责，空球队状态禁止按本队演练，主Play/非零步骤/两文件字节保持，errors空。未存测试球队，无真实账号/服务器依赖；该设备未做完整成员认领保存，不能把Chrome夹具当原生CRUD或物理操作。
- [真机截图](../../artifacts/qa/hc054/native-conditions.png)。硬件Back、手指滑动、输入法、旋转及有真实队员时的认领保存体验待用户验收；不阻断源码与自动验证继续完成。

## 最终自动回归与交付状态

最终从头[完整17组报告](../../artifacts/qa/runs/1.27.0-1793601484642/run.json)全部通过，[日志](../../artifacts/qa/hc054/browser-final.log)保留；runtime错误与外部请求均为0，自有Chrome/profile/server临时目录已清理。包括新26/91三态流程、标题玻璃选单、27启动组合/7控制、26只读及导出、九标题库布局、原96四页边框、自然卡内循环、六新增43帧与角色来源、档案/账号、建队三步/触摸、队徽转盘、玻璃草稿与更衣室、主训练控制。首轮失败与实际修复未抹去。

本轮旧加权/自评算法及专属测试按产品替换退役，其余安全覆盖保留并以三态、迁移、角色版本和攻防身份补齐。文档/模块链接及相对import检查通过；[独立审查](../reviews/HC-054-role-requirements-release.md)无未修P1/P2。源码/文档同步现有私有GitHub仓库，效果图、APK、私人存储备份及工具不进入Git。

任务保留awaiting_device：手机已更新，真实无队条件页浏览与原资料保护已验证；物理手指/返回键/IME/旋转、真实队员建队和认领保存待用户使用验收。账号云同步、5v5和全场不在本轮交付范围。
