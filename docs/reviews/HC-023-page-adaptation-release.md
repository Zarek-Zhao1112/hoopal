# HC-023 训练场与战术库正式适配独立审查

日期：2026-10-23。状态：源码、独立静态夹具、图检及主控最终浏览器范围通过，无剩余 P1 / P2；1.14.0 已安装指定新机，实际 WebView96 程序浏览检查通过，完整人工设备验收仍为 `awaiting_device`。任务：[HC-023](../tasks/HC-023-page-adaptation-release.md)。设计：[页面适配](../design/page-adaptation.md)。

## 范围与分工

本轮授权正式接入批准布局：仅更衣室保留品牌，训练场 / 战术库上方留白与卡顶位置保留，导航名称为更衣室 / 训练场 / 战术库。保留真实引擎、20 套战术、推荐来源、图例 / 步骤分页、导出、600ms 导航与 450ms 组队弹窗、现有存储协议，不移植预览示意引擎。

interaction_design 不参与实现，仅维护本审查文件及审查索引对应行。实现源码只读，可用必要内存夹具，不启动共享 Chrome、adb 或构建；主控提供真实浏览器、APK 与指定手机证据，按执行者及限制分别记录。

## 待核对合同

- 共享 #mode 为同一节点，在训练场 / 库卡内移动，事件监听、当前人数、catalogMode / 来源与异步失败保护不变；busy / modal 锁覆盖搬移后的控件。
- 菜单在训练场卡内，play-title 保留只读隐藏元数据；结构变更不改变真实回放、图例、步骤分页与导出对象。
- 手机 / 横屏 / 平板真实内容可达，库默认全收、浏览不加载、CTA 成功后播放；品牌仅更衣室且卡顶留白符合批准位置。
- 快照转场的实时控件值 / SVG 引用与布局、WebView96 兼容及原生弹窗隔离保持。

## 独立源码与静态夹具

已读任务 / 设计及集成后的 index.html、app.css / page-layout.css、app.js 与 workspace / snapshot 基线。placeModeControl 只将现有 mode 节点 prepend 到对应 port，没有克隆或重绑监听；onViewChange 分别同步 catalogMode 与真实 store.play.mode，原筛选 / clearContext / loadTemplate / persist 分支保持。controls 的 busy 仍含切换、阵容写入与玻璃 modal，搬移后 mode / template / 菜单锁定规则保持。

真实训练场结构保留原 SVG、回放、人员图例、步骤与分页控件及 ID，display:contents 仅改变布局；隐藏元数据不替换真实引擎。库仍用正式 library-deck 的真实 hidden / 焦点与显式 CTA。快照在 onViewChange 前复制旧页，模式节点随后移动；现有快照控制值同步与 ID / SVG 重映射未被替换。CSS 使用普通 grid / flex / 媒体查询，不依赖 :has 或 inert 才能布局；实际 WebView96 结果待对应环境证据。

reviewer 在内存 Node HTML 树夹具读取真实 HTML，确认 65 个 ID 唯一，mode 唯一且初始与菜单在 play-header-controls，play-title 仍 readonly 且有隐藏祖先。修后 storage-status 独立为 body 直接子节点、没有 hidden / aria-hidden 祖先，角色保留；仅自身正常 hidden。夹具不验证 CSS 像素、原生焦点或浏览器事件命中。

## 发现与复验

| 编号 | 级别 | 位置 / 触发与影响 | 修复及复验 |
| --- | --- | --- | --- |
| R1 | P2 | index.html 初稿将 storage-status 与 play-title 一并放进 hidden / aria-hidden 的 app-header。persist 或旧个人数据清理出错时只解除状态自身 hidden，祖先仍使其不可见；原持续错误提示被新布局隐藏，console 不能代替用户反馈。 | 主控将状态节点移为 body 直属真实 live 状态；page-layout.css 仅出错时 fixed 显示在顶部空白，不占正常卡顶，不增加常驻离线文案。独立源码 / HTML 树已确认脱离隐藏祖先；最终主控注入 builtin setItem 失败，状态 display=block、hiddenAncestor=false、rect 高 22，恢复后清除。reviewer 已亲看真实错误截图，状态 verified。 |
| R2 | P2，主控发现 | 原分页 span 的 min-width:45px 与箭头合计超出新 70px 步骤分页区，文字 / 箭头被裁切。 | 主控限定 #step-page-count 的 min-width:0；reviewer 已复读覆盖值、亲看修前 / 修后截图。最终 dist 定向检查六尺寸所有分页元素位于卡内且完整，状态 verified。 |

