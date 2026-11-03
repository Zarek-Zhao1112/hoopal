# HC-059 · 训练场内战术库与二级标题正式接入审查

日期2026-11-03。审查者未实现本轮代码或主回归；独占本记录及审查索引，应用/测试/构建源码只读。依据[HC-059任务与接口](../tasks/HC-059-training-library-release.md)及[HC-058预览](../tasks/HC-058-training-library-interactive-preview.md)。

## 当前结论与范围

已完成集成源码、独立真实浏览器检查和主控最终证据核对，后续完整回归发现的跨页样式P2已修并独立复验，当前已检查范围无未修复的可复现P1/P2。独立首轮15项及修后五尺寸5项通过；主控248项、13大组分段覆盖、APK与指定手机程序证据核对通过，人工设备体验仍保留awaiting_device。

范围包括app与workspace接线、selection玻璃库/完整体型页、共用sheet的开合隔离、我的→球队管理、向导来源route、保存与旧来源清除顺序。保留原26套战术/角色定义、schema2与旧计划，未新增账号或云服务。本审查不写真实用户档案、不操作手机。

## 独立浏览器验证

使用自有临时Chrome/HTTP/profile运行`artifacts/qa/hc059-review/review.mjs`；[12项结果](../../artifacts/qa/hc059-review/results.json)均通过，错误和远程请求为空，finally已关闭自有浏览器/服务并清理临时profile。与主测试agent的测试脚本和结果分开，不将主控运行称为审查者重复运行。

- 将真实训练时钟设为非整数1.26，开库取消后position、玩家层与路线层SVG原文均精确保留，真实档案原文不变。并非只比较进度条或快照字段。
- 从库进入完整体型页，改选后返回取消保原偏好；应用一大两小成功持久化到当前三人队，返回关闭后原position及玩家/路线SVG均保持。
- 对实际档案存储注入写入失败，应用保bodyDraft和完整旧档案原文，仍在体型页显示错误；恢复存储后同一选择可明确重试成功。
- 独立库切到4v4并选择三大一小，仅改变浏览候选，不向当前3v3球队写偏好。
- 真实卡片等待完整周期后cycle至少1且RAF1；关闭focus emulation并激活新tab，确实观察document.hidden=true，卡片暂停/RAF0；隐藏1.3秒和返回后位置不变化、不追赶。不是合成visibilitychange或pagehide证据。
- Tab持续隔离在库内；Escape收回90ms时phase=closing、dialog仍open、背景导航仍disabled；结束后回焦训练场的战术库按钮。
- 390×844、360×640、360×400、844×390、1024×768逐一以真实控件中心执行体型应用、明确选用、球队管理返回；两种二级标题均为卡外兄弟且标题底边不侵入主卡，主文档无横纵溢出。每次明确选用均position0且保持暂停。

另运行独立`safety.mjs`补充[3项存储/来源安全验证](../../artifacts/qa/hc059-review/safety-results.json)，同样errors/remote为空、自有QA资源已清理：

- 使用合法旧`role-confirmations`来源与完整旧rolePlans夹具。可靠清来源写失败时，旧Play/position1.26/玩家及路线SVG/两份持久化原文均不变，当前选卡与错误保留在库内。
- 清来源成功后内置选择写失败时，可靠解除旧ctx，旧rolePlans仍逐项相同；旧Play/position/SVG与原内置选择记录保持，不表面切换成功。
- 恢复存储后同一张卡明确重试才切换give-go并持久化，position归零、保持暂停。

已图检[展开库](../../artifacts/qa/hc059-review/library-390.png)和[卡外体型页](../../artifacts/qa/hc059-review/body-390.png)。后者截图保留故障注入后的短暂toast，是错误反馈证据，不当作正常文案或未修异常。

## 问题、修复与复验边界

### P2 · 球队管理根样式跨到训练场，已修

后续完整回归实际发现，进入球队管理后切训练场，旧球队管理标题仍露出并挤压球场。[失败截图](../../artifacts/qa/runs/1.29.0-1793670141606/hc008-failure-390-844.png)已由审查者独立图检，明确可见训练场上方残留球队管理标题。本问题未被首轮15项覆盖到，不以首轮通过否认新发现。

位置：`frontend/src/lineups/views/team-management.css`约第11行及其短屏媒体规则。原`#lineups-panel[data-section=archives][data-subview=teams]`只判断组件留存的内部状态，切训练场时内部route仍为teams，未按body当前view限制的display:flex规则胜过隐藏规则。影响是无关页面露出旧标题并占用布局空间；不涉及档案丢失。

