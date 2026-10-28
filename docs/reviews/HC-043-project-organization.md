# HC-043 · 项目清理与模块整理独立审查

- 日期：2026-10-28；审查者：interaction_design，未参与产品或清理工具实现。
- 当前结论：产品源码、独立行为 / 结构、最终完整Chrome、48对布局事实、APK及原生程序终审通过；设备preflight工具P2已修并独立复验，无剩余P1 / P2。物理操作与真实CRUD仍awaiting_device。
- 范围：[任务](../tasks/HC-043-project-organization.md) / [设计](../design/project-organization.md)，本地Git基线95c8bda、标签baseline/pre-hc043。实现只读，仅维护本审查与索引。

## 接口与现行数据保护

app仍管理读取 / 来源解除 / 持久化与后台串行操作；新training/player仅持播放状态并注入调度、倍率 / 循环及绘制回调，board/court-renderer只绘制。库预览时钟 / dataset / 隐藏与busy生命周期仍由原runtime拥有，没有把训练末停与卡片末停合并。UI的model保存外部状态、draftStore独立持会话草稿，wizard controller经onAction明确提交，视图 / 组件没有直接读写业务存储。

独立检查Git差异：storage / platform / shared / 推荐规则仅退役无现行引用的storage/repository.js，其余现行文件不变。builtin旧draft / library主键、WebView旧键及副本定向清理、失败重试和选择读取失败锁仍在；lineups原文备份 / revision / 调用时快照 / 串行写与双键来源保护没有被删除或下放给绘图组件。未恢复个人Play。

战术拆为一套一文件，六个旧聚合入口保留兼容索引及稳定顺序。独立执行基线检查，26套完整帧 / ID / 顺序 / 元数据、18规则、10组实际阵容推荐与人员映射、6项启动 / Native / 图标等身份源均与[行为基线](../../artifacts/qa/hc043/behavior-baseline.json)一致；没有用条数一致替代内容比较。

## 独立源码与内存行为复验

- 从Git基线取实际旧tick函数，与新player逐回调比较：24组帧数 / 倍率 / 循环配置、各300次，共7200次position / playing / endHold严格一致，含中途变倍率 / 循环及提前、倒退、长间隔timestamp。训练末停仍按delta×speed累计到1.2，即实际约1.2/speed秒；库仍固定1000ms。默认暂停取整、raw scrub及卡内暂停保位分别保留。新generation保护旧回调，不在本轮统一这些策略。
- 取实际旧courtBase / routeElement / draw与新renderer，26套各初态 / 真实中段 / 末态、对手显隐两种，共156组结构deepEqual；带长名 / emoji / 换行与球衣99的职责标题仍保场上职责号，显式插值球可见性与SVG局部引用完整。原透明路线命中区域和导出层ID保持。此为内存SVG结构核对，不冒充浏览器像素对照。
- 归一model / draftStore / identity字段别名后，40个原UI函数AST完全相同。六处提取变化（draw、beginEdit、beginCreate、closeWizard、renderWizard、推荐页）人工核对草稿store方法、销毁回调及共用renderer调用；context通过延迟转发合作，模块初始化完成前不调用尚未绑定的视图 / controller。五个搬移组件jersey / locker-room / sheet / team-carousel / wizard-motion去import后AST与旧实现完全相同，旧路径薄入口保留。
- 实际wizard controller配合中央perform夹具：连点只提交一次、调用时完整快照不随随后输入变化、写失败保原草稿 / 稳定成员ID，再次保存同ID成功后才清该草稿和关闭；其他编辑草稿保持。全队列表 / 嵌套说明 / dirty关闭确认的Back优先级仍有效。未将这些控制器夹具当作真实DOM焦点或手机手势证据。
- 独立递归展开旧 / 新app.css全部import，去注释后876条PostCSS规则AST严格deepEqual，包含声明、媒体条件与顺序；WebView96回退和旧层叠未因分文件重排。NBA资源glob迁移到components后相对assets路径同步调整。

## 清理与测试工具

只读核对clean-artifacts.ps1与[实际清单](../../artifacts/qa/hc043/cleanup-applied.json)。脚本验证项目 / artifacts / qa及目标无重解析点，只枚举downloads*直属文件，不递归删除；检查绝对边界、文档引用、最近修改及哈希后删除。独立逐项核对28条记录均为预期目录下.htm / .crdownload，路径与绝对目标对应、当前均已不存在，总376.318714MiB；没有PNG / JSON / .tools清理。审查者未执行清理。

