# 离线 Android 半场战术板设计记录

本文保留HC-001时点的原设计。个人战术保存/导入已在HC-006退出；无调用的旧仓库和专属测试在[HC-043](../tasks/HC-043-project-organization.md)退役，原实现保留于Git基线。当前接口以[架构说明](../architecture.md)为准。

日期：2026-10-22。状态：现有实现整理；实现、自动验证和 APK 构建已完成，安装启动已确认，完整真机功能待验收。

本文基于当前源码和验证结果补录模块约定及实现原因，不追溯声称这些设计在开发前已经完成。构建命令和设备使用说明以 [Android 离线版](../android.md) 为准，完整目录职责见[模块架构](../architecture.md)，验证证据见[验证记录](../validation.md)。

## 目标与范围

面向教练和球员的半场 **3v3 / 4v4** 战术布置与讲解。核心体验是观看连续动作过程：球员移动、持球运球、传球交接、分步讲解，以及暂停和进度跳转。编辑包括拖动球员与篮球、绘制跑位/传球/掩护/运球路线、复制或删除步骤、撤销重做、保存与 JSON / PNG 导出。

每一步保存完整站位快照，相邻步骤生成动画。路线在满足起终点和球员关联条件时参与插值；未匹配时按两步站位直接移动。篮球持续由同一球员持有时跟随球员，持球人变化时计算独立传球过程。掩护线用于讲解标注，当前没有碰撞、战术合法性判罚或自动防守模拟。

APK 应能在断网状态下冷启动并完成编辑、回放和本地保存。当前范围不包含 5v5、账号登录、云同步、多人实时编辑或业务服务器。

## 模块依赖与公开接口

| 模块 | 责任与主要 API |
| --- | --- |
| [app.js](../../frontend/src/app.js) | SVG 球场、编辑交互、播放时钟、界面状态；调用引擎、仓库和平台接口完成联动 |
| [engine.js](../../shared/engine.js) | `createPlay(mode)`、`createBoard(mode)`、`validatePlay(value)`；`PlayStore` 管理帧、编辑和历史；`interpolateBoards(from,to,t)` 与 `ballPosition(board)` 计算动画 |
| [templates.js](../../shared/templates.js) / [内置数据](../../data/templates.js) | 将纯数据定义转换为独立战术副本，内置配合与用户数据分开 |
| [hit-test.js](../../frontend/src/board/hit-test.js) | `resolveDragTarget(board,point,showDefense)` 用球场坐标解析触摸目标，避免触屏目标调整误选持球队员旁的篮球 |
| [repository.js](../tasks/HC-043-project-organization.md) | `createRepository({adapter,validatePlay,maxLibrary=40})`；返回 `load()`、`saveDraft(play)`、`saveLibrary(plays)`、`flush()` |
| [platform/index.js](../../frontend/src/platform/index.js) | 绑定 Capacitor 插件，导出 `isNative()`、`createStorageAdapter()`、`createSettingsAdapter()`、`exportFile(blob,filename)`、`setupLifecycle(callbacks)` |
| [platform/core.js](../../frontend/src/platform/core.js) | 可注入的 `createPlatformAdapters(...)`，负责网页/原生实现差异和独立测试 |

依赖方向是界面调用共享引擎、仓库和平台；仓库只依赖注入的校验函数与存储适配器。引擎不依赖 DOM、存储或 Capacitor。平台层不管理战术业务。电脑预览由 [backend/app.mjs](../../backend/app.mjs) 提供已构建资源，APK 运行不经过该服务。

`PlayStore` 公开 `play`、`board`、`canUndo`、`canRedo`，以及 `update`、`changeFrame`、`addFrame`、`deleteFrame`、`undo`、`redo`、`load`、`reset`、`setTitle`。编辑通过 `update` 提交，避免直接改动当前状态而绕过历史。每个 Play 包含 `id/title/mode/frameIndex/frames`，每帧包含 `players/ball/paths/note`；所有位置使用 SVG 球场逻辑坐标。

