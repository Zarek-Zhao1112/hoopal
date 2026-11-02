# HC-050 · 标题下展玻璃选单独立审查

- 日期：2026-11-02；审查者：picker_review，未参与生产代码或测试实现。
- 范围：[任务](../tasks/HC-050-tactic-picker-release.md)与[设计](../design/training-viewing.md)。生产/tests/config只读，仅维护本记录及审查索引。
- 结论：独立源码、逻辑、最终完整Chrome、APK和真实WebView检查完成，原重复点击P2已修复，无未修P1/P2；物理操作与人工观感仍待用户验收，任务保持`awaiting_device`。

## 接口与代码预审

可见入口为独立按钮，原select隐藏但保留options/value/change兼容，标题h1与原外框保持。组件仅处理本地DOM/选单状态；只展示同人数同类别的真实模板，选择在收起后交回原loadTemplate，不直接写select或存储。原load/source/persist/player与共用SVG/模板数据未因选单展示改写。

app单独保护非dialog选单：导航、公共弹窗、Space/start、阵容/库操作和隐藏select变更有isOpen检查；Back优先关闭且取消路径不调用persist，背景先立即关闭再走旧flush。背景锁涵盖导航、播放、模式、步骤、倍速/循环/显隐和人员分工；标题触发器单独保留再次关闭能力。真实专项已核对锁恢复与失败来源保护。

## 发现与复验

### P2：关闭中第二次点击可能撤销首次战术选择（已修复并通过真实指针路径复验）

- 位置：frontend/src/training/tactic-picker.js 的choose/close及tactic-picker.css的closing pointer-events。
- 触发：选择其他战术后进入160ms收起；在原选项位置很快再点一次，closing面板不接收指针，事件落到后面的shade，走outside关闭。
- 源码路径：旧close先对所有非select理由清pendingChoice，再判断已closing返回，因此第二次outside会让第一次选择的回调消失。
- 隔离证据：[实际函数体VM探针](../../artifacts/qa/hc050/review-cancel-probe.json)执行未改写的choose/close/finishClose函数体，正常选择回调一次，收起中再outside时回调零次。该证据只证明逻辑路径，尚未宣称真实Chrome指针或手机复现。
- 影响：快速重复点击可能表现为选项没有生效，违背关闭中锁与单次提交语义；没有触发数据丢失。
- 修复：UI将closing中的outside/trigger/select重复忽略，Back/Escape/background/destroy/context-change仍允许明确撤销，旧失败证据保留。
- 独立逻辑复验：[修复后实际函数体VM](../../artifacts/qa/hc050/review-cancel-fixed.json)九条路径通过，正常与三种重复只提交一次，五种明确取消均零次并最终closed；真实指针路径另记下条。
- 真实路径复验：[第二轮专项](../../artifacts/qa/hc050/target-1793591614258/hc050-tactic-picker.json)六种真实指针选择均记录第二击仍在closing并命中shade，且只启动一次load；两种推荐来源失败后原进度/身份/原文保持并可重试。旧缺陷的逻辑证据和修复后真实路径证据分别保留，不宣称已在旧版手机复现。

## Back程序优先级隔离核验

[实际onBack回调VM](../../artifacts/qa/hc050/review-back-priority.json)执行app中的未改写回调，五种状态通过：startup优先；选单在busy前处理并直接返回true；busy无选单时锁住其余操作；其他dialog继续原保存流程。选单关闭路径没有调用persist、导航或其他dialog。该证据为真实回调配合平台/DOM替身的程序逻辑，不是原生桥接或物理返回键验收。

## 测试源码核对

原page-layout与training-viewing只将可见select操作改为真实trigger/option，其余26战术、真实SVG坐标/时钟、来源失败、外框和存储/导出断言保留。新第16组放在完整流程开头，使用隔离浏览器数据与新文档注入恢复，包含6类来源/攻防×6尺寸、各行内部可达、同项不写/不重置、来源清除失败与重试，以及真实键盘/滚轮/指针和自然动效样本。重复选择补以同坐标第二击处于closing且命中shade的记录及单次load计数，避免慢机器在关闭后才第二击而形成假覆盖；是否实际通过以运行报告为准。

## 验收边界

动效/取消、键盘/焦点、短屏内部滚动、源清除失败/重试和完整16组由实际Chrome检查；Back回调顺序另由实际函数VM核验。APK与真实手机程序检查另记下文，物理手指/系统Back/旋转与原生最终CRUD未作为本轮新增验收。静态图、VM、桌面指针、手机DOM程序点击与物理手势不能互相替代。本审查者未启动完整Chrome、构建或ADB。

## 运行中记录

隔离专项首轮target-1793591116038在“opening has the approved deliberate timing”退出，生产仍是220ms定时及双RAF起势。首轮未在断言前保存原始trace，因此暂不能把原因断定为产品过快或采样遗漏；该断言同时依赖存在open阶段样本。主控回交测试补保存原始RAF/实际时间/MutationObserver边沿，并在关闭前等待实际open样本、关闭后等待closed样本；保持原时长门槛和生产代码，待复验后记录最终结论。

第二轮[专项报告](../../artifacts/qa/hc050/target-1793591614258/run.json)passed且errors/remoteRequests为空、tempCleaned=true；补齐观察后原时长门槛通过，生产未为首轮失败改动。[原始动效](../../artifacts/qa/hc050/target-1793591614258/hc050-picker-motion.json)保留28个自然RAF及MO边沿，独立重算从data-visible到open为224.10ms，closing到closed为171.30ms，含实际中间透明度和全程背景锁。首轮缺少原始trace，仍不倒推其具体缺失样本或误差原因。

## 修复后专项独立复核

