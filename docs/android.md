# Android 离线版

## 运行方式

2026-10-23 用户已更换手机，要求后续都安装到新手机。当前识别为 M2101K9C，ADB 序列号 `ef473680`；旧设备 `3b502e83` 的安装记录仅作历史。每次安装先重新核对 `adb devices -l`，不沿用旧设备目标。

新机 API31 / WebView96，1.7.0 首次 USB 安装受系统限制，已把 APK 传至下载目录并由用户正常确认安装；版本/冷启动/空柜截图已核对。初装时无阵容，不自动复制旧机或写入示例队员；该版真机交互待办见 HC-010。

1.8.0 / code10 已经通过 USB 正常覆盖安装到同一新机，返回 Success，冷启动与版本核对正常，更新前后均为 0 档案。NBA 选队的完整原生交互待验，见 [HC-011](tasks/HC-011-nba-team-kits.md)。

1.9.0 / code11 已覆盖安装同一新机并冷启，新增圆形切页、去常驻离线文案，柜位按用户最终箭头选择改为左拖下一位 / 右拖返回。此时用户已自行创建1份阵容，升级前后字节哈希一致。真实WebView96程序点击切页与清理通过；新版手指 / 旋转 / 输入等完整验收待做，见 [HC-012](tasks/HC-012-page-motion.md)。

1.10.0 / code12 已覆盖安装同一新机并冷启，接入用户批准的600ms柔光扩散。137检查、六屏Chrome与独立审查通过，27项APK资源与dist哈希相同。现有1份阵容文件升级前后字节保持；真实WebView96三主页面程序点击、曲线和光晕清理通过，完整物理操作仍待验，见 [HC-014](tasks/HC-014-soft-glow-release.md)。

1.11.0 / code13 已覆盖安装同一新机并冷启，战术库接入默认全收起的标题卡，逐卡开合与明确开始演练；浏览人数/攻防不改当前演练。143检查、六屏Chrome、独立审查及27资源哈希通过，原1份阵容字节保留。实际WebView96程序标题开合/换卡/命中通过，原生CTA/物理操作待验，见 [HC-016](tasks/HC-016-library-title-cards.md)。

APK 内包含前端页面、动画引擎、阵容推荐规则和内置 3v3 / 4v4 战术。安装后，档案配置、推荐计算、播放与保存均在手机本地完成，无需启动电脑上的 Node 服务。应用最低 Android 版本为 7.0（API 24）；需要可运行当前 JavaScript 的 Android System WebView。

1.12.0/code14已更新到同一新机，用户批准的库里卡通图标在系统详情与实际MIUI桌面显示确认；启动图标引用同步、网页favicon同源。28网页资源与15编译图标验证、独立审查通过，本次升级前实际0档案，前后文件hash一致。图标母版、导出脚本和真实显示证据见[HC-017](tasks/HC-017-curry-app-icon.md)。

1.13.0/code15已覆盖安装同一新机并冷启动，阵容页接入品牌区、开放式单柜与450ms玻璃任务面板。153检查、六屏Chrome、独立审查、28网页资源哈希和v2签名通过；升级前后实际0档案文件字节一致。真实WebView96程序验证三任务/四成员、背景模糊、说明优先关闭、放弃草稿及焦点返回，未点击最终保存、未写入测试档案。物理手势、系统输入法、原生返回与旋转待验，见[HC-021](tasks/HC-021-lineup-glass-release.md)。

项目采用 Capacitor 8，应用标识为 `com.halfcourt.tactics`，当前显示名为「球搭」（英文品牌HOOPAL）。更名保留原包名、签名、存储目录及键，覆盖安装沿用原资料。`capacitor.config.json` 的 `webDir` 为 `dist`，没有配置开发服务器 `server.url`。不要为了正式打包把它指向电脑 IP。

1.14.0/code16已覆盖更新同一新机，训练场/库接入批准的留白单卡，导航更衣室/训练场/战术库，仅更衣室保留品牌。153检查、完整六屏Chrome、最终布局/错误注入复验、独立审查、28资源/v2签名通过；COLD启动、版本与前后实际0档案字节保持已核对，实际WebView96程序三页/菜单/筛选/共享人数检查通过。没有保存测试阵容，物理操作待验，见[HC-023](tasks/HC-023-page-adaptation-release.md)。

