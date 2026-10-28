# HC-027 六套新增战术正式接入独立审查

日期：2026-10-24。状态：代码 / 浏览器审查闭环，无剩余 P1 / P2；1.16.0/code18 已安装，实际 WebView96 程序浏览通过，任务保留 `awaiting_device` 供完整物理验收。任务：[HC-027](../tasks/HC-027-new-tactics-release.md)。设计：[新增战术包](../design/new-tactics-pack.md)。

## 范围与证据约定

正式六定义追加、十八套进攻推荐角色、九张进攻卡 6+3 分页、浏览与来源清除 / 异步锁兼容。仅维护本记录及审查索引对应行，其他实现只读；可用必要内存夹具 / 实际引擎采样与图检，不运行 Chrome、adb、Vite 或构建。主控浏览器、APK 与设备证据明确执行者，不与 HC-026 预览历史互相替代。

## 固定验收合同

- 生产不能 import artifacts；六套 43 帧 / 球权 / 路线与批准预览实值一致，追加在旧二十套之后；保留旧 ID、顺序、Play / schema / 存储和来源协议。
- post-split 的 3 号低位策应，1 号传后掩护，2 号终结；Slip 的 2 号提前切入且无真实掩护，不列 screening 硬条件；Flare 的 2 号外弹接投、3 号掩护；Hammer 的 1 号底线突分、2 号弱侧接投、3 号掩护、4 号出口。
- Zoom 的 1 号交接 / 停稳掩护，2 号借下掩护并持球突破分球，3 号下掩护，4 号最终底角接投；STS 的 2 号同时承担先掩护与后接投，3 号先切、4 号再掩护 2。理由 / 条件 / 一一成员分配必须对应这些动画职责。
- 不改评分模型强推新候选。旧角色专项可限定旧候选验证竞争前的职责，但不能删弱关键语义；同时验证全十八候选的同型、全一般、缺投射、明确弱项、单一组织点和慢速等边界。
- 进攻第一页旧六 / 第二页新增三，防守四套不分页。换页收卡；入库 / 换人数 / 攻防回第一页；同组普通 render 保页。全部浏览不改当前演练 / 来源 / 进度 / 档案，不留旧页可点或可焦点节点。
- pending / busy 锁页码、标题和 CTA；第二页来源清除失败保持当前演练 / 来源、页码及展开可重试，恢复后单次成功载入。成功清除后的后续失败不回挂旧来源。resize / 减少动效 / WebView96 / 六尺寸可达性分别验证。

## 独立正式数据与角色核对

已只读检查 offense-expansion.js、data/templates.js、shared/templates.js；新增生产源仅引用生产 helpers，不 import artifacts，没有带入预览 fit / focusStep 字段。旧二十 ID 顺序保留，末尾追加 post-split、slip-screen、offball-flare、hammer、zoom-handoff、screen-the-screener；共 26 套，18 进攻 / 8 防守，各人数进攻 9 套。

reviewer 将六套真实生产 template.build().frames 去掉生成的 route.id，与批准预览编译结果逐项 deepEqual：43 帧完全一致，包括球权、说明、参考防守和路线。并用生产模板重新执行实际 interpolateBoards / ballPosition 每 .001 密采样，37 过渡各 1001 点、共 37,037 个 board，检查全部攻攻 / 攻防 / 防防，8 传球段检查球对全部防守及非传接球进攻者。结果仍为全员最小 55.482936（Zoom）、传球对防守 49.964392（STS）、传球对第三进攻 126.000008（Hammer）。没有排除掩护段的球员接近；仅球对第三进攻统计排除传接球者的有意起终点接球接近。球员核心半径 24（含描边直径 51）、球半径 12，阴影和路线不作碰撞实体。有限采样不是连续碰撞证明。

六套动作角色与 HC-026 人工审查一致，正式定义另行核对：低位 3 策应、Slip 2 无接触提前拆、Flare 2 外跑接投、Hammer 弱侧沉角、Zoom 下挡→独立手递手→突破分 4、STS 2 先设挡再借 4 挡；无新增篮球语义 P1 / P2。实值相同不代替本轮推荐与生产交互检查。

## 独立推荐审查与案例

已读 shared/recommendations.js 的稳定 ID 排列 / 权重与条件判定、十八条规则及新旧职责测试。将初期内存保存的原十二条规则与当前前十二条 deepEqual，完全相同；评分模型未因新规则改变。旧 DHO / 高低位 / Spain / 双掩护 / 突分底角的关键角色和任务断言仍在。旧“所有候选都须提示投射弱项”改为按该候选实际角色是否使用 shooting 判断：新增 PostSplit 没有投射职责，不应虚构该冲突；这一改动未删弱实际依赖投射的候选告警。