[独立复算](../../artifacts/qa/hc050/review-target-check.json)核36组布局/264行可达位置，标题、当前勾选与真实同人数同类别顺序一致，面板在标题下方且导航上方，当前项自动可见、主页面无滚动、局部blur存在而workspace.filter为none。六次实际双击只单次载入、两次来源清除失败/重试、同项/取消零写、键盘/内部滚轮/打开时旋转/后台撤销与播放中禁用均由实际专项覆盖。129份冻结源码SHA与当前输入一致。亲看竖屏低位分切、推荐三人360×400及844×390横屏实图，玻璃选单和选中态清楚，紧凑屏滚动在面板内部。

该专项无未修P1/P2；最终完整16组、APK及手机结果另记下文，不将专项当作全部交付已验。

## 完整回归首轮待查记录

[完整首轮](../../artifacts/qa/runs/1.26.0-1793591687045/run.json)的tactic-picker、startup和readonly-26-tactics通过，随后library组在844×390的4v4掩护者再获掩护预览中心命中检查退出；记录控制矩形在视口内、enabled，但hit=false，实际命中元素及失败截图未保存，不能据此确定遮挡对象或归因新选单。库renderer/CSS和旧library流程无本轮生产差异，生产冻结SHA保持。

新首组选单finally固定恢复390×844，改变了旧startup原1440×1100的入场状态，属于测试隔离漏项。主控回交测试恢复实际入场viewport，并为旧库失败补保存命中对象/截图/几何，不降低任何原断言、不修改库生产代码。修正隔离是必要的，但尚不能直接宣称它已被证明是该次库命中失败根因；最终整轮与可能的后续诊断待核。

第二次完整运行的[恢复证据](../../artifacts/qa/runs/1.26.0-1793592269540/hc050-picker-restoration.json)确认入场与恢复均1440×1100，原两键及lineups视图保持。旧库[255项布局记录](../../artifacts/qa/runs/1.26.0-1793592269540/hc031-library-metrics.json)独立核所有控件hit=true、enabled且新选单始终closed/hidden；所有旧断言原样通过，没有触发新增失败诊断。生产输入保持，首轮具体原因仍不确定，暂不将当前分项通过当作整轮已完成。

## 最终完整回归

独立读取[最终run](../../artifacts/qa/runs/1.26.0-1793592269540/run.json)，16组全部passed，errors/remoteRequests为空且tempCleaned=true；[独立复算](../../artifacts/qa/hc050/review-full-check.json)核实际36选单布局/6次closing命中shade双击与单次load/2来源失败重试、255库布局原断言通过、129份冻结产品源SHA一致。旧四页[96条边框记录](../../artifacts/qa/runs/1.26.0-1793592269540/hc036-after-frames.json)按24组四视图重算最大差0px。

最终动效为33个实际RAF样本，MO重算visible→open229.40ms、closing→closed173.10ms，CSS仍为220/160；与隔离专项28样本/224.10ms/171.30ms分别记录。起势含双RAF与实际调度，不能将观察时长当作精确帧率。最终真实图已亲看竖屏选单和推荐四人360×400，标题下展/当前高亮与局部玻璃符合选定A方向；短屏内部滚动，无整体布局移动。首轮缺失诊断、已确认的测试环境恢复修复和最终源不改通过事实保留，不反推旧库失败已确定根因。

## APK与实际手机

- 独立读取实际[APK](../../artifacts/apk/hoopal-1.26.0.apk)，4832365字节，SHA256 `fdbfe93514819a3c16b501de80b3be3a7cfa02464bd53aee9fb9d3b5c9126054`。打开ZIP独立逐字节hash核30份网页资源与dist一致、15图标与1.25.0一致，打包配置无server.url且包名/球搭正确，见[独立APK记录](../../artifacts/qa/hc050/review-apk-check.json)。[签名原文](../../artifacts/qa/hc050/apk/signature.txt)显示原v2证书，版本1.26.0/code31见[APK报告](../../artifacts/qa/hc050/apk/apk.json)。
- [设备前](../../artifacts/qa/hc050/device-before.json)/[设备后](../../artifacts/qa/hc050/device-after.json)为ef473680/M2101K9C，安装-r Success、COLD640ms/Wait649ms原文已核，实际0队，两文件SHA保持。特别核对本轮用户原进度是baseline-backdoor的frameIndex3（4 / 6、60%），选择SHA为`dfa4ce4e079dcd3e3f58e5b3b994d3399dd19aded2e66f2e9c3b90905412493e`，没有拿HC-048的frame0当本轮数据。
- [实际WebView记录](../../artifacts/qa/hc050/native-picker.json)为Android12/WV96、393×819；两组9项完整可见/命中，选中baseline-backdoor，局部blur18而workspace.filter为none，打开时背景锁且无整页溢出。独立[复算](../../artifacts/qa/hc050/review-native-check.json)核322自然RAF样本恰好四次opening/open/closing/closed序列及真实中间透明度，四类外部/当前项/原标题/DOM-Escape取消后主Play和双文件保持。
- 已亲看[手机展开](../../artifacts/qa/hc050/native-picker-open.png)与[关闭](../../artifacts/qa/hc050/native-picker-closed.png)截图，当前非零步骤保留。未在真机选择其他战术、植入测试队伍或直接恢复用户存储；程序点击/DOM-Escape不等同物理手指或Android系统Back，原生物理旋转、Back及最终CRUD另待人工验收。源SHA在构建/原生检查后保持，未以浏览器/VM代替手机证据。

审查及修复闭环已完成，无未修P1/P2。实现/自动验证/安装与物理验收分记，`awaiting_device`准确；文件所有权交还主控。
