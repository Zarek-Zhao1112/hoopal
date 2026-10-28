# HC-017 批准头像 App 图标独立审查

日期：2026-10-23。状态：`completed`。独立源码、图标资产与图检通过，无剩余 P1 / P2；主控 APK 校验、指定新机覆盖安装 / 冷启、数据保留与真实 launcher 显示已完成。仅收口本轮图标替换，旧业务任务的设备验收状态不变。任务：[HC-017](../tasks/HC-017-curry-app-icon.md)。

## 范围与结论

interaction_design 未参与图标生成或实现，仅维护本审查文件。已只读审查批准母版、`scripts/generate-app-icons.ps1`、15 份 Android PNG / 网页图标、Android Manifest / 图标 XML / styles / 色值、Capacitor 背景与 favicon 引用。未运行 Chrome、adb 或构建，也未重绘角色。

母版为 1254×1254，独立核对 SHA-256：`92f00107b9a45174dc425f56306eebea68dda326af70bd6f5c6138f8815a0bb3`。脚本先锁定母版哈希，只作确定性缩放、技术留白与遮罩，生成结束再查母版不变；无业务 / 存储或包名迁移。

## 独立资产与图检证据

reviewer 亲看母版与 `artifacts/design/app-icon/contact-sheet.png`：卷发、眉眼、胡须与微笑保持批准形象，圆形 / 圆角及 48px / 32px 示例五官可辨，核心眼睛与嘴巴没有被裁切；外围肩部可随遮罩裁掉。接触表由实际前景中央区域生成，不是设备或真实 launcher 截图。

独立内联 Node PNG 解码器读取实际文件、解压并还原扫描线，不调用生成脚本、不写资源：

- 传统 / 圆形五密度尺寸分别为 48 / 72 / 96 / 144 / 192；前景为 108 / 162 / 216 / 324 / 432；网页图标为 256。16 份 PNG 的实际尺寸与逐文件 SHA-256 均匹配交付清单，并另与固定期望密度表核对。
- 五份圆形 PNG 四角 alpha=0、中心=255，边缘均有 0–255 之间的抗锯齿像素；其他 PNG 全像素 alpha=255，避免只抽查角点便推断整体不透明。
- 五份前景中央 2/3 外的 208980 个像素精确为不透明 #496B83。108 / 216 前景中央 72 / 144 区域与同尺寸传统缩放对照，仅极少通道差 1 LSB，没有人物改绘 / 裁图的迹象；不把不同合成底色下的缩放称作字节完全相同。

按 [Android 官方自适应图标说明](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive)，108 技术画布与不会被形状遮罩裁掉的 66 安全区域不同；中央 72 是本项目完整原图布局区，不将整个 72 区称为所有 OEM 都不裁。当前图检覆盖圆形 / 圆角示意与静态小尺寸，不宣称穷尽厂商遮罩、动效或主题图标。

## 引用优先级与系统栏

独立断言与源码核对通过：

- Manifest 仍使用 @mipmap/ic_launcher / ic_launcher_round；未限定版本的旧 mipmap-anydpi XML 已移除，API24/25 不会再被旧 anydpi 篮球向量优先覆盖。API26+ 两份 adaptive XML 均引用 @mipmap/ic_launcher_foreground 与 @color/ic_launcher_background。剩余同名 drawable 资源未被这些入口引用，类型不同不构成覆盖。资源选择依据见 [Android 官方资源限定符说明](https://developer.android.com/guide/topics/resources/providing-resources)。这属于静态优先级审查，未运行 API24/25 设备。
- windowSplashScreenAnimatedIcon 指向新 @mipmap/ic_launcher；图标背景 #496B83 与 app_window_background #DCE7ED 已解耦。statusBarColor / navigationBarColor / 启动窗口背景使用后者，LightStatusBar / LightNavigationBar 保留，Capacitor 背景仍为 #dce7ed，没有把页面系统栏误改为深图标底色。
- favicon 使用本地 256px PNG，没有外部资源入口。页面内部篮球品牌图形不是本轮 App launcher 图标替换范围。

## 主控构建与 APK 证据

root 执行并报告 1.12.0 / code14 的 Vite / Gradle 与 3 项 HTTP 通过，v2 签名、28 个 dist / APK 网页资源逐项哈希一致、15 个编译 PNG 解码像素一致、无 server.url。reviewer 读取 `artifacts/qa/hc017-apk-assets.json`，核对 15 项 pixelsMatch=true、webAssets=28、serverUrlAbsent=true。

APK SHA-256：`4857610ab4fb3ed7e75ba70cefedb5a0bd5084622cd93c7ea2721121e492aa8b`。root 另报告 aapt 编译映射前景 0x7f0c0001 为 mipmap/ic_launcher_foreground、背景 0x7f050039 为 color/ic_launcher_background、窗口背景独立为 0x7f05001d；reviewer 没有另运行构建或 aapt。

## 指定设备与真实图标显示

root 执行并报告仅向 ef473680 install -r 返回 Success，1.12.0 / code14 冷启 `Status: ok` / `LaunchState: COLD`、前台确认。reviewer 只读核对 `artifacts/qa/hc017-device-before.json` / `hc017-device-after.json`：同设备、阵容文件均存在，本轮实际均为 0 份档案，SHA-256 均为 `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`。以本轮实读为准，没有沿用历史 1 份档案的旧哈希，也没有把存在的空档案文件称为文件不存在。

root 在系统本应用详情页核对名称、前台与版本，亲看新头像，记录 `hc017-installed-icon.json` / `hc017-installed-app-details.png`。首次 URI 检查保护退出未截图，改用只读 UI 名称验证后成功，未修改系统权限。此详情页证据与下面真实桌面证据分别记录。

root 在实际 com.miui.home 当前主页找到本应用名称，没有滑动或调整桌面，只保存本应用 icon / label 截块，并返回本应用。reviewer 核对 `hc017-launcher-check.json`，并亲自查看 `artifacts/qa/hc017-actual-launcher-tile.png`：真实桌面壁纸上显示批准头像与「半场战术板」名称，圆角图标五官清楚、未见错误旧图标。该图是实际 launcher 显示，不是离线遮罩或详情页的替代图；设备命令与截图由 root 执行，reviewer 未操作手机。

## 结论与限制

本轮图标替换必需证据已齐，无剩余 P1 / P2，任务可完成。未录系统启动动画逐帧，也未测试其他 OEM / API24/25 设备；它们不作为本轮新增必需验收项，图标 XML 的启动引用与旧系统资源优先级已有静态检查。没有把图标展示称作物理触摸、全部业务交互或多厂商兼容通过；旧业务 `awaiting_device` 待办不变。业务页面未改，本轮没有额外运行完整 Chrome 业务回归。
