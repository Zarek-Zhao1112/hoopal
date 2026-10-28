# HC-042 · 低位分切追防与补位独立审查

- 日期：2026-10-28；审查者：interaction_design，未参与实现。
- 状态：最终源码、独立数值 / 语义复验、浏览器分项、APK与原生程序证据通过，无未修P1 / P2；新防守人工观感仍awaiting_device。
- 范围：[任务合同](../tasks/HC-042-post-split-defense.md)。只审post-split固定人盯人、不换防示例；不扩展其他25套战术设计。

## 原问题与验收口径

旧第3→4步，进攻1站在(430,440)，进攻2绕挡最近63.71；防守2却从(490,375)移到(540,375)，全程离掩护者至少88.46，未表现追防受挡。前一步防守1移到(470,620)，与对位者分离。此为防守与挡切讲解的因果表达不足，旧数据最小间距 / 球权校验通过不能代替动作合理。

最终审查检查：防守1持续对应进攻1，防守2接近挡点、实际绕行并恢复追2，防守3保篮侧对抗及受限补位 / 回收；显式路线须被真实interpolateBoards执行。按每段1001点核对动态轨迹、球权与间距，另检查新语义断言是否拒绝旧帧，不能只依赖新hash。核七帧 / ID / 角色保持及其他25套输出兼容；截图与浏览器、APK、设备证据分别记录执行者。

## 最终源码与防守语义

最终仅post-split防守位置、路径与说明改变。defineExpansion先保留显式防守run，不再为同一防守人添加竞争直线；无显式路线时仍生成原自动路径。七帧及1→3→2球权顺序保持，未新增投篮 / 换防或引擎分支。

D1最终从(320,445)跟到(460,350)，待1号退出时经(500,430)、(600,440)追至(635,425)。独立全过渡采样对位距离最大102.620816，朝篮方向归一投影最小69.903489且始终正，原候选偏外起点与退远挡点没有保留。挡点距1约94.87，可解释为对静止无球者的篮侧保位，而非贴身或换防接管2。

D2第3→4步显式路径为(585,430)→(490,440)→(520,390)→(520,330)→(535,285)，先追近挡点，再从篮侧绕出，末距2约74.33。独立判断不止“靠挡点60”：真实插值t=.342–.456中115个样本同时满足接近挡点 / 切入者，D2到当时2号的直接追线，其内部投影穿入掩护者约51px中心安全占位区；首个线距50.755841，末个21.219039。实际绕行不进入占位区，距掩护者最小60.051213（t=.366）。因此有直接追线受阻、选择绕行与恢复原对位的几何因果。此处t是引擎插值参数，不是现实秒数或对防守决策的模拟。

D3在篮侧由(385,180)向(420,180)有限补位，再回(385,190)，最终随3号出翼到(270,285)；对原对位者全程距离最大106.301458。讲解明确其受限补位与回收，未演成放弃原人、保证接球空位或自动抢断。本例仅预编排固定盯人、不换防的一种应对。

## 独立真实引擎采样与负对照

审查者在内存调用正式templates.build / interpolateBoards / ballPosition，对本套六段逐段t=0…1、步长.001，各1001点，共6006个board样本，包括端点。所有球员两两间距均纳入，不排除有意借挡；球对全部防守均纳入，传球另查第三进攻者，排除传 / 接球者的有意接球接近。实际最小值：

| 检查 | 最小中心距 | 位置 |
| --- | --- | --- |
| 全员 | 56.568655 | 第3→4步，t=.842，进攻2 / 防守1 |
| 球 / 防守 | 52.838849 | 第1→2步，t=.168，防守1 |
| 传球 / 第三进攻者 | 203.048719 | 第4→5步，t=.136，进攻1 |

球员含描边约51、球直径24；不把阴影 / 路线作为碰撞实体。有限离散采样并非连续数学证明，更不等于篮球实战有效。四个D2显式路线拐点按累计弧长传入真实引擎，位置误差均为0，证明实际运动使用折线，而非只画新箭头。

只读提取并执行最终测试中的assertPostDefense：新帧通过；分别从主控保留的旧源重建旧D1 / 旧D2，再独立换入新版其余帧与对应旧路径，分别触发D1篮侧和D2显式绕挡断言失败。负对照拒绝的是旧行为，不依靠post-split新hash。原37段动态间距硬阈值仍保留，未因新数据放宽。

独立重算[其余25套基线](../../artifacts/qa/hc042/other-25-baseline.json)逐项SHA相同，[五项UI基线](../../artifacts/qa/hc042/unchanged-ui-baseline.json)也全部相同。与旧源重建帧作deepEqual，本套进攻坐标、进攻路径（忽略生成ID）及七帧球权均保持；不是只信[preserved报告](../../artifacts/qa/hc042/preserved.json)。生成路线字段顺序不作为行为差异。

## 浏览器分项结果与独立图检

