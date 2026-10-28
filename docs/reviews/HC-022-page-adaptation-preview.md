# HC-022 演练与战术库品牌适配预览独立审查

后续主控说明：本独立审查对应首版。用户最新指定仅更衣室留品牌、训练场/库去品牌但卡位保持、导航重命名；该小型跟进由主控完成四尺寸八组合/原交互与卡位断言并亲看新总览，未重新委派独立审查。新结果见任务跟进段，以下独立发现与复验作为历史证据保留。

日期：2026-10-23。状态：预览范围审查通过；两项 P2 已修复并独立复验，主控最终浏览器证据已核对，无剩余 P1 / P2。任务：[HC-022](../tasks/HC-022-page-adaptation-preview.md)。设计：[演练与战术库页面适配](../design/page-adaptation.md)。

## 范围

本轮只审查独立预览中演练 / 战术库相对 HC-021 阵容页的品牌、留白、主内容卡和导航适配；手机、小屏、横屏与平板的球场 / 卡片 / CTA 可达，默认全收与单卡开合，浏览与开始演练的边界。不是正式 UI / 引擎 / 数据 / APK 修改或设备验收。

interaction_design 只维护本文件及审查索引对应行；实现源码只读，不启动 Chrome、adb 或构建。主控负责真实浏览器检查和图片，reviewer 将区分本人源码 / 必要夹具 / 图检与主控执行证据。

## 独立证据

已读任务 / 设计，对照 HC-021 品牌尺寸及正式演练 DOM、library-deck 的隐藏 / 焦点与显式播放合同。只读检查预览 index.html / preview.css / preview.js：独立经典脚本，本地图标与 SVG 木地板，无生产模块导入、真实存储或请求 API；库 catalogMode / catalogKind 与 activePlay 分开，标题默认全收且正文真实 hidden，显式 CTA 才替换当前示意演练。讲解 / 更多 / 阵容导航明确说明预览边界，不冒充导出或正式保存。

reviewer 亲看 overview.png、library-expanded.png、play-landscape.png 与 play-tablet.png：品牌头、主卡与玻璃导航的层级 / 起线与阵容参考一致；木半场完整，手机展开卡球场与 CTA 均在卡内；横屏 / 平板将球场与讲解回放分区。最终补看 library-small.png（360×640）与 library-landscape.png（844×390）：小屏图 / CTA 并排、横屏左开卡 / 右标题，六标题与 CTA、导航都完整可见。没有以静态图推断触控命中或实际引擎战术合理性。

## 发现与复验

| 编号 | 级别 | 触发与影响 | 状态 |
| --- | --- | --- | --- |
| R1 | P2 | paintProgress 的 data-opponent 固定标在蓝方。从库选择四人防守并开始→关闭显示对手，会隐藏本方蓝防守，留下橙方对手；焦点移动也仍只作用于橙方。 | 独立内存 VM 复现 4 蓝全隐藏 / 4 橙全保留。ui 已按 data-team / activePlay.kind 修复焦点方、显隐、球和位移。reviewer 复读并以同类夹具验证攻防两种四人状态：本方四人保留 / 移动，对手隐藏；防守时球隐藏、进攻时球保留。主控实际 Chrome 的 blue=4 inline、orange=4 none、ball=none，四蓝位置前后变化，已只读核对。 |
| R2 | P2 | 外壳 landscape / tablet 仅建 play iframe，但仍可 setView library / 点击库页签，状态和 pressed 变为 library，画面仍 play；activeFrame 也找不到库 iframe。 | 原夹具复现状态 library / 实际 URL play。ui 已按 mobileView 创建 / 更新单 iframe，跟踪 navigation ticket 与 load / child ready，overview 仍双页。独立 VM 复验横屏 / 平板的 play / library 共四次状态、src 查询与 dataset 同步；主控实际 iframe load / ready 与窄屏页签复验通过。 |

夹具仅在本机 Node / VM 内存运行，不写预览或夹具文件，不启动浏览器。DOM 替身能核对选择与状态，不能验证 CSS、iframe 实际 load / origin 或原生焦点。

## 主控报告与限制

主控第二轮最终 Chrome 及新增检查全部通过；reviewer 已只读核对 `artifacts/design/page-adaptation-preview/verification.json`。390×844、360×640、844×390、1024×768 两页共八组合，所有可见控件完整且中心命中、文档 / app 不溢出；逐开首 / 末 / 第 2 卡及同卡关闭，展开 CTA 保持可达。筛选前后 activePlay 不变、CTA 才切，四人防守显隐 / 球与本方位移、播放 / 暂停 / 倍速 / 进度 / 步骤、旋转标签、讲解弹窗 / Escape、阵容边界说明、减少动效和两种外壳视图切换均通过；errors / remote 为空。

上述真实浏览器执行者为主控，reviewer 未重复运行 Chrome。独立证据为源码、Node / VM 夹具及静态图检；没有将浏览器通过归为本人设备或原生测试。

本任务不验证真实战术引擎、来源清除与保存协议、设备性能、WebView96 或物理手指操作；预览未修改生产 UI、存储、版本或 APK，不能据此宣称正式适配已实施。
