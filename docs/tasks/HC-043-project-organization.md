# HC-043 · 项目清理与模块整理

- 日期：2026-10-28；状态：`awaiting_device`。代码、清理、独立审查、自动回归及手机更新已完成；新版本人工操作体验待确认。
- 用户已确认带注释的目标目录并要求开始。先建立可回退本地源码基线，再分批清理与拆分；保持现有功能、UI及数据兼容。
- 基线：本机Git `95c8bda`，标签`baseline/pre-hc043`，无远程仓库；工具/依赖/产物按原gitignore排除。
- 设计：[目录与重构边界](../design/project-organization.md)。目标1.23.0/code28，验证与独立审查后构建离线APK，沿用指定手机保数据更新授权。

## 所有权与接口

- 主控：Git基线/集成/配置/版本/任务与设计文档、战术数据逐套拆分、退役模块与其历史文档引用、产物清理/归档与复用QA脚本、最终验证/打包/安装。不并行修改其他负责人文件。
- engine：frontend/src/app.js、board/court-renderer.js及相关board新模块、training/、workspace/library-preview.js与新单元测试。将训练播放位置/RAF/末停独立，球场共用绘制抽离；保持主场ID/球/路线/可见性、卡内dataset/单RAF，训练末停1.2/倍率秒与卡片1秒各自保留。持久化/来源切换/后台串行协调仍由app管理，不将写盘注入通用绘图组件。与ui协商推荐缩略图的共用绘制接口，只在交还文件后跨界集成。
- ui：frontend/src/lineups/（含views/wizard/components）及frontend/styles/、相关lineup单元测试。分离真实草稿与向导控制/绘制、主页视图；移动组件及组件样式，保留旧controller入口兼容。全局样式拆成基础/变量/框架与入口，保原层叠顺序/响应式/DOM焦点。sheet已有明确职责，不机械再拆。不得改app.js、board或共享配置；推荐缩略图共享接口先同步engine。
- interaction_design：独立只读集成审查，独占本任务review及reviews索引；不实现生产代码，不Chrome/ADB/build。核数据/生命周期/来源与存储协议、CSS视觉兼容、清理可回退/引用，修复后复验。

## 清理边界

仅清理已核实的artifacts/qa/downloads*里的.htm与.crdownload残留，逐文件核绝对路径、无链接/重解析跳转、无文档证据引用并记录清单；保留被引用PNG/JSON和原始图标/设计/验收资料。历史APK归入apk/archive并同步引用，保当前及一个回退版，未删除其历史证据。保留.tools工具/离线缓存、node_modules及原生签名与用户数据。旧repository与只由它使用的测试、无调用的旧E2E在核现行覆盖后退役，Git基线保留原实现并修文档链接；现行旧个人数据定向清理不可移除。

## 不变项与验证

26套战术ID/顺序/完整帧/球权/显式追防、18规则及同一档案推荐/人员映射逐项比基线；Play/schema/存储键/档案revision/来源协议、原图标和启动2400ms保持，无数据迁移。不引入框架、业务服务器或新玩法。

各实现模块先针对生命周期/交互验证，最终npm test、构建后完整npm run test:browser（26套/档案/推荐/离线/导出/布局/启动/动效）及必要定向补验；页面布局/样式至少对比竖/横/平板和极短屏，测试临时profile/下载只进artifacts/temp并finally清理。独立审查与本地链接/导入检查后Android构建核原v2证书/图标/无server.url/版本，手机即时草稿与双文件备份后install-r，核版本/双hash及真实WebView相关页面/动画。程序与物理验收分记，未有用户确认保持awaiting_device。

## 退役与清理记录

旧frontend/src/storage/repository.js及tests/unit/storage.test.mjs只服务已移除的个人Play保存，生产无引用；tests/e2e/builtin-flow.mjs与defense-flow.mjs无调用且使用旧编辑控件，已退役。现行builtins/lineups仓库和platform清理协议保持；读取失败、原文备份、串行快照与重试由当前builtins/lineup-storage/session/platform测试继续覆盖。原源码可执行git show baseline/pre-hc043:原路径查看，历史文档链接改指本记录。

