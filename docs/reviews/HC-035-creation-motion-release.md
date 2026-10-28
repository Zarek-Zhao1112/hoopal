# HC-035 · 建队大球衣与内容动效正式接入审查

- 日期：2026-10-26；审查者：interaction_design，未参与实现。
- 状态：代码 / 完整浏览器审查通过，APK已覆盖安装并完成原生程序核对；R1 / R2 两项 P2 已修并复验，无未修 P1 / P2，完整物理与真实CRUD验收仍 `awaiting_device`。
- 范围：[正式合同](../tasks/HC-035-creation-motion-release.md)，源码只读，仅维护本记录及审查索引。

## 独立检查与证据

检查了 ui / sheet / creation-layout、wizard-motion / CSS / unit 与正式保存、来源、读锁接口。内容页先 capture 再销毁旧转盘并重建，仅显式切步 / 切成员播放；普通标签、忙碌和错误重绘取消旧动效。新输入只局部更新球衣 / 姓名号码 / 完成标记，保留原输入节点。真实保存仍使用 validate 后完整副本、stable IDs、串行提交，失败保留草稿及来源页；没有沿用预览的演示完成语义。

独立 Node 组合夹具使用实际 jersey 函数和 motion 模块：两次旧快照各三个 SVG defs 引用均局部可解析且 ID 集合互斥；HTML ID / 业务 data 清除、旧 input 保视觉值但 disabled / tab-1，live 不被修改。旧 rAF 不能清掉后来的新任务；dialog 进入 closing 后 observer 移除旧层、帧与计时器，destroy 解绑。

另直接执行实际 `saveWizard` / `perform` 处理器：调用时捕获完整校验快照，后续草稿变化不改已提交值；pending 连点仅一次 onAction，false 留同一草稿 / 成员 ID 且不关闭，重试成功才清草稿、关闭并安排壳关闭后的导航。此为内存处理器验证，不冒充真实磁盘或浏览器流程。

核对主控 [专项报告](../../artifacts/qa/hc035-creation-motion.json)：修前 31 布局、三段 320 / 320 / 280ms 实帧、真实输入节点 / 焦点 / selectionStart 保留、真实隐藏页、档案原文保持。亲看 390×844、360×640、844×390 第三步图；前两屏大球衣 / 名号 / 字段和保存按钮完整，横屏发现下述问题，故未仅凭 fit / hit 全绿宣布通过。修后报告扩为 33 布局，结果见 R1 复验。

## R1 · P2：横屏成员按钮被压成 8px 竖条，姓名裁切

- 位置：`sheet.css:130` 的横屏旧 `.lineup-player-tabs{flex-direction:column}`；新 `creation-layout.css:78–82` 将 tabs 放到 27px 网格行却未重置方向，且按钮 min-height 为零。
- 触发：844×390 打开第三步、切成员或资料分区。三成员按钮仍竖排，报告中宽 417px / 高 8px，y=84.5 / 97.5 / 110.5；静图可见姓名被上下裁断，难以读认与触摸。
- 影响：中心点 fit / hit 均为 true，但不能证明按钮完整可读 / 可用；四成员也受同一方向继承影响。
- 修复：UI 在新 `.lineup-wizard-page .lineup-player-tabs` 明确 `display:flex; flex-direction:row; align-items:stretch`，其优先级覆盖旧横屏方向，snapshot 保留相同 class 因而同样受修复约束。
- 独立复验：复读最终 CSS，读取修后主控 session15945 专项 exit0 的 33 布局报告并亲看最终横屏三人 / 四人图。844×390 三人及四人 tab 均同 y=84.5、高27px，文字 y=92–104 完整落在按钮内；四人宽100.5px，三人约135.66px。六尺寸三人及新增390 / 844四人成员都具备高度、同 y、文字垂直 fit 断言，不再仅验中心命中。R1 标为 `verified`，无剩余此项 P2。

## R2 · P2：极短竖屏先缩高再触摸，姓名输入框不可达

