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
shared/recommendations → shared/lineups + data/recommendations

Vite → dist → Android APK（离线）
             └─ backend（电脑和局域网静态预览）
~~~

shared不引用DOM、存储、Capacitor或HTTP。页面通过操作回调进入统一业务/持久化流程；绘制与播放时钟均不写盘。backend仅提供静态资源，不承担账号、推荐计算或数据保存。

## 应用入口与播放

main.js先挂载startup单例，再动态加载app.js。app读取内置选择与档案、完成页面渲染后调用ready；读取失败继续展示原错误和重试，不能用默认空柜覆盖未知资料。启动时序保持1000ms静止、1100ms展开、300ms交接，跳过/后台/减少动效的门控保持。导航、弹窗、键盘与Android Back共享启动保护。

app.js负责初始化、当前战术/档案来源、保存和后台串行协调，组合页面、播放器与绘图接口。训练播放状态由training/player.js独占，参数注入帧调度、时间、速度/循环和onFrame/onComplete；提供play、pause、seek、load、destroy与只读状态。训练段在1倍速为2.4秒、前18%停留，循环末停为1.2/倍率秒，暂停取整与手动进度策略保持；旧回调token不能启动第二个RAF。

库预览仍由workspace/library-preview-clock.js管理独立毫秒时钟：2.4秒段、1秒末停，暂停保留当前位置和剩余末停。library-preview.js负责按钮中的真实动画、单RAF、可见性和销毁；它不修改主Play、来源引用或保存进度。library-deck负责单卡展开、九标题布局、忙态锁和离页暂停。进入训练场才沿原清来源→载入→自动播放流程执行。

## SVG绘制与页面

board/court-renderer.js提供三种现有画面的共用绘制：
- createTrainingCourt：主球场、路线、球员、球和角色title，保原DOM ID与导出结构。
- createLibraryCourt：卡内独立SVG/棋子与逐帧更新，保原data属性与独立surface前缀。
- createTacticPreview：推荐卡静态缩略图。

appearance.js提供显式SVG木地板、颜色与棋子；hit-test.js处理阵营/球的可见性。共用绘制保留主场、库卡和缩略图已有差异，不合并它们的播放或保存策略。

workspace/controller.js管理更衣室(lineups)、训练场(play)、战术库(library)、档案(archives)及公共弹窗。state.js提供分页与长文字分段；page-transition/soft-glow管理600ms柔光取消、快速切换和减少动效。页面状态不写入Play。

## 阵容界面与样式

lineups/controller.js保留createLineupUI和splitLineupText的公有入口。内部职责：
- ui.js：已保存状态、当前页、忙态与自有弹层协调，通过onAction提交业务操作。
- views/：更衣室、档案和推荐结果的绘制及文字/按钮辅助。
- wizard/drafts.js：按档案ID隔离编辑草稿、创建草稿、基线和成员选择；仅驻内存。
- wizard/controller.js：进入配置、步骤导航、保存/放弃与返回来源页策略。
- wizard/view.js：三步配置内容、输入与成员交互的绘制。
- components/：单柜、球衣、队徽转盘、玻璃面板、档案菜单和步骤/滑动动效。

外部render只更新已保存状态，不覆盖会话草稿。保存捕获完整快照，由原session一次提交，保revision校验、读失败锁、保存失败输入与焦点、不同草稿隔离。Back按内层球队列表/说明/确认/面板优先处理。只切换任务或成员不写盘。

原lineups组件JS/CSS路径保薄re-export/@import兼容入口；新代码引用components/views/wizard目录。这些入口不复制实现。sheet是面板隔离壳，wizard-motion只管理320ms步骤/280ms成员运动，team-carousel管理手势和吸附；生命周期各自清理。

frontend/styles/app.css只汇总组件、tokens、base、framework、navigation、dialogs、responsive和功能框架样式。组件样式随组件。拆分保留旧import、选择器、声明和媒体查询顺序；WebView96的焦点/disabled隔离、滤镜前缀、dialog降级和短视口规则保持。

## 战术与推荐数据

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

data/recommendations/offense.js定义18套进攻的职责、权重和执行条件；shared/recommendations.js枚举一对一分工，输出稳定排名、原因和缺口。同人数最多三套，防守不参与。体型只辅助已声明能力，推荐不生成新跑位或修改原Play。规则依据见[推荐说明](../data/recommendations/README.md)。

## 存储与平台

storage/builtins.js只记录内置ID/合法步骤，并执行用户授权的旧个人数据定向清理；lineups.js单独保存阵容；lineup-session.js协调档案版本、来源和两键切换。platform提供浏览器localStorage或Android私有文件、系统分享与生命周期。

存储键/格式保持：halfcourt-builtin-selection-v1为模板ID/步骤；halfcourt-lineups-v1为schemaVersion、多档案、activeProfileId与可空playbackContext。推荐和人员映射重算，不持久化旧结果。

先读后写、未知schema锁写、损坏原文覆盖前备份、串行快照保存与失败重试保持。手选战术或换档案先成功解除旧来源；中途失败宁可恢复普通演练，不能误套姓名。后台等待当前操作及两仓flush。

旧个人draft/library主键与副本清理仍在builtins/platform，不能因目录整理删除。无调用的旧repository及专属测试、两个旧编辑流程E2E已在HC-043退役；原实现可从Git标签baseline/pre-hc043读取。原图标母版保留resources/app-icon，包名/签名/平台目录保持。

## 检查、构建与产物

npm test构建并检查单元/HTTP；npm run test:browser运行原完整流程。scripts/qa/browser-session.mjs持有独立Chrome、动态端口与预览服务，finally只关闭自己的进程并清理artifacts/temp子目录。每轮报告/截图进artifacts/qa/runs/版本时间，导出样本单独保留，临时下载随测试清理。

scripts/qa还提供行为基线比对、静态导入与文档链接检查、限定下载残留的清理脚本。清理默认dry-run，显式Apply才删除；检查路径/重解析点、近期文件、引用和内容变化，并记录实际删除清单。历史APK归archive并同步文档引用；原设计、失败/通过证据及.tools工具链保留。

scripts/android.mjs构建同一dist、同步Capacitor并执行assembleDebug，生成通用debug包、带版本名APK及SHA256。APK无server.url、离线运行。Android生成网页资源、dist、依赖、工具、临时产物均不手改为源码；版本与设备验证分别记录在任务和[验证记录](validation.md)。
