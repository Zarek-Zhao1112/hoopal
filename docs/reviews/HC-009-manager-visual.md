# HC-009 视觉更新独立审查

日期：2026-10-22，更新：2026-10-23。状态：1.6.1 木地板跟进独立审查完成，无未修复 P1 / P2；主控构建、设备升级与原数据保留检查完成，真机交互待人工验收。任务：[HC-009](../tasks/HC-009-manager-visual.md)，设计：[黑白橙视觉更新](../design/manager-visual.md)。以下 1.6.0 深色球场记录保留为历史，当前决定及跟进结论见末节。

## 计划与参考图

interaction_design 未参与实现。已只读核对设计、任务、AGENTS.md 和 `artifacts/design/manager-style-v2.png`。计划中的石墨黑 / 雾白 / 篮球橙、独立球员卡与深色演练球场符合参考方向；保留原有阵容、推荐、二十套战术及离线架构，没有发现范围冲突或额外用户审批。

参考图中的球场用于视觉讨论，不作为修改实际模板坐标、球权或战术职责的依据。效果图也不代替六屏可达性与导出检查。

## 实现审查

独立只读核对 `frontend/src/app.js`、`frontend/src/lineups/ui.js` / `styles.css`、主 `app.css`、`index.html`、Capacitor 配置及原生启动图标 / 启动画面引用与版本配置。没有发现可复现 P1 / P2，没有修改实现代码。

- 主球场、marker、路线、球员、篮球、库和推荐缩略图均使用显式 SVG 色值。PNG 仍在异步处理前截取步骤 / 标题 / SVG，canvas 使用显式深底与浅色标题。木纹移除，实际战术坐标、球权和插值逻辑未见外观改动引入的变化。
- `data-action`、`onAction` / `onInspect`、逐人配置与确认来源约定保留。HC-008 的 `sourceRoute` / `editorId` 草稿隔离、Escape 视图守卫及完整文本入口均保留。
- 4v4 卡片 DOM 始终包含四名队员；高手机使用 2×2，短手机保留四张单排卡。姓名与能力标签截短后仍可点击查看完整文本。布局的实际可达性另由主控 Chrome 几何检查留证，不能单凭源码中的 overflow 规则证明。
- 输入压缩使用受小屏断点限制的 `:has(input:focus)`，没有恢复普通按钮焦点触发整页压缩。阵容容器透明背景选择器优先级高于通用 `.panel`，避免白标题落入浅色底。
- 外观节点继续调用既有保存、推荐来源、后台等待与全名弹窗路径，未见存储键、仓库协议或旧个人数据清理范围变动。Capacitor 保持本地 `dist`、原 appId，无 `server.url`；包版本为 1.6.0 / code 7。

## 独立轻量夹具

使用真实 UI 模块及最小 DOM 事件夹具，未启动 Chrome：

- 枚举六项能力中最多三项擅长、最多两项不重叠弱项的全部 423 种合法组合，分别渲染 3v3 / 4v4，共 846 次、2961 张成员卡。核对 5922 个可见 chips：普通技能来自真实擅长，`弱·` 来自真实弱项，未标与一般提示没有虚构能力；5922 次点击均能读到原姓名及全部已选强弱项。
- 所有卡片中的 SVG 渐变 / clip 引用存在且 ID 无重复；渲染和点击未修改输入档案。
- 切到 4v4 第四名队员修改 emoji / 换行昵称，保存回调保留四人和原成员 ID；模拟保存失败后原输入仍在，已保存档案未被改写。
- 双向取消再次通过：放弃创建不丢已保留成员草稿；放弃成员编辑不丢已保留创建草稿。

这些夹具不模拟浏览器布局、触摸命中或原生文件系统。

## 本人实际图检

通过图片查看工具检查以下由主控生成的实际产物，而非再次运行 Chrome：

- `artifacts/qa/manager-roster-3v3-phone.png`、`lineup-profiles-phone.png`：三人独立卡及四人 2×2 卡均完整出现，球衣号、姓名、能力按钮可见；黑白橙与参考方向一致，没有木纹大背景。
- `artifacts/qa/lineup-configure-phone.png`、`lineup-recommend-phone.png`：配置 / 推荐主操作、分区切换和分页可见，文字在浅深背景上可读。
- `artifacts/qa/manager-play-390-844.png`、`manager-play-844-390.png`、`manager-play-1024-768.png`：竖屏、横屏和多栏演练中的深色球场、球员编号、路线、控制区与姓名图例均可见。
- `artifacts/qa/downloads-readonly-1792676745066/四人协防轮转.png`：实际导出第 1 步 PNG 的白色标题 / 界线、蓝方路线 / 编号及篮球均可见，未出现脱离网页 CSS 后的丢色。本人仅检查这张导出图片，不声称逐步检查所有 PNG。

## 主控验证与限制

主控报告 109 项单元 + 3 项 HTTP 集成通过，共 112 项；真实 Chrome 已完成二十套动画、只读 / 离线 / 导出、两种人数档案、推荐、草稿、六屏各子页、长姓名与输入焦点检查。另逐屏检查 4v4 的卡片、SVG、姓名和能力按钮几何边界。以上执行者为主 agent，不记为 reviewer 亲跑。