主控将对应三处规则限定为`body[data-view=archives]`，JS与存储不变并重建dist。审查者另跑`artifacts/qa/hc059-review/navigation-scope.mjs`，见[修后五尺寸记录](../../artifacts/qa/hc059-review/navigation-scope-results.json)：390×844、360×640、360×400、844×390、1024×768全部通过。每种尺寸真实执行管理→训练、管理→更衣室，并比较进入管理前后训练卡与球场矩形逐项相同；训练场中lineups根display:none、管理标题无布局矩形，返回更衣室无旧标题。原管理页仍显示卡外标题，体型页的标题/主卡几何和应用按钮实际中心命中均保持，主文档无溢出。

已图检[390×844修后训练场](../../artifacts/qa/hc059-review/fixed-training-390x844.png)与[360×400修后训练场](../../artifacts/qa/hc059-review/fixed-training-360x400.png)。修后CSS SHA256=`396dfcb3be6a12380594cbc5d2b776d1b1648e125e4e3aa919fde3ce1d09ee6f`，errors/remote为空，自有Chrome/HTTP/profile已清理。首轮复验夹具在第二次回我的时错误假设一定回概览，但应用正常保留teams route，因此找不到teams-open；[前提失败原记录](../../artifacts/qa/hc059-review/navigation-scope-first-precondition.json)保留，改为已在管理页时直接继续后得到上述五项通过，不将该夹具前提错误算产品新缺陷。

源码审查曾指出`handleSelectionAction`的finally使用`draw()`可能以整数board覆盖小数位置画面。主控在独立浏览器运行前统一改为`showPosition()`；没有旧版实际浏览器复现，不标成已复现旧缺陷。修后在取消、体型提交、来源清除失败、内置选择写失败四种情形下都独立比较了真实SVG和position，均保持。

审查时源码SHA记录在首轮results.json，包含app=`cea814c24bc83c828b6636bc3c3d47e3b52206711010c6bdd887898bdca25daf`、selection/ui=`3e8a5c9646fdda26047667d0b31698c87309ab50d2af2028e11081c7b0cd37f6`。后续若有功能改动，需对受影响断言重新验证，不能直接沿用本记录。

## 主控最终证据核对（非审查者亲自运行）

终审只读核对主控输出和最终源文件，无需重复运行已通过的同输入测试。首轮记录的app.js、selection/ui.js、selection/styles.css、library-integration.css四份源码SHA均未变，管理CSS仍与上述修后SHA相同。构建日志的业务包`app-D4wH2Ofn.js`保持；CSS修复使入口资产由`index-DB60GEEK.js`变为`index-DZ6gUqAd.js`，不将其称为全部JS资产字节相同。

- [npm成功日志](../../artifacts/qa/hc059-npm-test-retry.log)248项通过、0失败；初次HTTP沙盒EACCES是执行前提失败，旧记录保留，未当作产品错误或删除。
- [13组浏览器覆盖汇总](../../artifacts/qa/hc059-browser-coverage.json)逐组回查各run.json，13个指定group的passed均为true，各run errors/remote为空、临时资源已清理。前三份run整体passed仍为false；最终只运行后四组的run为true。故仅称全部13组分段覆盖，不称单次不中断的整套通过。真实P2和旧列表/route前提失败分别保留，不用汇总覆盖旧失败。
- [APK报告](../../artifacts/qa/hc059-apk/apk.json)为主控实际核对，1.29.0/code34、包名com.halfcourt.tactics、30网页资源与dist同hash、15原图标、原v2证书、无server.url。审查者另直接计算[APK文件](../../artifacts/apk/hoopal-1.29.0.apk)大小4,837,885B及SHA256，确与报告`2a9cb83508496dd07d23dee82feaebd52ae37b8975f848066d623d4d33b2ee36`一致；[构建日志](../../artifacts/qa/hc059-android-build.log)为32秒成功。资源逐项/签名检查属于主控执行，不冒称审查者重新解包或签名验证。
- 指定ef473680设备的[before](../../artifacts/qa/hc059-device/device-before.json)/[after](../../artifacts/qa/hc059-device/device-after.json)报告为同序列号，1.28.0更新为1.29.0/code34、前台正常。审查者逐字段确认球队原文hash及选择进度hash严格相同、球队数量保持；安装前editing/busy及可见保留草稿提示均为false。该提示检查不证明所有已关闭内存草稿不存在。
- [真实原生程序记录](../../artifacts/qa/hc059-device/native-results.json)明确是Android12/WebView96的程序DOM操作，非人工手势。报告passed=true，三导航正确，库真实cycle=1/RAF1，关闭后原template/position保持，球队管理标题在卡外；errors/remote为空。未提交体型、新战术或示例球队。审查者核对报告与[终审摘录](../../artifacts/qa/hc059-review/final-evidence-check.json)，没有操作手机或把这些结果写成独立设备复测。

上述主控APK/安装/原生程序证据与本审查者的独立浏览器证据分开记录。物理触摸、硬件Back、IME、旋转及真实创建保存的人工体验未完成，不以浏览器或程序DOM操作替代；任务保留awaiting_device是正确边界。