另逐项重算[APK归档清单](../../artifacts/qa/hc043/apk-archive.json)14份APK / 校验文件，归档后SHA全部与清单一致；当前1.23.0与回退1.22.3保留顶层，历史证据未删除，文档引用由主控同步。

通用browser-session使用动态端口与独占profile，下载先到artifacts/temp，保留必要导出样本到版本化报告目录后finally只清自己目录 / 进程。runner原13组顺序、26战术及主要断言保持，新增分组报告和latest索引；静态服务器只增加可注入根目录供基线对照，默认仍dist。退役旧repository专属运行用例为12项（10个顶层test加draft / library两项循环用例），新增22项（9 player、5 renderer、8 drafts），故215−12+22=225；不能写成删除测试减少覆盖而通过。

首轮完整浏览器在readonly-flow新增导出样本writeFile处遇ReferenceError：漏import。审查者只读日志指出后，由主控补import并保留失败run与日志；产品 / 构建输入未因该QA修正改变。首轮exit1不能改写成通过。

## 完整浏览器与额外视觉对照

已读取[最终第二轮run](../../artifacts/qa/runs/1.23.0-1793159718244/run.json)：passed=true，13组全部通过，包括startup、26战术、library、page-layout、inline-loop、六新战术 / 推荐、archives、creation-motion、locker-frame、team-carousel、glass-sheet、lineups和page-motion；errors / remoteRequests为空，tempCleaned=true。执行者为主控，审查者未另开Chrome。

额外视觉parity首对390×844更衣室报告644像素不同、最大通道差10，已保留[原失败run](../../artifacts/qa/layout-parity-1793160490225/run.json)。主控定位在左上50×50图标区域，其余整屏一致；审查者亲看对应before / after未见可辨布局、文字或柜体变化。同旧dist对照也在第22对出现9像素差，保留失败记录，不能认定为重构引起或改产品掩盖。

最终[48对报告](../../artifacts/qa/layout-parity-1793160970161/run.json)独立计数layoutFactsMatch全true、43对exactPixelMatch=true、5对为false，19张打包图片SHA一致，errors / remoteRequests为空。审查者读取比较脚本确认逐可见元素比较几何 / 文本 / 全computed CSS、有效伪元素CSS、SVG绘制属性及图片路径 / natural尺寸；真实图像加载和字体就绪有断言。布局事实作为严格判据，像素差异独立完整保留，结论是布局 / 内容 / 绘制事实保持，不是全RGBA相同。曾有一次SVG属性键序导致JSON.stringify误判，改deepEqual后复验，非产品修复。

## APK与通用工具审查

主控21秒构建1.23.0 / code28；[APK结果](../../artifacts/qa/hc043/apk/apk.json)核30网页资源同dist、15图标同前版、无server.url、v2原证书e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26。compiled badging为球搭 / com.halfcourt.tactics / code28；APK SHA256为1e135c1a773cad63168b2c8eb5cd0b9fee120d91f8ca13f12c0c2d400a26269a。aapt首次中文绝对路径失败，改工作目录与ASCII basename后复验，未改产品或放松签名 / 资源检查。

只读审查device-state / check-apk / compare-layout / browser-session。包脚本只读ZIP、dist及旧APK，校验图标字节 / 证书 / 原生版本；设备脚本指定serial、读取原文与双hash、备份、版本与前台双重保护后才保存截图，finally只移自身动态转发。临时浏览器name限制与目录边界保护保持。

### R2 · P2 · 安装preflight遗漏档案异步忙态（已修复验）

位置：scripts/qa/device-state.mjs before分支的Runtime.evaluate，仅以body.is-loading判断busy，以打开的wizard判断editing。实际档案select / delete经handleLineupAction使lineups-panel aria-busy=true，不一定设置body.is-loading，且没有wizard；脚本会认busy=false，允许安装打断未完成操作。

审查者以真实脚本表达式做无ADB的VM负例：archives视图、无wizard、body无is-loading但档案aria-busy=true，返回editing=false / busy=false。主控修复busy为body.is-loading或lineups-panel aria-busy，另检查DOM中的继续创建 / 继续未保存指示；draftCheckScope明确只覆盖打开向导及当前渲染指示，不能证明所有关闭的内存草稿均不存在。

