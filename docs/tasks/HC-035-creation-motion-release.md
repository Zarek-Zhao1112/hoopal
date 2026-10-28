# HC-035 · 建队三步与大球衣正式接入

- 日期：2026-10-26；状态：`awaiting_device`（代码/独立审查/自动验证/安装/原生程序完成，人工设备操作待验）。
- 用户批准[HC-034预览](HC-034-creation-motion-preview.md)，接入真实创建/编辑玻璃面板，生成1.20.0/code22并正常覆盖当前手机。依据[玻璃面板设计](../design/lineup-glass-sheet.md)。

## 最终行为

三步固定玻璃壳/进度/底控，步骤1队名与3/4人数图示卡，步骤2现有30队转盘及真实球衣，步骤3上方大球衣/姓名号码与左右成员切换、下方资料/体型/擅长/可选弱项。手机不整页滚动，短屏缩小球衣、横屏左右分区，键盘时保输入与保存可达；同一编辑组件采用一致排版，保留当前队员与来源页。

保持450ms壳浮起，步骤320ms前进新页从右/旧页向左、返回反向，成员280ms整组球衣与资料同移；壳/进度/底控不随内容平移。左拖下一员、右拖返回、取消不切；按钮与成员tab可等效操作。减少动态效果静态切换；快速切换/关闭/后台/旋转清旧帧与快照，旧页不可点击/聚焦/被业务选择器识别。

正式保存仍是完整快照、最后一次真实写入，失败保留输入/草稿和重试，不沿用预览“完成演示”。姓名/号码、体型、擅长/弱项上限互斥、3/4成员池保留、稳定ID、revision、旧中性队/不完整档案兼容、草稿三选/读锁重试与来源解除协议保持。不改schema/存储键、26套战术/推荐/卡内循环/四栏/600ms主页面柔光，无服务端/账号。

## 分工与接口

- ui独占`frontend/src/lineups/ui.js`、`sheet.css`及可新增`creation-layout.css`（sheet.css引入）：批准的排版、稳定页容器、语义切步/成员意图及gesture接线。保留原data-action供真实业务/E2E；新增成员箭头用lineup-wizard-player-prev/next，避免主更衣室重名。
- engine独占新增`frontend/src/lineups/wizard-motion.js`、`wizard-motion.css`及相应`tests/unit/wizard-motion.test.mjs`：可取消内容动效和手势模块，不改ui/sheet/package/E2E。接口createWizardMotion({document})的capture(page)、play({host,page,snapshot,kind,forward})、cancel()/destroy()/state；capture先归正当前页再制作不可交互旧快照，HTML ID/业务data-action清理，SVG局部引用保持。attachWizardSwipe({element,isDisabled,onStep})回调delta=-1/1并返回destroy；方向/阈值/取消/代际与解绑可测。
- ui渲染时先捕获旧`.lineup-wizard-page`再destroy旧转盘/替换DOM，只有显式步骤或成员切换才播放；稳定body `.lineup-sheet-content`内新`.lineup-wizard-page`，engine只动内层。sheet.css引入wizard-motion.css。普通标签/忙态/错误重绘直接取消内容动效，不让过期节点写新草稿。
- 主控负责app必要集成、`sheet.js`必要生命周期修正、版本/锁/Android/docs、E2E适配/新专项、定向/完整Chrome/设备与最终交付。不并行写ui/engine文件，接口变更先同步。
- interaction_design未参与实现，最终只读审查、写HC-035 review及索引；重点焦点/输入/动画取消/异步保存与数据一致，不以风格代替行为。

## 必需验证

motion单元测试覆盖实际方向/时长/旧token/取消/reduced/手势阈值及清理；npm test及构建后完整test:browser保留既有断言。新增真实DOM三步六尺寸（含360×640/390×844/844×390/1024×768）、450/320/280ms实帧与固定壳/头/进度/底控、左右触摸/cancel、昵称号码与球衣同步、标签与成员/草稿对应、快速切步、关闭/重开/后台/reduced、输入焦点/长名/错误及最终写失败重试。创建前两步不写盘/最后一次写、旧档案/读锁/推荐来源和训练库全回归。

独立代码/浏览器审查后APK构建、28资源逐hash/无server.url/原签名；安装前即时备份真实手机档案及进度，正常install-r、版本/冷启及双hash核对。原生程序检查只在未保存草稿上验证新布局/步骤/滑动/关闭，不能在真实手机造测试档案；物理手指/IME/Back/旋转/真实CRUD分记awaiting_device。清理本轮profile/服务/动态forward，保留既存浏览器窗口与手机连接。

## 集成与验证进度

UI/动效模块已冻结，版本1.20.0/code22。最终205项（202单元/3HTTP，含10动效/手势）通过；首轮正式专项六尺寸三步/成员/输入、光标与SVG同步、320/280实际帧、触摸与取消、快速切换、缩高输入及真实hidden tab通过。检查器快速序列中的数值CSS选择器已纠正，不作为产品缺陷。

