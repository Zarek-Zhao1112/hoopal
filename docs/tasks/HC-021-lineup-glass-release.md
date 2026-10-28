# HC-021 · 阵容品牌主卡与玻璃组队正式接入

- 日期：2026-10-23；状态：`awaiting_device`。实现、独立审查、自动验证、APK构建与指定新机安装已完成；完整物理操作仍待验收。
- 用户确认本轮正式更新阵容页六项范围后同意开始：顶部现有图标/名称及留白、紧凑主卡、开放式单柜、450ms玻璃浮起/渐模糊、三任务组队、最终保存及关闭草稿处理。
- 依据：[批准设计](../design/lineup-glass-sheet.md)；最终空/有球衣效果`artifacts/design/lineup-glass-preview/locker-comparison.png`。演练/战术库布局与600ms主导航转场保留，后续再统一品牌。
- 数据：不改schemaVersion/存储键，不迁移或删除已有档案；创建草稿仅内存，最后一次create传完整players并单次提交整个档案。失败不关闭/不丢输入、不生成先存空档再更新的两次提交；旧create调用仍兼容。编辑使用原update版本保护/来源解除。

| 负责人 | 写入所有权 | 接口与验证 |
| --- | --- | --- |
| ui | frontend/src/lineups/ui.js、styles.css；新增wizard/sheet模块及专用CSS | 原createLineupUI公开API保留，扩展isModalOpen/close?需先告知；onAction create带完整players；DOM文本安全、原data-action尽量兼容；新450ms面板原生dialog需排除workspace通用关闭，关闭返回由UI handleBack统一处理 |
| engine | frontend/src/storage/lineup-session.js、tests/unit/lineup-session.test.mjs；frontend/src/lineups/locker-room.js、tests/unit/locker-room.test.mjs及可新增locker样式文件 | create支持完整草稿players单次写盘/失败快照；单柜同屏但保留左拖下一位/箭头/焦点隔离，空柜独立导出；不要改ui.js/styles.css；告知CSS import |
| 主控 | app.js、workspace/controller.js、frontend/index.html、app.css；版本/构建/文档；e2e | 集成弹窗/返回/生命周期、阵容专属品牌与布局、浏览器/失败路径/APK/设备检查 |
| interaction_design | docs/reviews/HC-021-lineup-glass-release.md | 未实现代码的agent集成后审查，重点创建原子性、既有档案/来源、草稿与快速关闭/重复提交、设备兼容 |

后续分工：engine负责既有`tests/e2e/lineup-flow.mjs`向三任务流程适配，以及使用指南/架构现状同步；主控新增`glass-sheet-flow.mjs`并保持完整回归，统一处理审查修复与版本安装。文件均已交回主控。

新建流程：1名称人数→2NBA分页选择→3逐人资料/体型/能力，完成后校验全队并一次保存。新建必须有球队与完整体型，擅长/弱项可空。旧未完整档案仍可编辑/显式保存，推荐要求仍由原ready规则判断。旧无NBA档案允许保持中性。已有档案人数不可更改。

验收：143基线及新增真实存储行为测试；六尺寸Chrome实际命中/触摸/模糊中间态/键盘压缩/长名/关闭与原推荐/库/导出；创建写失败留草稿且磁盘不多空档、并发只一次创建、编辑失败原档不变、读失败锁写。APK版本1.13.0/code15，安装/数据哈希/真机功能分开记录；连接不可用不阻断代码/自动验证。最终状态依据证据，不以编译/安装代替完整设备验收。

## 实现与审查

已接入品牌留白、同卡标题、开放式单柜/镂空木衣架/暖灯/内部座板，保留左拖下一位/右拖返回。sheet提供450ms原生dialog、模糊、视口适配/隔离/焦点返回；UI提供三任务、模式往返保留第四人、旧档兼容与独立会话草稿；app/workspace统一导航锁、说明与返回。演练/库布局本轮保留。create捕获完整快照、校验成员、保留草稿ID、串行一次提交，失败不变已存状态。同ID重提拒绝，键/schema与旧个人清理边界不变。

独立审查发现关闭中旧控件再触发、重绘后关闭焦点丢失两项P2，均修复并独立夹具/Chrome复验；主控另修横屏推荐空间和开发服务PNG类型。无剩余P1/P2，见[审查](../reviews/HC-021-lineup-glass-release.md)。

## 自动验证

- 150单元+3HTTP，共153检查通过，较143基线增加10单元。早期HTTP因沙箱localhost EACCES失败，允许本地连接后仅重跑集成通过；品牌PNG响应/MIME/magic亦通过。
- 最终第二轮完整Chrome通过20战术、离线/导出/重启、NBA30队、两人数与旧中性/不完整档案、来源/故障保护、长名/键盘压缩、六尺寸几何/命中、单柜触摸、600ms主导航。首轮横屏推荐裁切修复后完整复跑。
- 新glass-sheet-flow验证450ms真实位置/滤镜中间态、背景锁、前两步不落盘、4→3→4、最终写失败无空档且ID/输入稳定、恢复重试/连点仅一完整档案、Escape/保留/放弃、closing禁用及三入口准确焦点。隔离Chrome profile结束后关闭自建进程。
- 证据：`artifacts/qa/hc021-glass-flow.json`、`hc021-save-failure.png`、`manager-roster-3v3-phone.png`、`lineup-configure-phone.png`及六屏图。reviewer源码/独立真实UI夹具与图检通过，未冒充亲跑Chrome。
- README、设计/任务/审查索引、使用指南、架构、Android和验证记录已同步；67份Markdown的331个本地链接通过存在性检查。

## APK与指定设备

- android:build成功，1.13.0/code15，v2签名通过；28网页资源与dist逐个SHA256相同，无server.url，见`artifacts/qa/hc021-apk-assets.json`。
- 产物：`artifacts/apk/halfcourt-debug.apk`及`halfcourt-1.13.0.apk`；SHA256：`ec132ec22f5aed18ff6dc1730f203c73fca1f728bbc7545f808fc40fdca4b16a`。
- 重新识别M2101K9C/ef473680，USB覆盖安装Success，包管理器1.13.0/code15，冷启动Status:ok/COLD总706ms；`device-1.13.0-new-phone.png`。未卸载/清数据/改系统策略。
- 实际0档案，前后原阵容文件SHA256均`dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`，见`hc021-device-before/after.json`；不恢复历史测试或旧机档案。
- 真实WebView96程序检查品牌PNG、三任务/4人ready、blur渐进/终态6px、控件在视口内、说明先关而保留草稿、放弃后焦点/导航恢复。全程未点最终保存，最后档案字节相同；`hc021-native-sheet.json`及`hc021-native-step1/2/3.png`。首次因本应用不在前台主动停止，重新打开后通过，未截图其他应用；调试转发已移除。

## 待实际操作验收

1. 手指点击/柜位滑动，体验450ms浮起和关闭节奏。
2. 系统输入法、原生返回键/说明优先与草稿处理，面板旋转/前后台切换。
3. 用户自行创建/修改两人数档案最终保存，杀进程后恢复并演练推荐。

程序DOM点击、静态图、构建/安装不能替代物理操作、FPS或原生最终保存验收，状态保留awaiting_device。
