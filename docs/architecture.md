# 目录与模块边界

本项目使用原生JavaScript / SVG、Vite与Capacitor Android。当前目录整理见[HC-043](tasks/HC-043-project-organization.md)，带注释的总目录见[README](../README.md)。

## 依赖方向

~~~text
main → startup/runtime → app
                       ├─ training/player → 帧调度回调
                       ├─ board/court-renderer → appearance / hit-test
                       ├─ lineups → views / wizard / components
                       ├─ workspace → 页面 / 库卡 / 公共弹窗
                       └─ storage/lineup-session → repositories → platform

shared/templates → data/templates → 一套一文件的战术定义
selection/ui → shared/tactic-body-types + shared/templates + library-preview
storage/lineup-session → shared/tactic-roles + shared/lineups

Vite → dist → Android APK（离线）
             └─ backend（电脑和局域网静态预览）
~~~

shared不引用DOM、存储、Capacitor或HTTP。页面通过操作回调进入统一业务/持久化流程；绘制与播放时钟均不写盘。backend仅提供静态资源，不承担账号、推荐计算或数据保存。

## 应用入口与播放

main.js先挂载startup单例，再动态加载app.js。app读取内置选择与档案、完成页面渲染后调用ready；读取失败继续展示原错误和重试，不能用默认空柜覆盖未知资料。启动时序保持1000ms静止、1100ms展开、300ms交接，跳过/后台/减少动效的门控保持。导航、弹窗、键盘与Android Back共享启动保护。

app.js负责初始化、当前战术/档案来源、保存和后台串行协调，组合页面、播放器与绘图接口。训练播放状态由training/player.js独占，参数注入帧调度、时间、速度/循环和onFrame/onComplete；提供play、pause、seek、load、destroy与只读状态。训练段在1倍速为2.4秒、前18%停留，循环末停为1.2/倍率秒，暂停取整与手动进度策略保持；旧回调token不能启动第二个RAF。

HC-048的training/view.js只负责真实战术标题、简短讲解、圆形播放图标和全部步骤点；view.css限定训练场内部竖横布局，由全局汇总最后导入。全步骤点击通过onSelectStep交回app原有停止/seek/记录流程，不直接接触存储或时钟。旧步骤分页撤下，人员映射分页和全文面板保持。

HC-050的training/tactic-picker.js提供标题下展玻璃选单，只持有展示、定位、焦点与220/160ms开合状态。原template-picker select隐藏保留options/value/change兼容，真实入口为training-picker-trigger；选择收起后通过onSelect交给app原loadTemplate处理来源清除与持久化，同项/取消不写盘。isOpen贯穿关闭阶段，app用其保护导航、弹窗、键盘、Back和背景flush，明确锁定播放/步骤/倍速/循环/显隐及人员分工；组件不访问存储、平台或播放器，内部滚动不改变主页面。

库预览仍由workspace/library-preview-clock.js管理独立毫秒时钟：2.4秒段、1秒末停，暂停保留当前位置和剩余末停。library-preview.js负责按钮中的真实动画、单RAF、可见性和销毁；它不修改主Play、来源引用或保存进度。library-deck负责单卡展开、九标题布局、忙态锁和离页暂停。进入训练场才沿原清来源→载入→自动播放流程执行。

## SVG绘制与页面

board/court-renderer.js提供三种现有画面的共用绘制：
- createTrainingCourt：主球场、路线、球员、球和角色title，保原DOM ID与导出结构。
- createLibraryCourt：卡内独立SVG/棋子与逐帧更新，保原data属性与独立surface前缀。
- createTacticPreview：可复用的只读静态缩略图接口，旧推荐视图已退役。

appearance.js提供显式SVG木地板、颜色与棋子；hit-test.js处理阵营/球的可见性。共用绘制保留主场、库卡和缩略图已有差异，不合并它们的播放或保存策略。

