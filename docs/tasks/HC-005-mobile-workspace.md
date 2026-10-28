# HC-005 手机与平板一屏工作台

日期：2026-10-22。状态：`awaiting_device`。设计：[一屏工作台](../design/mobile-workspace.md)。

审查：[HC-005](../reviews/HC-005-mobile-workspace.md)。

## 范围与授权

用户认可三种布局效果图，要求手机竖屏为主、手机横屏放大球场、平板横屏三栏，日常操作不需要上下滑动。实施实际界面、交互、回归与新版离线 APK，并沿用已授权的覆盖安装流程。

保留十二套战术、编辑 / 动画 / 保存 / 导入导出能力和原 Play / 存储格式，不引入服务器。效果图用于布局方向，实际保持完整球场比例及可点按控件。

## 分工和接口

| 负责人 | 独占可写文件 | 内容 |
| --- | --- | --- |
| 主 agent | 文档、测试、版本与构建配置 | 协调、验证、集成及 APK |
| ui | `frontend/index.html`、`frontend/styles/app.css` | 重排语义结构、固定视口、自适应三种布局与弹窗 |
| engine | `frontend/src/app.js`、`frontend/src/workspace/` | 导航、分页、菜单、讲解和生命周期集成 |
| interaction_design | 只读 | 设计边界、独立实现审查及复验 |

保留现有业务元素 ID且只出现一次。新增统一接口：`body[data-view="play|edit|library"]`；`[data-view-target]` 切换按钮；`#workspace-menu`、`#open-menu`、`#close-menu`；`#note-dialog`、`#open-note`、`#close-note`、`#note-preview`、`#note-page-prev`、`#note-page-next`、`#note-page-count`；`#template-page-prev/next/count`、`#saved-page-prev/next/count`、`#step-page-prev/next/count`，以及 `[data-library-source="templates|saved"]`。对话框由原生 dialog 展示；原 `#frame-note` 放在步骤面板编辑区。界面 agent 可新增布局包裹，但新增业务 ID 先同步。

主 agent先定合同，界面和交互并行，最终由未实现代码的 reviewer 审查。修改所有权冲突先协调，不并行写同一文件。

## 必需验收

- [x] 手机竖屏演练、编辑、战术库各为固定一屏，无页面纵向溢出（浏览器）。
- [x] 手机横屏球场使用主要空间，控制区在右侧；完整球场可见且可切编辑 / 战术库（浏览器）。
- [x] 平板横屏 / 桌面显示战术库、球场和步骤三栏，内容分页可访问（浏览器）。
- [x] 十二套模板、四十套个人库、六十步与长讲解均有分页或明确入口，无隐藏不可达内容。
- [x] 编辑、播放、导入导出、保存恢复与切换保护不退化；手势只在编辑页启用。
- [ ] 长讲解对话框、菜单、键盘及 Android 返回键有可用的关闭 / 恢复路径（代码和浏览器通过，真实输入法 / 返回键待设备验收）。
- [x] 相关自动检查与独立审查完成；新版 APK 构建签名并记录实际设备结果。

真机的键盘、旋转及触控验收与浏览器模拟分别记录；设备限制时继续交付可完成的开发与验证。

## 实现与交付

1. HTML / CSS 改为固定动态视口，手机底部三页、横屏左场右控、平板三栏；`workspace/` 视图和分页不改变 Play 或持久化格式。菜单含导入导出，唯一笔记输入框位于编辑弹窗。
2. 库按每页 4 项、步骤按每页 6 项显示。演练禁止误拖，工具 / 编辑入口启用编辑；切页提交输入、结束手势，切到编辑或库暂停播放，成功载入后返回演练。
3. 独立审查发现多换行讲解被固定字数分页截断，改为实际 DOM 测量；截图发现平板卡片徽标裁切，改 flex 内部布局。两项均修复并真实浏览器复验，独立审查无未修复 P1 / P2。
4. 61 项单元 / 集成检查通过。Chrome 覆盖六种尺寸的三视图、全部十二套动画、40 库 / 60 步、2000 UTF-16 单元多换行和空行笔记、讲解旋转定位、360×400 键盘尺寸模拟、弹窗与保存恢复，全部通过。审查人与运行证据分工见审查记录。
5. 1.2.0（versionCode 3）APK 构建、v2 签名和 9 个网页资源逐个 SHA256 比对通过，没有 `server.url`。产物：`artifacts/apk/halfcourt-debug.apk`；SHA256：`44fb8f4b513ff282959ce1aaa3cb0747540a49254bd47150f51fe2aa48082381`，同目录提供 `.sha256` 文件。
6. 已连接 Android API 35 手机覆盖安装返回 `Success`。包管理器确认 1.2.0 / code 3，冷启动 `Status: ok`、进程存在。初始化完成后的实际截图 `artifacts/qa/device-1.2.0-ready.png` 显示完整一屏演练、播放与三个页签，原「高位挡拆」第 4/4 步恢复。刚启动的第一张截图仍在初始化，不能作为界面失败或已显示的证据；以 ready 截图为准。

## 剩余设备验收

手机之前拒绝 ADB 触摸注入（缺少 `INJECT_EVENTS` 权限），本轮没有更改安全策略或重复注入。因此代码审查和 Chrome 已通过，实际手机竖屏显示及升级恢复已确认；真实输入法弹起 / 关闭、Android 返回键、手动横竖旋转和各页触控仍待用户体验确认，任务保留 `awaiting_device`。完整离线、分享和杀进程恢复等验收仍由 HC-001 跟踪。

浏览器截图位于 `artifacts/qa/phone-portrait.png`、`phone-landscape.png`、`tablet-landscape.png`。认可的生成概念图保存在 `artifacts/design/hc005-concept-v1.png`，与运行截图分开。
