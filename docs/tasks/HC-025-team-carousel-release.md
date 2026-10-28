# HC-025 · 队徽滑动转盘正式接入

- 日期：2026-10-23；状态：`awaiting_device`（代码/审查/浏览器/安装/实际WebView程序检查通过，物理手感待验）。
- 用户确认HC-024预览，现将浅弧队徽/手指滑动/吸附与球衣联动接入正式玻璃任务面板第二步，完成验证后构建1.15.0/code17并覆盖安装当前新机。
- 设计：[队徽滑动转盘](../design/team-carousel.md)、[玻璃任务面板](../design/lineup-glass-sheet.md)。不引入React、账号、服务端或新存储键。

## 分工与接口

| 负责人 | 唯一写入范围 | 约定 |
| --- | --- | --- |
| engine | frontend/src/lineups/team-carousel.js | 独立DOM组件createTeamCarousel({document,teams,initialTeamId,getLogoUrl,onChange,onAllChange,isDisabled})，返回element/destroy/getState/stepBy/selectTeam/isAllOpen/closeAll；内部转盘与全部球队分页；无存储。初始null中性不回调，用户动作同步选中，取消可回调null恢复初始未选；onAllChange隔离外部任务控件；非动画作者负责后续独立审查 |
| ui | frontend/src/lineups/ui.js、team-carousel.css；tests/e2e/lineup-flow.mjs、glass-sheet-flow.mjs、team-carousel-flow.mjs、browser-qa.mjs | 接组件、球队草稿与真实球衣联动、渲染前destroy、顶部返回先关闭全队入口；更新浏览器流程及必要新交互验收。不写sheet.js/css或共享配置 |
| 主控 | 任务/设计/索引/版本/导入样式/平台构建与安装、必要独立QA | 协调接口、旧档案/草稿/保存/推荐来源边界，检查四尺寸/实际触摸，APK完整性/设备档案hash；不与实现文件并写 |
| interaction_design | docs/reviews/HC-025-team-carousel-release.md与审查索引 | 集成后只读功能审查，重点取消/新手势打断/失焦清理/异步锁与旧中性档案/未保存草稿/返回焦点；报告可复现错误与复验 |

## 数据及行为

- 新建与无NBA的旧档案初始显示中性占位，不因打开面板或resize/draw回调自动分配球队。新建仍需明确选队才能进入第三步；旧中性档案保留兼容。选队只改本次草稿，最终保存才落盘。
- 初始null可用临时中性首项，明确选队后进入30队循环；不提供自动选择球队。不更改schemaVersion1/存储键、已保存队名/球衣号/成员标签、推荐来源与保存失败重试约定。
- 左拖下一/右拖返回，330–410ms低惯性吸附，单次最多3队；轴锁、取消、重拖、拖后误点抑制、减少动效、隐藏页面/销毁停止RAF与事件。中间选中必须与草稿和球衣一致；退出第二步或保存时取当前明确选中状态，不存在滞后提交。
- 中央完整队徽，两侧浅纵深；可点相邻/箭头，全部球队分页直选30队并回到转盘。全部入口打开时其余任务控件隔离，Back/Escape先返回转盘并恢复入口焦点。

## 必需验收

- 相关单元/集成、构建后完整浏览器流程：真实创建/修改/失败重试/保留放弃草稿/旧中性与30队、左右触摸/取消/重拖/首尾/reduced motion/无自转，主界面回放与推荐不回归。
- 390×844、360×640、844×390、1024×768（必要时桌面）主操作/完整队徽球衣不裁切、不整页滚动；全队入口焦点与返回、busy/closing不能改草稿。
- 集成后独立审查及修复复验。
- Android构建与离线资源配置、原包签名可覆盖；核对adb devices，新机ef473680安装前后真实档案字节hash一致。不得卸载/清除数据/写入设备测试阵容。能做实际WebView程序检查则做，物理手指/系统Back等未验须`awaiting_device`。

