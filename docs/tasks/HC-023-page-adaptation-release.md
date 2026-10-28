# HC-023 · 更衣室 / 训练场 / 战术库正式适配

- 日期：2026-10-23；状态：`awaiting_device`。实现、独立审查、自动验证、构建与指定新机安装完成，完整物理操作待验。
- 用户确认HC-022最新预览：仅更衣室保留品牌，训练场/库去品牌但卡片位置与上方留白保留，导航采用更衣室/训练场/战术库。
- 设计：[页面适配](../design/page-adaptation.md)，效果`artifacts/design/page-adaptation-preview/overview.png`。
- 本轮正式接入、构建1.14.0/code16并更新指定新手机。保留真实20战术、4/6步、推荐人员图例/步骤分页/导出/600ms柔光/450ms任务面板；不引入预览的示意引擎、存储或示例档案，不改存储键/schema/个人数据清理边界。

| 负责人 | 文件所有权 | 接口与验证 |
| --- | --- | --- |
| ui | frontend/index.html、frontend/styles/app.css；新增frontend/src/workspace/page-layout.css | 正式结构/排版/三导航名称；#play-header-controls与#library-header-controls容纳共享#mode，由app在切页移动同一节点；#open-menu在训练场卡内；所有原控件ID保留，play-title为只读元数据保留；训练场单主卡包住球场/播放/步骤，库单主卡；不改app.js/引擎/存储 |
| 主控 | frontend/src/app.js、版本/构建、e2e、本文/设计/索引 | #mode移动与当前模式同步、交互/来源合同保护、六屏全量Chrome/构建/设备文件hash/实际WebView，最终集成 |
| engine | tests/e2e/page-layout-flow.mjs | 新布局真实行为QA，导出runPageLayoutFlow({send,evaluate,wait,waitFor,folder})；六尺寸命中/品牌可见范围/卡片top/共享mode实际父节点/筛选不改变演练/名称，结束还原干净状态；不改共享browser-qa入口 |
| interaction_design | docs/reviews/HC-023-page-adaptation-release.md与review索引 | 未实现对应代码的agent只读审查，模式控件移动/来源异步/弹窗焦点/布局/动效兼容；不运行共享Chrome/ADB |

目标布局：390×844卡顶116px、360×640卡顶96px、844×390卡顶68px、1024×768卡顶120px；更大桌面同平板/合理maxwidth。手机横屏左球场右回放，平板扩宽；推荐人员图例不挤掉CTA，完整讲解仍可打开阅读。浏览器验证与真实物理输入分开，不以APK/安装代替真机验收。手机只用ef473680，更新前重新识别/记录当前档案hash，不保存测试档案到用户存储。

## 实现、审查与自动验证

三导航名称、仅更衣室品牌、两页顶部留白及批准卡顶正式接入；训练场单主卡保留真实球场、讲解、回放、人员图例与六列步骤/分页，库使用原deck测量与单主卡。唯一mode通过placeModeControl移动，监听/状态/来源语义保持，内部view ID与存储不变。engine后续同步user-guide/architecture，所有文件交回主控。

153检查（150单元+3HTTP）通过；最终资源重构建后3HTTP再验通过。第二轮完整Chrome通过20战术、离线/导出/重启、库/阵容/推荐来源/故障、玻璃面板、真实滑动、六尺寸含人员图例、600ms柔光与快速切页/取消/减少动效。

独立审查发现隐藏元数据祖先连带藏住storage-status，已将真实错误状态移为body直属，仅失败时显示在顶部，不增加正常常驻文案；实际注入builtin写失败的可见/恢复检查通过。主控图检发现步骤页数继承45px最小宽造成分页箭头裁切，已定向min-width:0；最终APK同构建下六尺寸分页文字/箭头在卡内复验通过。无剩余P1/P2，见[审查](../reviews/HC-023-page-adaptation-release.md)。

首轮浏览器仅在旧page-motion断言按DOM顺序比较ID失败：共享mode合法迁移改变了顺序。改为排序后保留全部ID并显式Set唯一性，另外layoutflow保留原objectId检查同一节点；不降低快照隔离约束。随后完整回归通过。最后分页CSS修正只影响页数宽度，构建后定向layout/error复验通过，未为此重复所有业务回归。

新page-layout-flow覆盖六尺寸36种页面/开合状态及1次真实写失败状态，检查卡顶、所有主控件中心命中、完整CTA/空白/品牌、共享节点与catalog/real人数、浏览前后模板/标题/步骤/进度/SVG/两存储原文字节不变。`artifacts/qa/hc023-page-layout-metrics.json`、18张hc023尺寸截图、`hc023-storage-write-error.png`为最终证据；主控亲看普通/小屏/横屏真实图例、库与错误图。隔离Chrome/临时profile均清理。

## APK、安装与实际WebView

- android:build成功，1.14.0/code16；28网页资源逐个与dist哈希相同，v2签名通过，无server.url。`hc023-apk-assets.json`记录。
- `artifacts/apk/halfcourt-debug.apk`、`halfcourt-1.14.0.apk`及对应sha256；APK SHA256为`eb11ccdb3e2289c28de4bbb477bf0150f3eb9ddddb49ea621b439eeb76ec4b17`。
- 重新识别M2101K9C/ef473680，USB覆盖Success，版本核对1.14.0/code16，冷启动Status:ok/COLD总772ms。没有卸载、清数据或改安全策略。
- 实际0档案，升级前后文件SHA256均`dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`；`hc023-device-before/after.json`。不沿用历史1份档案，不恢复旧数据。
- 实际WebView96/Android12/393×819，训练/库/开卡/更衣室四态均controlsFit=true、无整页溢出；仅更衣室品牌，三导航正确，menu程序开关/人数原节点迁移/库异人数筛选保持give-go来源/返回训练恢复3v3均通过。仅程序DOM操作，未点CTA载入或保存测试阵容，最终档案字节仍相同。报告`hc023-native-layout.json`、三页`hc023-native-*.png`；调试forward移除。

## 待设备操作

真实手指点击/横向柜位手势、系统输入法、原生Back、旋转/前后台和分享接收仍需实际验收；浏览器与程序WebView不能替代。布局所需代码/审查/安装检查已完成，保留awaiting_device。