旧storage.test有10个顶层测试，循环另生成2例，共12运行用例；本次新增player9、renderer5、drafts8共22例。完整npm test实际225项通过，即215−12+22，未通过删弱现行断言掩盖失败。

[限定清理](../../scripts/qa/clean-artifacts.ps1)先dry-run再Apply，仅28个下载.htm/.crdownload，释放376.32MiB，逐路径/引用/近期写入/重解析/内容hash检查，清单在[实际记录](../../artifacts/qa/hc043/cleanup-applied.json)；原PNG/JSON/设计和.tools均保留。历史14个APK/校验文件归apk/archive，文件SHA前后同，相关历史文档引用同步；当前1.23.0与回退1.22.3保持顶层。

## 当前验证进度

数据26套逐帧/元信息/稳定顺序、18推荐规则、10份实际人员推荐与6个身份/启动源hash均同基线；141模块/278个静态相对导入无缺失。独立审查复算876条CSS AST、156个主场SVG结构与7200旧tick状态，均与原函数相同；向导失败重试/双草稿/嵌套Back夹具通过。最终npm test为225项全过，日志[保留](../../artifacts/qa/hc043/npm-test.log)。

首轮完整Chrome在新增导出证据复制处因QA漏导入writeFile退出，未作为通过；补导入后完整重跑，产品源码与dist保持。最终[13组完整回归](../../artifacts/qa/runs/1.23.0-1793159718244/run.json)全过，覆盖26套、档案/来源错误、推荐、离线/导出、启动、创建/库内/页面动效和布局；errors与remoteRequests为空，tempCleaned=true。首轮独立runs及browser-first-attempt.log保留。新报告按qa/runs/版本时间保存，临时下载/浏览器进artifacts/temp，finally清理。

额外[48对旧新版视觉对照](../../artifacts/qa/layout-parity-1793160970161/run.json)覆盖390×844、360×400、844×390、1024×768下3/4人四页、推荐及编辑三步。所有可见DOM几何/文字/完整计算样式/伪元素/SVG绘制属性一致，19张图片SHA一致；43对像素完全一致、5对有少量光栅差异，不宣称48对逐像素相同。同旧dist控制组也出现像素差，原始失败与控制记录保留。

21秒Android构建1.23.0/code28；[包检查](../../artifacts/qa/hc043/apk/apk.json)核30网页资源同dist、15图标同前版、无server.url、球搭label及原v2证书。APK SHA256为`1e135c1a773cad63168b2c8eb5cd0b9fee120d91f8ca13f12c0c2d400a26269a`。aapt首次中文绝对路径失败，改脚本工作目录与ASCII basename后同包复验。安装前预检实际无打开向导、当时body不忙且备份实际0档案/进度；不据此声称所有关闭的内存草稿都不存在。审查发现预检漏档案面板aria-busy的P2，已补检查及当前保留草稿指示，5夹具与独立复验通过，明确限制见[审查](../reviews/HC-043-project-organization.md)。

指定ef473680/M2101K9C正常install-r Success，COLD952ms；[安装后核对](../../artifacts/qa/hc043/device-after.json)为1.23.0/code28、0档案，档案SHA `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`、进度SHA `7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c`前后完全相同。

真实WebView96本轮手机横屏，[四页与三步草稿](../../artifacts/qa/hc043/native-pages-draft.json)四卡均x14/y68/w807.2728/h207.2727px，无溢出、控件fit/hit、仅更衣室品牌；4v4/BOS/成员切换及姓名球衣号即时同步，明确放弃草稿，未最终保存测试队。[自然循环](../../artifacts/qa/hc043/native-post-split.json)1332样本覆盖低位分切七帧、末hold/cycle1、player误差0/球误差<.001，暂停dataset冻结/RAF0，原Play与双hash保持、errors为空。首轮QA品牌选择器写错而退出，日志保留；修成现有.lineup-brand-header后原断言重跑通过，产品与APK未变。专属探针/动态转发清理、原视图恢复。物理滑动、系统Back/输入法/旋转和原生最终CRUD未作本轮新验，保持awaiting_device。

本地Git保留整理前基线与整理后提交，源码及文档纳入，artifacts/.tools/依赖/签名私钥不入库。用户最新要求先完成当前工作，远程仓库推送留到之后讨论；当前无远程配置或推送。
