# HC-036 · 更衣室玻璃主卡统一尺寸

- 日期：2026-10-26；状态：`awaiting_device`。
- 用户要求更衣室卡片玻璃大小与其他页面适配。直接修正式CSS，生成1.21.0/code23并按既有授权正常覆盖当前手机。
- 已读统一排版/玻璃设计；现因旧主卡450/760px宽、440/525/570/640px高上限及减36/42px，空态和有球队态与其他主卡不齐，宽屏workspace水平边距也不同；600–699px横屏品牌行断点不一致。

## 结果与范围

更衣室空态、3v3/4v4主卡外框的x/y/width/height，与训练场/战术库/档案在同一视口一致（≤1px）；保顶部留白及仅更衣室品牌。移除旧卡宽高上限/额外预留空间，按统一workspace伸展，最大1040px。柜体仍单柜且有自身尺寸约束，详情与推荐/配置按钮完整，不整页滚动；横屏/平板保原内部多栏。对齐600px横屏断点与≥900px左右30px边距，角半径按主框视觉分段，保持玻璃配色。

只改布局CSS与版本/文档；不改UI状态、创建动效、存储/来源、NBA资源、26套战术/推荐、编辑与导出。推荐子页/读取错误仍可达，禁止以更改用户阵容掩盖空态尺寸。

## 分工与验收

小型CSS修改由主控一人实现，独占frontend/src/lineups/styles.css、frontend/styles/app.css和必要配置/测试/文档；interaction_design独立只读审查，写HC-036 review/index，不重复实现。

先记录旧构建四页bounds，再用真实浏览器空态/三人/四人，360×640/390×844/393×819/640×360/844×390/1024×768/1280×800/1440×900逐页四边一致，启用控件fit/hit、无整页滚动、单柜/成员滑动/配置和推荐可用、数据原文与主Play保持。CSS不新写实现镜像单测；执行npm test构建及适当的定向浏览器回归（含页面排布、柜位与建队/柔光相关流程），不为外框修复重复全26套长时动画，除非出现相关异常。

独立审查后APK构建/离线资源逐hash/v2证书，安装前即时备份真实档案与进度，正常install-r/版本/冷启/双hash确认。原生WebView四页实际bounds对齐及控件检查；不在手机创建测试档案。物理/原生CRUD验收分别记录，缺人工证据标awaiting_device。清理本轮profile/临时服务/动态转发，保留其他连接/用户窗口。

## 实现与自动验证

styles.css末尾定向覆盖主panel与空态/已选球队卡：最大1040、全可用高度、清旧宽高cap和额外减高，内部柜体尺寸/多栏规则保留。按主框分段圆角，wide workspace左右30并对齐上方品牌，app.css横屏品牌行断点700改600；未改任何业务JS/存储/动效。

205检查（202单元/3HTTP）通过。[旧边界](../../artifacts/qa/hc036-before-frames.json)与[最终边界](../../artifacts/qa/hc036-after-frames.json)各96项，八尺寸×empty/3v3/4v4×四页共24组对照：before最大差280px，after所有x/y/width/height最大差0px；控件fit/hit、无整页滚动、仅更衣室品牌、原档案/选择/主Play保持。root亲看[390空态](../../artifacts/qa/hc036-after-390x844-empty-lineups.png)、[640横屏四人](../../artifacts/qa/hc036-after-640x360-4v4-lineups.png)与[平板三人](../../artifacts/qa/hc036-after-1024x768-3v3-lineups.png)。

[相关浏览器回归](../../artifacts/qa/hc036-regression.log)92640 exit0：完整runPageLayoutFlow/runLineupFlow/runPageMotionFlow通过，包含库展开/主页面、真实创建编辑/失败重试/推荐/档案、柜位touch、输入/长名/旧中性兼容、四页柔光rapid/cancel/reduced。未更改旧断言，不把未执行的全26套长时回放记为本轮新证据。独立CSS/几何/图检无P1/P2，APK/设备阶段单记。

## APK与原生程序证据

1.21.0/code23 [APK](../../artifacts/apk/halfcourt-1.21.0.apk)43秒构建成功，28网页资源逐hash与dist一致、无server.url；v2签名与原证书一致。APK SHA256为db1eff86f616307677d702b5f51774d7925b1a12a81832e108fe43fef7b14d50，见[资源核对](../../artifacts/qa/hc036-apk-assets.json)和[签名](../../artifacts/qa/hc036-apk-signature.txt)。

安装前即时核对当前ef473680/M2101K9C并备份实际0档案与当前进度，正常install-r Success，COLD746ms。版本/前台及[安装前](../../artifacts/qa/hc036-device-before.json)、[安装后](../../artifacts/qa/hc036-device-after.json)双hash保持：档案dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253；进度7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c。采用本次即时进度，不能用上次HC-035的历史进度代替。

实际WebView96/393×819[四页原生检查](../../artifacts/qa/hc036-native-frames.json)：训练场/战术库/档案/更衣室主框均x18、y116、width357.09、height620.27px，四维差0。启用控件fit/hit、无整页滚动、仅更衣室品牌、主Play和双文件字节保持，errors为空；未创建或保存手机测试球队。主控亲看[最终更衣室](../../artifacts/qa/hc036-native-lineups.png)，单柜比例与底部操作完整。只清本轮动态forward，保留其他连接及用户窗口。

代码/自动验证/安装与原生程序证据已完成，独立终审见[审查](../reviews/HC-036-locker-card-frame.md)。物理滑动/旋转与原生真实CRUD尚无人工验收，不将程序导航当作这些证据；保持awaiting_device，后续用户实际体验时核对。此状态不妨碍已授权更新交付。

最终独立终审无未修P1/P2，review文件所有权已交回。100份Markdown/660个本地链接检查无错误；本轮浏览器profile已清理，无残留测试目录。源码与已验证构建输入未再变更，不重复构建或回归。
