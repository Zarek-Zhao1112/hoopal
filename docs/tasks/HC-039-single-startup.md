# HC-039 · 修复两段启动开场

- 日期：2026-10-27；状态：`completed`。
- 用户反馈进入App看见两个动画，要求检查。当前1.22.0原生启动主题仍显示launcher头像，随后网页又播放HOOPAL/柜位展开；本轮修复为系统阶段同色静态衔接，仅网页保留批准的展开。
- 关联：[启动设计](../design/app-icon.md)、[HC-038](HC-038-hoopal-startup-release.md)。目标1.22.1/code25，依既有授权覆盖当前手机，保原包名/签名/头像/数据。

## 范围与接口

主控独占MainActivity.java、原生values/styles.xml、新增启动专用透明vector，以及版本/锁文件/任务与验证脚本；不改网页业务、启动1400ms时钟或存储。使用项目现有androidx.core:core-splashscreen 1.2.0，无依赖安装：installSplashScreen在super.onCreate前，系统退出时直接remove而不叠加离场动画。原生启动icon改为专用透明drawable，系统背景保持app_window_background；桌面/圆形/自适应图标不变，不使用windowDisablePreview或修改系统全局动画设置。

Android12冷/温启动系统仍有必需的启动窗口，不宣称删除OS动画；消除的是额外的中心头像品牌开场和退出动效，网页作为唯一品牌展开。前台恢复不重播、慢读/错误/skip行为沿用HC-038。既有原生系统开屏与网页串接的设计被此次用户反馈修正。

官方依据：[启动机制](https://developer.android.com/develop/ui/views/launch/splash-screen)、[迁移与重复开屏](https://developer.android.com/develop/ui/views/launch/splash-screen/migrate)、[兼容API](https://developer.android.com/reference/androidx/core/splashscreen/SplashScreen)。animationDuration只描述icon动画，并不控制系统窗口停留时长；不依赖单改duration掩盖问题。

engine只读核查网页是否双实例/重复调用，反馈结论不改实现；interaction_design独立只读审查原生theme/兼容顺序/退出remove与资源范围，写本任务review及索引，未参与实现。

## 验证与交付

安装前保留当前版本冷启动过程证据（只展示本应用阶段），核原生+网页两次品牌。源码审查、npm test/Android构建、v2原证书/原包名/新版本、APK30离线资源逐hash同dist且逐项同1.22.0APK；若web输入相同不重复26套长时浏览器回放，沿用HC-038完整浏览器证据并明确本轮未重跑。

当前设备重新核对、无未保存配置、即时档案/进度备份后install-r。冷启动实际录屏/逐帧对比核没有中心头像二次开场、网页展开一次/无残留，程序skip/前台恢复与最终四页可用/数据hash保持。系统COLD、视频/程序及物理用户体验证据分别记录；未有人工确认保持awaiting_device。清理仅本轮录屏/服务/profile/动态转发，保留其他连接与用户窗口。

## 实现、验证与证据限定

MainActivity使用现有core-splashscreen，在super前install、super后退出回调直接remove；启动专用透明vector/透明icon背景/动画duration0，NoActionBar窗口底色与原app_window_background一致。没有windowDisablePreview、全局动画设置或桌面icon改动。engine只读核网页为单例/幂等ready/完成不可重播，普通导航和恢复没有第二个网页入口。

213检查（210单元/3HTTP）与23秒Android构建通过。新[APK](../../artifacts/apk/archive/hoopal-1.22.1.apk)为1.22.1/code25，SHA256 1fa6dee15b42a5059f3b7df2af8ffc098d9a694e18bb4fd7d1a99308a6494615；[资源](../../artifacts/qa/hc039-apk-assets.json)核30网页逐hash同dist及1.22.0 APK、15编译mipmap PNG同旧包、无server.url/同包名/球搭显示名；[签名](../../artifacts/qa/hc039-apk-signature.txt)v2原证书通过，[透明vector编译](../../artifacts/qa/hc039-compiled-empty.txt)核对。前端源/资源未变，本轮未重复26套长时浏览器回放，明确沿用HC-038完整Chrome与启动专项。

旧1.22.0真实[COLD录像元数据](../../artifacts/qa/hc039-cold-before.json)记录818ms；[干净阶段联系表](../../artifacts/qa/hc039-before-sequence.png)仅展示本应用系统窗口进入→HOOPAL展开，所选11帧未见独立的原生中心头像，不能声称视频证实两次头像。配置中launcher头像原生开屏与网页品牌并存是源码证据；系统入口动作与网页展开相继发生是录像证据，两者不可混同。

无未保存配置检查后即时备份真实0档案/进度，指定ef473680/M2101K9C正常install-r Success/COLD741ms。[before](../../artifacts/qa/hc039-device-before.json)/[after](../../artifacts/qa/hc039-device-after.json)版本25/1.22.1和前台核对，档案SHA dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253、进度7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c保持。未清用户数据或创建队伍。

after录屏尝试在录制前前台保护退出，未取得新版本冷启逐帧证据，不声称after视频/新增原生skip或恢复测试通过。随后用户明确反馈「现在没有了」，并转入延长停留/放慢动画的讨论；本轮据用户真机实际确认完成可感知重复问题的视觉验收，替代原定after逐帧方式，保留未取得视频的限制。没有继续打断手机使用；网页skip/错误/后台机制沿用同字节HC-038证据，其他历史人工待办不扩称本轮已验。

[独立审查](../reviews/HC-039-single-startup.md)分别核源、编译/资源、安装和用户反馈。仅清本轮提帧Chrome/profile及设备临时录屏，原始本地QA录像/联系表作为证据保留；不公开桌面或他应用画面，保留其他连接。当前网页总1400ms未改，下一节奏提案只讨论。
