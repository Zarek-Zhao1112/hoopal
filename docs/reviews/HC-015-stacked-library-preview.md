# HC-015 战术库纵向叠卡预览独立审查

日期：2026-10-23。当前状态：默认全部标题收起的新版源码、独立状态夹具与最终图检通过，主控真实 Chrome 复验通过，无剩余 P1 / P2。以下 v1 记录为历史，末节为当前授权与审查结论。仅设计预览，不表示正式应用已接入。任务：[HC-015](../tasks/HC-015-stacked-library-preview.md)。

范围仅 `artifacts/design/stacked-library-preview/index.html` 设计预览；interaction_design 未参与实现，不改正式应用、存储、战术数据或 APK，只维护本审查文档，未运行 Chrome / adb / 构建。

## v1 独立证据（历史）

本节描述 v1 审查当时的实现与图片；旧 HTML 另存 v1-stack.html，部分同名 PNG 已被新版输出覆盖，当前视觉以末节为准。

只读审查实际 HTML / CSS / inline script，并在内联 Node VM 中执行真实脚本，使用最小 DOM / 模拟 stage 尺寸与定时器：

- 3v3 / 4v4 × 进攻 / 防守共四组，分别 6 / 4 张，共 20 卡全部选中检查通过；标题逐项对应现有 templates 目录，选卡不写存储。
- 展开六卡延迟依次 0 / 35 / 70 / 105 / 140 / 175ms，收回为相反顺序；选中卡收叠后 z-index 30，其他标题与开始按钮按实际可见性禁用 / 移出 tab 序列，展开时全部标题可选。
- 快速展开 / 收回 / 选卡、旧定时回调 token 保护、切分类 / 人数重建并归零、reduced-motion 时 transition:none 均通过。开始与导航仅显示明确的设计预览提示，未假装连接正式播放。
- 实际脚本没有 localStorage / sessionStorage / indexedDB 或 fetch / XMLHttpRequest / WebSocket 调用。对比模式 iframe 仅引用同一离线 HTML 的本地查询参数。

最终叠层 / CSS 调整后，上述实际脚本夹具重新执行通过。夹具不执行真实 CSS 尺寸、视觉堆叠、hit test 或动画，不能作为一屏可达 / 可读性证据；对应部分由主控真实 Chrome 与下面图检补充。

## 问题与修复

P2：普通 URL 的横屏 / 低高度外框。初版 `.device` 固定 408×862、body padding 28；一屏覆盖主要在 max-width:700px 与 frame 模式，横屏规则只改内部 grid，普通 `index.html` 在 844×390 / 1024×768 会超过可用高度，且 stage 宽度不足以进入 JS 横向分支。reviewer 源码审查发现并向 root / ui 指出不能只测 `?frame=1`。

ui 在 `index.html:20` 新增宽 ≥701px / 高 ≤950px 的非 compare、非 frame 单预览满屏规则，移除固定手机外框 / body padding / 侧说明，保留 vh → dvh 回退。reviewer 复核源码；root 最终真实 Chrome 补测普通 URL 五尺寸，document 均等于 viewport，844×390 / 1024×768 不再滚动。该 P2 已修复并复验，浏览器执行者为 root。

主控另在初版图检发现卡边仅约 1.75px、容易像单卡阴影；ui 将收叠步距改为 16px、每层缩放 .02、预留 48px、完整卡高度至多 480px。reviewer 亲看最终 stacked.png：完整封面后可辨三层卡边，已明显区别于单卡阴影。主控实际几何记录选中索引 2 收回为最高封面，后三层底边分别露出约 6.4 / 12.8 / 19.2px。

## 最终图检与主控证据

reviewer 亲看同目录 `comparison.png`、`stacked.png`、`expanded.png`、`selected.png`：收叠有完整球场与开始入口，展开六张标题可辨，选第三张后其球场完整、其余标题保留；固定玻璃导航和展开 / 收回入口清楚。球场是标明的静态站位示意，不将标题对应的说明与初始站位当作完整动画。图片只证明静态视觉，不能证明逐张动效的实际时间顺序。

root 执行实际 Chrome 按钮 / 快速操作、选卡置顶、四个人数分类组、reduced-motion、展开标题边界与中心 elementFromPoint 命中。reviewer 读取 `verification.json`：frame 和普通默认 URL 在 360×640、390×844、844×390、1024×768、1280×800 均 document=viewport；frame 展开六标题均在边界内且中心命中，errors / network 均空。浏览器由 root 执行，reviewer 未另开 Chrome。

在本轮设计预览范围内无剩余 P1 / P2。未做 APK / 真机验收，也未接入正式页面或存储；触屏设备实操、正式战术播放与未来正式整合的性能 / 状态迁移不在此次预览通过结论内。

## 用户变更：默认全部标题收起（当前方案）

用户最新明确要求覆盖 v1：默认不预选、不显示球场，去掉统一展开 / 收起按钮；点一张展开，同卡再点收回，换卡自动收回前卡，顺序保持稳定。原完整封面、选卡收回置顶与统一按钮不再作为当前验收标准；旧文件 `v1-stack.html` 仅为历史。主控修改预览，reviewer 未参与实现。

reviewer 只读新 HTML / 设计，并以实际 inline script 运行独立最小 DOM / 定时器夹具：四个人数 / 攻防组共 20 卡逐一开 / 再点关闭；默认 selected=-1、expanded=false、全部 card-body.hidden=true，真实 hidden 子树不参与页面展示或读屏；标题始终 enabled / tabIndex=0，aria-expanded 与开合一致，隐藏的开始按钮 disabled / tabIndex=-1，卡片本身不设 aria-hidden，保留标题可读性。

换卡时前卡 body 立即 hidden，任一时刻最多一张 body 可见；每组 50 次快速点击、切回同类别仍重置 -1、减少动态效果、resize 保留当前展开、程序收回均通过。源 HTML 没有统一按钮，仍无存储 / 网络 API。该夹具不能模拟真实焦点遍历、读屏引擎、几何 / 命中或动画视觉。

reviewer 亲看更新的 all-collapsed.png、comparison.png、expanded.png、selected.png：默认六张仅标题、没有预选球场或统一按钮；点开第一张 / 第三张的比较画面均只有当前卡展示完整球场、说明与演练入口，其余标题和顺序保留，底部玻璃导航清楚固定，符合最新用户要求。只把静态图作为视觉证据，不宣称亲自运行真实浏览器交互。

root 报告真实标题按钮验证：默认 selected=-1 / 无 active / 全 body hidden / 无 deck-toggle；点 0 展开、点 2 只开 2、再点 2 全收，快速 0 / 2 / 2 / 4 最终为 4；四组筛选均重置 -1。最新 verification.json 的 variant 明确为默认全部标题收起，无统一开关；frame 与普通默认链接五尺寸均 document=viewport，六标题边界 / 中心命中、reduced-motion、errors / network 为空，均由 root 执行并报告，reviewer 只读核对记录。

新版预览无剩余 P1 / P2，可作为当前交付；v1 的统一开关 / 封面置顶不再是需求，也不作为新版通过条件。正式应用、存储、APK 未改，真实设备读屏 / 触控与未来正式接入不在本次结论内。
