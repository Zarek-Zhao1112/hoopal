# HC-048 · 训练场完整动画布局独立审查

- 日期：2026-11-02；审查者：training_review，未参与生产代码或测试实现。
- 范围：[任务](../tasks/HC-048-training-viewing-release.md) / [设计](../design/training-viewing.md)，目标1.25.0/code30。生产、测试、配置保持只读，仅维护本记录和审查索引。
- 当前结论：初轮两项P2已修，最终完整Chrome15组、隔离36组专项、APK与实际WebView证据独立复核通过，无未修P1/P2。1.25.0已保数据安装手机，人工触摸/旋转等体验仍awaiting_device。

## 源码与兼容边界

index训练区使用真实#training-title和原#template-picker选择器，原#mode继续在库与训练页共享，#court保1000×820及xMidYMid meet。SVG绘制/战术数据不从生成效果图复制；布局仅作用于body[data-view=play]。新增圆形播放按钮保原ID和pressed/label，通过真实playing状态切换play/pause SVG。

training/view只负责标题、短讲解、图标和步骤标记；不持久化、不计时、不访问平台。app移除旧六步分页并转调展示模块，#frame-list仍以真实全部frames生成data-frame-index/aria-current和可理解名称，点击沿原stop→changeFrame→seek→render→persist；#frame-counter格式保持。loadTemplate原清来源顺序、失败恢复、保存策略以及所有播放/拖动/倍速/循环/离页/后台事件保留。storage/platform/shared/data/player.js和共用court-renderer无本轮改动。

人员映射仍由原renderLegend及recommendLineup结果生成，训练CSS只压缩其排版，不替换真实成员或删除查看全文/独立分页入口。导航内部archives路由、其他页面外框与原弹窗/Back优先级未改。

## 测试改动审查

旧readonly流程的分页断言改为同屏全部合法步骤，仍逐套加载26战术并保真实移动、暂停、显隐、断网和导出；新page-layout断言核真实标题与选中模板一致及全步骤在卡内，没有删除外框/控件命中/存储故障检查。offense-expansion仅更新步骤标记措辞，原七八步真实坐标/讲解与来源失败保护保留。

新增第15组training-viewing使用独立浏览器profile，按真实schema注入3/4人攻防和两份真实推荐档案，从非零保存步骤恢复；6类×6视口检查全部步骤/来源/命中、真实SVG等比CTM和完整视野，最后步骤真实pointer命中并核模板坐标。原生select用pointer/键盘选择，播放控制、连续拖进度、讲解/人员全文和自然完整回环/非循环结束/离页暂停分别验证。finally以新文档注入恢复两原始键，避免旧pagehide覆盖夹具；不读写用户手机资料。最终是否全部执行通过以主控实际run为准。

## 验收边界

静态图、桌面模拟、程序点击和物理操作分别记录，不相互替代；本审查者未运行完整Chrome、构建或ADB，而是独立审核源码、原始报告、SHA及实际截图。APK/安装/真实WebView已按后文核对，物理手势、系统Back、IME、手机旋转、原生CRUD与分享本轮未新增验收。数据/时钟均保持，仍需用户确认新布局体验。

## 发现与复验

### P2：推荐来源横屏时说明和步骤控件被覆盖（已修，专项复验通过）

- 位置：frontend/src/training/view.css 的横屏playback布局；实际失败断言tests/e2e/lineup-flow.mjs:361。
- 触发：真实推荐来源与本队人员映射已载入，844×390，训练场play base。
- 证据：[第1轮run](../../artifacts/qa/runs/1.25.0-1793585660774/run.json)在lineups组退出，blocked包含open-note及六个无ID步骤按钮；errors/remoteRequests为空，前面无来源page-layout通过不能替代此状态。
- 影响：讲解和步骤按钮虽在视口内，真实指针无法命中；属于主要操作不可达，不是单纯配色差异。
- 已通知主控和UI负责人，要求修复真实推荐布局并保留原命中断言，随后整轮及推荐短屏专项复验。当前记录不将该失败写成通过。
- 修复：横屏playback改为显式grid详情/44px时间轴/40px操作三行，header压为46px；短正文收为当前动作标题并保留全文按钮，人员两行/分页仍显示。835×340另用34px时间轴/36px操作行，防止flex子内容收缩后交叠。
- 独立复验：[修复后专项](../../artifacts/qa/hc048/target-1793586768141/hc048-training-viewing.json)36布局中两项844×390推荐状态的24/25个记录控件全部fit/hit；亲看四人推荐横屏截图，讲解、8步骤点与播放区彼此分开。最终完整lineups原断言仍待整轮确认。
- 最终复验：run 1.25.0-1793586836313的原lineups整组及新训练组均通过，未放宽原控件命中断言。

### P2：极短竖屏真实球场被压缩过小（已修，专项复验通过）