读取[主控五例记录](../../artifacts/qa/hc043/device-preflight-fixtures.json)，并独立提取最终真实Runtime表达式和实际assert片段执行VM：idle通过，bodyBusy、仅panelBusy、retainedIndicator、openWizard四种均拒绝。状态verified；只修QA工具，无产品 / APK输入变更，审查者未调用ADB或实际安装。

## 安装与原生程序终审

指定ef473680 / M2101K9C覆盖安装Success，1.23.0 / code28；[系统启动记录](../../artifacts/qa/hc043/device-launch.txt)明确COLD，TotalTime952 / WaitTime960ms。[before](../../artifacts/qa/hc043/device-before.json)与[after](../../artifacts/qa/hc043/device-after.json)均实际0档案；档案SHA256均dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253，选择SHA256均7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c。before记录editing=false / busy=false，仅按所记录范围说明，不能扩称已证明全部关闭内存草稿不存在。

只读核对[原生四页与草稿](../../artifacts/qa/hc043/native-pages-draft.json)及[自然循环](../../artifacts/qa/hc043/native-post-split.json)：实际WebView96 / API31，本次设备横屏约835.27宽；四主卡均x14 / y68 / w807.2728 / h207.2727，审查者重算四卡矩形一致，全部报告控件fit / hit、无overflow，品牌仅更衣室。DOM程序创建4v4临时草稿，选BOS、切第2人、姓名 / 球衣88即时同步，三步控件可达；明确放弃，未点击最终保存，档案 / 选择文件保持。

本套库内自然播放1332个真实样本覆盖0–6七帧、末停与cycle1。审查者使用正式引擎逐样本重算六球员 / 球最大误差均0；末帧91个样本首末可见间隔995.8ms，符合1000ms末停的采样容差，不是FPS测量。暂停报告playing=false / rafCount=0，主控严格检查dataset冻结；errors为空，mainPlay及双文件hash保持。未点手机进入训练场CTA。

审查者亲看[横屏更衣室](../../artifacts/qa/hc043/native-lineups.png)与[横屏第3步](../../artifacts/qa/hc043/native-draft-step3.png)：柜体、品牌、四栏与主动作完整，第2名临时队员、BOS球衣88和输入同步。该设备证据是横屏程序操作，竖屏 / 平板对照来自完整浏览器，不能冒称已真机手指 / 输入法 / 旋转验收。

首次原生QA将品牌选择器写成.lineup-brand而非实际.lineup-brand-header，保留[native-first-attempt日志](../../artifacts/qa/hc043/native-first-attempt.log)；修QA后同产品 / 同APK严格复验exit0，未改产品凑通过。主控已清理本轮动态转发 / 探针并恢复原视图；没有清理其他既存连接。

## 交付前收尾

主控最后仅规范ui.js及新文件空白 / 文件末空行，未改语句。重新Vite构建后通用APK检查仍核30资源逐字节匹配同一已安装APK，图标 / 身份 / 签名及SHA保持，无需为格式变更重装。审查者只读核对最终报告，未重跑应用或设备测试。

Windows默认脚本策略曾阻止npm clean:artifacts，新命令仅加进程级-ExecutionPolicy Bypass调用仓库既有限定脚本，不改机器策略、不改变删除范围；[实际dry-run](../../artifacts/qa/hc043/cleanup-final-dryrun.log)exit0，applied=false / files=0。主控最终对132条暂存路径运行git -c core.autocrlf=false -c core.whitespace=cr-at-eol diff --cached --check并exit0，包含新增文件；cr-at-eol仅允许Windows CR换行，与默认检查将部分CR尾误列为空白的规则分开记录，不将格式差异当作产品行为变化。

## 验证边界

主控最终源码npm test225项通过，check-behavior为26 / 18 / 10 / 6全同，最终导入检查141模块 / 278相对导入无错，完整Chrome13组、48对布局事实、APK / 安装与原生程序证据通过，无未修P1 / P2。独立证据为源码与基线、实际函数 / controller / preflight夹具、AST / CSS / 清理路径、实帧重算及亲看图片；Chrome / 构建 / 清理 / 安装执行者均为对应实现agent或主控。保留首轮QA失败及视觉控制差异，不把43对像素相等写成48对全像素相等。真实物理操作、IME / 原生Back / 旋转 / 分享与真实CRUD仍待用户人工验收，任务保持awaiting_device；本轮没有远程推送。
