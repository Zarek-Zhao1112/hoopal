# HC-009 石墨黑、雾白与篮球橙视觉更新

日期：2026-10-22，更新：2026-10-23。状态：`awaiting_device`。设计：[视觉更新](../design/manager-visual.md)。审查：[独立审查](../reviews/HC-009-manager-visual.md)。

2026-10-23 用户调整：战术球场改为室内木地板，不使用黑色；界面和球员卡继续黑白橙。主 agent 实现共享 SVG 木地板外观并同步主球场、库/推荐缩略图、PNG 与 CSS 容器；不改战术/存储/布局。作为 HC-009 的 1.6.1 / code 8 小范围跟进，独立 reviewer 只读核对；构建和相关浏览器回归后更新设备。

用户确认 `manager-style-v2.png`，本次将效果图落实到现有前端；保持内置战术、档案与推荐功能和离线架构，适配手机竖横屏及平板。

## 文件负责人与接口

| 负责人 | 独占修改范围 | 约束 |
| --- | --- | --- |
| 主 agent | app.css、index.html、Capacitor / 原生图标配色、版本、文档、构建与集成 | 统一主题、导航、库/演练布局与六屏验证 |
| ui | frontend/src/lineups/ui.js、styles.css | 阵容卡、球衣、配置与推荐外观；保留 data-action/草稿/回调 |
| engine | frontend/src/app.js | 仅 SVG/导出/缩略图绘制外观；不改功能与数据 |
| interaction_design | docs/reviews/HC-009-manager-visual.md | 独立只读审查实现；不参与实现代码 |

各人交还文件后再集成修复，避免并发覆盖。

## 交付清单

- [x] 视觉方向与效果图已确认，编码前记录边界与分工。
- [x] 统一配色、阵容卡、球员配置、推荐、战术库与深色演练球场。
- [x] 六屏真实 Chrome 回归、两种人数、长文本、导出和离线动画检查。
- [x] 独立审查闭环及合适的自动检查。
- [x] APK 构建、资源/签名核对；有设备时安装和实际截图。
- [ ] 真机触摸、输入法、旋转与系统分享验收，保留未验项目。

## 实现与验证结果

主 agent 统一全局配色、导航图标与橙色选中标记、库/演练/弹窗、启动图标和背景。ui 重写阵容 CSS、原生 SVG 黑白球衣、队员独立卡片与两项实际能力标签，保留完整查看和配置分区；4v4 高手机使用 2×2，短手机保留四张横排。engine 同步主场、路线、缩略图与 PNG 页头显式色值，不依赖网页 CSS 导出。

109 项单元 + 新构建后 3 项 HTTP 集成通过，共 112 项。最终 Vite 的真实 Chrome 覆盖二十套动画、只读球场、断网播放、PNG/JSON、两人数创建配置、草稿/取消、推荐来源/重启与写失败、长文本/emoji、输入焦点和 Escape。六尺寸为 360×640、390×844、844×390、1024×768、1280×800、1440×900；三视图、配置四分区、推荐四分区逐页检查。新增逐屏 4v4 卡片中的球衣、姓名及能力按钮边界检查全部通过。无运行时异常或远程资源请求。

独立 reviewer 未实现本轮代码，只读审查源码、真实截图与实际导出 PNG；另以轻量夹具检查全部 423 种合法强弱组合在两模式的渲染，共 846 次、2961 卡和 5922 chips/点击，验证标签真值、完整查看、成员 ID、失败保留与双向草稿隔离。未发现未修复 P1/P2；其图检与夹具不记作亲跑 Chrome/设备。

实际截图：`artifacts/qa/manager-roster-3v3-phone.png`、`lineup-profiles-phone.png`、`lineup-configure-phone.png`、`lineup-recommend-phone.png`，以及 `manager-play-{宽}-{高}.png`、`manager-library-{宽}-{高}.png`、`manager-roster-4v4-{宽}-{高}.png` 六尺寸组。已人工查看竖/横/平板代表图及 `downloads-readonly-1792676745066/四人协防轮转.png`，导出深底、标题、白线、蓝方路线和编号均可见。

