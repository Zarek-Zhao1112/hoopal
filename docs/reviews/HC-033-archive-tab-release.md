# HC-033 · 档案独立底栏正式接入审查

- 日期：2026-10-26；审查者：interaction_design，未参与实现。
- 当前状态：代码 / 浏览器审查通过，APK 已覆盖安装并完成原生程序核对，无未修 P1 / P2；完整物理设备验收仍为 `awaiting_device`。
- 范围：[任务合同](../tasks/HC-033-archive-tab-release.md)；仅本文件及审查索引由审查者写入，产品源码只读。

## 独立检查

检查了 app / workspace 四视图接线、HTML / page-layout、lineups/ui / styles / archives、原 session / store 接口及档案 E2E。session 的选择 / 更新 / 删除仍等真实保存成功后才更新内存；非当前管理直接绑定所点 profile ID，不先选队，更新沿原 revision 保护。菜单为 owned 原生 dialog，背景控件真实 disabled / tabIndex 隔离，关闭按原节点或稳定 profile ID 恢复焦点；编辑保留 originSection / originRoute，删除成功才清对应草稿。原库的可见性 / 后台暂停及主 Play 协议保留。

独立 Node 内存夹具直接提取实际 `button` / `perform` / `archivesPageView` / `navigate` 函数执行：第三页换队 false 或 throw 保持页码、原 active / context，不导航；pending 连点只提交一次；真实成功才导航；同 active 卡跳过 onAction，保留合法推荐来源。这是处理器级验证，不冒充完整 DOM 或浏览器流程。

亲看主控正式图：390×844 档案、360×640 管理菜单、844×390 档案；卡片、分页、创建、管理关闭入口及四项导航完整，没有图检阻断。最终浏览器报告见下节，不以 HC-032 预览证据代替。

## R1 · P2：读取失败被显示为零档案，切页还会丢失重试入口

- 位置：首版 `lineups/ui.js` 的 `profilePageView`、`archivesPageView`、`draw`、`setView`；app `renderLineups` 仅传 warnings 文本，没有独立读取锁状态。
- 触发：启动时档案键 getItem 失败；仓库返回空内存 state 与 writeLocked。更衣室仍提示先组队，档案页显示没有档案并提供创建；切换两页时 setView 清 feedback，而重试按钮依赖 feedback，错误及重试随之消失。
- 影响：未知旧档案没有被覆盖（仓库写锁仍安全），但用户被误导为空库，且丢失直接恢复入口，直到再次写失败。
- 修复：主控 `app.renderLineups` 传 `lineupSession.writeLocked`；UI 的 `readLocked` 不依赖可清除反馈，`draw` 最高优先渲染 `lineup-read-error` / 重试，取代两页合法空态及创建。普通写失败不会打开此读锁。
- 独立复验：直接提取最终实际 `render` / `draw` / `setView` / `readLockedPageView` 执行，确认两页切换、feedback 清空后读锁与唯一重试仍存在且没有创建；真实 retry 处理器恢复七个档案后解除读锁；普通写错误仍显示可读档案卡。
- 主控浏览器复验：读取最终 [档案专项报告](../../artifacts/qa/hc033-archives-flow.json)，实际启动 getItem 失败保原文、恢复后取回七个稳定 ID 均通过；[布局报告](../../artifacts/qa/hc033-layout-smoke.json)包含六尺寸两页共十二个读取失败状态。亲看 844×390 读取失败档案图，错误说明与重试按钮完整，未冒充零档案或提供创建。R1 已标为 `verified`，无剩余此项 P2。
- 回归隔离：engine 的新文档 seed 与加载屏障用于防止离开旧页面的真实 pagehide 保存覆盖测试进度；保留合法来源 / 原文硬断言，没有关闭应用生命周期。这是测试夹具时序调整，不是另一个产品修复。

## 证据边界

已核对主控最终档案专项：六尺寸逐页覆盖七个档案（3 / 3 / 1），同 active 卡保来源、真实 setItem 选择失败保原文 / 主 Play / 来源、恢复重试、非当前改名草稿保留后保存 / 删除 / 取消及菜单复焦均通过。最终 smoke 为五十组（含读取失败十二组），errors / remote 为空、存储原文保持；主控最终源码 195 项检查通过。

最终完整 Chrome session53225 已退出 0，核对 [浏览器日志](../../artifacts/qa/hc033-browser.log)末尾 `Browser QA passed`。主控覆盖 26 战术、NBA、柜位真实 touch、推荐 / 重启 / 导出 / 断网、六尺寸及四页柔光的快速取消 / 减少动效；读锁修复后的源码未再变化。上述浏览器执行者为主控，审查者仅核对源码、处理器夹具、报告与图片。代码及浏览器阶段可收口，允许继续原定 APK 构建与安装流程。

## APK 与设备证据

以下构建、签名、安装及设备操作由主控执行；审查者只读报告、签名文本并亲看两张设备图，未运行 Chrome / ADB / 构建。

- 主控 Android 构建成功（21 秒），[包资源报告](../../artifacts/qa/hc033-apk-assets.json)记录 28 项 dist 资源逐哈希匹配、无 `server.url`，APK SHA256 为 `c681f290a4926945449c42a1ff6236e4dbad135d9507ccdef0ef5193c1b6fcc4`。[签名文本](../../artifacts/qa/hc033-apk-signature.txt)确认 v2 有效，证书 SHA256 为 `e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26`。
- 指定手机 `ef473680` 正常覆盖安装成功，版本 1.19.0 / code21；主控报告 COLD 启动 820ms。[安装前](../../artifacts/qa/hc033-device-before.json) / [安装后](../../artifacts/qa/hc033-device-after.json)均实际零档案，档案 SHA256 同为 `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`，内置选择 SHA256 同为 `397c6cb369a367c0cf5b7d4a2a047c2748becc85e1af744731323b2b75ebd9eb`；未写测试档案，原文另有本轮 backup JSON。
- [原生报告](../../artifacts/qa/hc033-native-archives.json)为实际 M2101K9C / Android12 / WebView96 / 393×819 的程序操作：四页导航及未编辑创建面板共五状态，所有记录控件 fit / hit 通过、无溢出 / errors；打开面板后放弃关闭，前后档案和选择原文哈希保持，最终回到更衣室。首轮几何断言误将 1px 自定义 checkbox 当可见按钮；改核实际可见 label 后同 APK 复验通过，没有产品源码修改。
- 独立亲看 [设备档案页](../../artifacts/qa/hc033-native-archives.png)与[创建面板](../../artifacts/qa/hc033-native-sheet.png)：真实空态、四栏、创建入口完整，面板关闭 / 字段 / 底部继续均可见；没有把演示资料注入真实存储。主控已清理本轮专属动态转发，预存 tcp19223 保留。

原生仅程序导航与干净面板开关，未验收实际手机手指、系统返回、输入法、旋转或真实档案创建 / 选择 / 修改 / 删除。浏览器真实存储专项不能代替这些物理与真实业务操作；任务继续 `awaiting_device`，无新增用户审批要求。
