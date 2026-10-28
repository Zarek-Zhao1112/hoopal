# 协作任务看板

更新日期：2026-10-28。

这里记录需要多 agent 协作的开发任务：目标、模块边界、接口、依赖、审查与验收证据。主 agent 维护任务状态并负责最终整合，各 agent 在约定范围内开发或审查。

## 当前任务

| 编号 | 任务 | 状态 | 负责人 | 下一步 |
| --- | --- | --- | --- | --- |
| [HC-045](HC-045-account-center-preview.md) |「我的」与个人账号交互预览 | `completed` | ui独立页面，主控验证/集成，interaction_design审查 | 可点原型、77组五尺寸/9组file与独立审查通过，213正式SHA保持；源码同步GitHub，真实登录/云备份未接入，APK未改 |
| [HC-044](HC-044-github-sync.md) | GitHub建库与同步 | `completed` | 主控Git/API与文档 | 已创建私有Zarek-Zhao1112/hoopal，推送main及基线标签，origin/main跟踪与同步说明已配置 |
| [HC-043](HC-043-project-organization.md) | 项目清理与模块整理 | `awaiting_device` | 主控基线/清理/数据/集成，engine播放绘制，ui阵容/CSS，interaction_design审查 | 拆分/376MiB清理/归档完成，225检查、完整Chrome、48布局及独立审查通过；1.23.0已安装、双hash同，WV四页/草稿/1332循环样本通过；人工体验待确认，后续HC-044已推送源码 |
| [HC-042](HC-042-post-split-defense.md) | 低位分切追防与补位修正 | `awaiting_device` | engine战术/语义测试，ui浏览器，主控集成安装，interaction_design独立审查 | 215检查/6006动作样本/自然回放与四尺寸/七旧步骤恢复通过；1.22.3已安装、双hash同、WV96七帧循环1345样本通过；人工观感待验 |
| [HC-041](HC-041-startup-timing-release.md) | 2.4秒启动节奏正式接入 | `awaiting_device` | 主控时序/安装，engine验证，interaction_design审查 | 213/27组合七控制/相关回归通过，1.22.2已保数据安装；COLD483ms、WV96实测2415.3ms/一秒hold/skip/四页同框通过，首次桥接异常保留且严格复验未现；新节奏人工观感待验 |
| [HC-040](HC-040-startup-timing-preview.md) | 启动停留与展开节奏预览 | `completed` | ui预览，主控验证截图，interaction_design审查 | 2.4秒145帧/1.4秒85帧、21布局/1秒静止及终审通过，已打开两档预览；100正式hash同，手机仍1.4秒 |
| [HC-039](HC-039-single-startup.md) | 修复两段启动开场 | `completed` | 主控原生衔接，engine只读查重复，interaction_design审查 | 1.22.1已安装，213检查/原生构建/30web+15图标同旧/双hash保持，用户确认已无重复；新节奏待讨论 |
| [HC-038](HC-038-hoopal-startup-release.md) | 球搭品牌与启动展开正式接入 | `awaiting_device` | engine时钟、ui覆盖层、主控初始化/验证/安装、interaction_design审查 | 短屏修复、213/完整Chrome/27布局7控制及HTML真牌通过；1.22.0已安装，双hash同，WV96启动/skip/四页同框通过，物理待验 |
| [HC-037](HC-037-hoopal-startup-preview.md) | 球搭HOOPAL启动展开预览 | `completed` | ui画面/动效，主控验证截图，interaction_design审查 | 三阶段PNG/HTML、18布局/85自然实帧1406.7ms与独立终审通过；预览已打开，92正式hash不变，1.21.0和手机保持 |
| [HC-036](HC-036-locker-card-frame.md) | 更衣室玻璃主卡统一尺寸 | `awaiting_device` | 主控CSS与验证安装、interaction_design独立审查 | 205检查/96边界/相关回归通过，四页最大差0px；1.21.0已安装，双hash保持，真实WebView96四页同框，物理/原生CRUD待验 |
| [HC-035](HC-035-creation-motion-release.md) | 建队三步与大球衣正式接入 | `awaiting_device` | ui排版/接线、engine动效、主控集成验证安装、interaction_design审查 | 两P2修复、205检查/完整Chrome/33布局81实帧/终审通过；1.20.0已安装、双hash同、WebView96未保存草稿七布局通过，物理/原生CRUD待验 |
| [HC-034](HC-034-creation-motion-preview.md) | 建队三步与大球衣动效预览 | `completed` | ui视觉交互、主控截图验证、interaction_design审查 | 三步HTML/PNG、21布局/114实际帧/草稿触摸及独立审查通过；仅预览，正式1.19.0保持 |
| [HC-033](HC-033-archive-tab-release.md) | 档案独立底栏正式接入 | `awaiting_device` | ui双页与管理、engine回归、主控集成安装、interaction_design审查 | 读取P2修复、195检查/完整Chrome/专项/50布局与独立终审通过；1.19.0已安装、双hash同、WebView96四页/面板通过，物理及原生CRUD待验 |
| [HC-032](HC-032-archive-tab-preview.md) | 档案独立底栏效果预览 | `completed` | ui预览、主控截图验证、interaction_design审查 | HTML/三屏PNG、42组四尺寸布局交互及独立审查通过；仅内存示例，正式1.18.0保持 |
| [HC-031](HC-031-inline-motion-release.md) | 卡内循环正式接入 | `awaiting_device` | engine播放器、ui组件、主控回归集成安装、interaction_design审查 | 195检查/完整Chrome/独立终审通过；1.18.0已安装，双hash保持，WebView96全26卡/自然loop/HOME暂停通过，物理操作待验 |
| [HC-030](HC-030-inline-motion-preview.md) | 卡内循环动画效果预览 | `completed` | ui预览、主控动态截图验证、interaction_design审查 | HTML/三屏PNG、25布局/78帧样本/真实循环hold暂停/后台及独立审查通过；正式1.17.0/APK保持 |
| [HC-029](HC-029-single-page-library-release.md) | 一页九张战术库正式接入 | `awaiting_device` | ui组件、engine回归、主控集成安装、interaction_design审查 | 182检查/完整Chrome/108组逐卡开合及独立审查通过，1.17.0已安装，档案与进度双hash保持，WebView96原生18项复查通过；物理操作待验 |
| [HC-028](HC-028-single-page-library-preview.md) | 战术库一页九张效果预览 | `completed` | ui预览、主控截图验证、interaction_design审查 | 三屏PNG/HTML、90项四尺寸检查与独立审查通过；390九标题/紧凑展开，短屏覆盖后返回，正式1.16.0/APK不变 |
| [HC-027](HC-027-new-tactics-release.md) | 六套进攻正式入库与推荐 | `awaiting_device` | engine战术、ui分页、主控推荐/验证、interaction_design审查 | 26套/6＋3分页/18进攻推荐，181检查/完整Chrome/独立审查通过；1.16.0已安装新机、档案和浏览进度字节保留，WebView96六卡/分页通过，物理操作待验 |
| [HC-026](HC-026-new-tactics-preview.md) | 六套新增进攻战术预览 | `completed` | engine动作、ui预览、主控验证、interaction_design审查 | 六图/HTML交付，43帧/37037动态样本/32布局/六套完整播放/四尺寸控件及独立审查通过；正式库/推荐/APK保持1.15.0 |
| [HC-025](HC-025-team-carousel-release.md) | 队徽滑动转盘正式接入 | `awaiting_device` | engine组件、ui集成、主控验证安装、interaction_design审查 | 153检查/完整Chrome/四尺寸与独立审查通过；1.15.0已更新新机、实际0档案hash保持，WebView96选队/返回/草稿通过，物理手感待验 |
| [HC-024](HC-024-team-carousel-preview.md) | NBA队徽滑动转盘效果预览 | `completed` | ui视觉交互、主控截图验证、interaction_design审查 | PNG与HTML交付，四尺寸/真实触摸/30队点选/焦点及独立审查通过；正式1.14.0保留 |
| [HC-023](HC-023-page-adaptation-release.md) | 更衣室/训练场/库正式排版适配 | `awaiting_device` | ui布局、engine布局QA、主控集成、interaction_design审查 | 153检查/完整Chrome/最终布局与审查通过；1.14.0已安装、档案字节保留，实际WebView三页检查通过，物理操作待验 |
| [HC-022](HC-022-page-adaptation-preview.md) | 训练场与战术库排版适配预览 | `completed` | ui首版、主控跟进验证、interaction_design首版审查 | 最新仅更衣室留品牌、两页卡位不变、导航重命名，新PNG/8布局交互通过；首版独立审查保留，仅预览，正式1.13.0保留 |
| [HC-021](HC-021-lineup-glass-release.md) | 阵容品牌主卡与玻璃组队正式接入 | `awaiting_device` | ui面板、engine存储/柜位、主控集成验证、interaction_design审查 | 153检查/六屏Chrome/独立审查通过，1.13.0已安装新机且档案字节保留；WebView草稿流程通过，手指/输入法/返回/旋转/原生最终保存待验 |
| [HC-020](HC-020-lineup-glass-sheet-preview.md) | 阵容主卡与玻璃任务面板预览 | `completed` | ui面板实现、主控截图验证、interaction_design审查 | PNG/本地HTML交付，12布局/450ms真实浮起/任务草稿焦点/独立审查通过，仅预览不改APK |
| [HC-019](HC-019-unified-layout-preview.md) | 统一排版效果预览 | `completed` | ui视觉实现、主控截图验证、interaction_design审查 | 四页对照/状态/横屏PNG与HTML交付，16尺寸视图组合/开卡/独立审查通过；仅预览不改APK |
| [HC-018](HC-018-unified-screen-spec.md) | 全页面统一排版讨论稿 | `completed` | 主控设计汇总、ui/engine核对、interaction_design审查 | 16屏五项规范与独立文档审查完成，布局提案继续讨论，未改UI/APK |
| [HC-017](HC-017-curry-app-icon.md) | 库里卡通 App 图标 | `completed` | ui密度资源、主控平台集成、interaction_design审查 | 15密度PNG/遮罩/独立审查/APK检查通过，1.12.0已安装新机，真实系统详情和桌面图标确认，阵容文件字节保留 |
| [HC-016](HC-016-library-title-cards.md) | 战术库标题卡正式接入 | `awaiting_device` | engine布局、ui组件、主控集成、interaction_design审查 | 143检查/六屏Chrome/独立审查通过；1.11.0已安装新机且档案保留，实际WebView标题开合通过，完整物理/原生CTA待验 |
| [HC-015](HC-015-stacked-library-preview.md) | 战术库纵向标题卡效果预览 | `completed` | ui首版、主控最新调整/验证、interaction_design图检 | 默认全部标题收起/无统一按钮，逐卡点开再点收；新图与HTML交付，五尺寸Chrome通过，正式1.10.0不变 |
| [HC-014](HC-014-soft-glow-release.md) | 批准的600ms柔光正式接入 | `awaiting_device` | 主控集成、engine曲线、ui转场、interaction_design审查 | 137检查/六屏Chrome/审查通过，1.10.0已更新新机且档案保留；实际WebView三页程序动效通过，完整物理操作待验 |
| [HC-013](HC-013-motion-previews.md) | 圆形动效与C柔光600ms预览 | `completed` | 主控生成 / 验证、ui模板、interaction_design图检 | 三方案及选定C的600ms HTML / PNG / 原速GIF已交付，仅预览，手机应用未更新 |
| [HC-012](HC-012-page-motion.md) | 圆形扩散、去状态文案与左拖下一位 | `awaiting_device` | 主控；ui/engine 实现、interaction_design 审查 | 131检查/六屏Chrome/审查通过，1.9.0已安装且档案hash保留，真实WebView程序切页通过；新版物理手势待验 |
| [HC-011](HC-011-nba-team-kits.md) | NBA 球队选择与球衣联动 | `awaiting_device` | 主 agent；engine/ui 实现、interaction_design 独立审查 | 122检查、六屏Chrome、独立审查通过；1.8.0已覆盖安装新机并冷启，原生交互待验 |
| [HC-001](HC-001-offline-android.md) | 半场战术板 Android 离线版 | `awaiting_device` | 主 agent；engine、ui、interaction_design 协作 | 已安装打开，继续完整真机功能验收 |
| [HC-002](HC-002-collaboration-docs.md) | 固化协作规则与开发文档 | `completed` | 主 agent；engine、ui、interaction_design 协作 | 规则、设计、任务与审查已交付，106 个本地链接通过 |
| [HC-003](HC-003-device-install.md) | 安装 APK 到用户手机 | `completed` | 主 agent；用户确认手机安装 | 已确认包名存在并打开应用 |
| [HC-004](HC-004-tactic-library.md) | 扩充 3v3 / 4v4 战术库 | `completed` | 主 agent；engine、ui、interaction_design 协作 | 12 套示例、57 项检查与复审完成，1.1.0 已覆盖安装打开；完整真机验收见 HC-001 |
| [HC-005](HC-005-mobile-workspace.md) | 手机与平板一屏工作台 | `awaiting_device` | 主 agent；engine、ui、interaction_design 协作 | 代码、61 项检查及审查通过，1.2.0 已安装并确认竖屏一屏；待真机键盘、返回键和旋转操作验收 |
| [HC-006](HC-006-builtins-only.md) | 统一使用内置战术 | `completed` | 主 agent；engine、ui、interaction_design 协作 | 70 项检查与审查通过，1.3.0 已安装；手机个人库 / 草稿 / 副本清空已核对 |
| [HC-007](HC-007-defense-library.md) | 独立内置防守战术库 | `completed` | 主 agent；engine、ui、interaction_design 协作 | 20 套、82 项检查及复审完成；1.4.0 已覆盖安装打开，完整设备交互见 HC-001 / HC-005 |
| [HC-008](HC-008-lineup-recommendations.md) | 阵容档案、进攻推荐与移除编辑页 | `awaiting_device` | 主 agent；engine、ui、interaction_design 协作 | 112 项检查、最终 Chrome 与复审通过，1.5.0 已安装；待真机档案保存 / 推荐 / 输入法 / 旋转等操作验收 |
| [HC-009](HC-009-manager-visual.md) | 石墨黑、雾白与篮球橙视觉更新 | `awaiting_device` | 主 agent；ui、engine 实现，interaction_design 独立审查 | 木地板跟进 1.6.1 已安装冷启；112 项/六屏 Chrome/独立审查通过，原数据哈希保持；完整真机交互待验 |
| [HC-010](HC-010-locker-room.md) | 冰川蓝更衣室与玻璃导航 | `awaiting_device` | 主 agent；ui/engine 实现、interaction_design 独立审查 | 112 检查、真实触摸/六屏 Chrome、独立复审通过；新机1.7.0已手动安装/冷启，完整原生交互待验 |

