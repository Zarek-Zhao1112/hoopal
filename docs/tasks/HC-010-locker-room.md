# HC-010 冰川蓝更衣室与玻璃导航

日期：2026-10-23。状态：`awaiting_device`。设计：[更衣室](../design/locker-room.md)。审查：[独立记录](../reviews/HC-010-locker-room.md)。用户已确认更衣室单人视角、场景跟随滑动、冰川蓝/银灰/浅枫木与玻璃导航效果图。

用户中途更换手机并明确后续安装使用新机。已识别唯一连接设备 M2101K9C / `ef473680`，后续构建安装核对此目标，不再使用旧手机序列号。

| 负责人 | 独占文件 | 交付 |
| --- | --- | --- |
| 主 agent | app.css、index.html、版本/原生配色、文档、E2E | 全局蓝银主题、玻璃导航、安全区、集成/验证/安装 |
| ui | frontend/src/lineups/ui.js、styles.css、必要新场景模块 | 连续柜位、逐人切换、详情/配置同步、阵容全部子页 |
| engine | frontend/src/app.js、board/appearance.js | 木地板/蓝银油漆区与棋子厚度阴影，缩略图/PNG一致 |
| interaction_design | docs/reviews/HC-010-locker-room.md | 非作者独立审查与复验 |

接口和无迁移边界见设计；一文件一写入者。视觉更改不得破坏档案/草稿/推荐来源。

- [x] 确认图和边界记录。
- [x] 更衣室与左右切换、详情/配置、全局主题、演练和玻璃导航实现。
- [x] 触摸/边界/两人数/保存恢复与六屏回归、导出/离线。
- [x] 独立审查和必要修复。
- [x] APK 构建/核对、新手机首次安装与版本/启动检查（新机此前无本应用，不作旧机数据迁移声明）。
- [ ] 真机手势、输入法、旋转和分享等人工交互验收。

## 实现与验证

ui 新增 `lineups/locker-room.js`，连续柜位、墙面、衣架、蓝白布纹球衣、长凳与地面随一条轨道平移。右滑下一位、左滑返回；按钮/圆点可替代手势。成员 ID 按档案 ID 隔离记忆，详情与配置跟当前成员，切换不写盘。所有场景均为本地 HTML/CSS/SVG；无档案时显示装饰空柜，不虚构队员。

主 agent 实现蓝银主题、玻璃导航、可读回退、原生启动/系统栏颜色与版本。engine 同步细木地板、蓝灰油漆区、白线衬线与厚棋子，PNG 使用浅蓝银底与深蓝标题，保持真实坐标与原始职责号。

109 单元 + 3 HTTP 检查共 112 项通过。最终真实 Chrome 覆盖二十套动画、只读/离线/PNG/JSON、两人数创建配置、推荐/身份/重启、故障注入与草稿/取消隔离；新增真实 touch 的右/左滑、纵向拒绝、取消、首尾、配置同人、跨档案焦点记忆、查看时磁盘不变和 reduced-motion。360×640、390×844、844×390、1024×768、1280×800、1440×900 的三视图、配置/推荐四分区、长姓名/emoji、低高度 input 焦点全部通过；可见启用控件中心的 elementFromPoint 命中检查通过，玻璃导航没有遮挡其他操作。

为避免过渡帧成为交付图，拍摄等待 380ms；六屏静止柜位中心误差 <=2px 断言通过。代表截图为 `artifacts/qa/locker-1.7.0-3v3-phone.png`、`locker-1.7.0-4v4-phone.png`、`locker-1.7.0-small-phone.png`、`locker-1.7.0-landscape.png`、`locker-1.7.0-play-phone.png`、`locker-1.7.0-play-tablet.png` 与实际导出 `locker-1.7.0-export.png`。

独立 reviewer 未编写实现，检查 34 组手势事件、15 项 UI 状态/焦点/配色夹具，20 套 112 帧的 209 条可见路线/marker、788 个正面棋子坐标/半径及自包含 SVG 引用；CSS AST 核对全部 5 处 dvh 的 vh 回退、无 :has 残留。另亲看截图与实际 PNG，未启动共享 Chrome 或操作设备。两项 P2 已修复并独立复验：触摸子节点 lostpointercapture 冒泡误取消拖动；队伍颜色选择失去可见效果。后者恢复队徽细边和球衣小胸标三色，主体蓝银保持。

## 新手机与 APK

新手机 M2101K9C / `ef473680`，API31 / 实际 WebView 96.0.4664.104。兼容采用 vh 回退、实际输入焦点类、屏外柜位 aria-hidden/真实禁用/tabIndex 隔离，不依赖仅 :has 或 inert。

1.7.0 / code 9 Gradle assembleDebug、APK v2 签名通过，包名 `com.halfcourt.tactics`，min API24 / target API36。九个 dist 资源逐个与 APK 资源 SHA256 一致，无 server.url。`artifacts/apk/halfcourt-debug.apk` SHA256 `0b7ff582b51766b418b9badb33102318aecdf1141a6d3a5da5175f9e95205877`。

新机 USB 自动安装被系统以 INSTALL_FAILED_USER_RESTRICTED 拒绝；未更改安全策略。已正常传至 `/sdcard/Download/halfcourt-1.7.0.apk`，用户随后确认在文件管理完成安装。主 agent 核对 pm path、1.7.0 / code 9；force-stop 后冷启动 Status: ok / COLD，进程存在。再次打开并确认前台归属、等待系统动画后，保存/查看 `artifacts/qa/device-1.7.0-new-phone.png`：0 份档案、空柜和玻璃导航正常，未写测试队员。

旧机数据未迁移，新机首次安装无升级前后档案哈希比较。真实滑动、创建保存/恢复、输入法、旋转及分享接收仍待用户实际使用确认，任务保持 awaiting_device；安装/静态截图不替代完整原生交互验收。后续安装遵循用户最新指示，仅使用新手机并先核对连接。
