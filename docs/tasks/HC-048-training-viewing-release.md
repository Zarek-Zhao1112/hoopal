# HC-048 · 训练场完整动画布局正式接入

- 日期：2026-11-02；状态：`awaiting_device`。正式实现、独立审查、自动回归、构建和保数据手机更新已完成，物理操作与新布局人工观感待确认。
- 用户批准HC-047竖横屏效果，正式接入训练场并打包更新既定手机。目标版本1.25.0/code30。
- 设计：[训练场观看布局](../design/training-viewing.md)。大球场使用真实共用SVG，不复制概念图的球场拉伸或生成路线。

## 分工和接口

主控负责版本/配置、文档、最终集成、Chrome/构建/设备保数据安装与GitHub同步；不与实现agent同时写生产界面。

ui独占frontend/index.html的训练区、frontend/src/app.js的训练展示接线、frontend/styles/app.css最后新增训练样式导入，以及frontend/src/training/新展示JS/CSS（不修改player.js）。保留所有既有核心控件ID、事件、忙态及来源处理。标题突出真实当前战术，人数/攻防标签、显隐入口、真实木地板球场、简短当前步骤/讲解、时间轴/步骤点、集中播放/倍速/循环与重新播放。优先把原template-picker原节点作为清晰可点标题选择，保原mode共享节点；若需要自定义选择面板先同步接口。将分页步骤卡改为一行全部步骤标记，保留#frame-list和data-frame-index/aria-current，每个标记真实可点；移除旧step-pagination UI及对应只读分页接线。#frame-counter文本保持1 / N格式；#play-toggle保pressed/aria-label，内部可用SVG圆形图标。其他页面与外框位置/大小保持，紧凑视口确保主要控件可达，人员分工可点全文且不遮挡球场。动画引擎、SVG/data/shared/storage/platform不改。

engine独占tests/e2e中旧步骤分页/训练标题断言的必要更新，以及新增training-viewing-flow.mjs和browser-qa.mjs注册。保留全部真实26战术/存储/来源/库自动循环/四页同框/原动作与时序断言，只将批准的训练布局语义改为全步骤点和真实战术标题。增加3v3/4v4攻防、七八步、推荐姓名映射，六尺寸含360x400/844x390/1024x768的可见/命中/不溢出/球场不拉伸；真实pointer播放/暂停/上下步/步骤点/拖进度/倍速/循环/重播/讲解/显隐和横竖切换。验证主动画自然推进/结束回环和离页暂停，无假视频。Chrome完整运行由主控统一执行，不运行Android/ADB，不修改生产或配置。

training_review集成后独立只读审查生产/测试/报告，重点布局和动画/来源保护兼容，记录docs/reviews/HC-048-training-viewing-release.md及review索引。

## 数据与验收

不新增持久键或迁移，26套战术/18推荐规则/原动画时钟/旧图标/启动与两存储键保持。npm test、完整Chrome（含新训练组）、模板行为基线、静态导入/文档和独立审查通过后构建APK，核离线资源/原签名/包名/图标；设备检查草稿与忙态、备份两原始文件，覆盖安装-r，双hash不变后检查真实训练页面。缺少设备或人工体验按事实使用awaiting_device，不能以构建替代手机验收。

## 实现交接

ui已交还index训练区、app展示接线、新training/view.js与view.css及最后样式导入；旧分页撤下，全部步骤点与真实暂停图标接入。engine交还旧布局断言更新、新36组训练布局/真实控制与自然回环专项及第15组注册。主控初轮npm test225检查通过，26模板/18规则/10推荐样本/6身份文件保持，静态147模块/292相对导入通过。

首轮实际Chrome竖横图检发现原生range呈厚黑轨道、步骤标题取整句过长，UI随后仅修view.js/view.css为细浅蓝显式track/thumb与首短语14字截断；不修改真实讲解或播放行为。首轮dist与该两项修正的最终dist分开记录，不把旧截图冒称最终结果。

## 问题与修复复验