1.15.0/code17已正常覆盖安装同一新机，球队第二任务采用批准的浅弧队徽转盘、左右滑动/吸附、30队快速入口与球衣联动。150单元+3HTTP、修后完整Chrome/四尺寸、独立审查、28资源/v2签名通过；COLD启动595ms、版本/前台及实际0档案前后文件hash一致确认。实际WebView96程序检查初始中性/空选拒绝、BOS→LAL/返回、列表模拟Escape焦点和任务往返通过；未最终保存测试阵容，结束放弃草稿，转发已清理。物理滑动/FPS/系统Back等待验，见[HC-025](tasks/HC-025-team-carousel-release.md)。

1.16.0/code18已覆盖更新同一新机：26套战术、新六套进攻与推荐、每人数进攻6＋3分页。181检查/完整Chrome/独立审查/28资源逐hash与v2签名通过，COLD启动628ms。实际0档案安装前后hash一致；WebView96程序浏览六卡、分页/防守过滤及点击范围通过，阵容和内置进度字节均保持。未点原生CTA/最终保存，物理操作待验，见[HC-027](tasks/HC-027-new-tactics-release.md)。[该版APK](../artifacts/apk/archive/halfcourt-1.16.0.apk)也可发送到Android平板直接安装。

1.17.0/code19已覆盖更新同一新机：战术库一页九张、短屏覆盖返回和横屏分区，实际动画/推荐与阵容保持。182检查/完整Chrome及代码图检通过，28资源/v2签名通过，COLD725ms；安装前即时刷新真实0档案及播放进度，前后双hash一致。真WebView96/393×819程序浏览18张进攻与防守筛选通过，无pager/溢出且全部命中；未点原生CTA/最终保存，物理操作待验，见[HC-029](tasks/HC-029-single-page-library-release.md)。[该版APK](../artifacts/apk/archive/halfcourt-1.17.0.apk)可直接发送到Android平板安装。

1.18.0/code20已覆盖更新同一新机：卡内真实循环/1秒末停/点击暂停继续及进入训练场。195检查、完整Chrome与代码审查通过，28资源逐hash/v2签名通过，COLD851ms。安装前后真实0档案及进度双hash同，真WebView96全部26卡、自然循环/暂停剩余、实际HOME后台暂停与手动继续程序检查通过，原主Play保持；未最终保存测试档案或点原生EnterTraining，完整物理验收待做，见[HC-031](tasks/HC-031-inline-motion-release.md)。[当前APK](../artifacts/apk/archive/halfcourt-1.18.0.apk)可发送到Android平板安装。

## 构建

1.23.0/code28仅整理目录、拆分模块与QA工具，26套战术及推荐输出保持。225检查、完整Chrome13组、48对布局事实与独立审查通过；21秒构建、30网页同dist/15图标同前包、无server.url及v2原证书通过。指定手机install-r Success/COLD952ms，实际0档案及进度双hash保持；本轮横屏WebView96四页同框、未保存建队三步/放弃及1332样本自然循环通过。物理体验未作新验，见[HC-043](tasks/HC-043-project-organization.md)。

1.22.3/code27修正低位分切蓝方对位、绕挡追防和低位限补回收，进攻路线/七帧/球权/旧进度及其他25套保持。215检查、独立动作审查、自然库/训练回放、四尺寸和七旧步骤恢复通过；25秒构建，30网页同dist/15原图标/Native保持/v2原证书通过。指定手机正常覆盖安装，COLD682ms，实际0档案及进度前后双hash同；真实WebView96整轮1345样本、暂停/同源位置/数据保持通过，未点手机训练CTA或写测试队。人工观感待验，见[HC-042](tasks/HC-042-post-split-defense.md)及[1.22.3 APK](../artifacts/apk/hoopal-1.22.3.apk)。

1.22.2/code26将批准节奏更新为品牌静止1000ms、展开1100ms、交接300ms，标题1165–1825ms淡出；原生启动衔接/桌面头像/布局与旧键保持。213检查、27组合七控制与相关页面阵容回归、28秒构建、30网页同dist/15图标同旧包/Native三源码同基线、v2原签名通过。2026-10-28指定新机install-r Success，实际0档案与进度双hash保持；用户解锁后明确COLD483ms，WebView96自然2415.3ms/一秒静止/skip/四页同框严格复验通过。首轮桥接异常记录保留且未再现，人工节奏观感待确认，见[HC-041](tasks/HC-041-startup-timing-release.md)。[球搭1.22.2 APK](../artifacts/apk/archive/hoopal-1.22.2.apk)可直接发Android平板安装。