## APK 与设备升级

1.6.0 / code 7 Gradle assembleDebug 成功，APK v2 签名有效，包名不变，min API 24 / target API 36。九个 `dist` 资源逐个与 APK 内资源 SHA256 相同，无 server.url。产物 `artifacts/apk/halfcourt-debug.apk`，SHA256 `c8e87305edd133d9634b0e67fcd1544bc7655fe932cd8866e2a5c1c3e82333b9`。

手机 USB 覆盖安装返回 Success，包管理器确认版本，强制停止后冷启动返回 Status: ok / COLD。`artifacts/qa/device-1.6.0-ready.png` 为实际手机截图：用户原有 1 份 3v3 档案显示于新卡片，未添加测试队员。

只读比较升级前/冷启动后两个文件：档案 SHA256 均为 `8dbcaca37b85e248edf1e2304731581a4deaa52f6a093035daecc70b24da965f`，内置选择均为 `62db0bd519d0171f23ca9e2246d08d11612ffa049e9988cc7e82490aaeba73ca`，逐字节保持。报告位于 `artifacts/qa/hc009-device-before.json` / `hc009-device-after.json`，仅含哈希和数量，无队员原文。

完整真机点击/保存、输入法、返回键、旋转和分享接收尚未自动操作，和 HC-001/005/008 原待办一起保留。本次已安装和静态运行截图不替代这些验收，任务因此保持 `awaiting_device`。

## 2026-10-23 木地板跟进（1.6.1）

主 agent 新增 `frontend/src/board/appearance.js`，统一木地板 SVG pattern 与外观色；主场、库/推荐预览均使用本地自包含定义，导出 PNG 可携带板缝和轻微木纹。场线深棕，跑位深绿、传球棕橙、掩护灰、防守深蓝；球员保持橙蓝与白号。界面、球员卡、动画/坐标、档案和存储协议未变。

112 项单元/HTTP 与最终六屏真实 Chrome 回归再次通过，包含原有二十套动画、导出、档案/推荐、草稿和长文本等。独立 reviewer 只读审查并检查 20 套全部 112 帧的 209 条可见路线颜色/marker 一致、各 SVG 图案与引用自包含、主场/20 缩略图/推荐图 ID 无重复，另实际查看五张木地板版本图，无未修复 P1/P2。本次未重复未改动的能力组合枚举。

版本截图独立保存在 `artifacts/qa/wood-court-1.6.1-phone.png`、`wood-court-1.6.1-landscape.png`、`wood-court-1.6.1-library.png`、`wood-court-1.6.1-recommend.png`、`wood-court-1.6.1-export.png`；通用 QA 截图文件随最新回归更新，1.6.0 安装截图仍独立保留。

1.6.1 / code 8 APK 构建、v2 签名、九个 dist 资源逐个哈希一致及无 server.url 均通过；APK SHA256 `e8e45216a835463d20fdb98fd4eae3b6f2f40dff4107853e9648fbc2cb7c2635`。USB 覆盖安装 Success、冷启动 Status: ok / COLD，包管理器版本正确；`device-1.6.1-ready.png` 为实际启动的阵容页截图，不作为手机演练点击证据。

本次升级前后只读比对原 1 份档案 SHA256 均为 `8dbcaca37b85e248edf1e2304731581a4deaa52f6a093035daecc70b24da965f`，内置选择均为 `a2d8bf76686cfc567ce5b131e66c2583098a1afae8ef8d5e51596c901ccb9e10`；两个文件逐字节保持。报告为 `hc009-1.6.1-device-before.json` / `hc009-1.6.1-device-after.json`。未添加测试档案，原真机交互待办继续保留。

