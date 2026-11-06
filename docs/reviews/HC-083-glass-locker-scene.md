# HC-083 · 玻璃更衣室场景独立审查

日期：2026-11-06。审查者：`hc083_review`。源码只读，未参与实现。

## 范围与结论

审查 `frontend/styles/appearance-locker.css` 中 HC-083 的双外观共享场景、玻璃伪元素和控件覆盖规则，并参照 [设计](../design/glass-locker-scene.md) 与 [任务](../tasks/HC-083-glass-locker-scene.md)。未审查工作区中其他任务的未提交实现。

在本次源码、浏览器和截图范围内未发现需要修复的功能问题。

## 证据

- 人工查看主控生成的 390×844、375×480、844×390 玻璃截图：场景覆盖全卡，球衣在柜内，暖灯与冷蓝背景可区分，标题和两个按钮清晰。背景伪元素处于独立堆叠层，不覆盖交互内容。
- 独立计算 `artifacts/qa/hc083/` 下五组 `before-realistic-*.png` 与 `after-realistic-*.png` 的 SHA-256，390×844、360×640、844×390、1280×900、375×480 全部相同，未观察到写实版像素变化。
- 使用现有 `createBrowserSession` 创建独立 Chrome 会话，对当前构建执行四人长队名和无球队夹具，不接触真实用户资料。四人长队名在上述五尺寸使用省略显示，页面无横向或纵向溢出；空卡在上述五尺寸载入本地场景，创建/选择球队按钮中心命中且可操作。
- 独立检查玻璃场景伪元素计算样式为 `pointer-events: none`。聚焦 `.locker-viewport` 后按右方向键，当前球员切换到第 2 位，`.locker-position` 的辅助说明同步；四人阵容有四个圆点。
- 检查共享 CSS 与现有手势组件：整卡指针监听、横滑阈值、选择回调和单人编辑接口未变；无新增存储与网络依赖。独立浏览器会话运行异常列表为空，最终关闭并清理其临时 profile。

## 限制

本轮独立动态验证使用桌面 Chrome 的视口模拟。没有构建或安装 APK，没有在 Android WebView 96 实测滤镜、磨砂性能及系统栏；设备画面和用户手指体验仍需分别记录。主控专项的 `after.json` 已生成，横滑和单人编辑结果由主控任务记录引用，本审查未独立重复这两项。

## 启动快照集成复审

追加审查 `frontend/src/startup/controller.js` 的 `cabinetSnapshot` 包装器及原函数改名为 `freezeCabinet`。完整场景隐藏了真实柜体 DOM，旧启动快照因此只剩球衣；主控保存的失败证据位于 `artifacts/qa/runs/1.36.0-1793940642775/`。本修正把 viewport 克隆到 `#lineups-panel` 外临时 `.locker-scene` 中，取原单柜样式冻结，随后移除临时节点；目标位置仍来自真实 viewport。

- 只读审查确认临时 host 的离屏、透明、禁指针与 `aria-hidden` 不依赖 `inert` 生效；WebView 96 不支持 `inert` 时仍有其他隔离。创建、计算与移除没有异步等待，`finally` 覆盖冻结异常。克隆不携带原 `addEventListener` 监听，真实节点未被搬走。
- 输入 SVG ID 在临时克隆连接的同步区间会短暂重复；冻结继续使用既有子树 ID 映射，把最终快照中的 ID 和 URL 引用改成 `startup-paint-*`。临时 host 不跨事件循环存活，没有新增最终 DOM 的重复 ID。
- 独立 Chrome 实测正常和受控冻结失败两条路径：每次临时 host 仅创建一次，准备完成时 `body > .locker-scene` 均为 0，原 `.locker-viewport.outerHTML` 与创建前相同，整页最终 ID 无重复。正常快照有一个绘制子树；通过仅针对临时 host 的 `getComputedStyle` 异常注入，确认异常路径仍移除 host、清空快照、可完成跳过，且无未捕获运行异常。独立会话已关闭和清理。
- 主控修正后的 `artifacts/qa/runs/1.36.0-1793940825770/run.json` 中 `startup` 通过；同轮 `locker-frame` 在旧断言失败，因此该目录的整体状态为失败，本审查不把它写为整轮通过。

复审结论：未发现需要修复的启动快照功能问题。未新增需要较新 WebView 支持的必需 API；Android 的实际启动画面和性能仍属于设备验收。

## 1.36.1 手机交付复审

按用户追加的手机更新要求，只读核对 `artifacts/qa/hc083-apk/`、`artifacts/qa/hc083-device/` 及源码版本，未重新构建或操作设备。

- `package.json`、`package-lock.json` 与 `android/app/build.gradle` 一致为 1.36.1，Android code 为 46。`badging.txt` 与设备安装后记录一致，包名为 `com.halfcourt.tactics`；设备从 1.36.0/code45 升级至 1.36.1/code46，序列号与型号均保持 `ef473680 / M2101K9C`。
- 独立计算 `artifacts/apk/hoopal-1.36.1.apk` 的 SHA-256 为 `0757dc3d76bca236552eaa6a7bc0d594d4b78154e2e2a41fd6945cf8ff4215ab`，与 `apk.json` 一致。`signature.txt` 记录 v2 签名验证成功，证书 SHA-256 与报告一致。32 个网页资源、15 个图标及无 `server.url` 的结论来自主控 APK 校验报告，本复审未再次解包对比。
- 安装前后均为 1 支球队，球队文件 SHA-256 同为 `cc6103d3fd35f00c7a16549a7c3dbaf69a1d83452f6508018af9a86ca77c229f`，战术选择文件 SHA-256 同为 `ed9ef37524892c34d008af1e5f50e54926ded3041b2cce02f016b2a31af45107`。核对原生探针代码确认，双外观/换人检查后又从设备文件读取并比对此两项哈希，`dataUnchanged` 为真。
- `native-checks.json` 的 UA 为真实 Android 12 / M2101K9C / WebView Chrome 96，视口 393×819。两种外观的球衣坐标和尺寸相同，两个按钮均宽约 160.55、高 46 CSS 像素，中心命中且在屏内，无页面溢出。玻璃伪元素加载本地图片、滤镜已生效且不接收指针。
- 探针通过真机 WebView CDP 输入从第 1 位滑至第 2 位，确认编辑资料对应当前球员，再还原选中项；页面 reload 后启动结束且临时 host 已清理，异常列表为空。人工查看 `native-final.png`，玻璃整卡场景、暖灯、当前真实球衣及等宽按钮与设计方向一致，最终页面停留玻璃更衣室。

交付复审结论：版本、包哈希和记录一致，安装及原生程序检查支持本次交付，未发现阻断问题。CDP 输入属于真机程序验证；启动检查是页面 reload 完成及临时节点清理，未独立采样首秒柜体或测量真机帧率，也不等同于用户手动滑动、返回、旋转与观感验收。任务仍应保持 `awaiting_device` 等待用户体验确认。