只读核对[最终汇总](../../artifacts/qa/hc042-browser-summary.json)：requiredChecksPassed=true，errors / remote为空。其自然播放报告仍passed=false / exit1，不改写成整轮exit0。两次整轮最后失败均为旧进度夹具在旧document内预写后，被合法pagehide保存覆盖；只加等待屏障的首次修正不足。最终独立[旧进度恢复runner](../../artifacts/qa/hc042-browser-restores/verification.json)在下一document初始化前注入原选择键，保留生产pagehide行为，exit0，0–6七个旧步骤全部恢复。失败产物保留，不作为产品修复或被忽略。

自然播放的已完成组件包括：库内完整一轮 / 末停 / cycle1、暂停冻结 / 离页停、主Play与存储保持、CTA进入训练场完整播放、七步说明 / 进度、四尺寸fit / hit。库内908点、训练862点为真实SVG读取；审查者另用正式引擎逐点重算，库内六球员与球的最大误差均0，训练球员最大4.099038e-13、球1.171857e-13。报告末帧可见停留999.8ms。位置重算证明实际绘制对应数据，篮球因果另由前节独立语义判断，不能互相代替。

审查者亲看[库内追近挡点](../../artifacts/qa/hc042-browser/library-screen.png)、[篮侧绕行](../../artifacts/qa/hc042-browser/library-around.png)、[近筐回追](../../artifacts/qa/hc042-browser/library-receive.png)、[D1随外撤](../../artifacts/qa/hc042-browser/library-defender-one-recovery.png)与[训练场末态](../../artifacts/qa/hc042-browser/training-390x844.png)：场景与独立坐标复验相符，标题、CTA、底栏与训练控件完整。小库中攻防run仍沿用同绿路线，不以小缩略图单独证明全部角色可读，实际动态样本及训练场为补充；本轮未改renderer。

## APK核对

读取主控[25秒构建日志](../../artifacts/qa/hc042/android-build.log)、[APK资源结果](../../artifacts/qa/hc042-apk-assets.json)与[签名](../../artifacts/qa/hc042/apk-signature.txt)：1.22.3 / code27，30网页资源与dist保持，15图标与1.22.2一致，三份Native启动源未变，无server.url，包名com.halfcourt.tactics / 名称球搭。v2有效、证书仍e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26；APK SHA256为a3742ca42dc2d5bca6cbb79c6cc9c94e2a1e109c2017323f3c3a6397fbd04da5。

## 安装与原生程序终审

主控指定ef473680 / M2101K9C重新识别后执行覆盖更新。[即时preflight](../../artifacts/qa/hc042-device-preflight.json)为library、editing=false，无未提交草稿；[安装](../../artifacts/qa/hc042/device-install.txt)Success，[启动](../../artifacts/qa/hc042/device-launch.txt)明确COLD，TotalTime682 / WaitTime686ms。[before](../../artifacts/qa/hc042-device-before.json)与[after](../../artifacts/qa/hc042-device-after.json)均实际0档案，后者版本1.22.3 / code27且前台核验通过。档案SHA256均dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253，选择SHA256均7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c。

只读核对[原生报告](../../artifacts/qa/hc042/native-post-split.json)及[严格运行结果](../../artifacts/qa/hc042/native-run.log)：实际WebView96，库内自然完整一轮1345样本，覆盖0–6全部步骤、末停与cycle1。审查者逐样本调用正式引擎独立重算，六球员和球的最大误差均0；末步有91条样本、首末可见间隔994ms，随后cycle1，与1000ms末停的绘制采样容差一致，不是FPS测量。程序暂停后报告playing=false / rafCount=0，主控严格检查整份dataset冻结；控件fit / hit、无overflow、mainPlay / 双文件哈希保持，errors为空。

亲看[原生绕挡中](../../artifacts/qa/hc042/native-around-screen.png)与[原生近筐接球](../../artifacts/qa/hc042/native-receive.png)：实际蓝方追近 / 篮侧绕行与近筐对位和源码位置相符，库卡 / CTA / 四项底栏完整。图片和实帧共同用于核对呈现，未把静图本身当作完整运动证明。手机未点进入训练场CTA、未创建或保存测试阵容。主控finally移除本轮探针及动态转发、恢复原视图，保留其他既存连接未动。

## 验证边界

最终npm test为主控执行的215项通过；代码、浏览器分项、APK与原生程序阶段收口，无未修P1 / P2。两次浏览器整轮exit1与独立旧进度恢复exit0分别如实保留，不能改称全套单次通过。审查者未设计或修改产品坐标，未运行Chrome、ADB或构建；独立证据是源码、6006点采样、负对照、基线 / 实帧复算及亲看图，执行者报告另列。未重复未改动25套长时播放；新防守实际观感尚未获用户确认，仍awaiting_device，不把程序点击、离散几何或安装成功当作物理手指、IME / Back / 旋转 / 真实CRUD或篮球实战验收。
