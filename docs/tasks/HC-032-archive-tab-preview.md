# HC-032 · 档案独立底栏预览

- 日期：2026-10-26；状态：`completed`（仅独立效果预览）。
- 用户要求底栏新增「档案」，从更衣室拆出管理，并要求先看效果图。采用讨论推荐：点球队卡片直接选用并进入对应更衣室。
- 只交付独立HTML/PNG与演示交互，正式1.18.0、安装包及手机保持；不读写真实阵容/Play/存储，无迁移。布局沿用[统一排版](../design/unified-screens.md)、[更衣室](../design/locker-room.md)与[玻璃组队](../design/lineup-glass-sheet.md)。

## 屏幕与行为

四项玻璃底栏为更衣室/训练场/战术库/档案。仅更衣室保留品牌；档案页顶部留白与现有单主卡起线一致。更衣室保当前球队、一个开放柜与当前球员、左右切换/配置球员/查看进攻推荐，小「换球队」进入档案。移出档案分页、创建及删除。

档案主卡显示纯示例球队：队徽、名字、3v3/4v4、成员概览/当前使用标记，独立管理按钮和创建入口；点卡进入对应球队更衣室，当前标记同步，管理按钮不误切队。默认3卡/页、更多通过页内分页保持整页不滚动。示例可用GSW/BOS/LAL，队徽/代表球衣均本地现有资源，不为用户擅自创建真实档案。

创建/管理/推荐如未复现完整既有业务，应明确预览提示或任务示意，不伪称保存。原三步玻璃任务面板为后续正式复用目标，不在此轮重做。训练场/库导航仅示意说明，不替代已有播放功能。

## 分工与接口

ui只写`artifacts/design/archive-tab-preview/`内index/overview、preview.css/js、build-data/data；主控负责render/verification/PNG、任务/设计索引；interaction_design只读预览并维护HC-032审查与索引。源码、配置和依赖不改，各文件一人写。

previewAPI ready/setView/selectTeam/selectPlayer/state；query embedded/view/team/player供截图。#app-screen、[data-view-target]、档案卡[data-team-id]及data-action按钮清晰可验证。仅内存演示，无Storage/fetch/外部字体资源。

## 验收

四尺寸390×844/360×640/844×390/1024×768，两个主页面及四导航控件几何/中心命中/无滚动；卡片直接进入对应更衣室、球衣/成员同步、小换球队返回、菜单不误切队、创建和配置入口提示明确。默认/选用后三屏对照图与可点HTML，独立源码/图检；不为效果图重构正式导航或打APK，不把模拟当真机。

## 实现与验证

- ui已交还六个预览文件：index/overview、preview.css/js、build-data/data。使用现有本地NBA队徽、实际球衣生成器和批准的单柜结构；示例不写入真实档案。
- [交互HTML](../../artifacts/design/archive-tab-preview/index.html)和[三屏对照PNG](../../artifacts/design/archive-tab-preview/overview.png)展示当前更衣室、档案、选用BOS后的更衣室。主控已查看最终图；训练场和库明确为预览占位，创建/配置/管理/推荐用清晰演示提示，不冒充业务保存。
- Chrome最终[验证结果](../../artifacts/design/archive-tab-preview/verification.json)：42组布局，四尺寸四导航、品牌仅更衣室/卡片同起线/底栏落位、本地图片加载；启用控件均在视口内且中心可命中、无整页滚动。逐尺寸真实点击验证管理不切队、Escape关闭、BOS卡进入更衣室并同步球衣、队员前后切换、换球队返回及当前标记、创建提示不改球队。
- 默认3档案无分页；`?many=1`使用六个不同示例，翻页不切当前球队。减少动效模式选择正常。运行错误、HTTP(S)请求和Storage调用均为零；七项正式源码/配置/APK基线哈希保持。
- 验证范围为桌面Chrome独立预览；不代表真实手机手势、原生返回键或正式档案保存验收。本轮未构建APK、未连接或修改手机。
- interaction_design已完成[独立源码/数据/图检审查](../reviews/HC-032-archive-tab-preview.md)，未发现未修P1/P2，确认主控证据与预览边界；本轮预览交付完成。后续正式接入需另立任务，复用真实保存、来源解除和玻璃面板流程。
