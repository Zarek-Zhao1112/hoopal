# HC-056 · 整体体型挑选战术独立审查

- 日期：2026-11-02；状态：实现及最终交付证据终审通过，保留设备人工验收边界与安装后偏好变化记录。
- 审查者未实现本轮生产或测试代码，仅写本记录与审查索引。
- 范围：[任务合同](../tasks/HC-056-body-type-tactic-release.md)、[批准视觉](../../artifacts/design/body-type-tactic-concept/overview-v1.png)、体型分类与目录门槛、schema2偏好/旧计划保护、球队/库入口人数、玻璃选单焦点与取消、预览RAF及短屏。

## 初始接口检查

用户已批准入口「挑选战术」和纯体型写法，旧HC-054逐角色确认不再是本轮必经流程。合同保留26套角色元数据/155帧、旧rolePlans及兼容读写；新训练只用编号讲解，不把体型或旧认领自动解释成新人员分配。球队入口锁当前mode，独立库可浏览异人数但不能写错球队偏好。

当前只确认实施约定，不表示代码、完整回归、APK或手机验收已通过。独立检查将重点复现以下边界：

- 不合法bodyType只隔离字段并备份原文，不能通过旧decode的整队隔离分支丢掉合法队伍/旧计划；schema1/2读取不立即写盘。
- setBodyType捕获调用时profileId/revision，排队换队或陈旧界面拒绝；失败保选择和重试；成功增revision并清旧ctx，原成员/计划不变。
- 普通update沿用previous.bodyType，防旧wizard草稿在改名/号码时抹掉已存偏好。
- 模式、进攻/防守和体型过滤组成严格候选集合，非法参数不回退成全部列表；每类应可达，空状态不伪造适配。
- 玻璃选单关闭阶段持续锁住背景；取消/同项/挑选本身不改主Play和选择进度，进入训练前可靠解除旧来源。
- 新预览的切换、选单、离页、后台及销毁释放旧RAF；迁移旧roles CSS时保留HC-054真实聚焦命中修复。

## 问题与复验

### P2 · 360×400战术页底部操作越过主卡（已修复复验）

实现者的新真实E2E首先发现360×400战术页footer超出主卡，说明按钮中心y约357–372命中底部导航，进入训练也不可达；见[原命中诊断](../../artifacts/qa/hc056/short-tactics-hit-probe.json)。该问题影响正常点击，不应只以页面无整体滚动判定可用。修复由界面实现者调整短屏内部网格、footer尺寸及错误反馈收紧，保实际中心命中断言。审查者对修复后的正式dist独立检查360×400、835×340、390×844、1024×768的训练/说明/选单/更换体型中心，均位于主卡及导航之上且elementFromPoint命中；另对360×400/835×340的来源写失败反馈状态检验训练按钮仍可点击，六组[独立布局记录](../../artifacts/qa/hc056/independent-browser-review.json)通过。审查者没有重新运行旧版代码，原始失败由实现者诊断保留，修复后为独立复验。

## 独立数据与持久化检查

[独立脚本结果](../../artifacts/qa/hc056/independent-catalog-storage-review.json)exit0。26套顺序、91位完整roles与roleVersion、155帧逐字段等于审查者开始时捕获的快照；14个人数×攻防×体型组均非空，返回项全满足严格mode/kind/bodyTypes条件。元数据的简短文本描述实际配合，不从体型直接指定球员能力、位置或成功率。

独立内存存储夹具验证：错误three-big放入3v3档案时仅将bodyType归null、保两队及旧rolePlans，读取零写；备份失败原主文不变，重试先精确保留原文再写。setBodyType捕获调用时快照、成功增revision/清旧来源但不改成员与计划；主写失败状态不变并可重试，旧revision拒绝，队列先切另一队再执行旧偏好请求会拒绝。普通旧wizard形状改名仍保原bodyType和计划。

## 独立正式浏览器检查

[独立正式dist报告](../../artifacts/qa/hc056/independent-browser-review.json)通过14个真实筛选组选单、6组布局/反馈与6类流程；临时Chrome/profile/server结束已清理，无runtime错误或外部资源请求。内容包括：

- 两人数每种体型分别切攻/防，实际选单IDs逐项等于严格纯函数候选；只点击体型不写档案，浏览/取消不改主Play、进度与内置选择。
- 偏好主写注入失败保选中卡、档案原文字节与主Play，重试成功；旧完整rolePlans不显示本队姓名，真正进入训练前清来源失败会留在挑选页，原模板/步骤/棋子DOM/两键保持，恢复后可进入普通编号训练且旧计划仍在。
- 当前3v3球队经独立库浏览4v4三大一小，界面明确浏览模式，不向当前队保存错误人数偏好。空队从库选择类别也不创建队伍、不写偏好档案。
- 预览实际时间推进且只有1个RAF；开菜单暂停、等待后位置保持，选另项后旧button已移除且playing=false/rafCount=0，离页销毁选单。全文说明打开时暂停预览，Escape只关上层说明并保战术页。
- 非减动效下CSS打开220ms、关闭各属性160ms；closing阶段导航仍禁用，关闭后焦点回标题。减动效路径也完成同一组选择与取消。