- 位置：`creation-layout.css` 的短屏第三步最小行高及仅 `has-input-focus` 时的极短屏压缩规则；内容页和 host 均裁切溢出。
- 触发：编辑第三步资料分区，先将视口缩至360×400，再真实触摸姓名输入。未聚焦布局保留至少95px球衣 / 27px成员 / 28px分区 / 132px字段和间距；只有输入已聚焦才隐藏上部内容，不能保证首次触摸可达。
- 证据：主控修后完整64709在旧 `lineup-flow` 的真实触摸焦点断言失败，进程 exit1（不是取消或通过）。新增专项15218同样失败；[诊断](../../artifacts/qa/hc035-short-input-diagnostics.json)记录未聚焦姓名中心 x=125 / y=387.40625、高32px，hit=false、active=body，真实 touch 后 active 为 panel、无 input action。原专项采用先程序 focus 再缩高，未覆盖这个顺序，不能代替原真实触摸断言。
- 影响：键盘压缩或极短窗口中，用户不能通过触摸开始编辑；程序 focus 绕过问题会掩盖实际不可用状态。
- 修复：UI 仅对宽≤599px / 高≤500px 的极短竖屏，无论是否已 focus 均使用相同紧凑壳 / 字段结构，隐藏 hero 但保留成员 / 分区 / 输入 / 底控；正常640 / 844高及横屏不命中。输入不再依赖程序 focus 才可达。
- 独立复验：复读最终CSS及主控 session61704 exit0 的真实 touch 报告，亲看修后 before / after 两图。更新诊断显示未focus姓名中心 x=125 / y=243.5、高32px，hit=true、active=body；真实 TouchStart / End 后 active action 为 `lineup-player-name`，panel 带 has-input-focus，布局无突变，成员 / 字段 / 保存仍完整。旧 `lineup-flow` 真实 tap / activeElement 硬断言保留，并在最终完整62578通过。R2 标为 `verified`。

## 自动验证阶段

主控报告 R2 修后源码 205 项检查（202 单元 + 3 HTTP）及33布局专项通过；定向专项保留输入节点 / 光标、成员手势 / 取消、快速切换 / reduced-motion / 实际后台标签页及档案不写入，并新增先缩高再真实 touch 的 R2 断言。历史完整 Chrome session64709 因 R2 exit1，不作为通过证据。

最终修后完整62578 exit0，已核对 [浏览器日志](../../artifacts/qa/hc035-browser.log)末尾 `Browser QA passed`；覆盖26主战术 / 卡内循环 / 推荐 / NBA / 建队完整保存及失败重试 / 旧档案 / 来源清除 / 重启导出断网 / 六屏 / 四页柔光。旧真实触摸断言保留，两个P2修后源码未再改变。最终专项报告为33布局、三段共81个实际rAF样本，不固定先前运行的采样数量；APK / 原生证据见后节，不能从桌面通过推断设备通过。

## APK 与原生程序核对

本节构建、安装和设备操作执行者为主控；审查者只读报告 / 签名文本并亲看最终设备图，未运行 Chrome / ADB / 构建。

- Android 构建成功（46秒）；[包资源报告](../../artifacts/qa/hc035-apk-assets.json)记录28个dist资源逐哈希一致及无server.url，APK SHA256 `4e2c3243fb702a4bd1d3bfd7769370f35decefd4c278a95c76d525a063cea5c7`。[签名文本](../../artifacts/qa/hc035-apk-signature.txt)确认v2有效，沿用证书SHA256 `e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26`。
- 指定手机ef473680正常覆盖安装，1.20.0 / code22，主控报告COLD启动798ms。[安装前](../../artifacts/qa/hc035-device-before.json) / [安装后](../../artifacts/qa/hc035-device-after.json)实际均零档案，档案SHA256 `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`、内置选择SHA256 `397c6cb369a367c0cf5b7d4a2a047c2748becc85e1af744731323b2b75ebd9eb`均保持；另有本轮实际原文备份。
- [原生报告](../../artifacts/qa/hc035-native-creation.json)为真实WebView96 / Android12 / M2101K9C / 393×819程序操作：七布局包括第一步、第二步中性 / BOS已选、第三步体型 / 第二成员 / 资料及草稿确认，均无溢出或fit / hit失败，errors为空。4v4草稿的成员箭头、姓名 / 88号即时SVG同步、3→4成员保留、明确放弃及回更衣室通过；没有点击最终保存，两个存储文件哈希仍保持。
- 独立亲看[原生第三步](../../artifacts/qa/hc035-native-step-3.png)和[资料页](../../artifacts/qa/hc035-native-identity.png)：四成员完整一排，BOS球衣、当前第二成员、未保存姓名 / 88号一致，特点或输入及真实保存入口均可见。程序操作没有把测试档案写入手机。主控已清理本轮动态转发和无头测试profile，预存9333 / 19223连接保留。

## 验证边界

审查者未运行 Chrome、ADB 或构建；浏览器及设备操作由主控执行并独立记证据。不以 HC-034 预览代替正式实现，不以模拟 / 程序点击替代手机物理触摸、IME、系统返回、旋转或真实CRUD保存验收；上述人工项目仍待设备验收，任务保持 `awaiting_device`。
