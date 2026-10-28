# HC-045 ·「我的」与个人账号交互预览独立审查

- 日期：2026-10-28；审查者：interaction_design，未参与原型或QA实现。
- 结论：独立预览范围审查通过，无未修P1 / P2。不是正式账号、云备份或换机恢复验收。
- 依据：[任务](../tasks/HC-045-account-center-preview.md)、[设计](../design/account-center.md)与批准[效果图](../../artifacts/design/account-center-concept/overview-v1.png)。实现仅frontend/previews/account-center，生产仍1.23.0，无APK构建或安装。

## 独立源码核对

只读审查index.html、preview.css、preview.js、主控overview与QA脚本。普通本地HTML / CSS / script，账号、球队和导航仅内存示例；无Storage / IndexedDB / Capacitor、fetch / XHR / beacon或业务模块引用。生产入口与Vite配置不引用此原型；独立重算[基线](../../artifacts/design/account-center-concept/production-before.json)213个正式文件SHA全部保持。

member仅由query或页面外示例控制切换；个人卡明确「个人账号示例」「备份状态示意」，备份行与说明明确未接入。实际submit listener阻止默认表单提交，只更新未接入提示，不读取 / 发送账号密码，不改变member身份。关闭清空账号 / 密码并恢复密码隐藏状态；不请求真实凭据。创建、管理、设置、关于、注册和找回均为可关闭说明，未宣称登录 / 备份 / 恢复成功。球队选择与管理是相邻独立按钮；选择改变示例当前队并进入更衣室示意，管理不切队。训练场 / 战术库明确仅导航示意，不冒充正式回放。

原生dialog打开和关闭均使用450ms；背景filter渐变，实际背景控件disabled / tabIndex=-1并有capture guard，保护持续到closing结束。Tab在可见启用控件内循环，Escape / 遮罩 / 本地继续统一关闭，之后恢复原disabled / tabindex及触发焦点。generation检查隔离旧两次rAF与timer；减少动效立即到位。响应式按实际stage与visualViewport测量，保vh / dvh顺序；短屏用分栏而非单纯隐藏滚动条压住内容。

## 独立确定性夹具

在内存提取并运行实际isolate / restore、open / close / finishClose / setState、减少动效处理和submit代码，替代DOM几何与调度，未启动浏览器。复验结果：

- opening尚未结束就关闭，旧rAF不重新打开；快速login→guest→member最终保持member示例且弹窗关闭。
- 原本disabled的背景控件仍disabled，其他恢复；普通关闭将焦点还给原触发项。
- 提交仅preventDefault及未接入提示，demoState保持guest；关闭清空两字段、重置密码type与可见性状态。
- opening中切换减少动效后立即open，随后close立即closed，旧回调及计时不改写新状态。

此为实际函数 / 状态夹具，焦点几何、原生dialog和视觉过渡另以主控浏览器及图片证据核对，不把桩对象当真实触摸结果。

## 主控浏览器与独立报告重算

读取[冻结源码后的完整HTTP报告](../../artifacts/qa/account-preview-1793172707698/run.json)：passed=true，77布局、五尺寸完整交互、13截图，errors / remoteRequests为空，tempCleaned=true。五尺寸为390×844、360×640、360×400、844×390、1024×768；覆盖三态、球队 / 管理 / 创建 / 工具 / 四导航、登录不伪认证、注册 / 找回、背景DOM强制点击保护、Tab / Escape / 复焦、遮罩、快速示例切换及减少动效。

审查者逐记录重算77布局，报告内可见控件全部非零 / fit / hit、整页无溢出，Storage / IndexedDB / fetch / XHR / beacon拦截记录全空。实际opening 29条样本，面板top891.6→368，背景blur0→6 / brightness1→.73；closing 28条反向样本，top368→891.6，可见阶段约449.3ms。opening阶段标记含起势双rAF，采样跨度约464.8ms，与CSS450ms和帧调度口径分开，不据此声称精确FPS。

另读[本地file报告](../../artifacts/design/account-center-concept/file-verification.json)：默认非embedded入口在390×844、360×400、1440×1100三态共9布局，API / 本地图片 / 控件与关闭通过。独立重算9条均不滚动且fit / hit，errors / remote为空；与HTTP嵌入舞台证据分开。

首轮在3布局后因QA相同data-action选中遮罩而非button退出，保留[失败run](../../artifacts/qa/account-preview-1793172664419/run.json)。主控只把action helper限定button后完整重跑；原型未变，未把失败隐藏或当产品修复。

## 亲看图片与边界

已亲看批准图及真实HTML[三屏对照](../../artifacts/design/account-center-concept/interactive-overview.png)、[360×400已登录示例](../../artifacts/design/account-center-concept/interactive-member-360x400.png)：冰川蓝 / 玻璃层级、两队与四栏完整；短屏个人卡、工具、球队分栏和按钮可见，账号与备份示意文案保留。审查者核对design目录这两图与已查看的最终QA截图字节一致；未用原imagegen批准图代替真实页面截图。

无真实登录、注册、云端上传 / 下载、冲突处理或本机球队读写；这些属于后续正式设计与实施。审查者只读源码、内存夹具、报告重算、正式文件hash及亲看图片，没有运行Chrome、ADB、构建或手机验证。本任务可按独立预览收口，不新增正式账号服务或设备完成结论；Git提交与同步由主控另行执行。
