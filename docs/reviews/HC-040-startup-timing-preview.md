# HC-040 · 启动停留与展开节奏预览审查

- 日期：2026-10-27；状态：`completed`（独立预览审查）。
- 审查者：interaction_design，未参与实现；结论：无阻断或未修P1 / P2，可交付效果图与可播放对比。
- 范围：[合同](../tasks/HC-040-startup-timing-preview.md)内独立时序提案；正式1.22.1 / 网页1400ms / APK及手机均不变。

## 独立源码与时钟检查

只读检查新目录的index / preview.js / preview.css / overview，以及最终verification。`relaxed`为1000ms静止 + 1100ms展开 + 300ms收尾，标题1165–1825ms淡出；`current`完整保留250 / 850 / 300ms及330–890ms标题边界。没有将新标题区间套给旧预设冒充当前节奏。

setPreset默认取消旧rAF、归零并暂停，实际预设按钮再显式play；seek先读传入值再暂停定位，重播 / 跳过 / 后台同generation清理，resize只重测不重播。ready遵守先前手动操作，减少动效直接到末态。结束前room真实disabled / tab-1及aria-hidden，演示按钮说明不读取或保存球队，不接正式业务或未来训练功能。

独立Node夹具直接执行实际render / clock处理器：1000ms前后clip与标题不变，推荐1165 / 1825、当前330 / 890标题端点正确，setPreset归零暂停、旧回调不能清新rAF，finish无残留且仅末态启用room控件。此为函数级验证，不代替浏览器自然播放。

独立重算production-before.json全部100项前端 / 数据 / Android / 版本SHA256，均与基线一致；没有本轮构建、安装、真实存储或网络业务。

## 主控浏览器报告与独立图检

核对最终[verification.json](../../artifacts/design/hoopal-timing-preview/verification.json)：主控Chrome session11770 exit0，21布局覆盖五尺寸纯舞台三phase、resize、四工具页及减少动效。产品舞台无整页溢出；工具页允许自然纵滚，横向无溢出，控件滚到后fit / hit通过。Storage / 破图 / errors / remote / failed均为空。

推荐自然145个rAF样本，约2413.4ms结束、内部timeMs=2400且playing / rafActive为false；当前预设85样本、约1403.6ms结束，内部1400。独立筛选推荐前1000ms的60条实帧，对frame / media / brand / room样式重算唯一值数为1，确认是真实静止停留。切预设取消、实际按钮 / 进度max、同1000ms对比、pause / continue / seek / skip、真实Target后台与reduced均有交互路径通过。

亲看最终[三阶段总览](../../artifacts/design/hoopal-timing-preview/overview.png)及[360×400起始](../../artifacts/design/hoopal-timing-preview/360-start.png)：推荐1000 / 1550 / 2400ms阶段清晰，短屏品牌横排与画框分离、柜体正常，结束更衣室及四栏完整。静图用于排版核对，节奏证明采用上述自然实帧；Chrome执行者为主控，审查者只核源码、夹具、报告及静图。

## R1 · P2：新预览极短屏空柜被slot压扁（主控发现，已修）

旧借用页面slot在360×400把预览柜体压扁；此为本独立预览布局问题，不是正式App回归。主控仅在新预览极短portrait改空态左右布局、为柜体保留空间并设置125px上限，隐藏非交互caption，没有隐藏创建 / skip等操作。

独立复读最终CSS与measure约束，亲看修后360-start柜体及重跑21布局 / 控件证据，R1 `verified`。已知旧预览品牌重叠未被带回，stage-compact横排及安全band保留。

## 边界与交还

无剩余问题；审查者未运行Chrome、ADB或构建。正式1.22.1仍1400ms，2.4秒仅待用户选择的提案，不能将预览参数或桌面实帧写成App已更新 / Android冷启验收。本轮不安装、不重跑无关正式业务回归。