首轮审查脚本把关闭两属性时长字符串「0.16s, 0.16s」当作必须为单项而失败，[初次记录](../../artifacts/qa/hc056/independent-browser-review-first.json)保留。修正脚本为每项仍须严格160ms后通过，未改产品或正式测试门槛；不是产品动画错误。

实现者[角色替代E2E报告](../../artifacts/qa/hc056/body-e2e/run.json)亦为passed、零异常/外网、清理完成；它与以上审查者独立执行分开记录。专项与最终整轮、APK及原生证据分别记录如下。

## 最终自动回归、构建与APK证据复核

审查者只读复核[npm test最终日志](../../artifacts/qa/hc056/npm-test-final.log)246项全部通过；[最终完整17组](../../artifacts/qa/runs/1.28.0-1793607069188/run.json)全部passed，errors/remoteRequests为空，tempCleaned=true，包含同轮修复后的建队/短屏以及新体型挑选。完整运行约08:11–08:23 UTC，结束状态和[日志](../../artifacts/qa/hc056/browser-full.log)一致，不把此前定向检查当作整轮结果。

[真实入口负例](../../artifacts/qa/hc056/build-gate-negative.json)五份源hash经独立重算均与当前文件一致。缺体型元数据、空分类组两类错误分别由实际npm build与Android sync阻断，共四次exit1，dist/android均未生成，影子临时目录结束已清理。

[最终Android构建](../../artifacts/qa/hc056/android-build.log)24秒成功；[APK报告](../../artifacts/qa/hc056/apk/apk.json)为球搭/com.halfcourt.tactics、1.28.0/code33、原v2证书、30项网页资源、15原图标、无server.url。审查者独立重算[APK](../../artifacts/apk/hoopal-1.28.0.apk)4,845,725字节、SHA256 `9dc9137ec94f69f386720cfbca0f986a132054134b7a666e063d77b966990d11`，与报告相同。原图标/离线资源与签名依据打包检查报告复核，不将其当作手机功能验收。

## 真实WebView与安装后数据边界

本轮[安装前](../../artifacts/qa/hc056/device-before.json)是ef473680/M2101K9C上的真实1份3v3球队，版本1.27.0/code32，选中pick-roll/frameIndex0；不是HC-054的0球队或先前另套战术/第5步。预检未发现打开编辑/忙态及当前显示的保留草稿提示，该范围仍不能证明所有关闭的内存草稿不存在。

[原生程序报告](../../artifacts/qa/hc056/native-selection.json)显示Android12/WebView96、真实3人球队草稿只点分类后取消，另从独立库浏览4v4四体型×攻防共8组，严格候选/背景锁/无溢出/预览暂停与销毁、自然进度推进均通过，无运行错误。审查者核对程序源：只对与当前队不同mode的库浏览点「查看战术」，没有存新测试队或直接恢复存储；每组和结束/finally均检查两原文hash等于开始。报告开始hash与安装前两份原文备份独立重算相符。程序WebView操作不等于物理手指、系统Back/IME/旋转或真实偏好保存的人工作业验收。

**最终档案原文字节并未保持不变。** 原生探针完成后的一次读取观察到体型偏好与revision变化，严格通用after-helper因此拒绝“前后双hash完全一致”的断言。主控随后使用本轮专用只读差异报告保留该事实，没有恢复过期备份去掩盖变化。[最终设备报告](../../artifacts/qa/hc056/device-after.json)明确`lineupsAndSelectionUnchanged=false`，仅声明`installationAndNativeProbeBytesUnchanged=true`。

审查者[独立最终证据复算](../../artifacts/qa/hc056/independent-final-evidence-review.json)对[差异报告](../../artifacts/qa/hc056/device-data-diff.json)、备份及最后观察快照验证如下：

- 安装前档案原文SHA256为`80faa883e3dcfd5ac1c600373d1f3c6c639e577bf200234b9a44c44b3c3fd716`；最后观察原文为`ef9b870c7ae4beb46d8dd6ee275388f83d13ceb51a98a27a1d1c520070acf3b4`，两者确实不同。
- 唯一结构变化为同一球队bodyType从原缺省（语义null）变为similar，revision从1变4；去除这两个偏好相关字段后，整个state逐字段deepEqual，包括球队/成员的全部基本资料、activeProfileId、recentTemplateId、所有旧rolePlans和其余状态，不仅是抽查姓名。
- 内置选择备份独立重算SHA256始终为`116a20169ddd85f2ba67bbba685cba48d0511536b8ea48430595074ea142d1b0`，pick-roll/frameIndex0保持，未用旧轮次步骤覆盖。
- 变化操作来源未观察；不能据此认定是用户已完成人工保存验收，也不能把它归因于迁移、安装或已经结束且两hash相同的探针。最终交付应说核心球队成员、旧计划和进度保留，并明确记录偏好变化，不能笼统声称“最终档案字节完全未变”。

## 结论

当前无可复现的未修复P1/P2；实现、独立数据/存储/正式dist复验、246项检查、最终17组、真实构建门槛与APK/安装/受限原生程序证据均已复核通过。最终偏好/revision变化及严格hash断言拒绝保留，不作未观察的来源推断。任务保留awaiting_device：物理手势、系统Back、输入法、旋转和手机真实偏好保存体验仍待人工确认。
