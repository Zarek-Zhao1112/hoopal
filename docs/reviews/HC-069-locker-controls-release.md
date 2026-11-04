# HC-069 · 更衣室排版审查

独立只读审查覆盖正式更衣室结构、手势与键盘、写实和玻璃样式、编辑入口及数据边界。未发现发布阻塞问题。

- `frontend/src/lineups/components/locker-room.js` 继续使用原有指针捕获、方向判定和边界处理。圆点没有点击处理，读屏状态随当前球员更新。
- `frontend/src/lineups/views/locker.js` 更新的当前球员仍通过 `selectedByProfile` 传给 `wizard/controller.js`，进入编辑面板时保留选中的队员。未修改持久化逻辑。
- 两种外观使用相同的等宽按钮网格，样式审查覆盖手机竖屏、短屏和桌面分支。设备与浏览器证据由主控记录在 [HC-069](../tasks/HC-069-locker-controls-release.md)。
- 旧名片预览依赖正式页面的实时结构，移除名片后无法复现旧版。HC-068 已注明用历史截图查看旧方案。
