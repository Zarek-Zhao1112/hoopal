# HC-012 · 圆形扩散与更衣室滑动

- 状态：`awaiting_device`（开发、审查、自动化、安装冷启完成；新版物理手势等完整人工验收待做）
- 授权：用户确认圆形扩散方案，要求检查第一位球员右滑问题；包含前一轮已授权文字移除。
- 设计：[页面动效](../design/page-motion.md)
- 基线：已安装 1.8.0 / code10；文字移除仅在源码，尚未安装。
- 方向澄清：用户最终明确选「← 手指从右向左拖，切到 2 号」。新版本按左拖下一位 / 右拖上一位，覆盖旧方向约定；此前真机右拖成功记录只用于调查，不作为最终需求验收。

| 负责人 | 独占写入文件 | 工作 |
| --- | --- | --- |
| 主控 | app.js/index.html/app.css import、版本、E2E、文档、构建与手机 | 集成 / 验证与交付 |
| ui | workspace/controller.js、page-transition.js、page-transition.css | 圆形扩散与可靠清理 / 降级 |
| engine | lineups/locker-room.js、tests/unit/locker-room.test.mjs | 滑动方向 / 命中 / 边界调查与修复 |
| interaction_design | docs/reviews/HC-012-page-motion.md | 集成后独立审查 |

## 待验

- [x] 实际手机序号 / 号码与用户触摸已观察；根据最终箭头选项改为左拖下一位，未把旧方向边界当作新需求。
- [x] 主页面圆形扩散、快速切换 / 取消 / 浏览器旋转尺寸与减少动态效果。
- [x] 原有 NBA、档案、战术 / 推荐与离线 / 导出回归。
- [x] 六尺寸、[独立审查](../reviews/HC-012-page-motion.md)、APK 签名 / 资源验证。
- [x] 指定新机安装冷启、数据保留及真实 WebView 96 程序点击转场验证。
- [ ] 新版实际手指左拖下一位 / 右拖返回、原生旋转 / 输入法 / 返回 / 分享完整人工验收。

## 实现与定位结果

常驻文案从 HTML 和正常保存路径移除；空状态 hidden 不占行，真实异常仍有提示。主页面转场为 350ms：旧页视觉副本封闭在 closed ShadowRoot，ID / SVG / CSS 引用重写且无读屏、焦点和交互；从目标导航中心扩大透明圆孔，揭示同步切换的真实新页面。玻璃导航在上层始终可点。CSSOM 缓存、没有外部网络 / 截图依赖，不修改业务数据；不支持或减少动态效果时立即切页。快速连点只保留最后一层，resize / pagehide / modal / hidden / motion 清理。

真机最初 index0、球衣号1，下一位可用，排除了号码与序号混淆。用户真实触摸观察证明旧版右拖 0→1、左拖 1→0 均工作；之后用明确箭头二选一，用户选「← 从右向左切到2号」。因此新版按最新意图改为正序柜位、dx<0 下一位和对应负向 translate，场景跟随手指。首 / 中 / 末提示同步，边界不循环；铭牌 / 徽章起点也支持拖动，轻点仍查看资料。

## 自动化与独立审查

128 单元通过，其中新增9项 locker 实际DOM / capture / swipe夹具；最终方向改变后9项重新通过。3 HTTP通过，共131检查。实际 Chrome 最终全流程通过：20战术、NBA三页全徽章、两人数档案 / 推荐 / 来源故障、重启 / 离线 / PNG与JSON、六尺寸布局 / hit及球衣和铭牌真实touch。

转场专项18组（六尺寸×三方向）检查导航圆心、覆盖四角半径、350ms、单层 / closed shadow / 无重复ID、实际按钮命中、正常完成；另测快速连点最后意图、同页不重播、resize / pagehide / modal / reduced-motion。815节点视觉准备为6.3–48ms（桌面，不代表手机帧率）；指标 `artifacts/qa/hc012-motion-metrics.json`，真实中间帧 `hc012-circle-phone-mid.png`。

首轮 Chrome 发现 P2：SVG 路线的 pointer-events=stroke 覆盖快照继承的 none，遮挡下方操作。修为快照全部后代 pointer-events:none!important，独立夹具与最终实际 elementFromPoint 复验通过。测试中另修正了同时匹配 body 状态属性的层选择器及 DevTools 尺寸变更异步 resize 的等待，二者为测试同步问题。最终无待修 P1/P2。

## APK 与真实手机

- 1.9.0 / code11；APK `artifacts/apk/halfcourt-debug.apk`，SHA256 `ef7759eea70af0c063ecb729547a7d86b4fa7d261fd22472e0d4bde553c6babd`。
- Gradle assembleDebug、v2签名通过；27个APK网页资源与dist逐项hash相同，无server.url。
- 重新核对设备，仅向新机ef473680 / M2101K9C覆盖安装，Success；冷启Status:ok/COLD，版本、PID、前台及 `artifacts/qa/device-1.9.0-new-phone.png` 确认。
- 原有1份真实阵容逐字节保留，升级前后SHA256均 `c625afadf07cfc09ccccf552e3b5dff77e66ca072d53c4dc9c497166a9759758`。报告 `hc012-device-before.json` / `hc012-device-after.json`；未注入测试档案。
- 实际WebView96的应用内DOM程序点击验证阵容→演练→阵容：CSS mask支持、running / complete、结束无快照层；正常状态文字隐藏。731节点准备耗时两次63.4 / 71.3ms，最终记录 `hc012-native-motion.json`。主控亲看 `hc012-native-play-settled.png` 为正确演练，文案已去掉。`hc012-native-circle.png` 捕获时已结束，不作为手机中间帧证据。
- 标准ADB input被系统以INJECT_EVENTS拒绝；CDP Input未响应，不计为手势通过，未修改安全设置。用户旧版手指观察不是新版方向验收；完整原生操作继续待确认。