- 位置：frontend/src/training/view.css 的max-height:500px短屏分区；失败断言training-viewing-flow.mjs的实际球场面积检查。
- 触发：360×400，无来源和推荐来源均可出现。
- 证据：[隔离专项日志](../../artifacts/qa/hc048/target-run-1.log)在post-split/360×400退出；[布局探针](../../artifacts/qa/hc048/layout-probe-1.log)用实际SVG CTM重算球场内容106.10×87px，低于既定115×90最低阈值。该值指真实球场绘图面积，不是外围木板盒子。
- 影响：虽然页面无滚动，球场内容受挤压，无法满足完整动画优先的基本观看面积。
- 已回交UI修复布局，保留阈值，待36组专项及最终整轮复验。探针将隐藏的toggle-defense原input标记为被span.switch命中属于原有label代理结构，不列为第三项产品问题；实际显隐应检查可见label及真实切换结果。
- 修复：紧凑布局腾出9px给球场，并显式指定range第1行、全部步骤第2行，避免继承grid-row造成隐式行。
- 独立复验：重算同一专项六项360×400状态真实CTM面积均117.073×96px，保持原115×90阈值且等比/完整可见，控件全部fit/hit。亲看推荐三人短屏截图，人员、讲解、7步骤、进度和四栏均可见。
- 最终复验：同一冻结输入的完整训练组36布局全部通过，六项极短竖屏仍满足原面积阈值。

## 修复后专项复核

读取target-1793586768141/run.json确认exit路径passed、errors/remoteRequests空、tempCleaned=true；独立重算36布局/6控制组，所有记录控件fit/hit，CTM均匀缩放，全部短屏满足原阈值。自然播放260个实际RAF样本覆盖整轮及回环，另有循环关闭终点、离页暂停、旋转不丢进度和真实标题select选择结果。亲看390×844低位分切竖屏、844×390四人推荐、360×400三人推荐实图；滑轨已改显式浅蓝轨道，短动作标题保完整讲解入口。该专项是正式dist隔离Chrome，不是原效果图，也不是手机物理操作或FPS认证；后续完整run必须使用同一冻结输入。

## 最终完整浏览器与源码冻结复核

独立读取[最终run](../../artifacts/qa/runs/1.25.0-1793586836313/run.json)，1.25.0共15组均passed，errors/remoteRequests为空，tempCleaned=true；原14组保留并新增training-viewing。原lineups组真实推荐横屏命中断言与全部26战术/库循环/来源失败/离线/导出/启动/组队/我的/转场均完成。主控npm test最终225/225通过，日志位于hc048/npm-test-final.log。

审查者重新读取127份冻结源文件并逐SHA256核对final-source.json，全与捕获值一致。最终[训练报告](../../artifacts/qa/runs/1.25.0-1793586836313/hc048-training-viewing.json)重算36布局/6控制组、全部已记录控件fit/hit、无整页溢出、等比CTM与最低面积保持。最终自然循环样本为255条（独立专项为260条，分开记录），含一次真实末端回环与181种实际球员transform组合，不以采样数声称FPS。再次亲看最终run的竖屏/推荐横屏/推荐短屏截图，确认图与最终输入匹配。

独立重算hc036-after-frames.json的96条：三档案状态×八尺寸×四页，24组四页外框x/y/宽/高相差均不超过1px，记录控件fit/hit、整页无溢出，storageAndPlayUnchanged=true。该证据核实际边框盒，不把新训练内部排版称为旧版像素一致。

## APK、安装与真实WebView终审

主控Android构建27秒；独立读取[APK报告](../../artifacts/qa/hc048/apk/apk.json)：球搭/com.halfcourt.tactics、1.25.0/code30，30网页资源同dist、15图标同1.24.0、无server.url、v2有效且证书保持e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26。审查者独立读取实际APK的4,828,101字节，重算SHA256为117a86a2bbba8beebf12fdc2fb727767b693632a09de5517e97610a24a74ada4，与报告相同。

实际ef473680/M2101K9C install-r Success，[启动](../../artifacts/qa/hc048/device-launch.txt)COLD985ms/Wait991ms。[before](../../artifacts/qa/hc048/device-before.json)为1.24.0/code29，[after](../../artifacts/qa/hc048/device-after.json)为1.25.0/code30且前台核实，实际均0份球队。两原始文件SHA逐项一致：档案dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253，内置选择7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c。preflight无打开向导/当前渲染草稿指示/忙态，检查范围明确不等于证明全部关闭的内存草稿不存在。

独立读取[原生报告](../../artifacts/qa/hc048/native-training.json)：Android12/WebView96、393×819、原真实底线反跑六步，暂停/播放两组，所有已记录可用控件fit/hit、无整页溢出、CTM等比。620连续实际RAF样本，独立从进度>990到<30重算观察到自然回环；实际脚本核SVG确实变化、暂停稳定，并经原步骤按钮恢复初始frame0及1x/loop，两个私有文件hash保持。errors为空，未创建测试球队或直接覆写文件；探针/独占转发已清理。

亲看[手机最终暂停态](../../artifacts/qa/hc048/native-training-final.png)与[手机播放中](../../artifacts/qa/hc048/native-training-playing.png)：真实木地板/六步/蓝色轨道/圆形play-pause状态/四项玻璃底栏完整，图标与真实playing状态一致，队员位置随动画变化。该图使用手机原有战术选择与0球队状态，不把Chrome推荐测试球队说成用户数据；手机本轮只验证竖屏，横屏/极短屏证据来自正式Chrome回归。