新增规则逐项与动画职责核对：Slip 2 无 screening 权重 / 硬条件；Zoom 2 是突破分球者，4 有 shooting 硬条件并对应最后球权；STS 2 的 screening 与 shooting 同时为硬条件，3 承担第一切入、4 承担第二掩护。体型加成仍只支持已标强项，不产生技能。

reviewer 直接执行实际全十八候选 recommendLineup，手工指定非按角色排序的成员 ID 和独立能力情境，未从 weights 反推能力：

- 3 / 4 人全一般均为 conditional，首推仍为 give-go / four-out-cut。
- 3 / 4 人全明确弱投射：只有实际依赖 shooting 的候选列该弱项告警；无投射职责的 PostSplit 不虚构投射条件。
- 3 / 4 人仅一个组织强点、其余明确弱控传：每候选一人一职，均有条件，不由同一强点兼任多人。
- 3 / 4 人同型能力，重复姓名 / 改号码 / 反转成员顺序后，候选及角色到成员 ID 映射保持。
- Slip 的终结者明确弱 screening，实际结果仍可 recommended，不虚构掩护弱项；Zoom 实际将最终接投映射 4，移除全队投射强项并标弱后不再强推为 recommended；STS 2 同时有设挡 / 接投任务，撤掉 screening 优势并标弱后不会保持强匹配。

这些案例没有覆盖所有能力排列或实战战术有效性，不以“进入前三”单独判定角色正确。

## 独立分页与异步审查

已只读检查 library-deck.js / state / CSS、app.js 的 clearContext→load→persist 路径及 storage/lineup-session.js。组件只保留当前页 entries；换页增加 generation、禁用并移除旧卡，旧 handler 同时检查代际 / 当前 entries。换页收卡；焦点原在库内时移到新页首标题，边界分页按钮不会留下不可用焦点。same-signature render 只更新条目与锁，不重建 / 跳页；reset / 换组回首；pager 在原 deck 内预留 34px，不突破 layout 六卡上限。组件无存储调用，仅 CTA 调用 onPlay。

reviewer 对真实 createLibraryDeck 使用内存 DOM / 可控异步 Promise，在实际两个进攻目录分别验证 6+3：旧页 heading / CTA 即使强制派发也无效；换页焦点落新首标题；同组复制对象 render 保页 / 展开 / 节点；pending 期间双击仅一次 onPlay，上一页 / 其他标题 / 同组 render 不解除锁；返回 false 或 throw 后仍在第二页、同一展开卡可重试；成功重试只再触发一次；external busy 锁翻页，reset 回首收起，防守四卡不显示分页。该夹具没有模拟浏览器尺寸或真实磁盘，来源原文字节保护待主控真实故障注入报告。

来源协议仍由实际应用 / session 处理：clear 持久失败时不加载新 Play；组件 onPlay 返回 false 不清页 / 展开；clear 成功后的后续失败不挂回旧来源。没有改 schema、存储键、个人 Play 清理或推荐来源定义。

## 最小工具链变更复核

主控尝试的 Rolldown WASI 仅导入成功，实际 Windows 入口解析失败，已从最终依赖撤除，不把该中间结果记录为可构建方案。最终 package.json 固定 Vite 7.3.7，npm override 的 rollup 指向官方 @rollup/wasm-node 4.65.0；reviewer 已只读核对锁文件及实际 node_modules/rollup/package.json 的包名 / 版本 / Node 入口与 CLI。没有修改生产配置来适配失败的构建器；vite.config.js 仍 base='./'、既有 dist 输出和 target='es2022'。