HC-001 为事后依据实际协作整理的记录，不表示此前开发由这份合同驱动。详细验证结果见 [验证记录](../validation.md)。

## 状态定义

| 状态 | 含义 |
| --- | --- |
| `planned` | 已明确目标和验收项，尚未开始实现。 |
| `in_progress` | 正在设计、开发、集成或执行必要验证。 |
| `in_review` | 可审查的实现和验证结果已提交，正在独立审查。 |
| `changes_requested` | 审查发现需要修复的问题，修复后重新审查相关范围。 |
| `verified` | 约定的自动化验证及审查已完成；全部人工或设备验收可能仍未完成。 |
| `awaiting_device` | 可执行的开发、审查和自动验证已完成，仍需设备安装或真机验收。 |
| `completed` | 所有必需验收项均已完成，证据和交付物已记录。 |
| `blocked` | 当前任务因明确的外部依赖无法继续；记录具体原因与恢复条件。 |

常见流转为 `planned → in_progress → in_review → verified → completed`。审查需修改时进入 `changes_requested`，修复后回到 `in_review`；设备验收待完成时使用 `awaiting_device`。验收失败后回到对应修复阶段，不能仅凭测试通过或已生成安装包标记 `completed`。

## 使用方式

1. 开始协作开发前，创建任务文档并约定目标、负责文件、接口、依赖顺序和必需验收项。
2. 将可以独立实施的模块分配给不同 agent；交叉修改由主 agent 协调整合，接口变更先同步相关 agent。
3. 保留审查结论、修复结果和验证范围；区分自动测试、模拟验证与真实设备验证。
4. 进度变化时更新看板和任务文档。未通过或未执行的验收保持待办，并写清下一步。

小型文档或低影响修改可以只记录目标、变更和必要检查，不要求每次修改都拆分 agent 或重跑完整测试。验证范围根据变更和风险确定。

等待某台设备或某个人工验收时，可继续其他不依赖该结果的工作；保留当前任务的待办与状态，无需停下整个项目。
