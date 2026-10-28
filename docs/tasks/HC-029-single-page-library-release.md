# HC-029 · 一页九张战术库正式接入

- 日期：2026-10-25；状态：`awaiting_device`。正式实现、全部自动检查、独立审查和指定手机覆盖安装完成；物理手指/FPS/旋转/系统返回仍待验。
- 用户确认[HC-028预览](HC-028-single-page-library-preview.md)并要求实施。正式取消库6＋3分页，同人数全部9进攻/4防守直接可见，保留真实演练、推荐与本地数据；版本1.17.0/code19，验证后覆盖更新指定手机ef473680。
- 设计：[纵向叠卡](../design/stacked-library.md)。不改变26套动画、18条进攻规则、旧ID/顺序、存储键/schema/来源协议或个人Play清理；无数据迁移、服务器或账号。

## 所有权与合同

| 负责人 | 唯一写入范围 | 验收与交接 |
| --- | --- | --- |
| ui | frontend/src/workspace/library-deck.js/.css/-state.js、tests/unit/library-deck.test.mjs | 从批准预览迁入纯布局/正式组件，去pager，九卡/overlay/wide；异步锁/失败重试/失效旧节点/resize焦点保护；定向unit和语法后交还，不运行Chrome/ADB |
| engine | tests/e2e本次相关文件 | 一页九卡全可达、四防守、6尺寸/overlay隐藏与返回/控件命中、26实际动画及六新推荐43帧与来源失败原文保护；旧核心回归不得删弱；不运行Chrome/build/ADB |
| 主控 | 版本/共享配置、frontend/index.html小型初始计数、文档/构建/全验证/设备脚本和产物 | API协调，181项基础检查及必要新行为，最终Chrome/APK签名资源/新手机数据保护/安装和WebView程序证据 |
| interaction_design | docs/reviews/HC-029-single-page-library-release.md及审查索引 | 集成后只读实现/报告/图片，未实现相应代码，具体缺陷与复验，分开程序和物理验收 |

createLibraryDeck沿用render/setBusy/reset/refreshLayout/expandedId；page/pages如保留仅兼容0/1。DOM无[data-library-page]，root.dataset.layout=portrait/wide/overlay、count/total与paged=false，保留expandedId/wide/compact/transitioning。只CTA调用原onPlay，浏览/收回/筛选不写选择或清来源。

## 已批准的布局与边界

默认九张标题；常规竖屏展开保留全部标题，球场与说明/CTA左右排。实际deck高度不足430px的短屏使用当前卡覆盖，其余卡不可见/不可聚焦，当前标题旁独立“收起 · 返回列表”；收回恢复全部标题。横屏/平板左预览右侧其余标题，按空间1/2列。防守四卡正常，顶部留白/主卡位置/玻璃导航保持，整页不滚动。

进入库或换人数/攻防收起，同组普通render保持展开；pending/externalbusy锁标题、CTA及收回。来源清除持久失败保持原演练/档案原文及展开供重试，不表面成功。换组使旧节点事件失效；进入overlay时焦点若在被隐藏卡，移至当前可见标题。快速开合/resize/减少动态效果以当前状态收敛。

## 必需验证与设备

定向布局/真实组件行为unit、完整npm test、最终构建后Chrome全回归，至少6尺寸双人数九标题逐个命中展开/收回、overlay返回、wide分区、来源失败重试及26真实动画和推荐/存储兼容。集成独立审查后1.17.0 APK构建、资源逐hash=dist/no server.url/v2签名。重新识别手机、安装前后实际档案hash相同、不卸载清数据或最终保存测试档案；真WebView只浏览时进度也保持。物理手指/FPS/旋转/原生返回未验则awaiting_device，不用编译/程序点击代替。

## 当前集成记录

ui四文件已冻结交还；保留原API及page/pages=0/1兼容，移除pager节点，header/body布局按实际测量分portrait/wide/overlay，非当前覆盖卡真实隐藏禁用。10项组件/布局定向单测、JS/CSS解析通过。主控`npm test`构建与182检查（179单元＋3HTTP）全过，无skip；26套数据与18条规则不改。

正式源码冻结后，在E2E脚本适配期间先生成可审查APK，避免重复等待；安装仍待完整浏览器与独立审查通过。构建使用与npm test相同的index-DnN-RngA.js/index-DWba1cUQ.css，构建期间不同时运行Chrome服务旧dist。若发现实现问题，修复后更新构建和相关证据。