reviewer 另查第一方资料：[Vite releases](https://vite.dev/releases)列 7.3 为重要修复 / 安全补丁支持分支；[Rollup 官方架构](https://github.com/rollup/rollup/blob/master/ARCHITECTURE.md)明确 wasm-node 提供 Node JavaScript 接口与 CLI，以随包 WASM 替代原生代码。此为官方 Node 包替换，不是依赖浏览器网络加载 WASM 的 @rollup/browser。主控正常 npm test 构建成功，报告 npm audit 为 0；reviewer 未自行安装、构建或审计依赖，也未声称审计 0 代表不存在安全风险。旧失败方案未留在最终包声明，未见新 P1 / P2。

## 主控最终浏览器与独立图检

主控正常 npm test 成功，共 181 检查（178 单元 + 3 HTTP）；完整 Chrome 最终 exit 0：26 套战术、NBA、柜位实际触摸输入、推荐 / 重启 / 导出 / 离线、六尺寸及导航快切 / 取消 / 减少动效通过，runtime errors / remoteRequests 为空。Chrome dist 为 index-D2OsjU2a.js / CpF25yCs.css，后续 Android 构建使用相同 web 输入。执行者为主控；浏览器触摸模拟不等同手机物理手指。

reviewer 已只读核对本轮重写的 hc027-expansion-playback-recommendations.json：六条回放共 43 帧、六条实际推荐与完整 3 / 4 人图例，正式角色 / 成员姓名 / 球衣映射进入实际球场。对应 flow 还执行第二页来源写失败注入：归档原文字节 / 原来源保留、page=1 / 原卡展开且可重试；恢复写入后手选清来源并播放。此为主控真实故障注入，独立组件内存失败夹具与之分开。

本轮 hc023-page-layout-metrics.json 含六尺寸页面 / 两页相关 48 条布局及一条实际存储错误状态；hc016-library-metrics.json 为六尺寸七种闭 / 开卡状态共 42 条，含第二页新增标题 / CTA。主控断言完整矩形、中心命中与无整页溢出，reviewer 核对报告结构及代表记录，不把历史文件名误作旧轮结果。

reviewer 亲看 hc027-library-page-2.png：正式 3v3 目录显示 9 套，第二页 07 / 08 / 09 对应三套新战术，Flare 单卡展开木球场 / 描述 / 开始演练完整，其余标题保留；第 2/2 页及总数、上一页、禁用下一页、玻璃导航均可见。无新增图检 P1 / P2。

## APK 与实际设备

主控执行 npm android:build，Android BUILD SUCCESSFUL（21s），v2 签名有效，证书 SHA256：`e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26`。artifacts/apk/archive/halfcourt-1.16.0.apk SHA256：`8aa05ea16b5113d3bd90eac866d334b7cdc95daa6f2926e7d00f9b01352bedfb`。主控逐项核对 28 个 APK 网页资源与 dist 哈希一致；reviewer 只读核对 hc027-apk-assets.json 的 webAssets=28、serverUrlAbsent=true 及同一 APK 哈希，未自行解包 / 签名或构建。

主控重新识别 ef473680 后覆盖安装成功，1.16.0/code18 COLD 启动 628ms。reviewer 已读 hc027-device-before.json / hc027-device-after.json：实际均为 0 档案，归档 SHA256 均为 `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`，after 版本 / 前台校验通过；未卸载或清除数据。

reviewer 已读 hc027-native-library.json：实际 Android12 / WebView96.0.4664.104，在 393×819 内以 DOM 程序点击检查两模式 6+3 分页、六张新增卡依次单展开、CTA 可用且几何 / 中心命中、无整页溢出；主控还检查防守四卡不显示分页。六条新增展开记录的 overflow=false，全部列出控件 fit / hit=true。archiveAndSelectionUnchanged=true；归档哈希同上述，内置进度检查前哈希为 `f2a7a137085343c0cbaf9bde068a147ff9c656cfcb16b2126094cf354966c553`，主控前后字节比对保持。程序仅浏览，没有点原生开始演练 CTA 或最终保存测试阵容。主控恢复原 lineups / 3v3 / offense 状态，并清理调试 forward。

reviewer 亲看 hc027-native-3v3-page2.png 与 hc027-native-4v4-page2.png：真实手机第二页均显示 07–09 / 第2页共9套，3v3 Flare、4v4 STS 单卡展开球场、对应描述和开始演练完整；上一页、禁用下一页及导航完整，没有新增裁切 / 遮挡问题。安装 / 原生程序检查由主控执行，截图由 reviewer 独立图检。

## 发现与限制

独立源码 / 生产密采样 / 推荐与分页夹具 / 浏览器及原生图检无可复现 P1 / P2，主控完整 Chrome 与实际 WebView 程序浏览通过。reviewer 未运行 Chrome、adb、Vite 或构建，不把内存样本当磁盘、布局或真机证据；HC-026 预览不代替本轮生产验证。

本轮原生检查未触发开始演练 CTA 或最终保存；手机物理手指 / FPS / 原生系统 Back / 旋转及完整实际保存仍未验收，不用程序 DOM 点击或浏览器触摸代替。任务保持 `awaiting_device`，并不因代码审查、编译、安装或截图通过改为全设备 completed。