主控报告 1.6.0 / code 7 APK 构建、v2 签名、九个网页资源与 dist 逐个哈希比对通过，无远程开发服务器配置。

设备操作同样由主 agent 执行：`adb install -r` 返回 Success；force-stop 后冷启动返回 `LaunchState: COLD` / `Status: ok`，包管理器确认为 1.6.0 / code 7。主控查看 `artifacts/qa/device-1.6.0-ready.png`，已有一份用户 3v3 档案正常显示，没有写入假队员。

升级前后只读记录在 `artifacts/qa/hc009-device-before.json` / `hc009-device-after.json`。主控脚本 deepEqual 断言通过，原档案字节 SHA256 均为 `8dbcaca37b85e248edf1e2304731581a4deaa52f6a093035daecc70b24da965f`，内置选择均为 `62db0bd519d0171f23ca9e2246d08d11612ffa049e9988cc7e82490aaeba73ca`。这证明本次覆盖升级保留了既有数据，不代替新增 / 修改后的保存恢复验证。

reviewer 未启动共享 Chrome、构建 APK 或操作真机，也未亲自查看设备截图。真机触摸、输入法、返回键、旋转、分享接收及新增 / 修改后的保存恢复仍待用户人工操作；安装、冷启和静态截图不能替代这些功能验收。

## 2026-10-23：1.6.1 室内木地板跟进

用户最新要求只将战术球场改为室内木地板，取消深色地板；其他黑白橙界面保持。本段取代历史深色球场要求，不将 1.6.0 的配色选择记为本次缺陷。

独立只读核对新增 `frontend/src/board/appearance.js` 及主场、库缩略图、推荐预览的调用、球场容器底色和 1.6.1 / code 8 版本配置，未发现 P1 / P2。共享 palette 使用浅木色、深棕场线、深绿跑位 / 运球、棕橙传球、灰色掩护与蓝方路线；橙蓝队员与白色号码保持。改变局限于绘图和配色，未见对战术坐标 / 球权 / 动画、身份来源、后台保存或持久化键的改动。

`appendWoodSurface` 将 pattern、底色、板缝和纹理写在同一个 SVG 内，不依赖外部图片或页面 CSS。主场的 `court-wood`、各模板专属 `thumb-wood-*` 和唯一推荐预览 `lineup-preview-wood` 分开命名；原 SVG deep clone 包含对应 defs，PNG 的异步起点快照逻辑保持。

独立轻量夹具提取实际 `courtBase` / `draw` / `templateThumbnail` 和推荐预览函数：

- 遍历二十套内置战术共 112 帧，209 条实际可见路线的 stroke 与对应 marker stroke 均一致。
- 主场、全部二十张库缩略图及单个推荐预览的图案 / marker ID 不重名；各 SVG 的 `url(#...)` 均可在自身内部找到目标，没有外部图案、CSS 变量、currentColor 或 undefined 色值。
- 该夹具只检查真实绘图输出结构与引用，不模拟浏览器像素或原生系统；本次未重复未改动的 846 种阵容能力组合测试。

reviewer 通过图片工具亲自查看主控生成的 `artifacts/qa/wood-court-1.6.1-phone.png`、`wood-court-1.6.1-landscape.png`、`wood-court-1.6.1-recommend.png`、`wood-court-1.6.1-library.png` 和 `wood-court-1.6.1-export.png`。竖 / 横主场、库及推荐预览均已呈现木地板，其他界面保留黑白橙；实际导出 PNG 仍有板缝 / 木纹、场线、路线、编号、篮球和标题，未出现 clone 后纹理丢失。图检未见新增问题。

主控报告本轮 112 项自动检查与真实 Chrome 全回归通过。1.6.1 / code 8 APK 的 SHA256 为 `e8e45216a835463d20fdb98fd4eae3b6f2f40dff4107853e9648fbc2cb7c2635`，v2 签名、九个网页资源与 dist 的哈希比对及无 server.url 检查通过。

本轮设备操作由主 agent 执行：覆盖安装返回 Success，强制停止后冷启动为 `Status: ok` / `COLD`，包管理器确认 1.6.1 / code 8。升级前后仍有原用户一份档案；档案字节 SHA256 均为 `8dbcaca37b85e248edf1e2304731581a4deaa52f6a093035daecc70b24da965f`，内置选择均为 `a2d8bf76686cfc567ce5b131e66c2583098a1afae8ef8d5e51596c901ccb9e10`。主控脚本 deepEqual 断言通过，报告为 `artifacts/qa/hc009-1.6.1-device-before.json` / `hc009-1.6.1-device-after.json`。

主控亲自查看 `artifacts/qa/device-1.6.1-ready.png`：这是阵容页实际设备截图，只证明应用启动和原档案显示，不作为手机演练操作证据。reviewer 未查看该设备截图、启动共享 Chrome、构建 APK 或操作设备；真机输入法、返回键、旋转、分享、演练触摸及新增 / 修改后的保存恢复等原人工验收项目继续保留。
