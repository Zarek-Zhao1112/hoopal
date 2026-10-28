# HC-046 ·「我的」页正式接入与手机更新

- 日期：2026-10-28；状态：`awaiting_device`。正式接入、自动回归、独立审查、APK及手机覆盖更新已完成，人工操作体验待确认。
- 用户指出手机未更新；此前HC-045只交付原型。本轮将已批准个人中心布局接入正式App，目标1.24.0/code29，构建后保数据更新既定ef473680/M2101K9C。
- 设计：[个人中心与账号备份](../design/account-center.md)。用户已确认个人账号用于备份球队/换机恢复，真实认证和服务尚未部署，本轮入口诚实显示「尚未开放」，不收集凭据或显示已登录/已同步。正式页面不带预览状态切换或演示球队。

## 分工与接口

主控负责frontend/index.html导航名称/图标、版本/配置、最终集成、任务设计/文档、npm/Chrome/Android/ADB验证安装及Git同步。内部view=archives保持，底栏仅显示名改「我的」；正式26套战术/规则/资料协议不变。

ui独占frontend/src/lineups/ui.js、views/archives.js、views/locker.js的小型文案、lineups/styles.css以及新增account相关components/CSS；必要时只在components/sheet.js加入默认值兼容的可选id参数，保原wizard行为。真实档案仍走现有perform/select/create/menu与draftStore，读失败/错误/分页/上限和来源清除不弱化；保.lineup-archives-card、.lineup-archive-card、原data-action/data-profile-id与三卡分页。新页面顶部「我的」、账号卡、「我的球队」及工具区；外层边框盒同原四页，内部可分玻璃卡。账户/备份450ms玻璃说明面板应纳入isModalOpen/handleBack/背景隔离/复焦/reduced，不能与向导重复id或误解除另一面板隔离。UI不调用存储/网络/原生，不改app/platform/shared/data或构建配置。

engine独占tests/e2e/*所需显示名更新与新account-center-flow.mjs、browser-qa集成；可补相关行为单元夹具。保现行所有断言，只调整批准的显示名，并新增真实页面空/3/4/多档案、账户不可用/备份不可用、其他工具/草稿回原处、真实选择/失败/无写盘、五尺寸含360×400、450ms实际帧/背景/焦点/键盘与模态Back程序分发、reduced等检查。不修改生产文件或运行ADB/build；把Chrome运行留给主控。

interaction_design独立只读审查，仅维护HC-046 review及reviews索引，不实现生产代码。重点查账号入口真实性、真实球队/来源/失败保护、sheet多实例隔离、完整回归和真机证据。

## 数据与验收

不新增账号键、迁移或业务服务器；多档案与内置进度仍本机原键，图标/原生启动/2.4秒时序保持。原有26套帧/18规则/10推荐fixture逐项同基线，身份文件源hash保持（版本配置单列）。npm test、最终完整Chrome（含新增真实页面检查）、独立审查通过后Android构建，核30类实际打包资源/原v2证书/原图标/no server.url/1.24.0与code29。

安装前核设备身份与当前向导/忙态，备份即时档案及进度；install-r后核版本/双hash/前台。真实WebView程序检查「我的」页、账户/备份不可用说明、面板开关/无测试档案保存；真机人工交互与程序分记，未获人工反馈则awaiting_device。原型仍独立保留，不作为正式验收替身。最终提交源码/文档并推送既有私有仓库。

## 实际实现与验证

已将真实archives页面接为「我的」，新增account-cards/account-sheet/account-center.css；ui.js纳入新面板锁、返回和重绘隔离，共用sheet仅增加默认兼容id/labelledBy，旧wizard默认不变。账号/备份不开放，无凭据字段、演示账号或演示球队；球队数据始终来自现有仓库，原select/menu/create/pager与数据协议保留。只更新底栏显示名/人形图标，内部archives路由不变。

[npm test](../../artifacts/qa/hc046/npm-test.log)225项通过，数据26套/18规则/10推荐fixture/6身份源同原基线；[最终完整Chrome](../../artifacts/qa/runs/1.24.0-1793174647181/run.json)一次性14组全过，errors/remoteRequests为空、tempCleaned=true。原13组含26套回放、启动、导出/离线、96组四页同框、真实档案/来源/草稿与错误恢复全部保留；新增[我的页专项](../../artifacts/qa/runs/1.24.0-1793174647181/hc046-account-center.json)有36个页面/分页布局、20个说明面板记录和20组自然早/中/末采样。五尺寸完整覆盖，另加835×340实际横屏高度边界；Storage与请求审计为零、原文/来源/主Play保持、真实写失败重试及保留草稿返回通过。采样与CSS450ms对应，不宣称浏览器全段逐RAF或物理Back通过。

主控亲看真实正式页空态/七队/短屏说明图；浏览器测试档案只存在专属profile，不是用户手机数据。interaction_design完成[独立终审](../reviews/HC-046-account-center-release.md)，实际多sheet/UI guard夹具、数据基线、报告/实图与包/原生证据复算通过，无未修P1/P2。

28秒Android构建1.24.0/code29，[APK核对](../../artifacts/qa/hc046/apk/apk.json)30网页同dist、15图标同1.23.0、原v2证书、球搭label/no server.url通过；SHA256 `65eea001c8973f82a5443ed3c5474c116a9ba51ac404a7626f95ecfbab483b05`。原1.22.3包按[归档记录](../../artifacts/qa/hc046/apk-archive.json)移至archive，SHA保持并同步历史链接，顶层保1.24.0及回退参考1.23.0。

手机重新识别ef473680/M2101K9C，安装前1.23.0/code28、当前0份档案、无打开向导/当前可见保留草稿指示、busy=false；检查不证明全部关闭内存草稿均不存在。即时原文备份后install-r Success，[COLD启动](../../artifacts/qa/hc046/device-launch.txt)754ms/Wait760ms，[after](../../artifacts/qa/hc046/device-after.json)明确1.24.0/code29、前台与双hash同：档案`dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`，进度`7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c`。

[真实WebView96竖屏393×819](../../artifacts/qa/hc046/native-account.json)检查我的页及四说明共5组几何，全部fit/hit、无整页溢出、输入数0；账号/备份明确尚未开放，导航在面板开闭期间锁定并恢复，724连续RAF样本含opening148/closing135、四次开合，errors为空。原Play与双文件保持，没有保存测试球队；主控亲看[手机我的页](../../artifacts/qa/hc046/native-my-page.png)及[账号说明](../../artifacts/qa/hc046/native-account.png)。探针和自身动态转发清理、原视图恢复。此为真实设备DOM程序与截图，不冒称物理手指、系统Back/输入法/旋转或原生CRUD已新验；人工体验待确认。

最终源码/文档提交并同步既有私有origin/main；账号认证、云存储与换机恢复仍需后续服务接入，本任务没有部署或发布这些服务。