动画为相邻快照插值。有效 `run/dribble` 路线须关联球员，首尾分别距两帧球员位置小于 45；有效 `pass` 路线首尾须距实际球位小于 60。匹配后用实际位置作为首尾，按折线总长度计算中间位置。插值中的篮球用自由球坐标输出，防止渲染时再次吸附到原持球人。

## 初始化、保存与恢复

界面先 `await repository.load()`，再创建 `PlayStore`、渲染和自动保存，避免原生异步读取尚未结束时写入默认模板。`load()` 返回 `{draft,library,warnings}`，坏草稿和坏库互不阻塞；库中单项损坏时保留其余有效战术。

仓库与适配器遵守以下约定：

1. 适配器 `getItem(key)` 异步返回文本或 `null`，`setItem(key,string)` 返回写入 Promise；只有确实不存在的数据可返回 `null`。
2. `saveDraft` 和 `saveLibrary` 在调用时校验并复制快照，再进入统一串行队列，防止后续界面编辑改变待写入内容，或旧保存晚完成覆盖新保存。
3. 读取失败会在对应键上建立保存锁。即使后续底层读取恢复，自动保存仍拒绝写入；只有再次调用 `load()` 且该键读取成功才清锁。警告和错误提示需要重试读取，避免启动模板覆盖未知的旧战术。
4. 损坏原文覆盖前先写入 `原键.corrupt-唯一后缀` 备份；备份失败停止覆盖。直接保存、未先调用 `load()` 时也会检查原文。暂时读取失败与已经读到的损坏内容采用不同恢复路径。
5. 保存失败会返回错误，后续操作仍可重试；失败不会永久阻塞队列。`flush()` 等待调用时已有队列，并传播最近一次保存失败。

两个稳定键为 `halfcourt-draft-v1`、`halfcourt-library-v1`。当前战术库上限 40 项，导入导出继续使用兼容的 Play JSON。存储错误时保留编辑中的战术并提示保存失败；仓库提供显式重新加载能力，当前界面主要通过重启重新执行读取初始化，没有单独的“重试读取”按钮。

名称和讲解输入会触发自动保存，后台切换前再次提交输入并等待队列。切换战术时暂时锁定编辑区，先保存旧战术再载入新战术，避免异步等待期间新增输入丢失。PNG 异步生成开始时冻结导出的标题和步骤，避免切换后混用文件名。

## 网页与 Android 数据边界

| 项目 | 网页 | Android APK |
| --- | --- | --- |
| 草稿/战术库 | 当前访问地址的 `localStorage` | Filesystem 的应用私有 Data 目录，键映射为 `halfcourt/storage/<编码后的键>.txt` |
| 写入方式 | 平台适配器封装为异步接口 | 先写临时文件，再重命名替换；不先删除原文件 |
| 轻量设置 | `localStorage` 适配器 | Preferences；包括同一 WebView 来源的旧数据迁移标记 |
| JSON / PNG 导出 | 浏览器下载 | 写 Cache 临时导出文件，再调用系统分享 |

网页与 APK 不自动同步。原浏览器战术迁入 APK 的方式是导出 JSON 后导入。原生适配器只在确认私有文件不存在时检查当前 WebView 来源的旧 `localStorage`，保留旧值并写迁移标记；权限或 IO 错误不会触发迁移。它无法读取电脑浏览器中的数据。

清除应用数据或卸载会影响私有文件；长期保留的战术应导出 JSON。升级保留数据的条件和签名说明见 [Android 离线版](../android.md)。当前没有业务数据库或远程数据服务。

## 打包、文件分享和返回键

[vite.config.js](../../vite.config.js) 从 `frontend/` 打包，使用相对资源路径、`es2022` 目标，将界面、引擎、模板数据和客户端插件产物写入 `dist/`。[capacitor.config.json](../../capacitor.config.json) 固定 `webDir: "dist"`，没有 `server.url`。同步后同一份构建资源进入 APK；用户安装后不需要 Node 服务、电脑 IP 或开发服务器。