完整[首轮run](../../artifacts/qa/runs/1.25.0-1793585660774/run.json)在lineups组发现844×390推荐来源的讲解与步骤按钮被覆盖；[第一轮训练专项](../../artifacts/qa/hc048/target-1793586364429/run.json)发现360×400真实球场106.10×87px偏小。布局探针确认右侧详情被flex压缩后内容盖到时间轴，极短竖屏则内部分区耗去球场高度；独立审查记录两项P2，未降低原控件命中及115×90真实球场门槛。

UI修复为横屏显式详情/时间轴/操作网格、极短屏紧凑内部行高，并撤掉旧继承导致的时间轴倒排。重新构建后的npm test225通过；[专项第二轮](../../artifacts/qa/hc048/target-1793586768141/run.json)及[原始指标](../../artifacts/qa/hc048/target-1793586768141/hc048-training-viewing.json)36布局/6控制组/260自然回环样本、非循环终点/离页/旋转保位置与原生select选择通过，六项360×400实际117.073×96px。主控与独立审查亲看竖屏、推荐四人横屏及推荐三人短屏，所有记录控件fit/hit。最终整轮仍以最后报告为准。

## 最终验证与手机更新

- 最终[完整Chrome](../../artifacts/qa/runs/1.25.0-1793586836313/run.json)15组全部通过，errors/remoteRequests为空、临时浏览器及服务器已清理；保留首轮真实失败。训练[专项指标](../../artifacts/qa/runs/1.25.0-1793586836313/hc048-training-viewing.json)36布局/6控制、255自然样本覆盖整轮和回环，与隔离260样本分记。原lineups横屏推荐命中断言原样通过，96条四页边框检查保持。
- npm test225、147模块/292引用、26模板/18规则/10推荐样本/6身份文件通过；[127份冻结源码](../../artifacts/qa/hc048/final-source.json)与最终完整回归及构建输入保持。独立[审查](../reviews/HC-048-training-viewing-release.md)复核两P2修复与实际图，未遗留功能问题。
- Android构建27秒；[APK核验](../../artifacts/qa/hc048/apk/apk.json)1.25.0/code30、30网页与dist逐hash同、15图标与1.24.0同、包名/球搭/无server.url/原v2证书通过。[安装包](../../artifacts/apk/archive/hoopal-1.25.0.apk)4828101字节，SHA256 `117a86a2bbba8beebf12fdc2fb727767b693632a09de5517e97610a24a74ada4`。
- ef473680/M2101K9C重新识别且无打开的配置/当前可见未保存提示/忙态，备份两原文后install-r Success；COLD985ms/Wait991ms。实际0队，档案SHA `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`、内置进度SHA `7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c`在升级前后相同，见[设备前](../../artifacts/qa/hc048/device-before.json)和[设备后](../../artifacts/qa/hc048/device-after.json)。草稿检查仅说明当前打开/可见状态，不证明所有关闭内存草稿不存在。
- 实际WebView96 / Android12 / 393×819的[训练检查](../../artifacts/qa/hc048/native-training.json)两组暂停/播放几何完整、无整页溢出、控件命中/球场等比通过；620自然RAF样本覆盖本机原选中「底线反跑」整轮回环与暂停稳定。无示例队伍写入、无直接恢复存储，最终恢复原frame0、1倍速/循环/显隐，双文件SHA保持，errors为空。主控与审查者检查[手机实图](../../artifacts/qa/hc048/native-training-final.png)，独占ADB转发和探针已清理。
- 按既定顶层两版本规则将1.23.0包及SHA侧文件移到archive，逐hash保持并修历史链接；1.25.0和1.24.0保留顶层。生成包/图片/QA原文仍在artifacts，不进源码仓库。

当前手机已打开新版训练场。系统Back、真实手指、物理旋转和原生最终球队CRUD未作为本轮新增验收；浏览器模拟与手机程序点击分别记录。源码与文档按既定方式同步GitHub，最终同步SHA留本机QA记录。
