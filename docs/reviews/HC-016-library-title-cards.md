# HC-016 战术库标题卡正式接入独立审查

日期：2026-10-23。状态：独立源码、夹具与实际截图图检通过，无剩余 P1 / P2；主控完整浏览器、APK 校验、新机覆盖安装 / 冷启与 WebView 96 标题浏览通过；原生 CTA / 物理操作等完整验收仍为 `awaiting_device`。任务：[HC-016](../tasks/HC-016-library-title-cards.md)，设计：[纵向标题卡](../design/stacked-library.md)。

## 范围与结论

interaction_design 未参与实现，只维护本审查文件。只读审查 `frontend/src/workspace/{library-deck-state.js,library-deck.js,library-deck.css}`、app / HTML / 主样式集成，以及沿用的 loadTemplate / lineup-session 来源保护路径。未运行 Chrome、adb 或构建。

默认不预选、不展示球场，标题只开 / 关单卡；换卡收回旧卡，筛选与重新进入库重置全收。catalogMode / catalogKind 与当前演练独立，标题 / 库筛选不调用加载或清来源。只有显式 CTA 交给原 loadTemplate 路径，成功后开始播放；卡片 pending 与外部 busy 分离，失败保留展开与重试。没有战术、档案或存储协议迁移。

## reviewer 独立夹具

夹具使用真实导出模块及最小 DOM / 定时器，不新增持久测试或改实现：

- 四个人数 / 攻防组共 20 卡，标题逐张开 / 再点关闭，onPlay 调用始终为 0；初始无 thumbnail，正文真实 hidden，开始按钮 disabled / tabIndex=-1，标题 aria-controls / aria-expanded 对应。所有卡可开，任一时刻最多一张正文可见。
- 同 ID 组 render 保留标题节点、展开 ID 和当前动画定时器，仅更新内容 / 当前来源标记 / busy。关闭时若焦点在正文内，回到该标题；外部 busy、内部 pending 都阻止换卡与播放。重复 CTA 在途只调用一次，false / 抛错均保卡可重试，恢复成功正常结束。
- reset / 组变全收、resize 保展开并重算、减少动态效果 transition:none，以及跨组返回同一 ID 只生成一份缓存 thumbnail 均通过。模拟 DOM 不代替实际 SVG 命中、焦点遍历或读屏引擎。
- 八组区域尺寸 × 4 / 6 卡 × 所有合法选中 / 全收状态，共 96 个纯布局，条目边界、非负尺寸、互不重叠通过。常规 340×367 的六卡开合仍有 40px 标题与约 102px 正文；338×300 极限允许标题缩至约 29.83px，不能将布局有界称为该极限仍有 40px 触摸尺寸，真实图 / CTA 可达以浏览器为准。
- 另提取实际 app loadTemplate 与传给组件的 onPlay，连接真实 createLineupSession、真实卡片组件及失败注入的 repository：清来源保存失败时，原 Play、activeTemplateId、进度、playbackContext、展开卡不变，不导航 / 不 start；恢复写入后重试，一次 load、一次 persist、一次导航 / start，来源清空，双击没有第二次加载。周边绘图 / 导航 / 磁盘由夹具模拟，不作为完整 app 或真实设备运行。

## 图检与主控浏览器证据

reviewer 亲看 `artifacts/qa/hc016-library-collapsed.png` 与 `hc016-library-expanded.png`：默认六张仅标题，展开首卡时完整木球场、说明和开始演练入口可见，其余标题保留；顶部人数 / 攻防与底部玻璃导航清楚。实际使用现有 SVG thumbnail，不把初始站位缩略图当作完整战术回放。图片只证明静态状态。

root 执行并报告 140 项单元与 3 项 HTTP，共 143 项通过，及最终完整 Chrome：四组 20 卡浏览前后当前来源 / 标题 / 选择原文 / 档案原文不变；同卡、换卡、快速点击、重入 / 筛选 reset、reduced-motion，六尺寸标题 / CTA / 导航几何与实际中心命中通过。真实 CTA 双击只载入一次并自动播放。

root 的 lineup-flow 还验证真实推荐同 ID → 仅浏览保来源 → 清来源写失败留在 library、卡仍展开且不播放 → 恢复写入再试清来源并播放。原 20 套动画、NBA / 档案 / 两人数、locker 触摸、离线 / 导出、六屏与 18 组柔光转场回归通过。reviewer 只读核对 `artifacts/qa/hc016-library-metrics.json`，未另开浏览器。

## APK / 设备与限制

以下由 root 执行并报告，reviewer 未构建、安装、运行浏览器 / adb 或亲看本轮设备截图，仅只读核对 JSON：

- Android 1.11.0 / code13 构建、v2 签名、27 个 dist / APK 资源逐项哈希一致与无 server.url 检查通过。APK SHA-256：`a405b97988cb9f05ca1afbb6088044ba82f6d99eb1c00b2658e92cb280e142b6`。
- 仅指定新机 ef473680 install -r 返回 Success，冷启为 `Status: ok` / `LaunchState: COLD`。reviewer 核对 `artifacts/qa/hc016-device-before.json` / `hc016-device-after.json`：同设备、原有文件存在且均 1 份档案，前后 SHA-256 均为 `c625afadf07cfc09ccccf552e3b5dff77e66ca072d53c4dc9c497166a9759758`；after 版本 1.11.0 / code13、foregroundVerified。另核对 `hc016-data-after-preview.json`，原生浏览后仍同一档案数与哈希。
- reviewer 核对 `hc016-native-library.json`：真实 WebView 96 程序 DOM 标题点击，初始 expanded 为空 / 6 标题 / 0 正文，开 pick-roll 为 1 正文、换 give-go 仍仅 1 正文、同卡再点回 0 正文；结尾仍在 library、全部收起。root 另报告标题与可见 CTA 中心命中、当前来源未变，亲看 `hc016-native-library.png` 为全收起状态。
- 首次原生辅助检查因非前台保护退出；重新打开本应用到前台后完成上述成功检查。后续复拍再次因前台保护退出，未捕获其他 app，不把这些退出尝试记为通过；档案保留另外以只读哈希核对。

原生检查仅浏览标题，没有执行原生 CTA，以保持真实推荐资料不变；不代表手机加载 / 播放成功或物理手指 / 帧率验收。当前无待修 P1 / P2，完整原生 CTA、物理触摸、输入法、旋转、系统返回与分享仍待验收，任务保留 `awaiting_device`。Node / 桌面 Chrome / 截图、设备程序点击与手指操作分别记录，不互相替代。
