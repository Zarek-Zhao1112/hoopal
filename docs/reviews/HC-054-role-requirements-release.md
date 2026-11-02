# HC-054 · 战术条件与三态认领独立审查

- 日期：2026-11-02；审查状态：两项P2已修复独立复验，224项/最终17组、APK/安装与真WebView证据复核通过；人工设备验收另待确认。
- 审查人：`role_release_review`，未实现本任务生产代码或测试。
- 任务：[HC-054](../tasks/HC-054-role-requirements-release.md)；设计：[角色认领](../design/tactic-role-assignments.md)。

## 范围与门槛

审查26套战术的91位职责与动画阵营绑定、纯函数三态与唯一成员约束、版本变化、schema1→2原文保护、串行快照与错误重试、档案/战术切换的来源解除、界面提交与取消、玻璃面板隔离、构建门槛及相关回归证据。审查不将浏览器模拟或APK编译等同于真机手势验收。

## 集成前核对

现有存储只识别schema1，已有推荐来源只支持进攻；旧session在播放时重新计算推荐，旧图例仅绑定进攻。必须整体迁移来源与图例逻辑，不得只替换展示文案。Android脚本直接调用Vite，因此需要在该入口显式执行角色目录校验。

已向主控提示以下检查点，当前为实现约束而非已确认缺陷：

1. 修改认领、交换或重置后，旧播放来源必须立即解除或依据新计划完整核验；相同模板ID不代表成员仍相同。
2. 排队的认领操作应绑定调用时档案身份与revision，不能在执行时悄悄作用于后来选中的队伍。
3. 过期roleVersion需要保留原计划待重新确认，与损坏计划隔离区分；不自动恢复为已确认。
4. 原文备份成功但主写失败的重试，应保留成功备份与未完成写入状态。
5. npm build与Android直接构建两处门槛均应拒绝缺失/不合法角色元数据。

## 实现与证据

独立只读Node夹具已核对全部26套/91职责：逐字段比较HC-043行为基线的155帧、原元数据和目录顺序均保持；逐套验证初始未知、全员唯一认领、重复成员拒绝、未知/暂缺清除成员、过期版本全部退回未知且needsReview、交换后唯一性；注册缺roles模板会被目录校验拒绝。此结果不覆盖界面集成或来源切换。

已检查的职责文本中，低位分切保持“1号先传后掩护、2号借挡切入、3号低位策应后外补”，掩护者再获掩护保持2号先设挡再借4号掩护，四人协防与三人边线夹击按各帧实际轮转分工；角色不是固定传统位置或只看第一帧。

独立内存存储/session夹具通过：含旧标签及旧来源的schema1读取零写盘，基础身份保留、旧自动来源解除；首次迁移备份失败不覆盖主原文，重试成功保留精确原文并写schema2；三人防守逐位确认后可创建来源；改名与号码保持成员绑定并更新来源revision；将任一职责改为unknown解除来源并拒绝本队播放。上述夹具未写用户浏览器或手机存储。

独立正式dist Chrome流程exit0，记录见[集成审查证据](../../artifacts/qa/hc054/independent-integration-review.json)：逐套进入26套条件并核对91行，初始均禁止本队播放；取消浮层前后主档案原文一致；有人可以但未选成员时禁提交、已占成员禁选；注入主键写失败后面板与选择保留，解除失败后可重试；三人防守全确认后直接进入训练场，三个防守棋子title携带正确队员姓名；看通用示范解除来源；通过真实页面操作切四人球队，再确认四位进攻职责，四个进攻棋子映射正确。此独立浏览器没有外网请求与runtime错误，结束清理自有Chrome与临时目录。

界面实现者的独立源码夹具[记录](../../artifacts/qa/hc054/role-ui-check.json)覆盖390×844、320×568、844×390、1024×768，主卡和面板底部均可达、根页面不滚动；还覆盖过期角色版本显式重置、无球队通用示范、占用与失败草稿。该记录为实现者验证，与上述审查者正式dist流程分开记载。

独立正式dist迁移流程exit0，[证据](../../artifacts/qa/hc054/independent-migration-review.json)：旧schema1带自动来源启动后档案原文字节保持，演练身份解除；注入migration备份失败时主原文不覆盖、面板保持，重试后备份精确原文并写schema2；版本999历史计划在条件页禁止认领和本队演练，显式重置前先保存role-version原文备份，重置后当前版本全部unknown/null。此流程同样使用隔离临时浏览器，没有用户设备写入、runtime异常或遗留自有进程。

独立复核[实际构建入口负例](../../artifacts/qa/hc054/build-gate-negative.json)：package.json、Android脚本、目录检查脚本和纯角色引擎四份源hash与当前文件一致；隔离shadow里的原npm build及Android sync均因新增future-missing-roles战术退出1，尚未创建dist或Android输出，结束已清理shadow。源码检索无recommendLineup、offenseRules或已移除旧推荐模块的运行引用；行为基线脚本明确旧加权结果被本任务替换，继续核对26套原帧、元数据、六项身份资源和当前角色目录。

## 发现与修复

### P2 · 成功进入演练后仍停留条件页（已修复）