[scripts/android.mjs](../../scripts/android.mjs) 负责网页构建、Capacitor 同步与 Android 构建。当前应用标识是 `com.halfcourt.tactics`，最低 API 24、目标 API 36；测试 APK 使用开发签名，正式发布签名尚属后续发布工作。

Android 导出 JSON 写 UTF-8 文本，PNG 写二进制对应的 Base64 数据，再将缓存 URI 交给 Share。文件名清理非法字符，按 Unicode 码点截短至字节上限，保留扩展名并避免截断 UTF-16 代理对；不保证保留完整的组合 emoji 字素簇。分享取消作为 `USER_CANCELLED` 单独反馈；分享调用成功只表示系统接受交接，不保证第三方接收端最终保存。缓存文件保留给接收端异步读取。

`setupLifecycle({onBackground,onBack})` 返回异步清理函数。界面在返回键时依次优先取消手势、暂停播放或结束输入；未被这些操作消费时，平台层等待后台保存后将应用最小化。前一次返回操作完成前忽略重复返回事件，生命周期保存失败通过错误事件反馈，不当作成功退出。

## 兼容性与验收

最低 Android 安装版本不等于所有旧版系统 WebView 均可运行当前 JavaScript。需要支持构建目标与所用浏览器 API 的 Android System WebView；触屏选择、横竖屏、安全区域和系统插件行为仍需设备验证。构建环境要求以 [Android 离线版](../android.md) 维护为准。

| 验收层级 | 已有证据 | 剩余边界 |
| --- | --- | --- |
| 引擎与交互逻辑 | [engine.test.mjs](../../tests/unit/engine.test.mjs)、[hit-test.test.mjs](../../tests/unit/hit-test.test.mjs) 覆盖帧、历史、路线、持球插值和触屏命中 | 不代表真实设备输入时序已验收 |
| 存储与平台 | [storage.test.mjs](../tasks/HC-043-project-organization.md)、[platform.test.mjs](../../tests/unit/platform.test.mjs) 覆盖读取故障锁、损坏备份、并发快照、失败恢复、原生接口模拟 | 原生文件系统和系统分享接收端需真机验证 |
| 构建资源 | [server.test.mjs](../../tests/integration/server.test.mjs)、[browser-qa.mjs](../../tests/e2e/browser-qa.mjs) 验证 HTTP、编辑回放、刷新恢复、导出、断网后的动画及手机触屏 | 浏览器模拟不能替代 APK 断网冷启动 |
| APK | Debug 构建和签名验证完成，产物为 `artifacts/apk/halfcourt-debug.apk`；用户安装后，包管理器及启动结果确认成功 | 完整真机功能尚未验收，安装记录见 [HC-003](../tasks/HC-003-device-install.md) |

真机通过标准：断网冷启动后可载入 3v3 / 4v4 示例并播放；编辑并保存后关闭、杀进程和重新打开仍恢复数据；JSON 往返导入导出保持战术，PNG 能交给系统接收端；返回键、前后台切换及横竖屏后状态正常。实际完成情况统一更新[验证记录](../validation.md)，不以测试代码存在代替测试通过。

## 协作记录

本次实现采用主 agent 集成、产品交互讨论、状态引擎/存储模块开发、平台适配开发和独立只读审查分工。共享接口与文件边界用于并行开发，集成后统一执行回归。审查发现的首次读取故障覆盖风险、异步切换输入风险、导出标题快照和长文件名问题已修复；手机模拟暴露的触屏误选篮球问题也已修复并补充测试。具体结果见[验证记录](../validation.md)。

后续修改沿用[设计目录要求](README.md)：明确范围与模块接口，记录故障和验收条件，再同步实现、审查和验证结果。本文是这次实现完成后的整理，不补造此前的设计产物或评审时间线。
