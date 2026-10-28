# HC-026 · 六套新增进攻战术预览

- 日期：2026-10-24；状态：`completed`（仅独立效果图与可播放预览）。
- 用户先同意加入讨论的六套战术，随即要求“先出效果图”。本轮改为独立效果图与可播放预览，正式战术库/推荐/APK暂不更新；待选定后继续原新增目标。
- 关联：[新增战术包设计](../design/new-tactics-pack.md)。当前正式1.15.0保留，旧ID/档案/存储/推荐排序不变。

## 分工与边界

| 负责人 | 唯一写入范围 | 接口与验收 |
| --- | --- | --- |
| engine | artifacts/design/new-tactics-preview/data.mjs、check-data.mjs | 六套纯数据定义、每套6–9步；id/title/mode/category/difficulty/description/fit/focusStep/steps，复用data/tactics/helpers.js；冻结下列职责，核对路由/球权/静止掩护/动态间距，不改data或shared源码 |
| ui | artifacts/design/new-tactics-preview/index.html、preview.css、preview.js、overview.html | 现有冰川蓝/木地板、默认标题叠卡，按3v3/4v4只看本批三张；点卡展开→预览演练，播放/暂停/前后步/重播/球权与文字联动。六图overview，用同一真实数据与关键步骤。经典脚本file可开、不读存储/网络；四尺寸适配 |
| 主控 | 任务/设计/索引、build-data.mjs/engine-entry.mjs、render-preview.mjs、图片/报告 | 从data生成window.previewTactics，从实际引擎/球场appearance打包预览IIFE；四尺寸/全六套实际播放/入口与时序检查，逐图检查，无生产变更 |
| interaction_design | docs/reviews/HC-026-new-tactics-preview.md与审查索引 | 集成后只读审查篮球动作、球权/掩护顺序/参考防守及交互；核对来源与人数改编边界，不以数据合法代替战术正确 |

## 六套职责合同

| ID / 人数 / 名称 | 动画职责 |
| --- | --- |
| post-split / 3v3 / 低位分切 | 1传低位后给2掩护；2借挡切入接回传；3低位接球策应并回传2 |
| slip-screen / 3v3 / 假掩护顺下 | 1持球观察并传球；2尚未建立接触便提前切入接球；3弱侧拉开；明确是挡拆变式 |
| offball-flare / 3v3 / 无球外弹接投 | 1外线传球；2借3的无球掩护远离球向外跑接球；3站稳掩护后接应；区别掩护者外弹 |
| hammer / 4v4 / 弱侧锤子配合 | 1沿底线突破分弱侧；2借3弱侧掩护沉到底角接球；3站稳掩护；4外线出口/拉开 |
| zoom-handoff / 4v4 / 下掩护接手递手 | 1高位交球并停稳；2先借3下掩护上提，再近身接1手递手突破；3掩护结束拉开；4弱侧出口 |
| screen-the-screener / 4v4 / 掩护者再获掩护 | 1持球观察；2先掩护3切入，再借4掩护出来接球；3先空切牵制；4掩护2；区别同一接球者连续双掩护 |

每步note讲当前角色/下一动作；主要路线能看出各套区别，掩护接触阶段先站稳，不把移动掩护当合法方法。近身手递手需独立交接帧；传球不穿参考防守者标记，球员不重叠。若需调整职责先同步主控和UI，不擅自改推荐语义。

## 必需验收

- 仅artifacts预览及文档，源码生产模块/版本/APK/设备不改；无Storage/HTTP(S)资源请求。
- 六套可独立构建并通过真实引擎校验，路径起终点/球权与相邻帧一致；独立审查动作顺序和差异。
- 四尺寸390×844、360×640、844×390、1024×768无整页滚动、库卡可达；全部六套可打开并播放、暂停、逐步、重播，切换可靠停止旧运动，单次切换仅更换当前预览。
- 输出六战术概览PNG、两种人数手机界面PNG与本地可播放HTML；图检与浏览器、设备证据分开。本轮无需构建或安装APK。

## 交付与验证

- [六套动作总览](../../artifacts/design/new-tactics-preview/overview.png)、[可播放预览](../../artifacts/design/new-tactics-preview/index.html)、[手机库卡](../../artifacts/design/new-tactics-preview/library-3v3-expanded.png)。正式版本仍1.15.0、20套战术，没有改正式推荐或更新手机。
- 六套数据共43帧/37段相邻过渡、8次传球、7段screen，保留完整中文讲解与角色合同。engine先修了部分借挡/参考防守/路线间距，再冻结最终数据。实际引擎每段1001点检查，球员最小间距55.48、球与防守最小49.96；[数据报告](../../artifacts/design/new-tactics-preview/data-verification.json)无问题。独立审查额外密采样37037个board及185个IIFE/正式引擎等价样本通过。
- [最终Chrome报告](../../artifacts/design/new-tactics-preview/verification.json)：32组合（两人数库×四尺寸＋六套演练×四尺寸）、六套全部从头播放到末帧及末球权、暂停/逐步/重播/切套停止旧RAF通过，所有主要控件可命中，无整页滚动、异常、HTTP(S)资源或Storage调用。主控与reviewer图检总览/关键手机帧，图片使用同一数据。
- 后续具体控件检查发现进度条input先pause/paint覆盖新值，实际500输入读回0.009而非0.5。主控修正先捕获requested值再pause；[补充四尺寸控件报告](../../artifacts/design/new-tactics-preview/controls-verification.json)通过实际库CTA、range拖动到50%并暂停、倍速继续、全文讲解开关/命中及人数切换，异常/网络/存储均空。此一行修正不改变图像、数据或未使用range的既有完整播放证据；独立A/B复验旧0.009、新0.5及0/125/999/1000比例通过，无未修P1/P2。
- [审查](../reviews/HC-026-new-tactics-preview.md)记录源码、篮球动作、独立采样、图检与主控浏览器执行者，预览证据不替代专业效果或真机验收。
- 构建独立IIFE时，本机Vite原生binding被系统Application Control策略阻止，普通与授权命令均失败；未删除锁文件、依赖或改系统策略。预览改用两份无import的实际引擎/appearance源码各自闭包去export链接，独立等价检查通过；不涉及生产dist/APK构建。
- 文档检查80份Markdown、411个本地链接通过。两轮完整预览浏览器与补充控件检查均完成，自己的临时Chrome/profile已清理；未操作设备。

后续正式接入仍需九张进攻卡的可达性/分页、六套推荐职责与完整业务回归；本轮只兑现用户最新要求的效果图与独立预览。
