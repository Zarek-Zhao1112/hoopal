# HC-020 阵容玻璃任务面板预览独立审查

日期：2026-10-23。状态：预览范围审查通过。独立发现与主控动效发现均已修复，源码复读、独立图检与最终主控浏览器报告已核对，无剩余 P1 / P2。任务：[HC-020](../tasks/HC-020-lineup-glass-sheet-preview.md)。设计：[阵容主卡片与玻璃任务面板](../design/lineup-glass-sheet.md)。

## 范围

本轮仅审查独立预览中的阵容主卡、450ms 玻璃面板、建立球队 / 选择球队 / 配置队员三个任务，以及关闭确认、内存完成和减少动效。不是正式创建 / 保存协议、生产 UI 或 APK 验收。

interaction_design 仅维护本文件；预览实现、资产和截图归对应负责人。已阅读任务、设计和项目规则，只读审查 index.html / preview.css / preview.js 与本地 teams-data.js，再对主控图片作独立图检。未运行 Chrome、adb 或构建，未修改实现、生产数据或其他文档。

## 独立源码与图检

原生 modal dialog 配合背景 disabled / tabindex=-1、aria-hidden 与 inert；Tab 手动循环，Escape / shade / 关闭共用 requestClose，结束后回到创建入口。草稿仅内存，input 事件提交到草稿；任务回看与队员切换沿用同份输入，关闭确认区分继续、保留本会话、放弃，保留不冒充跨进程恢复。模式切换决定 3 / 4 名实际成员；NBA 30 队按 12 / 12 / 6 分页；弱项可空。未见存储调用、生产模块导入或远程请求代码，脚本 / 样式 / 队徽均为本地引用。

reviewer 亲看 comparison.png / team.png / players.png：我的阵容标题仅在主卡内，顶部留白明确；打开后上沿约 16%、模糊暗化背景与冰川蓝玻璃层区分清楚。球队格、队徽 / 球衣摘要、队员与四配置分区、固定操作区可辨，完成明确称演示。该图检只覆盖静态画面；不以它证明 450ms 的实际渐进过程。

## 发现与复验

| 编号 | 级别 | 位置 / 触发与影响 | 修复及复验 |
| --- | --- | --- | --- |
| R1 | P2 | preview.js next 完成后先把 draft=null，再保留 450ms 关闭动画；期间完成按钮仍可触发 next，第二次访问 draft.name 会抛 TypeError。快速双击完成即可触发，不涉及生产数据。 | 主控修复；reviewer 复读第 69–70、79–80 行，next / goStep 检查草稿、dialog 开启与 closing 状态，委托点击也加 closing / 空草稿守卫。最终报告 rapidComplete 为 first=true、second=false、step=false，completed 保留 3 名成员且 draft=null；主控完成按钮连点也无异常，等待后正常关闭。 |
| R2 | P2，主控发现 | CSS .glass-dialog 原 overflow:hidden 允许浏览器为焦点程序滚动；虽 transform 数值改变，面板可见 top 几乎恒定，实际没有呈现预期的浮起过程。 | 主控改 overflow:clip；reviewer 已复读声明，切断该滚动容器。最终主控报告同次打开 top 为 506.10 → 137.39 → 135.03px，背景 blur 为 1.58 → 5.96 → 6px，shade 为 .263 → .993 → 1；前两次存在 duration=450ms 的活动 CSS 动画，最终无活动动画。该问题及诊断归主控，不冒充独立发现。 |

## 主控证据与限制

主控最终脚本 exit 0，reviewer 已只读核对 `artifacts/design/lineup-glass-preview/verification.json`：390×844、360×640、844×390、1024×768 各 empty / team / players 共 12 组布局，主体、关闭与底部按钮无溢出且中心命中；30 NBA 选择、4 名成员、任务返回 / 草稿保留 / 放弃、Escape、18 次 Tab 焦点隔离、完成连点与减少动效均通过，errors / remote 为空。减少动效示例 animations=[]。上述执行者为主控，reviewer 没有独立运行浏览器或重复这些检查，也不把 CSS 活动动画与离散采样解读为持续帧率保证。

最新 comparison.png（1360×1160）已由 reviewer 重新亲看：默认卡、选队与成员配置完整，未见滚动条或新增遮挡；team.png / players.png 的独立图检结论保持。该交付可用于继续讨论视觉与任务分配，不代表用户已授权正式迁移创建流程。

本轮不验收生产创建原子写入、真实档案编辑 / 来源保护或全部正式表单规则；未检查 WebView96、系统输入法或真实手指操作。页面刷新后示例状态丢失符合会话预览边界，不表示存储能力故障。
