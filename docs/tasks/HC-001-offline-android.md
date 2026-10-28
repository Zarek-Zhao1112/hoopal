# HC-001 · 半场战术板 Android 离线版

| 字段 | 内容 |
| --- | --- |
| 日期 | 2026-10-22 |
| 当前状态 | `awaiting_device` |
| 集成负责人 | 主 agent |
| 协作 agent | engine、ui、interaction_design |
| 交付物 | `artifacts/apk/halfcourt-debug.apk`；使用开发签名 |

本合同在 Android 阶段开发后，依据实际分工和验证结果整理，用于后续维护与验收追踪；此前工作并非由这份文档预先驱动。

## 目标与范围

把现有 3v3 / 4v4 半场战术板封装为可安装的 Android 离线应用。APK 包含页面、动画引擎和内置战术，手机编辑、播放、保存时不依赖电脑服务或网络。

保留网页版本及已有 JSON 战术格式。Android 草稿和战术库使用应用私有存储，导出交给系统分享，处理后台保存和返回键。此次交付为本地测试安装包；账号、云同步、应用商店上架及正式发布签名不在本任务范围。

## 分工与文件边界

以下为本阶段的主要开发和审查文件；Android 自动生成的资源不逐个列出。

| Agent | 职责 | 主要文件 |
| --- | --- | --- |
| 主 agent | Vite / Capacitor 集成、界面接入、触屏修复、构建、回归和交付记录 | [`frontend/src/app.js`](../../frontend/src/app.js)、[`frontend/src/board/hit-test.js`](../../frontend/src/board/hit-test.js)、[`tests/unit/hit-test.test.mjs`](../../tests/unit/hit-test.test.mjs)、[`vite.config.js`](../../vite.config.js)、[`capacitor.config.json`](../../capacitor.config.json)、[`package.json`](../../package.json)、[`package-lock.json`](../../package-lock.json)、[`scripts/android.mjs`](../../scripts/android.mjs)、[`scripts/start.mjs`](../../scripts/start.mjs)、[`backend/app.mjs`](../../backend/app.mjs)、[`tests/integration/server.test.mjs`](../../tests/integration/server.test.mjs)、[`tests/e2e/browser-qa.mjs`](../../tests/e2e/browser-qa.mjs)、[`android/`](../../android/)、相关使用与验证文档 |
| engine | 异步存储仓库、快照与并发保护、损坏数据备份、读取失败保护 | [`frontend/src/storage/repository.js`](../../frontend/src/storage/repository.js)、[`tests/unit/storage.test.mjs`](../../tests/unit/storage.test.mjs) |
| ui | 网页 / Android 平台适配、私有文件、系统分享、生命周期、原生接口 mock 测试 | [`frontend/src/platform/index.js`](../../frontend/src/platform/index.js)、[`frontend/src/platform/core.js`](../../frontend/src/platform/core.js)、[`tests/unit/platform.test.mjs`](../../tests/unit/platform.test.mjs) |
| interaction_design | 独立只读审查存储、平台、交互、Android 配置与构建；回报缺陷和验证限制 | 上述实现及配置；审查结论汇入 [验证记录](../validation.md) |

共享引擎和内置战术沿用 [`shared/engine.js`](../../shared/engine.js)、[`shared/templates.js`](../../shared/templates.js)、[`data/templates.js`](../../data/templates.js)。模块所有者先完成各自范围，主 agent 整合并负责跨模块修复。

## 接口合同