手机已重新识别ef473680，安装前读取当前真实0档案，文件SHA256 dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253。最终安装/前后字节比对与原生浏览稍后记录。

预构建`npm run android:build`成功（Gradle48秒）。[1.17.0安装包](../../artifacts/apk/archive/halfcourt-1.17.0.apk) SHA256 `2e1140d1016539a3189d98c4f87924a02e4f5960a6e657a1f56f455d0004d6c1`；[资源检查](../../artifacts/qa/hc029-apk-assets.json)28项逐hash与dist一致、没有server.url。v2签名通过，证书SHA256保持e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26。尚未把构建当浏览器或物理验收。

## 最终自动与浏览器证据

最终源码上`npm test`全182项（179单元/3HTTP）通过，无skip。完整Chrome退出0：26套实际播放、六新43帧与6组真实推荐/图例、档案创建/保存/失败/重启、旧个人数据清理、离线、导出、NBA转盘、柜位触摸、玻璃面板及柔光rapid/cancel/reduced-motion继续通过；无运行时异常或远程请求。没有为一页九卡改动画、规则或存储实现。

[库报告](../../artifacts/qa/hc029-library-metrics.json)255项：六尺寸×两人数108组九卡实际中心点击开/收，闭卡直接可达、portrait全部标题保留、overlay隐藏禁焦点/收回/失效隐藏点击、wide分区，samegroup实际render保节点与原文字节、resize焦点、快速意图、减少动效与复位。[统一页面报告](../../artifacts/qa/hc029-page-layout-metrics.json)49项保留品牌/留白/主卡起线/共享人数节点及写失败恢复。360短屏来源失败时保持原非零步骤、模板/players/进度及两键原文，原卡展开可重试；同步pending锁住收回。六新[实际回放与推荐报告](../../artifacts/qa/hc027-expansion-playback-recommendations.json)由本轮重写，历史命名不代表引用旧执行结果。

[390正式图](../../artifacts/qa/hc029-390x844-4v4-expanded.png)、[360覆盖图](../../artifacts/qa/hc029-360x640-4v4-expanded.png)、[横屏图](../../artifacts/qa/hc029-844x390-4v4-expanded.png)由主控亲看，正式SVG/真实开始演练，不以HC-028静态预览替代。独立审查员已核源码/90纯布局及实际组件夹具、报告和五张正式图，无P1/P2；最终设备图结论见[审查](../reviews/HC-029-single-page-library-release.md)。本轮自建Chrome、profile、临时服务已清理。

## 安装与真实设备程序检查

安装前立刻重新识别ef473680并刷新[双文件摘要](../../artifacts/qa/hc029-device-before.json)，覆盖安装返回Success；1.17.0/code19 COLD启动725ms、前台与版本确认。[安装后](../../artifacts/qa/hc029-device-after.json)实际0档案SHA256 dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253，内置选择SHA256 397c6cb369a367c0cf5b7d4a2a047c2748becc85e1af744731323b2b75ebd9eb，两项均逐字节保持。无卸载/清数据，未保存测试阵容。

[真实WebView96报告](../../artifacts/qa/hc029-native-library.json)393×819逐项程序开收双模式18张进攻，九卡/无pager/单展开、所有列出控件fit及hit、无溢出、防守四卡通过；本机属于portrait，九标题与紧凑展开体同屏。[默认九标题设备图](../../artifacts/qa/hc029-native-3v3-collapsed.png)、[展开设备图](../../artifacts/qa/hc029-native-4v4-expanded.png)。只浏览不点原生CTA或最终保存，阵容和选择两摘要保持，恢复原更衣室/3v3/进攻，9228转发清理。

首次原生几何断言未通过，未取得完整诊断；紧接复查发现本应用已离前台，未截取其他应用。重新带本应用前台后同一源码/APK完整18项检查通过，没有源码修复，不将未证实原因写成已修产品缺陷，也不隐去首次失败。

## 验收限制与下一步

手机物理手指/FPS/系统Back/旋转、原生CTA及最终档案保存未在本轮完整验收；浏览器触摸和真WebView DOM程序不替代这些证据。代码/自动检查/安装与图检收口后保持`awaiting_device`，用户可直接在战术库体验一页九张并反馈。

最终独立审查已读即时前后双hash、APK/native报告并亲看两张原生图，无未修P1/P2；代码、浏览器、设备程序和物理限制分别记录。86份Markdown/478个本地链接通过，测试进程/档案与ADB转发均已清理。