1.22.1/code25仅调整原生系统开屏衔接，启动专用透明vector/同色窗口、兼容SplashScreen退出直接remove，不改桌面头像或网页1400ms。213检查和23秒构建通过，30网页及15编译图标逐hash同1.22.0 APK，v2原签名/球搭label/no server.url通过。指定手机正常覆盖安装、COLD741ms，安装前无未保存配置，实际0档案与进度双hash同；用户确认重复开场消失。after视频未取得，视觉验收采用用户真机反馈，未伪称新skip/恢复程序检查。见[HC-039](tasks/HC-039-single-startup.md)及[球搭1.22.1 APK](../artifacts/apk/archive/hoopal-1.22.1.apk)。

1.22.0/code24已覆盖安装当前手机，采用球搭/HOOPAL与原头像，真实柜位圆角展开约1400ms，可跳过，后台返回不重播。213检查/完整Chrome/27布局7控制及独立审查通过；短屏重叠、柜位2px和next遮挡已修。27秒构建、30离线资源逐hash/编译label球搭/原v2证书通过，COLD700ms，安装前即时备份的实际0档案及进度双hash保持。实际WebView96自然63条记录、加载中skip有效意图/无展开帧及四页同框程序检查通过，errors空；未造测试队伍。物理手势/Back/旋转等另待验，见[HC-038](tasks/HC-038-hoopal-startup-release.md)。[球搭1.22.0 APK](../artifacts/apk/archive/hoopal-1.22.0.apk)可发Android平板覆盖安装，无需卸载。

1.21.0/code23已正常覆盖更新当前手机：更衣室玻璃主卡与另三页统一尺寸和边距，保持单柜比例及顶部品牌。205检查、96边界与相关浏览器回归通过；43秒构建、28资源逐hash/v2原证书通过，COLD746ms，安装前后实际0档案与当前进度双hash同。真实WebView96四页主框x18/y116/w357.09/h620.27px、控件可达/无溢出/原数据保持通过；未保存测试球队。物理操作与原生CRUD待验，详见[HC-036](tasks/HC-036-locker-card-frame.md)。[当前APK](../artifacts/apk/archive/halfcourt-1.21.0.apk)可发送到Android平板正常覆盖安装。

1.20.0/code22已覆盖更新当前手机：批准的建队三步、大球衣/下标签、320ms步骤/280ms成员横移与真实输入同步，450ms壳及四页柔光保持。205检查、最终完整Chrome与代码终审通过；横屏成员8px裁切和极短窗口未focus输入两项P2均修复并真实复验。APK46秒构建、28资源逐hash/v2原证书通过，COLD798ms；安装前后实际0档案及进度双hash同。真实WebView96未保存4v4草稿的三步/选BOS/成员/名号同步/3↔4/明确放弃七布局通过，未保存测试球队。物理手指/IME/系统Back/旋转及真实CRUD仍待验，见[HC-035](tasks/HC-035-creation-motion-release.md)。[新版APK](../artifacts/apk/archive/halfcourt-1.20.0.apk)可发Android平板正常覆盖安装。

1.19.0/code21已覆盖安装同一手机：独立「档案」底栏和球队创建/管理、更衣室只显示当前队，保留原26套动画和推荐。195检查、完整Chrome、档案专项/50布局与独立代码审查通过；APK21秒编译，28网页资源逐hash一致、无server.url、原v2证书。COLD820ms，安装前后实际0档案和战术进度双hash同；真实WebView96四页及未编辑创建面板开/放弃关通过。未保存测试档案，物理手势/系统Back/输入法/旋转及原生CRUD待验，详见[HC-033](tasks/HC-033-archive-tab-release.md)。[新版APK](../artifacts/apk/archive/halfcourt-1.19.0.apk)可直接发送到Android平板覆盖安装。

首次准备：

```sh
npm ci
npm run android:sync
```

