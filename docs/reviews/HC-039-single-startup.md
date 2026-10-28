# HC-039 · 原生重复开场修复审查

- 日期：2026-10-27；审查者：interaction_design，未参与实现。
- 状态：`completed`。原生源码 / 构建及保数据安装通过，用户真机反馈确认重复开场已消失；无未修P1 / P2。修后录像未取得，验收证据调整及限制见下节。
- 范围：[合同](../tasks/HC-039-single-startup.md)，仅原生启动主题 / MainActivity / 启动专用透明vector及版本调整。

## 源码与兼容顺序

只读核对 MainActivity.java、values/styles.xml、drawable/startup_empty.xml、Manifest、现有core-splashscreen1.2.0依赖及本地Capacitor BridgeActivity实现。

`SplashScreen.installSplashScreen(this)` 在super.onCreate前执行，随后同步设置 `SplashScreenViewProvider::remove` 退出监听，不添加离场动画或额外保持条件。BridgeActivity自身同NoActionBar后置主题不冲突。Launch保持Theme.SplashScreen / postSplashScreenTheme，专用108dp透明vector及透明icon背景仅供系统启动主题；NoActionBar补原app_window_background作静态衔接。Manifest桌面 / roundIcon引用未改，不使用windowDisablePreview或全局系统动画设置。

独立核对[Android迁移说明](https://developer.android.com/develop/ui/views/launch/splash-screen/migrate)与[兼容API](https://developer.android.com/reference/androidx/core/splashscreen/SplashScreen)：安装顺序及监听后必须主动remove符合官方接口；animationDuration不决定系统窗口停留，故本修复不依赖把duration设零来隐藏窗口。min24通过现有兼容库覆盖，Android12仍有系统必需启动窗口，不能宣称删除OS启动。

## 编译与网页范围

读取[资源报告](../../artifacts/qa/hc039-apk-assets.json)：1.22.1 APK的30项web资源既逐哈希匹配当前dist，又全部与1.22.0 APK一致；15个编译mipmap PNG也与旧包相同。启动专用透明vector另有compiled-empty文本确认；保持com.halfcourt.tactics和球搭显示名，版本1.22.1 / code25。

[签名文本](../../artifacts/qa/hc039-apk-signature.txt)确认v2原证书有效，[badging](../../artifacts/qa/hc039-apk-badging.txt)确认原包名 / 球搭 / code25。主控报告213检查通过、Android构建23秒；APK SHA256 `1fa6dee15b42a5059f3b7df2af8ffc098d9a694e18bb4fd7d1a99308a6494615`。

网页输入不变，本轮按合同不重跑26套长时浏览器回放，明确沿用[HC-038完整浏览器及启动控制证据](HC-038-hoopal-startup-release.md)。网页重载不能覆盖系统原生启动窗口；原计划新旧COLD逐帧 / 前台恢复程序检查未全部取得，不将沿用证据写成HC-039新测。

## 安装、视觉证据与用户确认

- 主控在ef473680正常install-r Success，版本1.22.1 / code25，报告COLD启动741ms。[安装前](../../artifacts/qa/hc039-device-before.json) / [安装后](../../artifacts/qa/hc039-device-after.json)实际均零档案，档案SHA256 `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`、选择SHA256 `7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c`前后相同，包名 / 原签名 / 原头像保持。
- 修前真实[冷启录屏信息](../../artifacts/qa/hc039-cold-before.json)及[干净联系表](../../artifacts/qa/hc039-before-sequence.png)由主控 / engine采集和抽帧；审查者亲看联系表，只见系统窗口过渡后进入HOOPAL展开，所选帧未出现独立中心头像。不能把这些帧写成“视频证实两次中心头像”；旧源码中原生launcher图标与网页品牌先后配置为另一类依据，不替代画面事实。
- 修后录屏尝试在录制前因前台保护退出，没有取得after视频，故没有修后逐帧通过证据。未继续抢占手机，没有将保护退出当作产品失败或已有录像。
- 用户安装后明确反馈：“现在没有了，我想让这个球搭这个页面停留时间长一些，动画有点快了，我们讨论下”。按用户最新真机确认，重复开场问题已消失；此人工反馈替代本次原计划after逐帧的视觉验收。结合有限原生修改、实际安装、网页 / 桌面图资源一致及数据保持，足够本项修复收口，不扩大为其他OEM或全部原生交互已验收。
- 用户关于更长停留 / 动画时长的新要求当前仅讨论；代码未调整，网页时序仍为1400ms。不把后续时序设计列作本native修复未完成项，也不新增审批流程。

## 验证边界

审查者未运行Chrome、ADB或构建，只读源码、官方文档 / 编译 / 安装报告并查看修前选帧；安装 / COLD由主控执行，修后视觉结果来自用户人工反馈。未声称after视频、HC-039新测skip / 前台恢复或其他OEM / API通过；原网页行为沿用HC-038证据。旧物理CRUD待办保持原任务范围，不作为本native修复额外必需验收项。