集成时发现动效快照清业务data导致退出页样式可能变化，UI已将新布局的section/ready/arrow规则改为class并保留data供真实操作；快照仍不可点击/聚焦且不被业务选择器匹配。独立审查另发现横屏P2：旧sheet.css的column让27px成员行内3个按钮各仅8px高，姓名裁切，中心fit/hit不能发现此问题。UI已明确row并保高度，新专项增加三人/四人同y、≥23px与文字垂直bounds，正在新构建复验。第一轮旧构建完整Chrome92586因此由主控主动停止，不计最终通过；只结束已核实的本次Node/Chrome子树并删除已校验QA路径下的专属profile，保留用户打开的预览窗口。

修后最终205项无skip通过，[正式专项](../../artifacts/qa/hc035-creation-motion.json)15945 exit0：33组布局包含六尺寸三步、成员/输入、390×400焦点缩高、三/四人横屏与四人竖屏。三段80实RAF样本验证320正反/280成员与固定壳/头/进度/底控；旧snapshot无业务action或可聚焦节点；输入保持同一节点/焦点/光标2并同步SVG；真实手指模拟左下一/右回/cancel、快速切换/reduced、真实hidden tab和原档案保持均通过。横屏3/4成员实际同y84.5、27px高，文字92..104完整，已亲看[四人横屏](../../artifacts/qa/hc035-844x390-four-members.png)。[独立审查](../reviews/HC-035-creation-motion-release.md)P2复验verified，无未修P1/P2；最终完整Chrome64709进行中。

完整64709随后在旧lineup-flow245的真实touch输入断言失败（exit1，不计通过）。专项15218独立复现第二项P2：360×400未聚焦时name中心y387.40625/高32，实际hit=false被底控裁切；真正touch后只focus panel，无法触发has-input-focus压缩。原专项先programmatic focus再缩高漏掉该顺序。现新增先缩高/真正touch/点击前命中+点击后焦点硬断言，保留旧assert不放宽；UI修低高度portrait未focus也可达的布局后再完整复验。R1横屏仍verified，R2输入可达待修。

R2已修：仅在宽≤599px/高≤500px采用未focus也紧凑的壳/内容，隐藏球衣，保成员/分区/输入/底控；前后focus结构一致，正常640/844及横屏不命中。最终205检查通过，专项61704 exit0，[真实touch诊断](../../artifacts/qa/hc035-short-input-diagnostics.json)输入中心从y387.40625移到243.5，hit=true，实际touch后active=lineup-player-name；没有改为programmatic-focus绕过。最终完整回归新一轮进行中。

最终完整Chrome62578 exit0，[日志](../../artifacts/qa/hc035-browser.log)确认原26套真实动画、卡内循环/后台、推荐职责、NBA/玻璃/柜位真实touch、创建与失败重试、档案/来源/原文保持、重启/导出/离线、六屏及四页柔光快速/取消/reduced全通过。原lineup-flow245的实际touch断言仍保留并通过。最终专项报告由全suite重写为33布局、81实RAF样本（帧数随采样可变），输入焦点/光标/隐藏tab与原档案保持为真。独立审查已收口代码与全浏览器，无未修P1/P2，进入APK和手机阶段。

## APK、安装与原生程序

1.20.0/code22 [APK](../../artifacts/apk/archive/halfcourt-1.20.0.apk)46秒构建成功，[28网页资源逐hash](../../artifacts/qa/hc035-apk-assets.json)等于dist且无server.url；v2证书SHA256 e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26与原包同。APK SHA256 4e2c3243fb702a4bd1d3bfd7769370f35decefd4c278a95c76d525a063cea5c7。

ef473680/M2101K9C install-r Success、COLD798ms，版本22/1.20.0前台确认。安装前即时备份原文，[before](../../artifacts/qa/hc035-device-before.json)/[after](../../artifacts/qa/hc035-device-after.json)实际0档案SHA256 dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253、selection397c6cb369a367c0cf5b7d4a2a047c2748becc85e1af744731323b2b75ebd9eb双hash均同；未卸载或清数据。

[真实WebView96报告](../../artifacts/qa/hc035-native-creation.json)393×819：三步/球队中性与BOS选择/成员2/资料同步/关闭确认共七布局fit/hit/无整页溢出与错误。程序在未保存4v4草稿中输入临时队名、选NBA、箭头切成员，姓名和88号即时同步SVG；3→4后输入保留，最后明确discard，返回更衣室，两文件仍同。亲看[三步骤球衣与标签](../../artifacts/qa/hc035-native-step-3.png)与[姓名号码同步](../../artifacts/qa/hc035-native-identity.png)。这些是原生WebView程序点击，不称物理手势或真实最终保存。专属动态forward已清，其他连接与用户预览窗口保持。

## 剩余验收

代码/独立审查/自动验证/APK/安装/原生程序各阶段已记录，手机真实创建保存与重启CRUD、物理手指/FPS、IME、系统Back和旋转尚待用户操作；不在用户手机写演示球队。保持`awaiting_device`，新版本已可使用。

最终独立审查已核全部报告、28资源/原v2证书、即时双hash和原生七布局/两图，R1/R2均verified、无未修P1/P2。98份Markdown/624本地链接检查通过；本轮headless/profile/临时服务/动态forward已清，保留其他手机连接和用户预览窗口。
