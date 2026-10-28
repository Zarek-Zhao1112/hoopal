# HC-016 · 战术库标题卡正式接入

- 日期：2026-10-23；状态：`awaiting_device`（正式实现、审查、自动验证、安装与原生程序浏览通过；完整物理/原生CTA待验）。
- 授权：用户确认HC-015最新预览。正式接入默认全部标题收起、去统一按钮、点单卡开/再点收/换卡收旧卡；按既有偏好更新指定新机ef473680。
- 设计：[纵向标题卡](../design/stacked-library.md)。不改20套战术、存储/推荐/队员协议。预览不加载战术；仅「开始演练」调用现有成功清来源→载入→切页路径。

## 分工与接口

| 负责人 | 独占文件 | 职责 |
| --- | --- | --- |
| engine | workspace/library-deck-state.js、tests/unit/library-deck.test.mjs | 纯布局layoutLibraryDeck({width,height,count,selected=-1})，返回strip/gap/wide/compact/entries[{x,y,width,height}]；支持六/四卡与窄高/横屏，所有条目在区域内 |
| ui | workspace/library-deck.js、library-deck.css | createLibraryDeck({root,makeThumbnail,onPlay})，render({templates,activeTemplateId,busy})/setBusy(bool)/reset()/refreshLayout()和expandedId getter；全部默认收起、单卡标题始终可点，内容隐藏/焦点隔离、减少动效、快切/旋转稳定 |
| 主控 | app.js、index.html、app.css导入、版本/E2E/任务/APK/设备 | 接现有真实木地板thumbnail和loadTemplate成功路径；进入库/筛选重置，浏览不写来源；检查和指定新机数据保留 |
| interaction_design | docs/reviews/HC-016-library-title-cards.md | 未实现代码的独立审查，重点浏览/播放边界、数据失败保护、开合/焦点/尺寸与截图 |

UI以article.library-card为卡、button.library-card-heading[data-template-id]为标题，button.library-card-play[data-play-template]为演练。root.dataset.expandedId为空代表全收起；只保留合法选中ID。render相同ID组不重建/不复位开合（播放和重绘会调用）；组变化/reset回到全收起。setBusy只禁标题/CTA不改持久化；渲染真实textContent。makeThumbnail(template)返回已有SVG，每个ID只一份，隐藏内容真实hidden且无焦点。用户点标题不调onPlay；CTA捕获template.id，异步成功才导航，失败保留卡。布局和动画无DOM新API依赖，WebView96回退vh/ResizeObserver/matchMedia。正式页面无全局开关、无个人战术和模板分页；四/六卡全部可达。

## 验收

- [x] 纯布局边界和DOM开合/同卡/换卡/默认/筛选/重入、快速点击/减少动效、六尺寸真实标题与CTA命中。
- [x] 浏览不改变真实战术/来源/进度，开始演练沿用来源解除失败保护，所有20套与档案/NBA/手势/导出/离线/600ms页面转场回归。
- [x] 独立审查；APK版本/签名/资源与dist一致，无server.url。
- [x] 指定新机更新冷启、现有档案升级前后字节保持；真实WebView程序标题开合/换卡检查。
- [ ] 真机物理手指、原生CTA/播放、旋转/返回/分享等完整验收；程序点击与桌面播放证据不替代。

## 集成与证据

engine交付纯布局与6项有意义边界测试，ui交付DOM组件/CSS，主控接app/HTML及原有来源保护路径。库页catalogMode与实际Play.mode分开，筛选只浏览；标题默认全部收起、无统一按钮/旧分页，CTA捕获ID且防重复，源解除失败保留卡和旧演练，成功载入后自动播放。桌面库独占页面，演练移除原左库占位；600ms柔光、柜位左拖下一位、NBA与存储协议保留。

140单元+3HTTP共143检查、Vite与Gradle构建通过。完整真实Chrome通过：四组共20标题逐项预览、同卡/换卡、筛选/reset/重入/快切/减少动效；六屏18状态卡片与CTA/nav中心命中和页面边界；浏览前后source/title/进度/档案原文字节一致；真实CTA双击只载一次且开始动画。推荐同ID的清来源故障注入保证不导航/不播放/保旧context和开卡，修复写入后重试成功。原20套/NBA/档案/推荐/手势/重启/导出/离线与18次主页面柔光回归通过。`artifacts/qa/hc016-library-{collapsed,expanded}.png`、`hc016-library-metrics.json`、`hc016-motion-metrics.json`为本轮证据。

独立审查无未修P1/P2，reviewer执行实际组件、纯布局和抽取真实app+lineupSession的故障链夹具、亲看实际两张Chrome图，详见[审查记录](../reviews/HC-016-library-title-cards.md)。

1.11.0/code13 APK位于 `artifacts/apk/halfcourt-debug.apk`，v2签名通过，27网页资源与dist逐个SHA256相同，无server.url。APK SHA256：`a405b97988cb9f05ca1afbb6088044ba82f6d99eb1c00b2658e92cb280e142b6`。

重新核对设备后仅更新ef473680；install-r Success，冷启Status:ok/COLD，版本与进程核对正常。原1份真实阵容文件升级前/后及程序浏览后均为 `c625afadf07cfc09ccccf552e3b5dff77e66ca072d53c4dc9c497166a9759758`，未写测试队员。证据 `hc016-device-before.json` / `hc016-device-after.json` / `hc016-data-after-preview.json`。

实际Android12/WebView96程序DOM点击通过：默认全部正文隐藏、展开第一张/换第二张/再点收起，始终最多一正文，所有可见标题/CTA中心命中，实际source未变。主控图检 `hc016-native-library.png`，报告 `hc016-native-library.json`。未执行原生CTA以避免改用户推荐引用；实际播放与故障证据来自Chrome。手机不在本应用前台时，检查保护退出，不抓其他应用；重开自家应用后程序验证通过，后续前台变更只读核对文件。未模拟硬件触摸或声称手机FPS，完整设备待办保留。

本次Chrome临时profile/服务已清理，原生CDP连接与forward已关闭。HC-014旧同名QA文件曾被本次通用回归刷新；本轮另存HC-016文件，历史数值以既有任务/审查文字为准，不把新版截图冒充旧版实测。
