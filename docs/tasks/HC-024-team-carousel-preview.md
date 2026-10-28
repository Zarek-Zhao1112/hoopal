# HC-024 · NBA队徽滑动转盘预览

- 日期：2026-10-23；状态：`completed`（仅独立设计预览）。
- 用户提供CircularCarousel React+CSS源码，希望局部用于选队徽并以手指滑动；讨论后要求看效果图。
- 设计：[队徽转盘](../design/team-carousel.md)。仅独立HTML/CSS/原生JS预览与PNG，不接生产/React/存储，不构建或安装APK。

| 负责人 | 文件所有权 | 接口及验收 |
| --- | --- | --- |
| ui | artifacts/design/team-carousel-preview/index.html、preview.css、preview.js | 现有冰川蓝玻璃第二任务内，中央突出/两侧后退的平整队徽、手指拖动/低惯性吸附/点击相邻/箭头、30队循环、队名球衣联动、全部球队快速选择；window.teamCarouselPreview ready/getState/selectTeam(id或index)/stepBy(n)，file可直开 |
| 主控 | 本文/设计/索引、teams-data.js、render-preview.mjs与图片/报告 | 从现有本地NBA数据生成经典脚本；实际Chrome四尺寸/触摸/边界/图检，不改生产 |
| interaction_design | docs/reviews/HC-024-team-carousel-preview.md及review索引 | 集成后只读源码/必要夹具/图检审查，关注拖动与误点/取消/选中联动、快速入口/隐藏控件及预览边界 |

验收：390×844、360×640、844×390、1024×768可看完整队徽/球衣与主要操作，不整页滚动；实际触摸左滑下一/右滑返回，轻拖一队/快速拨动多队、停止吸附，30队首尾循环，点击侧卡可用，静止无自动旋转；全部球队入口可定位30队并返回；队名/队徽/球衣一致；无远程请求或Storage调用。交付PNG和本地可滑动入口，设备/FPS/业务保存不在预览范围。

## 实现与验证

- 交付：[独立交互预览](../../artifacts/design/team-carousel-preview/index.html)、[双球队效果图](../../artifacts/design/team-carousel-preview/comparison.png)；默认勇士，预览参数可切换湖人等球队，正式应用未改。
- ui完成经典脚本、玻璃第二任务、浅纵深环绕、低惯性/330–410ms吸附、最多拨动3队、左右触摸锁轴/取消/打断、首尾循环、30队分页定位及示例球衣。没有引入React、业务保存或创建其余任务。
- 静态检查：脚本语法、CSS解析、本地30队SVG与品牌资产、唯一HTML ID及接口通过。
- 主控Chrome：[验证脚本](../../artifacts/design/team-carousel-preview/render-preview.mjs)与[报告](../../artifacts/design/team-carousel-preview/verification.json)。四尺寸转盘与全部入口均无整页滚动，主要按钮可命中、可见资产加载完整；PNG已逐张图检。
- CDP真实触摸：慢左滑GSW→HOU、右滑返回GSW；快拨前进2队，纵向不切换，取消回起点，吸附中再次触摸可打断，首尾和侧卡切换通过，静止不自转。30支球队均从快速入口实际选择，队名/球衣同步并还原入口焦点；20次Tab留在全队面板。减少动态效果通过。
- 页面无异常、HTTP(S)资源请求或Storage调用。该结果是独立Chrome设计验证，不是Android设备触摸/FPS/业务保存验收；无需构建或安装APK。
- [独立审查](../reviews/HC-024-team-carousel-preview.md)完成：源码、四尺寸图检与浏览器证据核对通过，无未修复P1/P2。文档本地链接通过；后续正式接入需用户选定设计再另立任务。