## 已执行证据（滚动更新）

- 首版Vite构建通过；150单元通过。`npm test`中3个HTTP检查受沙箱回环连接EACCES影响，单独授权本机连接后运行`node --test tests/integration/server.test.mjs`，3项全部通过。没有把首次受限结果记作完整命令通过。
- ADB重新核对连接设备为ef473680/M2101K9C；后续安装与档案结果见下。
- 首轮真实Chrome在全队选WAS后立即点下一队未环绕（29仍29）。定位为ResizeObserver对隐藏后显示的延迟通知无条件freeze取消了新动画。engine修正可见测量仅paint、真正隐藏仍freeze；独立审查精确A/B复现旧失败、新BOS0通过。最终构建正在完整Chrome复验，未以首轮未跑完的结果冒称全通过。
- ui最终移除临时全文dialog作为组件disabled的条件，避免暂停绘制成disabled后没有恢复paint导致死按钮；native modal继续隔离用户输入，gen/busy/closing/草稿身份守卫保留。新增真实浏览器“吸附中打开全文→关闭→下一队”检查。

## 最终交付与验收

- 三方交还后的最终源码：team-carousel.js、ui.js、team-carousel.css及浏览器流程，主控管理app.css样式入口与1.15.0/code17版本。JS语法/CSS严格解析、两类独立内存组件及真实UI夹具通过。正式业务保存层与schema未改。
- 最终Vite主JS为`index-DUPGJGOX.js`。修后完整`node tests/e2e/browser-qa.mjs`退出0：20战术/只读与库/六屏排版、转盘专项、真实三任务创建与失败重试、已有阵容编辑/推荐/重启/离线/导出、主页面动效均通过；没有运行时异常或远程资源依赖。
- [转盘报告](../../artifacts/qa/hc025-team-carousel.json)：四尺寸各有中性/已选态，共8布局，logo完整、主要操作可命中、panelOverflow0；CDP实际touch方向/轴锁/取消回null/快拨≤3/吸附打断/首尾循环、不自转、30队逐个直选、20Tab及Escape隔离、忙/closing失效旧组件和旧中性显式保存均通过。吸附中打开全文、关闭后继续下一队的新增断言通过。主控与独立审查均图检四张PNG。
- [独立审查](../reviews/HC-025-team-carousel-release.md)：RO时序问题已修复并独立A/B及真实Chrome复验，未留P1/P2。
- `npm run android:build`成功，28项APK网页资源与最终dist逐哈希一致；无server.url，v2签名有效。[带版本APK](../../artifacts/apk/halfcourt-1.15.0.apk) SHA256：`57dddd0f97c236f9508c7cfc585020488420252d30d783909efb95956d54b703`。
- 新机正常覆盖安装返回Success，冷启动595ms；版本1.15.0/code17及应用前台核对。安装前后实际0档案，[before](../../artifacts/qa/hc025-device-before.json)/[after](../../artifacts/qa/hc025-device-after.json)文件hash都为`dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`，未卸载、未清除数据。
- [实际WebView96程序检查](../../artifacts/qa/hc025-native-carousel.json)通过：393×819可视区/主要控件无溢出、初始中性且空选不能继续、BOS队徽球衣同步、下一LAL/返回BOS、全队列表及模拟Escape回入口焦点、任务2→3→2保持BOS。只创建内存草稿，未点击最终保存，结束放弃草稿；真实档案hash保持。两张设备PNG已图检，ADB转发已清理。
- 最终文档检查：77份Markdown、394个本地链接通过；本轮测试Chrome/临时profile与ADB转发已清理，手机回到更衣室。

尚待真实手指连续滑动手感/FPS、系统Back/键盘与旋转等物理验收；浏览器触摸、原生mock和WebView程序点击不能替代。因此本任务保持`awaiting_device`，手机已更新可直接试用。
