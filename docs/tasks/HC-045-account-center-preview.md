# HC-045 ·「我的」与个人账号交互预览

- 日期：2026-10-28；状态：`completed`（独立交互原型）。
- 用户批准[三状态效果图](../../artifacts/design/account-center-concept/overview-v1.png)，并确认第一版真实账号用途为「个人账号：备份球队、换手机恢复」。本轮先完成可点击的独立页面预览；不把视觉批准记录为账号服务已实现。
- 设计：[个人中心与账号备份](../design/account-center.md)。正式版仍1.23.0；现有本机档案、26套战术、推荐及APK不改。

## 分工与接口

主控负责需求、任务/设计、QA脚本、浏览器验证截图、现有正式文件hash保护、集成及Git同步。ui负责`frontend/previews/account-center/`内index.html、preview.css、preview.js，可读取现有本地NBA资源，禁止改正式src/styles/index/存储/配置、依赖与APK。interaction_design仅只读独立审查，维护本任务review与reviews索引；不执行产品实现或ADB。

原型入口支持`?embedded=1&state=guest|member|login`；默认guest。`#app-screen`、`[data-demo-state]`、`[data-action]`为明确可验证控件；window.accountPreview提供ready、setState(state)、state()。state()至少返回demoState、modal、activeTeamId、view；使用query切换和页面外演示控制，不让填写账号密码自动变成已登录。加载方式为普通本地script，可file打开，也可本机静态HTTP。

## 边界与验收

仅内存示例，不读写Storage/IndexedDB/Capacitor，不fetch/提交账号密码，不调用真实登录或云同步；登录提交显示「交互预览，尚未接入账号服务」，不显示登录/备份成功。member通过页面外「已登录示例」切换，应用内同步状态显式注明示意。登录/注册/找回/备份/设置/关于均有明确、可关闭交互或说明。球队选择只改预览当前队，创建入口仅显示任务示意；训练场/战术库导航不伪造正式业务。

沿用冰川蓝/银灰、顶部留白、四项玻璃底栏与浮起面板/渐进模糊。390×844、360×640、360×400、844×390、1024×768下全页不滚动，当前可见控件非零且fit/hit；弹层背景禁点、Tab隔离、Escape/关闭/本地继续关闭及焦点返回有效。450ms开合有实际中间帧，减少动效直接到位。已保存正式源码hash保持；独立审查后保存三态/关键尺寸PNG和JSON证据。无APK编译、无真机写入，原型验收不冒作正式账号验收。

## 实现与自动验证

ui交还三个原型文件，主控增加[三屏对照页](../../frontend/previews/account-center/overview.html)和[复用QA脚本](../../scripts/qa/check-account-preview.mjs)。[可点入口](../../frontend/previews/account-center/index.html)可本地file打开；手机默认保留页面外三态控制条，embedded模式只显示App内容。已登录示例直接标「个人账号示例」「备份状态示意」，表单提交仅显示尚未接入，关闭时清空DOM中的账号/密码。示例球队选择进入更衣室示意，管理不切队。

最终[HTTP完整预览回归](../../artifacts/qa/account-preview-1793172707698/run.json)77组布局、5尺寸完整交互通过，所有可见控件非零/fit/hit、整页无溢出；覆盖三态、球队/管理/创建/工具/四导航、登录提交不改变身份、注册/找回、Tab/Escape/背景隔离与复焦、遮罩关闭、快速示例切换及减少动效。自然开场29帧、收回28帧覆盖中间位置与背景blur；213份现有正式文件SHA保持，errors/remoteRequests与Storage/IndexedDB/fetch/XHR/beacon拦截调用均为空，专属profile/server/下载目录已清理。所有三个实现文件修改时间均早于最终运行，未在验证中换输入。

首轮在3组布局后因QA以同名data-action误选遮罩而非关闭按钮退出；[失败run](../../artifacts/qa/account-preview-1793172664419/run.json)与browser-first-run.log保留。主控把QA action限定button后完整重跑通过，不改产品或放宽可达性断言。额外[本地file验证](../../artifacts/design/account-center-concept/file-verification.json)覆盖390×844/360×400/1440×1100的默认非embedded三态，共9布局通过，errors/remote为空；与HTTP报告分记。

主控亲看[真实HTML三态截图](../../artifacts/design/account-center-concept/interactive-overview.png)及极短屏，原批准的imagegen图overview-v1.png不覆盖。此轮未编译/安装APK、未请求用户真实凭据、未读写真实球队；真实认证/云备份及设备体验不作为本任务已完成内容。

interaction_design完成[独立终审](../reviews/HC-045-account-center-preview.md)，无未修P1/P2；只读重算213正式hash、77HTTP/9file与29开/28收样本，实际controller内存夹具核旧rAF/快切/reduced/焦点/提交不变身份及关闭清空密码，亲看真实截图。原型源码、QA与文档提交同步私有origin/main，生成图/QA原始证据按既定规则留本机artifacts，不作为源码上传。
