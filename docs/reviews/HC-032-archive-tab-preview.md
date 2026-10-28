# HC-032 · 档案独立底栏预览审查

- 日期：2026-10-26；状态：`completed`（独立预览审查）。
- 审查者：interaction_design，未参与本轮实现。结论：未发现需修复的 P1 / P2，可交付效果图与可点预览。
- 范围：[任务](../tasks/HC-032-archive-tab-preview.md)所列独立预览；不代表正式四栏导航、档案 CRUD 或真机功能已实现。

## 独立源码与数据核对

只读检查了 [index.html](../../artifacts/design/archive-tab-preview/index.html)、[preview.js](../../artifacts/design/archive-tab-preview/preview.js)、[preview.css](../../artifacts/design/archive-tab-preview/preview.css)、[overview.html](../../artifacts/design/archive-tab-preview/overview.html)、[build-data.mjs](../../artifacts/design/archive-tab-preview/build-data.mjs) 与生成的 data.js。

- `preview.js:22,30–32`：选队和管理是同一 article 内的两个独立 button，没有按钮嵌套；事件按各自 action 分流。管理打开原生模态 dialog，不调用选队；关闭、Escape 和遮罩路径汇入 `closeMenu`，返回仍连接的原管理按钮。管理菜单的配置 / 改名 / 删除只提示，不修改示例。
- `preview.js:19,21,24–28`：球队身份、成员、柜位铭牌、球衣和当前标记统一来自 active；选队同时重置成员索引并进入更衣室。四导航独立切 view，品牌仅在更衣室显示；CSS 显式将导航固定在第三网格行，隐藏品牌不会把档案页顶部留白挤掉。
- `preview.js:5,22,30`：默认三个示例；`many=1` 为六个不同 ID，真实按三项切两页，分页只改 page，不替换当前球队。创建 / 配置 / 推荐均明确说明预览边界；训练场与库也直接说明未接真实战术或推荐来源。
- 独立 Node 只读解包 data.js，确认六队成员 ID 按档案隔离、人数为 3 / 4；生成内容包含与正式 `jersey.js` 去 export 后完全一致的球衣函数。构建脚本读取本地目录与 NBA 数据，预览运行不导入业务存储。未发现 Storage、远程请求或真实保存调用。

## 独立图检

亲看最终 [三屏总览](../../artifacts/design/archive-tab-preview/overview.png)、[档案页](../../artifacts/design/archive-tab-preview/archives.png)、[BOS 更衣室](../../artifacts/design/archive-tab-preview/locker-bos.png)。三卡、创建入口和四项底栏完整；档案页顶部留白与两侧主卡起线一致。BOS 的队徽、四人标记、当前球队、成员编号与绿色 BOSTON 球衣一致。图中管理按钮和选队内容区分明确，没有遮住成员概览。

## 主控执行证据核对

读取并汇总最终 [verification.json](../../artifacts/design/archive-tab-preview/verification.json)：42 组布局包含 390×844、360×640、844×390、1024×768；报告内整页溢出、控件中心命中失败及 Storage 调用均为零。四尺寸交互记录均显示选择 BOS 后进入其四人更衣室；另外包含更多示例第二页及减少动效状态，errors / remote 均为空，七项正式基线哈希保持。

主控实际 Chrome 还检查了菜单不误切队、Escape / 当前标记 / 队员切换、四视图品牌和卡片起线、底栏落位与本地图片加载。上述浏览器操作由主控执行，审查者核对源码、报告和静图，没有另行运行 Chrome。

## 问题与限制

无未修 P1 / P2，本轮未要求实现修改。审查未运行 Chrome、构建、ADB 或设备操作；静图不证明手机触摸手感。真实档案的创建、改名、删除、来源清除、保存失败重试与正式四栏导航仍不属于本次预览，不能用这份结果替代后续正式接入验收。正式 1.18.0 / APK 保持不变，本轮无需设备安装。
