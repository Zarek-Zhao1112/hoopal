# HC-034 · 建队三步与大球衣动效预览审查

- 日期：2026-10-26；状态：`completed`（独立预览审查）。
- 审查者：interaction_design，未参与实现；结论：无阻断或未修 P1 / P2，可交付预览。
- 范围：[HC-034 合同](../tasks/HC-034-creation-motion-preview.md)，不含正式建队流程、存储或 APK 修改。

## 独立源码与处理器检查

只读检查 [index.html](../../artifacts/design/creation-motion-preview/index.html)、[overview.html](../../artifacts/design/creation-motion-preview/overview.html)、[preview.js](../../artifacts/design/creation-motion-preview/preview.js)、[preview.css](../../artifacts/design/creation-motion-preview/preview.css)、[build-data.mjs](../../artifacts/design/creation-motion-preview/build-data.mjs) 与 data.js。

- `renderPage` 以整张当前内容页切步骤 / 成员，因此球衣、姓名号码与配置字段来自同一成员；旧页 aria-hidden、禁用控件并移出 Tab，HTML ID 改名避免冲突，SVG 内部引用保留，新球衣使用唯一前缀。旧页 CSS 禁止指针命中。
- 前进新页从右侧 27px 进入、旧页向左 22px 离开，返回反向；步骤 320ms、成员 280ms，generation 隔离旧回调，取消移除旧层及待执行回调。原生 dialog 450ms 浮起，背景控件真实 disabled / tabIndex 隔离，焦点循环不依赖 inert；关闭动画锁控件，重开清旧计时并重新归还焦点。
- 关闭草稿提供继续 / 保留本次会话 / 放弃；保留不伪称跨进程恢复。人数切换取三人或四人的视图，内存始终保留四成员池；擅长 / 弱项互斥及上限保持，弱项可空。完成动作明确没有写入本机。
- 独立 Node 夹具直接执行实际 `cancelTransition` / `renderPage`：核对前后方向、320 / 280ms、整页 playerId、快速切换旧 token 无效、取消后仅一页且无待执行帧 / 定时器，以及 reduced-motion 立即切换。仅为处理器时钟验证，不冒充浏览器样式动画或设备触摸。
- 独立对照生成 data.js：实际 `jersey.js`、`team-carousel.js` 去 export 后源码均精确包含于经典脚本；运行只用本地资源和内存，不调用存储 / 网络。

## 图检与主控浏览器证据

亲看最终 [三步总览](../../artifacts/design/creation-motion-preview/overview.png)和[短屏第三步](../../artifacts/design/creation-motion-preview/short-step-3.png)：第三步球衣在上、配置标签在下，当前小王 / 7号 / BOS 球衣对应一致；短屏缩小球衣与标签，关闭、成员切换、分区、特点及完成按钮均完整可见。横屏 / 平板按源码改为左右分区，不将手机纵排机械套用。

读取最终 [verification.json](../../artifacts/design/creation-motion-preview/verification.json)，由主控 Chrome session97016 执行：

- 21 个布局，覆盖四尺寸三步及四成员切换；报告无整页溢出、控件 fit / hit 失败、损坏图片、Storage、远程请求或运行错误。
- 四段动效共 114 个实际 rAF 样本：前进 / 返回分别从 +27 / −27px 归零，成员切换 280ms，壳浮起 450ms、初始 y=744.417 最终归零。审查者重新汇总步骤 / 成员样本，壳、标题与底部控件各 bounds 最大变化均为 0px；这些实帧用于确认方向和稳定区域，不用静图冒充动画证据。
- 手指左下一位 / 右返回、取消不换成员、改姓名同步球衣、队徽与球衣联动、人数保留成员、保留关闭后重开 / 放弃、空名拦截、背景禁用及减少动效均为 true。八个正式文件基线哈希保持。

主控首轮采样取错旧页、关闭选择器误取遮罩，后限定当前页和实际按钮复验；这属于 QA 选择器修正，没有对应产品修复，本审查采用最终报告。

## 结论与限制

本轮未发现需修复的 P1 / P2，不要求扩大正式业务范围。审查者执行源码 / 处理器 / 数据对照 / 图检，Chrome 实际点击和触摸模拟由主控完成；未运行 Chrome、ADB 或构建。此结果只验收独立网页效果预览，不代表真实手机输入法、系统返回或正式建队保存通过。正式 1.19.0、存储、版本与 APK 保持不变，无本轮安装或设备验收要求。
