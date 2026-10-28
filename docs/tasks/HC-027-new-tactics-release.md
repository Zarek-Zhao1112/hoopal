# HC-027 · 六套进攻战术正式接入

- 日期：2026-10-24；状态：`awaiting_device`。代码、自动检查、独立审查及指定手机覆盖更新已完成；物理手指、帧率、旋转和系统返回待验。
- 用户确认HC-026效果图后要求继续。正式增加3v3/4v4各三套，使库合计26套（18进攻/8防守），并接阵容推荐；每种人数进攻9套，叠卡按6+3分页，保持一屏。
- 设计：[六套新增战术](../design/new-tactics-pack.md)、[阵容推荐](../design/lineup-recommendations.md)。构建1.16.0/code18，验证后覆盖安装指定新手机；保留旧20 ID及顺序、原有进度/阵容/来源协议与schema，不恢复个人Play。

## 分工与文件所有权

| 负责人 | 唯一可写范围 | 接口/依赖/验收 |
| --- | --- | --- |
| engine | data/tactics/offense-expansion.js、data/templates.js；tests/unit/templates.test.mjs、defense-templates.test.mjs、offense-expansion.test.mjs | 将批准预览数据复制为生产源（不能生产import artifacts），六固定ID/角色/43帧，与预览实值一致；将六套追加在旧20之后，旧序不变；真实引擎.001动态间距/路径/球权/静止掩护及动作差异测试 |
| ui | frontend/src/workspace/library-deck.js、library-deck.css、library-deck-state.js；tests/unit/library-deck.test.mjs；tests/e2e全部本次相关文件 | 组件内6+3分页，root布局上限6保留；无整页滚动，页码/上一页下一页、隐藏页不留焦点/误点，换页全部收起，浏览不加载或清来源；busy/pending锁分页/标题/CTA；更新26套及6新实际推荐/回放E2E，原始回归不得删弱 |
| 主控 | data/recommendations/offense.js、tests/unit/recommendations.test.mjs、offense-expansion-recommendations.test.mjs；配置/版本/文档/验证/构建/安装 | 新规则实际角色与动画一致、最多三套稳定一一映射/弱项可见；工具链适配、全自动检查与APK/设备字节保护 |
| interaction_design | docs/reviews/HC-027-new-tactics-release.md与review索引 | 集成后只读动作/角色/推荐/九卡分页/来源与busy兼容审查，不写实现；独立样本/图片复核，问题具体复现并复验 |

## 角色与推荐合同

沿用HC-026六ID、各帧站位、球权与动作：

- post-split：1传低位后掩护，2借挡近筐终结，3低位策应回传；不是高低位两内线互传。
- slip-screen：1持球传球，2未建立掩护接触便提前切入终结，3弱侧拉开；不把掩护技能列为假挡者硬条件。
- offball-flare：1输送，2无球外弹接投，3掩护并接应；不是掩护者外弹。
- hammer：1沿底线突破/跨侧传球，2弱侧落角接投，3弱侧掩护，4外线出口。
- zoom-handoff：1高位手递手并停稳掩护，2先借3下掩护再接手递手突破分球，3掩护后拉开，4最终底角接投。最终持球是4，不能只按2终结写规则。
- screen-the-screener：1输送，2先掩护3再借4掩护接投，3先切入终结威胁，4掩护2后内侧接应。2同时有掩护和投射，不能混同双掩护同一接球者。

现有6技能可覆盖，无需新标签/字段；体型不替代技能，未标按一般；不改评分模型以强推新战术，不删除旧规则，只扩充候选。旧专项测试若因前三名竞争失去候选，限定旧候选夹具核原职责，同时新增全18候选语义检查，不能把关键断言改成“存在即可”。

## 分页与数据约束

每组进攻9套：默认第一页旧六套，第二页新增三套；防守四套不分页。分页只在库卡内，所有页标题默认收起，当前目录总数显示9；翻页不改当前演练、内置选择键、推荐来源或档案。入库/换人数或攻防回第一页，普通同组render不跳页。异步加载、来源清除失败保持当前页/展开卡可重试。保留手机竖横屏/平板一屏及原卡顶留白。

存储和Play格式没有迁移。新ID直接进入现有白名单，旧ID/合法步数继续读取；推荐来源仍先持久清除再手选或换档案，失败不表面成功。安装不卸载/清数据，不写设备测试阵容。

## 必需验证

- 数据/推荐/分页针对行为的单元与HTTP、最终构建后完整Chrome：26套实际播放、六新推荐及成员图例、重启/离线/导出/来源失败、6+3全部可达与翻页不写盘、busy锁、6尺寸闭卡/开卡/两页可命中，无溢出。
- 独立集成审查与修复复验，分清预览历史与本轮实际证据。
- 1.16.0/code18 Android构建/签名/资源逐hash/no server.url；重新核对adb设备ef473680，安装前后档案hash一致，冷启与实际WebView程序检查六新可达/展开/页码/筛选（不最终保存测试阵容）。物理手指/原生最终保存未验保持`awaiting_device`。
- 上轮Vite原生binding受OS Application Control阻止，主控先查本地工具链与官方支持路径；不删除锁/依赖树或关闭系统策略，不手改dist。