## 主控证据与限制

主控最终报告 150 单元 + 3 HTTP，共 153 检查通过，构建后另 3 HTTP 通过；第二轮完整 Chrome 已通过真实 20 战术、只读回放、库、layout、玻璃组队、阵容 / 推荐及六尺寸图例、导航动效。最后分页 CSS 随 android:build 构建后，另在同份最终 dist 执行定向六屏 / 共享节点 / 原文不变 / 存储错误注入与恢复 / 分页完整性检查，通过后刷新指标与图片。reviewer 未运行或重复这些浏览器检查。

reviewer 已亲看首轮 hc023-390x844-training.png、manager-play-844-390.png 与 manager-play-360-640.png：品牌在训练场隐藏、顶部空白保留；真实四人推荐图例与六步骤、木半场、讲解和播放区在小屏 / 横屏可见。图片当时尚在 R2 修复前，不把已知分页裁切隐去或提前称最终图检通过。

最终补看 hc023-360x640-training.png、hc023-844x390-training.png、hc023-360x640-library.png 与 hc023-storage-write-error.png：分页两箭头及计数完整，手机库六标题 / 开卡球场 / CTA 和固定导航可见，错误状态在顶部明确显示且主卡位置保持。`artifacts/qa/hc023-page-layout-metrics.json` 已只读核对：36 个布局记录和 1 个实际存储错误记录；正常品牌仅更衣室，卡顶 96 / 116 / 68 / 120px 与批准尺寸一致。实际命中、同对象检查、原文 / 来源不变以主控脚本证据为准，不用静态图替代。

共享 mode 移动会合理改变 DOM 遍历次序；主控将旧转场 ID 顺序断言改成排序后的 ID 集合内容比较，并另断言 Set 唯一性，layout flow 仍保留同 Runtime.objectId / isConnected 检查。reviewer 已核对，这不是放宽重复控件或重建节点的约束。

reviewer 未运行 Chrome、adb 或 APK 构建；没有设备功能或持续帧率证据。后续区分主控浏览器、签名 / 资源核对、安装 / 冷启动、程序 WebView 操作与真实触摸 / 输入法 / 原生 Back / 旋转 / 分享，不以某一层代替完整验收。

## APK 与设备

主控报告 1.14.0 / code16 Gradle 构建成功，v2 签名通过，28 份 APK 网页资源与 dist 逐个 SHA-256 一致，无 server.url；`hc023-apk-assets.json` 已由 reviewer 只读核对。APK SHA-256：`eb11ccdb3e2289c28de4bbb477bf0150f3eb9ddddb49ea621b439eeb76ec4b17`。指定 ef473680 / M2101K9C 覆盖安装 Success，COLD 启动总耗时 772ms；执行者为主控，reviewer 未运行设备命令。

reviewer 已只读核对 `hc023-device-before.json` / `hc023-device-after.json`：本轮实际均为 0 档案，哈希同为 `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`；after 版本 1.14.0 / code16，foregroundVerified / lineupsUnchanged 均 true。未沿用历史其他任务的一份档案，也不将空档案哈希保持称为新增档案保存验证。

`hc023-native-layout.json` 已只读核对：实际 Android12 WebView96.0.4664.104，393×819 的 training / library / opened / locker 四态 overflow=false、controlsFit=true；品牌仅 locker，modeHost 随页在 play / library port 间切换。主控核对同一节点、库异人数 / 攻防筛选保持 source=give-go，回训练恢复 3v3，菜单可打开关闭；只用 DOM 程序操作，没有触发库 CTA 载入、保存测试阵容或改用户档案。报告 archiveUnchanged=true，哈希仍保持。

reviewer 亲看主控采集的 `hc023-native-training.png` 与 `hc023-native-library.png`：真实系统栏下训练场与展开的四人防守库保持空白顶区、完整主卡 / 回放或 CTA、步骤分页与玻璃导航。设备程序浏览不替代真实手指、输入法、原生 Back、旋转、分享或最终保存验收；未给出 FPS 结论，完整人工设备项继续待验。