APK 编译需要 Node.js 22.12+、JDK 21、Android SDK Platform 36 及构建工具。可安装 Android Studio，设置 `JAVA_HOME` 和 `ANDROID_HOME`，然后执行：

```sh
npm run android:build
```

脚本会构建网页、同步 Android 资源、运行 `assembleDebug`，再生成 `artifacts/apk/halfcourt-debug.apk`、`hoopal-版本号.apk`及各自的SHA256文件。原始产物在 `android/app/build/outputs/apk/debug/app-debug.apk`。顶层保当前版与一个回退版，更旧包放在`artifacts/apk/archive/`，同步历史文档链接。

当前构建版本为 `1.23.0`（versionCode 28），目录和模块整理不改变现有功能、存储键或数据格式。安装证据见[HC-043](tasks/HC-043-project-organization.md)，[1.23.0安装包](../artifacts/apk/hoopal-1.23.0.apk)可直接发Android平板，升级保留档案与进度，不需卸载或电脑服务。[1.22.3](../artifacts/apk/hoopal-1.22.3.apk)保作源码/资源核对与回退参考，Android降级安装受版本限制。

当前开发机的便携工具放在被忽略的 `.tools/` 中，构建脚本可以自动使用其中的 JDK、SDK 和 Gradle。这些大体积工具不属于项目源码；其他电脑按上面的标准环境变量配置即可。首次构建需要联网下载依赖，安装后的战术应用可离线使用。

本机应用控制策略拒绝Rolldown原生DLL。项目固定Vite7.3.7及官方Rollup WASM替代包，保留ES2022编译目标，普通`npm ci`和上述构建命令即可使用；无需关闭系统策略。依赖与原因见HC-027任务记录。

用 `npm run android:open` 可在 Android Studio 打开工程。当前产物使用开发签名，供本地测试安装；正式发布前需要单独配置发布签名和版本管理，不要将签名私钥提交到仓库。

## 进度记录与导出

- 内置选择键仅记录模板 ID / 原始步骤，阵容键独立记录成员标签和推荐来源引用，不保存个人 Play。
- 旧草稿、旧个人库及 WebView 副本按用户要求清空；同旧键前缀的备份 / 临时文件定向清理，失败提示并在下次启动重试。
- 选择写入捕获快照并串行执行，原生通过临时文件重命名替换；选择读取失败锁定写入直到重读成功。
- 三步配置最后明确保存后落盘，保存失败保留表单。创建只提交完整档案，前两步和会话草稿不落盘；进程结束不会恢复未保存草稿。返回键先处理上层说明和阵容面板，再处理播放、输入与阵容子页，最后回阵容首页 / 桌面；原生键盘行为仍需真机确认。
- Android 的 JSON 和 PNG 导出会打开系统分享界面，可选择文件保存工具或分享应用；取消分享会显示取消，不会当成保存成功。
- JSON / PNG 导出保留；个人保存、新建和导入入口已移除。已导出的外部文件不随旧库清理删除。

应用升级应使用相同包名和签名。1.3.0 的旧个人数据清理是用户明确要求的功能迁移，其他设置不作整应用清除。

## 验证范围

自动测试覆盖引擎、阵容输入、推荐职责、存储损坏保护、并发快照、两键切换、原生接口模拟、HTTP 资源，以及 Chrome 的只读回放、断网播放、导出、档案配置与重启、人员图例和手机触屏。

安装到设备后还应确认：

1. 断开网络后冷启动，载入 3v3 / 4v4 示例并播放。
2. 创建 / 修改两种人数档案并保存，杀进程后恢复标签和合法推荐来源；取消或保存失败不当作成功。
3. JSON / PNG 能交给系统分享接收端，无个人保存或导入入口。
4. 返回键、横竖屏和前后台切换后，站位及播放状态正常。
5. 真实输入法打开、长昵称完整查看、档案分页及推荐详情均可达。

浏览器模拟与原生接口 mock 的结果不能替代 Android 真机验收。

实现依据：[Capacitor 工作流](https://capacitorjs.com/docs/basics/workflow)、[Filesystem](https://capacitorjs.com/docs/apis/filesystem)、[Preferences](https://capacitorjs.com/docs/apis/preferences)、[App](https://capacitorjs.com/docs/apis/app)、[Share](https://capacitorjs.com/docs/apis/share)。
