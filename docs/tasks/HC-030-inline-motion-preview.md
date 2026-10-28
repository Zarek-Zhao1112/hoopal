# HC-030 · 战术卡内循环动画预览

- 日期：2026-10-25；状态：`completed`。独立预览、最终Chrome/PNG与独立审查完成，正式1.17.0和手机保持。
- 用户希望展开卡片直接播放完整战术，已选择循环播放，并要求先看效果图。只交付独立HTML/PNG及可播放预览；正式1.17.0、APK和手机保持，不提前接生产。
- 设计沿用[纵向九卡](../design/stacked-library.md)。本轮在其球场区域增加真实动作，保留九标题/短屏覆盖/横屏分区、顶部留白和玻璃导航。

## 交互合同

展开当前卡从初始站位自动1倍速播放现有完整动画，末帧停留1秒后回初始循环。整块球场可点暂停/继续，角落小状态角标明确播放或暂停；暂停保留当前进度及末帧停留的剩余时间。收起/换卡/切人数攻防停止旧循环，再次展开从头。只运行当前卡的一个rAF；后台停计时，返回不跳跃；resize不重置进度。CTA文案「进入训练场」，本独立预览只给说明，不载入真实演练或写来源。

所有26套正式模板导出完整frames，复用真实interpolateBoards/ballPosition及木地板/棋子外观，不能用假的CSS跑位或录制视频代替本地引擎。球权、路径和角色与实际模板一致。无存储/网络/数据迁移。

## 分工与接口

ui只写artifacts/design/inline-motion-preview下index/overview、preview.css/js、build-data/catalog/engine七类文件，复用HC-028；主控写render/verification/PNG与任务索引、执行Chrome；interaction_design独立只读并写HC-030审查及索引。无生产写入或依赖安装。

previewAPI保留setMode/setKind/select/collapse/state，增加pause/resume/seek；state暴露播放/进度/轮次/步骤/球权/等待阶段，便于用实际引擎核对，不以截图宣称动态通过。seek接口由实现者明确，仅预览使用。

## 验收与交付

四尺寸390×844/360×640/844×390/1024×768、双人数卡片默认/播放/暂停/切换，真实控件命中与无滚动，常规九标题与短屏覆盖返回保持。验证真实时间推进、暂停稳定/继续、完整至少一轮含1秒末停、换卡收起切组取消旧任务、仅一条rAF、真实棋子与球权、后台及减少动态效果可用，无Storage或远程请求。输出三屏PNG和file可开HTML，独立源码/图检审查。预览不要求重跑全应用或更新APK；物理设备性能仍未验。

## 已完成的预览与证据

[三屏效果图](../../artifacts/design/inline-motion-preview/overview.png)、[交互预览](../../artifacts/design/inline-motion-preview/index.html)、[对照HTML](../../artifacts/design/inline-motion-preview/overview.html)：默认收起、3v3自动循环、4v4暂停。球场整面button可点/键盘暂停继续，右上小玻璃角标与细进度线；CTA「进入训练场」只给独立预览说明。26套完整frames来自生产模板，真实路线/球权/棋子复用引擎与材料。

ui七文件最终冻结后主控完整Chrome退出0，[验证报告](../../artifacts/design/inline-motion-preview/verification.json)：25布局/交互组合含四尺寸双人数闭卡/播放/暂停与减少动效，控件实际中心点击、视口有界/无滚动；78真实状态样本（26套各0/.5/1）棋子transform与ballPosition逐值对应生产帧/实际引擎，端点球权一致。

实际1倍速give-go观察可见棋子/球移动、暂停位置冻结；从头完整播放至末帧并进入hold，末停已过约400.1ms时暂停，剩约599.9ms在暂停300ms期间保持，继续后累计1000ms才重启cycle1。真实新tab令页面hidden，播放变paused、rAF0且进度不变；切卡rapid只保留当前卡1rAF，收起/切组0，暂停resize不改棋子/进度。无运行时错误、远程请求或Storage调用。

首轮已通过后ui完成角标位置/ball属性/短屏焦点细化，主控对冻结版本重新整轮并刷新全部PNG，最终报告与图为同版。主控亲看最终三屏图，短屏/横屏/平板图均已生成。真实时间闭环只对give-go完整观察，其他26套以端点/中点样本与共享循环生命周期覆盖，不宣称全部26各跑完一整轮或真机FPS通过。

[生产快照](../../artifacts/design/inline-motion-preview/production-before.json)六项（package/lock、正式库3源、1.17.0 APK）SHA256前后相同，最终检查直接写在报告productionHashesUnchanged=6；未部署/更新手机，临时Chrome进程/profile已清理。previewAPI.seek(progress0..1)暂停并定格，pause/resume保留末帧停留剩余时间；state暴露循环/播放/hold/帧号/球权供核验。

独立审查与图检见[HC-030审查](../reviews/HC-030-inline-motion-preview.md)，无未修P1/P2。审查员用实际预览脚本/真实引擎独立夹具核全部155帧与正式模板相等、单rAF/2400ms段/1000ms末停与暂停剩余/代际清理/后台/resize，并亲看最终三屏及360图，区分主控真实时间与VM证据。此预览不替代正式来源/载入协议或设备验收；确认视觉后再另行生产接入。