初轮接线中，app的play-roles/play-generic只设置rolePlayPending，界面perform成功后没有关闭条件页；onClose导航直到用户另点返回才触发。触发方式为条件页点击任一演练按钮，影响用户无法直接看到已载入球场。修复由界面实现者在异步回调成功且pending解除后关闭主条件页；独立正式dist已对三人防守本队、通用示范与四人进攻本队三个入口复验，均直接进入训练场。

已复核交换交互明确展示两名队员交换后的整套职责与中文动作条件，提交文案为确认能完成新职责后交换；不将单纯拖动或旧编号自动视为动作已确认。过期roleVersion需先显式重置，旧原文在覆盖前备份，不直接逐项修改旧版本计划。

### P2 · 建队横屏姓名输入中心被遮挡（已修复）

首轮完整浏览器[日志](../../artifacts/qa/hc054/browser-full.log)在前九项通过后，于creation-motion的844×390/identity-input停止：姓名输入框位于x243、y203.75、w298.17、h31，几何在屏内但中心实际hit=false。影响横屏手指正常点选姓名字段；不能用仅检查矩形在屏内代替命中。根因为focused基本编辑器改成单列，但旧tabs保留col2形成隐式第二列，hero在col1与编辑器重叠；实现者在roles/styles.css的max-height:560px聚焦规则中隐藏hero并固定tabs/editor单列，保留原命中断言与timeout。

独立正式dist[修复复验](../../artifacts/qa/hc054/independent-creation-hit-review.json)通过：844×390、360×400、390×844的姓名/号码共六个中心elementFromPoint均命中且在屏内，并通过CDP实际坐标mousePressed/Released逐项点击，activeElement均为目标字段；修改输入仍不写档案，runtime错误为零。已清理自有浏览器。此针对性复验不代表最终整轮回归已通过，也不等同于手机输入法或物理手指。

## 交付证据与边界

已复核[npm test日志](../../artifacts/qa/hc054/npm-test.log)224项全部通过。修复后的[creation targeted日志](../../artifacts/qa/hc054/creation-targeted.log)与[后续七组报告](../../artifacts/qa/hc054/follow-on-1793600896796/run.json)均通过，七组无runtime错误或外网请求、临时目录已清理；这些分项通过与最终17组整轮仍分开记录，首轮命中失败日志保留。

最终[17组整轮报告](../../artifacts/qa/runs/1.27.0-1793601484642/run.json)及[整轮日志](../../artifacts/qa/hc054/browser-final.log)已独立核对：2026-11-02T06:38:04.642Z至06:49:58.322Z，整轮exit0，全部17组passed，包括角色条件、标题选单、启动、26套只读战术、战术库、页面布局、卡内循环、新增角色、更衣室/档案、建队动效、四页同框、NBA转盘、玻璃面板、球队操作、切页动效、我的与完整训练观看；errors和remoteRequests均为空，tempCleaned=true。修复后的creation-motion在最终同轮再次通过，首轮失败未被删去或合并伪装为一轮成功。

[最终Android构建](../../artifacts/qa/hc054/android-build-final.log)21秒成功；[APK报告](../../artifacts/qa/hc054/apk/apk.json)、[签名报告](../../artifacts/qa/hc054/apk/signature.txt)确认包名com.halfcourt.tactics、名称球搭、1.27.0/code32、原v2证书e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26、30项网页资源、15个图标与旧版一致、无server.url。审查者独立重算[最终APK](../../artifacts/apk/hoopal-1.27.0.apk)为4,895,395字节，SHA256为0bd11d5169082cf17cda969a05f7e4892e0abceafaf31c5932b8b6df3bd95b26，与报告一致；[归档清单](../../artifacts/qa/hc054/apk-archive.json)中1.25.0安装包及SHA文件两个文件的归档后hash均独立复算一致。

[设备安装前](../../artifacts/qa/hc054/device-before.json)与[安装后](../../artifacts/qa/hc054/device-after.json)报告对应ef473680/M2101K9C，版本由1.26.0/code31变为1.27.0/code32，安装后前台存在。审查者独立重算两份原文备份并核对前后报告：真实档案0份，档案hash均dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253，内置选择hash均1d58ac7f5405f8c7f13adfc406cc9f768124d03ba5db9b08185be56f03cb474c。此次安装前即时选择是baseline-backdoor/frameIndex4（第五步），不是早前记录的frameIndex3；未恢复旧进度。空档案原文仍schema1，本轮只读浏览条件没有触发首写迁移，不能声称设备执行过schema2保存。

[真实WebView程序报告](../../artifacts/qa/hc054/native-roles.json)为Android12/WebView96，26套/91职责逐项展示、无页面溢出和runtime错误。审查者重算确认actualProfiles=0，各角色unknown且认领/本队演练禁用；检查结束主模板、步骤、进度、棋子DOM及双存储hash保持。脚本未向手机写fixture球队，仅验证无队伍条件浏览；本队认领保存、迁移故障与完整人员映射的证据来自隔离Chrome，不能描述为原生保存通过。安装前检查只覆盖打开面板和当前渲染的保留草稿提示，不证明所有已关闭内存草稿都不存在。

## 结论

当前无未修复P1/P2；实现、独立审查、224项自动检查、最终17组整轮回归、APK身份、保数据安装和真实无队伍WebView程序检查证据均已复核通过。物理手势、系统Back、输入法、旋转、设备上的真实创建与认领保存尚待人工验收，任务保留awaiting_device；不将这些人工项描述为已完成。