| 边界 | 接口与约束 |
| --- | --- |
| 业务 → 存储仓库 | `createRepository({adapter, validatePlay, maxLibrary})` 提供异步 `load()`、`saveDraft(play)`、`saveLibrary(plays)`、`flush()`。保存时立即复制快照，写操作排队；损坏原文在覆盖前先备份。初次读取失败会锁定对应键的保存，重新加载成功后才解锁。 |
| 存储仓库 → 平台 | `createStorageAdapter()` 提供异步 `getItem(key)`、`setItem(key, text)`。缺失返回 `null`，权限或 IO 错误拒绝；网页延迟读取 `localStorage`，Android 使用 `Directory.Data` 文本文件并先写临时文件再重命名。 |
| 存储键与格式 | 保留 `halfcourt-draft-v1`、`halfcourt-library-v1`；战术通过 `validatePlay()` 校验。网页与 APK 存储独立，可通过 JSON 迁移；Android 仅在缺少原生文件时尝试一次当前 WebView 的旧数据迁移，保留旧值。 |
| 业务 → 文件导出 | `exportFile(blob, filename)` 返回 `{method:'download'\|'share'}`。网页下载文件；Android 写 `Directory.Cache` 后以文件 URI 调用系统分享。JSON 用 UTF-8，PNG 用 base64。取消分享抛出 `USER_CANCELLED`，其他错误继续上抛。文件名最多 200 个 UTF-8 字节并保留扩展名。 |
| 业务 → 生命周期 | `setupLifecycle({onBackground,onBack})` 返回异步清理函数。后台等待保存；返回键先让 `onBack()` 处理，返回 `false` 时等待保存再最小化应用。监听错误可见且不产生未处理拒绝；平台层不操作球场。 |
| 构建 → Android | Vite 输出 `dist/`，Capacitor 的 `webDir` 指向 `dist`，不设置开发服务器 `server.url`。构建脚本完成网页构建、资源同步和 `assembleDebug`。 |

## 依赖与集成顺序

1. 主 agent 确定离线封装范围，准备 Vite / Capacitor 依赖并同步模块接口。
2. engine 与 ui 按接口并行实现存储仓库和平台适配，分别运行相关单元测试。
3. 主 agent 接入异步初始化、自动保存、导出与生命周期，完成前端构建和浏览器回归。
4. interaction_design 独立审查；相关 agent 修复所负责的问题，主 agent 整合后重新验证受影响范围。
5. 构建最终网页资源、同步 Android、编译 APK 并验证签名。
6. 安装手机并执行离线冷启动、数据恢复、系统分享及设备交互验收。

步骤 6 已完成安装与打开，其余真机功能验收尚未完成；其他不依赖该结果的开发和文档工作可以继续。

## 验收清单与证据

- [x] 3v3 / 4v4 战术编辑与动画功能在构建后的网页资源中保留。
- [x] 46 项自动测试通过：引擎 11、触屏命中 2、平台适配 18、异步存储 12、HTTP 集成 3。
- [x] Chrome 回归通过：编辑、回放、撤销重做、刷新恢复、未失焦输入保存、PNG / JSON 导出、无效导入保护、进度跳转和防守显示。
- [x] 浏览器断网后的播放、手机布局和触屏拖动验证通过；运行时未请求远程资源。
- [x] 独立审查完成；读取失败覆盖风险、异步切换输入、PNG 导出快照、长中文文件名问题已修复并验证。
- [x] 触屏误选持球队员旁篮球的问题已修复，并补充命中测试和浏览器回归。
- [x] APK `assembleDebug` 编译成功，开发签名 v2 验证通过；包名 `com.halfcourt.tactics`，最低 API 24，目标 API 36。
- [x] 手机安装成功并启动应用；用户手动确认安装后，包管理器和启动结果已确认，见 [HC-003](HC-003-device-install.md)。
- [ ] 真机断网冷启动，载入并播放 3v3 / 4v4 示例。
- [ ] 真机编辑名称、讲解和站位后，进入后台及杀进程重启仍可恢复。
- [ ] 真机 JSON 导出 / 导入正常，PNG 交给系统分享接收端；取消分享不会显示成功。
- [ ] 真机返回键、前后台切换及横竖屏切换后数据和交互正常。

完整结果见 [Android 接入验证记录](../validation.md)，操作步骤见 [Android 离线版](../android.md)。自动测试入口为 `npm test`，浏览器回归为 `npm run test:browser`，APK 构建为 `npm run android:build`。

## 当前待办与完成条件

Android API 35 设备最初拒绝 USB 自动安装，返回 `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`。随后将 APK 传入手机，用户完成正常安装，主 agent 确认包名存在且应用启动成功。完整真机功能仍未验收，不能以安装成功、浏览器模拟或原生 mock 替代，因此总体状态为 `awaiting_device`，不是 `completed`。

后续逐项记录上述真机功能验收结果；发现问题则回到修复与相关验证。所有必需项完成后，主 agent 更新本合同、验证记录和任务看板为 `completed`。等待设备验收期间继续不依赖该结果的独立工作。
