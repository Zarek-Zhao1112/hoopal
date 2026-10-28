# HC-024 NBA 队徽转盘预览独立审查

日期：2026-10-23。状态：预览范围审查通过，未发现 P1 / P2。任务：[HC-024](../tasks/HC-024-team-carousel-preview.md)。设计：[队徽转盘](../design/team-carousel.md)。

## 范围

仅审查独立玻璃面板第二任务预览：平整队徽的浅纵深、手指跟随、低惯性吸附、30 队循环、相邻点击 / 箭头与全部球队入口、中心名称 / 队徽 / 球衣联动。不是正式选队 / 保存流程、React 接入、真实 WebView 性能或手机物理手感验收。

interaction_design 只维护本文件与审查索引对应行；预览实现只读，可用必要内存夹具，不运行 Chrome、adb 或构建。主控负责真实浏览器、触摸模拟、尺寸检查与图片，审查区分执行者及限制。

## 独立源码与图检

已只读检查 index.html / preview.css / preview.js 及其本地数据接口：采用独立经典脚本、仓库 NBA SVG 与队服配色，不导入正式业务、React、存储或网络请求；前后任务按钮只展示局部预览说明，没有假保存 / 真档案写入。

连续 position 驱动七个复用 slot，30 队取模循环；左拖增加索引，右拖返回。新触摸 stopMotion，横 / 纵轴锁定后不再反转，非主指针和取消恢复 originIndex；lostpointercapture 仅处理 stage 本身，避免子节点隐式捕获转移误取消。水平拖动后 420ms 捕获阶段抑制 click；松手目标限制原索引 ±3，缓出吸附，静止时无持续自转 rAF。减少动效时直接吸附，不依赖 CSS 动效才能改变选中。

paint 与 syncIdentity 使用同一个四舍五入后取模索引更新队名 / 序号 / 球衣。非交互远侧卡 disabled / pointer-events:none / aria-hidden；仅中心卡进入 Tab，箭头与全部球队提供替代入口。全队面板按 12 / 12 / 6 显示，隐藏原 team-content、禁用外层进度 / 关闭 / 底部按钮；Tab 限该面板，选择 / 关闭后回到全部球队入口。背景控件有真实 disabled / tabindex 隔离，原生 dialog 与手动 Tab 防护配合。

reviewer 亲看 comparison.png、team-360x640.png、team-844x390.png、team-1024x768.png：中央队徽平整完整、相邻队浅退后，非弯曲贴图；勇士 / 湖人的居中队徽、球队名和球衣一致。小屏球衣 / 当前名 / 箭头 / 全部球队 / 前后任务可见，横屏和平板将队徽与球衣分栏，符合局部玻璃面板风格。没有用静态图推断真实拖动跟手或性能。

## 主控实际验证

reviewer 已只读核对 `artifacts/design/team-carousel-preview/verification.json`。主控实际 Chrome 四尺寸（390×844、360×640、844×390、1024×768）无整页溢出，主要控件与可点击侧卡完整 / 命中；当前队徽 / 球衣一致。实际触摸左滑由 GSW→HOU、右滑返回 GSW，快拨至 IND，纵向与取消保持 GSW；吸附启动 70ms 后再反向触摸也可打断并稳定。首尾循环、静止不自转、相邻点击、减少动效均通过。

30 个 NBA ID 已在全队入口逐个实际点击定位并返回转盘，allTeamSelections=30，球衣 / 选中 / 返回焦点一致；20 次实际 Tab 均留在全队列表，allTeamFocusChecks=20；errors / remote 为空，主控记录无存储改动。执行者为主控，reviewer 未重复其 Chrome 检查，也未另写实现镜像测试。

## 限制

独立证据为源码与静态图检；本轮未独立执行指针 / 时间推进夹具、浏览器、设备或 FPS 测量。该预览尚未接正式第二任务，没有验证真实暂选 / 取消 / 最终保存、旧中性档案、推荐来源或 WebView96 手机物理手感；这些属于以后如获授权的正式接入任务。无未修复 P1 / P2，不新增审批或业务要求。