workspace/controller.js管理更衣室(lineups)、训练场(play)、战术库(library)、档案(archives)及公共弹窗。state.js提供分页与长文字分段；page-transition/soft-glow管理600ms柔光取消、快速切换和减少动效。页面状态不写入Play。

## 阵容界面与样式

frontend/previews/account-center是独立HTML/CSS/JS原型，不被正式index/app导入，不进入默认Vite/APK打包。仅内存演示个人中心及玻璃登录交互；真实账号、云备份与本地档案的接入不由原型承担。原型源码随Git同步，截图/验收仍进artifacts，范围见[HC-045](tasks/HC-045-account-center-preview.md)。

lineups/controller.js保留createLineupUI和splitLineupText的公有入口。内部职责：
- ui.js：已保存状态、当前页、忙态与自有弹层协调，通过onAction提交业务操作。
- views/：更衣室、档案与基本球队身份的绘制及文字/按钮辅助。
- wizard/drafts.js：按档案ID隔离编辑草稿、创建草稿、基线和成员选择；仅驻内存。
- wizard/controller.js：进入配置、步骤导航、保存/放弃与返回来源页策略。
- wizard/view.js：三步配置内容、输入与成员交互的绘制。
- components/：单柜、球衣、队徽转盘、玻璃面板、档案菜单和步骤/滑动动效。

HC-046将archives视图显示名更新为「我的」，内部路由和真实档案接口不变。account-cards提供个人卡与本机工具入口，account-sheet用共用sheet的可选id/labelledBy建立独立说明面板，默认wizard参数保持；isModalOpen/handleBack统一包含账户说明，避免绕过导航/返回保护。账号与云备份尚未开放，组件不收集凭据、不发网络请求或持久化账号状态；实际球队操作继续沿用原session。

外部render只更新已保存状态，不覆盖会话草稿。保存捕获完整快照，由原session一次提交，保revision校验、读失败锁、保存失败输入与焦点、不同草稿隔离。Back按内层球队列表/说明/确认/面板优先处理。只切换任务或成员不写盘。

原lineups组件JS/CSS路径保薄re-export/@import兼容入口；新代码引用components/views/wizard目录。这些入口不复制实现。sheet是面板隔离壳，wizard-motion只管理320ms步骤/280ms成员运动，team-carousel管理手势和吸附；生命周期各自清理。

frontend/styles/app.css只汇总组件、tokens、base、framework、navigation、dialogs、responsive和功能框架样式。组件样式随组件。拆分保留旧import、选择器、声明和媒体查询顺序；WebView96的焦点/disabled隔离、滤镜前缀、dialog降级和短视口规则保持。

## 战术与角色数据

data/tactics/offense/{3v3,4v4}和defense/{3v3,4v4}中每套战术一文件。helpers、legacy-helpers、expansion-helpers和defense-helpers提供数据构造；显式绕行优先，不能被自动直线覆盖。原分组文件保留为顺序稳定的薄索引，legacy.js仍承载最初四套战术的聚合入口。

data/templates.js统一保持26套ID和顺序。shared/templates.js递推局部站位、生成完整独立快照并校验，不让页面改动模板原文。Play格式保持：
~~~text
Play: id / title / mode / frameIndex / frames[]
Frame: mode / players[] / ball / paths[] / note
Player: id / team / number / x / y
Ball: x / y / holderId
Path: id / type / points[] / playerId（可选）
~~~

kind、类别和难度属于模板元数据，不进入Play导出。shared/engine.js负责建立、校验、状态与路线插值；通用历史API本轮保留，当前界面仍无战术编辑或个人Play保存入口。

HC-054退役体型/能力自评、加权排名与自动分工代码；旧算法仅留[历史说明](../data/recommendations/README.md)。现26套战术的roleVersion和roles与各自定义共置，含稳定职责ID、动画棋子ID、整套任务和具体actionIds。shared/tactic-roles.js管理校验、三态计划、唯一成员、显式交换和不同动作候选，不生成跑位或胜率。