## 实现与构建工具记录

六套定义已复制为正式源并追加；旧20套顺序与帧数据保持。18套进攻规则逐项覆盖，原12规则不变；新六套的实际前三推荐、人员对应和特殊职责有独立行为检查。库分页组件保留同组页码、异步失败展开与重试，换页旧事件失效。

Windows阻止Vite8/Rolldown的原生DLL；匹配官方WASI包虽可导入，实际Windows磁盘入口解析仍失败，该方案未作为成功结果保留。采用官方仍支持的Vite7.3.7，并用npm override将Rollup替换为相同Node API/CLI的官方`@rollup/wasm-node@4.65.0`；标准esbuild可运行，ES2022目标与原Vite配置保持。未关闭系统策略、未修改node_modules源码或手写dist。依据：[Vite支持范围](https://vite.dev/releases)、[Rollup架构](https://github.com/rollup/rollup/blob/master/ARCHITECTURE.md)。`npm install`审计0漏洞；正常`npm test`构建成功、181检查全过（178单元＋3HTTP）。

## 最终自动验证

- 正式数据与批准预览43帧一致；旧20套数据和顺序保持。独立生产引擎每.001采样37,037个board，全员最小间距55.482936、传球对防守49.964392。有限采样不等于连续碰撞或实战有效性证明。
- 完整Chrome退出0：26套实际播放、6套库第二页CTA自动开始、43帧站位/球权/说明与7–8步分页、真实前三推荐及全部人员图例；第二页来源清除失败原字节保持、页码/展开保留及恢复重试通过。181项构建/单元/HTTP检查无跳过项。
- 本轮49项六尺寸统一排版与42项库布局报告检查两页闭卡/开卡/控件命中无溢出；NBA转盘、玻璃三任务最终保存/取消、原存档与旧个人数据清理、重启、PNG/JSON导出、离线、柜位触屏及柔光快速切换/取消/减少动效回归通过。无浏览器运行时异常或远程资源请求。独立Chrome测试档案、临时服务及进程已清理。
- 证据：[新增回放与推荐](../../artifacts/qa/hc027-expansion-playback-recommendations.json)、[六屏统一排版](../../artifacts/qa/hc023-page-layout-metrics.json)、[库布局](../../artifacts/qa/hc016-library-metrics.json)、[第二页正式图](../../artifacts/qa/hc027-library-page-2.png)。历史命名报告由本轮完整执行重写。
- [独立审查](../reviews/HC-027-new-tactics-release.md)已完成，无未修P1/P2；独立源码/采样/内存夹具及图检、主控浏览器、设备程序证据分开记录。最终文档检查82份Markdown/437本地链接通过。

## APK与实际手机

`npm run android:build`成功，Gradle21秒；版本1.16.0/code18。[版本安装包](../../artifacts/apk/halfcourt-1.16.0.apk)与通用halfcourt-debug.apk相同，SHA256 `8aa05ea16b5113d3bd90eac866d334b7cdc95daa6f2926e7d00f9b01352bedfb`。[28网页资源](../../artifacts/qa/hc027-apk-assets.json)逐hash与最终dist一致，无server.url；v2签名通过，证书SHA256仍为e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26。最终网页bundle与Chrome验收输入相同。

再次识别当前新机ef473680/M2101K9C，`adb install -r`返回Success，COLD启动628ms、前台和版本确认。安装前[真实档案摘要](../../artifacts/qa/hc027-device-before.json)与[安装后](../../artifacts/qa/hc027-device-after.json)相同：本次实际0份档案、文件SHA256 dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253；没有卸载、清数据或写测试阵容。

[实际WebView96程序检查](../../artifacts/qa/hc027-native-library.json)在393×819逐项点开六新卡，双模式6＋3分页、单展开、CTA可用/控件命中、无溢出与防守4卡无分页通过。只浏览未点原生CTA及最终保存，阵容和内置进度两文件摘要均不变；恢复原始更衣室/3v3/进攻状态，9228转发已清理。[3v3设备图](../../artifacts/qa/hc027-native-3v3-page2.png)、[4v4设备图](../../artifacts/qa/hc027-native-4v4-page2.png)。

## 剩余设备验收

物理手指点击/滑动、连续动画FPS、系统Back、键盘、旋转以及原生CTA/最终保存未在本轮完整验收。浏览器CDP触摸或真机DOM程序不代替这些证据；因此保持`awaiting_device`。用户可在战术库进攻的第二页体验六套，回报具体人数/战术/步骤与现象后继续修正。
