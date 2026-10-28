# HC-042 · 低位分切追防与补位修正

- 日期：2026-10-28；状态：`awaiting_device`。
- 用户指出低位分切防守位置不合理，同意完整表现追防/必要补位。采用固定人盯人、不换防、绕挡追防的一种示例，不将防守主动让路演成掩护效果。
- 关联：[新增战术设计](../design/new-tactics-pack.md)。正式目标1.22.3/code27，沿用当前设备保数据覆盖更新授权。

## 范围与接口

仅修正post-split的站位、明确防守路径与对应讲解；保持ID、七帧、1传3/1为2设挡/3回传2的角色与球权，不改变其余25套、推荐职责、播放器/存储schema、布局、2.4秒启动或原生交接。真实防守编号固定对应各自进攻人，1号防守不无故退远，2号防守追随切入并因掩护绕行，3号防守保持低位对抗并体现受限协防/回收。可以为动作可读性小幅调整本套进攻站位或路线，但应先说明必要性；不新增投篮、分支AI或防守切换菜单。

defineExpansion优先保留显式defense run路线，无显式且位置变化才生成直线；保持其他五套输出完全相同。画图路径必须与真实interpolateBoards轨迹一致，不能仅换箭头不换运动。掩护者使用期间静止，球员核心直径约51、球直径24；全程坐标合法、球权连续、合理间距，不以最小距离通过替代防守语义。

## 分工与所有权

- engine：唯一修改data/tactics/offense-expansion.js、tests/unit/offense-expansion.test.mjs；实现并采样防守关系，说明初始/挡点受阻/绕挡恢复/低位协防的证据。更新本套旧预览hash断言时明确新授权，保留其他五套原hash及旧20顺序；不改共享引擎/推荐/配置。交回时报告实际文件、1001点采样结果、限制与必要进攻微调。
- 主控：版本/任务/设计/文档、真实Chrome录制与截图、APK/安装/设备数据保护；检查库内循环与训练场同源动作及旧进度可达。先保留本轮改前数据基线，不修改engine持权文件。
- interaction_design：集成后独立只读审查，不实现数据；独占本任务review与reviews索引，核防守因果/篮球语义、真实引擎样本和实际图，不以hash一致代替正确。问题须给步骤/位置/触发，修复后复验。

## 验收与边界

npm test；构建后定向Chrome完整播放本套库内一轮并检查暂停/循环/切页、进入训练场完整播放与逐步讲解/球权、四尺寸控件与数据保持。新语义测试必须能拒绝旧版退远/不追防，保留其他战术密采样及推荐兼容；当前仅改战术纯数据，不重复全部未改页面长回归，发现关联失败再扩展。独立审查后Android构建，核30网页同dist、原签名/图标/无server.url、1.22.3/code27。安装前即时草稿/档案/进度检查与备份，install-r后版本/双hash及真WebView本套程序复核；不能以浏览器/DOM操作冒称手指或篮球实战验证，用户观感未反馈维持awaiting_device。

## 实现与初步验证

engine已交回数据和测试。所有进攻坐标/路线及七帧球权保持，仅防守站位/显式路线与讲解改变；defineExpansion保留已有defense run而不再追加竞争直线，其他25套逐帧SHA与本轮基线完全相同。D1初始改至篮侧(320,445)、挡点(460,350)，并沿折线跟1外撤；D2追近挡点后从篮侧绕行回追，D3限补后回收并跟随3补翼。初候选D1起始略在背篮侧，被主控和独立审查指出后改正，未带入最终构建。

10项战术定向检查与完整[npm test](../../artifacts/qa/hc042/npm-test.log)215项通过（212单元/3HTTP），原37段×1001插值的球员/球路硬阈值未放宽。新语义测试分别换入旧D1或旧D2会失败，并核篮侧持续跟位、实际挡住直追线、显式绕行逐点插值与低位有限补位/回收。本套6×1001样本全员最小56.5687px、球对防守最小52.8388px；D1对1最远102.6208px，D2近挡60.0512px、末态距2为74.33px。数值证明采样几何边界，不代替实际画面或篮球对抗验收。