HC-056用selection/ui.js替换旧角色界面，首选整体体型，再浏览对应mode/kind/bodyType候选。各单套提供bodyTypes/bodyTypeNotes，shared/tactic-body-types.js提供纯分类、校验与说明；构建checker额外保证14种组合可达。selection/picker.js管理220/160ms局部玻璃列表、关闭锁和焦点，复用library-preview独立真实循环，离页/后台/弹层暂停并销毁旧RAF。主卡仍替换库内部内容，不增加底栏；旧roles UI已退役，建队聚焦/短屏修复移到wizard/basic-layout.css保留。

app区分球队入口与独立库：前者锁当前球队人数，后者可浏览另一人数但不写错队偏好。body-type动作交session，play-tactic只在可靠清除旧ctx后载入原编号演练；旧rolePlans保留兼容而不再显示为新成员映射。不需要逐人确认即可进入训练场。

## 存储与平台

storage/builtins.js只记录内置ID/合法步骤，并执行用户授权的旧个人数据定向清理；lineups.js单独保存阵容；lineup-session.js协调档案版本、来源和两键切换。platform提供浏览器localStorage或Android私有文件、系统分享与生命周期。

存储键保持：halfcourt-builtin-selection-v1为模板ID/步骤；halfcourt-lineups-v1为schemaVersion2，保存profiles、activeProfileId、兼容旧rolePlans及playbackContext。HC-056给profile增加可选bodyType，缺省null；坏类别只隔离字段，原文覆盖前备份，不丢队伍和计划。setBodyType校验显式profileId/revision及调用时当前队，成功保存偏好并增revision/清旧ctx，相同值无写入；普通update沿用previous.bodyType，防旧向导草稿覆盖新偏好。选择体型卡仅在UI，查看成功才持久化。旧source=role-confirmations仍按旧完整计划合法性读取，不由新训练展示姓名或自动复用。

schema1读入只在内存迁移，保球队/成员/号码/NBA身份，旧标签和自动来源不转为确认；首次schema2写前将精确旧原文存到独立migration-v1备份键，失败禁止覆盖。过期角色版本原计划保留且不可演练，首次后续写前保role-version原文备份，用户明确重置后重新确认。未知schema锁写；降级至1.26时也会保护schema2未知格式，不会静默删新分工。

先读后写、未知schema锁写、损坏原文覆盖前备份、串行快照保存与失败重试保持。手选战术或换档案先成功解除旧来源；中途失败宁可恢复普通演练，不能误套姓名。后台等待当前操作及两仓flush。

旧个人draft/library主键与副本清理仍在builtins/platform，不能因目录整理删除。无调用的旧repository及专属测试、两个旧编辑流程E2E已在HC-043退役；原实现可从Git标签baseline/pre-hc043读取。原图标母版保留resources/app-icon，包名/签名/平台目录保持。

## 检查、构建与产物

npm test构建并检查单元/HTTP；npm run test:browser运行原完整流程。scripts/qa/browser-session.mjs持有独立Chrome、动态端口与预览服务，finally只关闭自己的进程并清理artifacts/temp子目录。每轮报告/截图进artifacts/qa/runs/版本时间，导出样本单独保留，临时下载随测试清理。

scripts/qa还提供行为基线比对、静态导入与文档链接检查、限定下载残留的清理脚本。清理默认dry-run，显式Apply才删除；检查路径/重解析点、近期文件、引用和内容变化，并记录实际删除清单。历史APK归archive并同步文档引用；原设计、失败/通过证据及.tools工具链保留。

scripts/android.mjs构建同一dist、同步Capacitor并执行assembleDebug，生成通用debug包、带版本名APK及SHA256。APK无server.url、离线运行。Android生成网页资源、dist、依赖、工具、临时产物均不手改为源码；版本与设备验证分别记录在任务和[验证记录](validation.md)。
