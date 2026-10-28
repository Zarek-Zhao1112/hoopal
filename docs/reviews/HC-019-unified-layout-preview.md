# HC-019 统一排版效果预览独立审查

日期：2026-10-23。状态：预览范围审查通过。两项独立发现与一项主控发现均已修复；独立源码复读、图检及主控最终浏览器证据已核对，无剩余 P1 / P2。任务：[HC-019](../tasks/HC-019-unified-layout-preview.md)。设计依据：[HC-018 逐屏讨论稿](../design/unified-screens.md)。

## 审查范围

本轮交付为独立本地视觉讨论预览：阵容、演练、战术库、配置四页对照，以及空/错误/读取和横屏示例。不是 HC-018 全部 16 个屏幕的正式实现，也不包含生产存储、APK 或真机验收。

interaction_design 独占本审查文件；实现、截图与浏览器验证由 ui / 主控负责。独立审查限于预览源码、交互接口和生成图片，不运行 Chrome、adb 或构建，不修改预览实现。

## 独立源码与图检

已只读检查 `index.html`、`preview.css`、`preview.js`。未见生产模块 import、localStorage / IndexedDB 等持久化调用或请求 API；脚本、样式与 NBA 队徽均引用本地文件。外壳有统一示例说明，frame 内标题也有“预览”；保存按钮打开“尚未保存 / 没有写入本机”说明，读取失败与重试明确为外观示例。

外壳 API 的 setMode 切总览 / 状态 / 横屏，frame API 的 setView / setState / selectPlayer / toggleCard 操作单页内存。库初始 -1，全收正文使用真实 hidden；同卡开合、换卡收旧、人数/攻防与重入重置可从源码核对。体型与能力点选只改示例成员，推荐、创建、队伍与导出入口用说明弹窗呈现，没有冒充真实业务成功。

reviewer 亲看 `overview.png`、`library-expanded.png`、`config.png`、`states.png` 与 `landscape.png`：四页轻量标题、主操作、玻璃导航有一致层级；蓝银柜位与白绿球衣、自然木地板明确区分场景。库展开图保留单卡球场 / CTA 与其余标题；配置保留不保存提示；空柜、错误与骨架互不混淆；横屏球场、回放与导航分区清楚。图检不代替控件几何或真实触摸检查。

## 发现与复验

| 编号 | 级别 | 位置 / 触发与影响 | 修复及复验 |
| --- | --- | --- | --- |
| R1 | P2 | preview.js 的 court 固定绘制 3 橙 / 3 蓝，catalog 防守始终使用三人标题；库切 4v4 后元数据仍称 4v4 初始站位，与图中人数和名称矛盾。 | 主控修复；reviewer 复读第 48–50、58–64 行，库按人数传 count 并绘制第四攻防棋子，四人防守切相应标题；演练默认仍为一致的 3v3 示例。主控最终 Chrome 报告四人标题、attackers=4 / defenders=4，已只读核对报告。 |
| R2 | P2 | preview.js resize listener 在播放中调用 stop，但未重绘播放按钮；视口变化后 playing=false，按钮仍显示暂停，下一次点击实际重新播放。 | 主控修复；reviewer 复读第 109 行，stop 后在 play 调 paintProgress。最终报告 rotatedPlayback 为 playing=false、按钮“▶ 播放示意”，与预览暂停策略一致。 |
| R3 | P2，主控发现 | 844×390 横屏展开时右列末张标题下沿超出 deck，标题中心可点不足以证明完整可见。 | 主控增加右列标题与间距的 strip 上限，并为展开标题 / CTA 增加 insideDeck 断言；reviewer 已复读第 78 行公式。最终四尺寸断言通过，未将该发现冒充独立发现。 |

## 主控证据与限制

主控最终 Chrome 脚本 exit 0，`artifacts/design/unified-layout-preview/verification.json` 已由 reviewer 只读核对：390×844、360×640、844×390、1024×768 各四页共 16 组 frame 检查，文档不溢出、主要 CTA / 导航中心命中、本地图片加载；每尺寸库展开标题 / CTA 中心命中且位于 deck 内。库状态为默认 -1 → 开 0 → 换 2 → 同卡关回 -1；四人防守人数 / 标题、体型点选和保存不写入说明、播放后 resize 标签均通过，errors 与 remote 均为空。reviewer 未独立运行浏览器或重复这些检查。

示意球场、动画与目录用于比较空间，不作为真实战术路线 / 推荐规则验收；配置资料输入、创建和保存不构成正式档案流程。未验证真实读屏、WebView96、系统键盘、原生返回或设备交互。本任务不要求修改或验收正式应用 / APK，也不以该预览声称 HC-018 全部屏幕已实现。