主控[preserved核对](../../artifacts/qa/hc042/preserved.json)确认另外25套完整frames、五份startup/app UI源保持，七帧与原球权序列不变；旧0–6步骤均仍合法，无schema/键/ID或数据迁移。

## 浏览器与独立动作审查

[浏览器总索引](../../artifacts/qa/hc042-browser-summary.json)按实际执行分项：自然库908个样本、训练场862个样本，与正式引擎逐点比较，球员误差分别0/4.10e-13；末态停留约999.8ms后cycle1、暂停冻结、离页停止、库浏览不改主Play或存储、CTA完整训练播放、七步全文与scrub、390×844/360×640/844×390/1024×768八组fit/hit及无整页溢出通过。主控亲看实际挡点/绕行和训练场图，未改共享renderer或布局。

两次整轮runner的旧进度夹具在reload前写localStorage，被旧document的合法pagehide保存覆盖，均保留exit1与原报告；第一次仅补document屏障未解决该夹具时机，未将失败冒写为整轮通过。最终单独[0–6恢复检查](../../artifacts/qa/hc042-browser-restores/verification.json)将原格式夹具放在下一document初始化前，保留生产pagehide与实际读取，七项exit0。已过的长回放/布局不再重复；总索引明确引用分项来源、源码/产物SHA和失败事实，requiredChecksPassed=true。无运行时异常/远程请求，独立profile/server/Chrome均清理。

独立审查按6×1001样本重算：D1持续篮侧并随1，全程最近篮向投影为正；D2追近段t=.342–.456的115个样本，其直追当时2号的线段内部穿入1号51px占位区，而实际路线安全绕出，四个转折点插值误差0。旧D1/旧D2分别换入会被新行为断言拒绝；进攻路径/坐标和其余25帧SHA独立重算保持，不以新hash或静图单独证明战术有效。详见[审查](../reviews/HC-042-post-split-defense.md)。

## APK与当前手机

[25秒Android构建](../../artifacts/qa/hc042/android-build.log)成功，[1.22.3/code27 APK](../../artifacts/apk/archive/hoopal-1.22.3.apk) SHA256 `a3742ca42dc2d5bca6cbb79c6cc9c94e2a1e109c2017323f3c3a6397fbd04da5`。[包资产](../../artifacts/qa/hc042-apk-assets.json)核30网页同dist、15编译图标同1.22.2、Native三个源码保持，无server.url；[原v2签名](../../artifacts/qa/hc042/apk-signature.txt)及[球搭版本/包名](../../artifacts/qa/hc042/apk-badging.txt)通过。

重新核ef473680/M2101K9C、preflight无草稿，即时备份真实0档案和进度后[正常覆盖安装](../../artifacts/qa/hc042/device-install.txt)。[明确COLD682ms/Wait686ms](../../artifacts/qa/hc042/device-launch.txt)，[before](../../artifacts/qa/hc042-device-before.json)/[after](../../artifacts/qa/hc042-device-after.json)核1.22.3/code27/本应用前台，档案SHA `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`、进度SHA `7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c`完全相同。未卸载、清数据或写入测试阵容。

[实际WebView96程序检查](../../artifacts/qa/hc042/native-post-split.json)exit0，库内自然一轮1345样本覆盖全部七帧，实际球员对正式引擎误差0、球误差<.001；末hold/cycle1、暂停dataset冻结、fit/hit/无溢出/原mainPlay及档案进度双hash保持，errors为空。主控亲看[手机绕挡](../../artifacts/qa/hc042/native-around-screen.png)与[接球](../../artifacts/qa/hc042/native-receive.png)。未点手机训练CTA或测试保存，训练场完整播放证据来自浏览器，不能混同。

探针/专用动态转发已清，恢复原视图与筛选，保留其他四条ADB连接及他应用。实现、相关自动检查、独立审查、APK安装与本套原生程序验证完成；固定防守脚本不是AI或必然空位。用户尚未反馈新防守动画的实际观感，维持awaiting_device；下一步请实际查看第3–4步绕挡追防及后续补位回收，历史其他真机待办不并称已验。

独立终审已完成，无未修P1/P2；最终源与dist/index哈希仍匹配浏览器总索引。112份Markdown的883个本地链接核对通过，版本说明/使用指南/设计/任务与审查索引已同步。
