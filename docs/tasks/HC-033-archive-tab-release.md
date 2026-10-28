# HC-033 · 档案独立底栏正式接入

- 日期：2026-10-26；状态：`awaiting_device`（代码/审查/自动验证/安装完成，物理与原生CRUD待验）。
- 用户批准[HC-032预览](HC-032-archive-tab-preview.md)，接入真实本地阵容和四项底栏，生成1.19.0/code21并更新当前指定手机。设计依据：[玻璃组队与档案拆分](../design/lineup-glass-sheet.md)。

## 目标与边界

底栏更衣室/训练场/战术库/档案，沿用600ms柔光及顶部卡位。仅更衣室品牌。更衣室展示activeProfileId的单柜、当前成员、配置及推荐；「换球队」进入档案，空态提供去档案组队入口。档案每页最多三卡，完整队徽/名称/人数/成员、当前标记，创建及独立管理菜单；点卡持久选择成功后才进入更衣室。选择失败保留原队与当前页并提供重试。创建/配置沿用450ms三任务面板，编辑/改名/删除对应所点档案，不先切当前队。删除明确确认；未保存草稿、读取错误、20档案限制及旧中性球队兼容。

无账号/云服务/个人Play，不迁移schema或键，不预置示例球队到真实存储。训练场、26套卡内循环、推荐来源解除和保存失败保护保持。网页刷新恢复已保存当前队，浏览档案/菜单/分页/四导航不改当前队或主Play。

## 分工与接口

- ui负责`frontend/src/lineups/ui.js`、`styles.css`及必要新增`archives.css`：更衣室与档案渲染、菜单/编辑入口/分页/成功导航，保持sheet/carousel/locker接口。只改上述文件；新增样式由styles.css import。新增createLineupUI参数`onNavigate(view)`、方法`setView('lineups'|'archives')`；同一root由workspace显示于两页，默认lineups。isModalOpen/handleBack包含管理菜单；所有真实操作仍await onAction，成功再导航。
- 主控负责`frontend/src/app.js`、`workspace/controller.js`、`frontend/index.html`、`frontend/styles/app.css`、`frontend/src/workspace/page-layout.css`、版本配置/锁/Android/docs/QA与最终集成。onViewChange调用lineupUI.setView；两个阵容视图统一键盘/返回和导航锁。
- engine负责`tests/e2e/`及必要`tests/unit/`：适配新增档案入口和四导航，并加入真实存储失败/菜单隔离/非当前管理/选择来源/分页/空态回归。不得改正式实现或共享package。先按接口开发，UI完成后再跑浏览器。
- interaction_design不参与实现，集成后只读源码/图/报告，写`docs/reviews/HC-033-archive-tab-release.md`及索引，复查来源/失败/焦点/Android兼容。

## 验收与交付

执行相应unit、npm test及构建后完整test:browser；四种手机/平板尺寸及宽屏无整页滚动/遮挡，四栏柔光、真实创建/改名/配置/删除/取消/失败/重启、选择后球衣与推荐成员一致、来源持久解除失败不表面成功、原库循环和训练保持。浏览器测试独立profile，真实设备不写测试档案。

独立审查完成再构建APK，核对dist资源/离线配置/v2签名；安装前即时备份当前设备实际档案及进度并记录hash，正常覆盖安装不卸载；安装后版本/冷启/原数据保持及WebView程序检查。设备不可用则继续交付APK并记录awaiting_device；程序检查与物理手势/返回/输入法/保存验收分别记，不以模拟替代真机。清理本轮测试profile/进程/专属转发，保留预存转发。

## 进度与修复

主控集成四路由与卡位、当前队重开保来源、1.19.0/code21；ui交还双页/菜单，engine新增真实档案专项并适配旧E2E。初轮npm test195及38组六尺寸通过，随后修复独立审查发现的读取P2并完成最终全量验证和安装，详细证据如下。

独立审查发现读取错误P2：首次档案getItem失败返回空state+writeLocked时，两主页冒充合法空库；setView清feedback又让错误/重试消失。真实存储已有锁写保护，不会覆盖原文，但界面误导且恢复入口丢失。主控新增独立writeLocked传参，ui修持续读取错误态与重试，engine增加真正启动getItem失败、跨两页及恢复重试验收；不得把setItem失败用例冒充读取失败。修后重新构建并完整回归，再由审查者复验。

P2修后最终npm test195无skip通过，[专项Chrome](../../artifacts/qa/hc033-archives-flow.json)实际getItem启动失败、跨页错误/无创建、重试恢复7原ID/原文，以及真实setItem失败保原队/来源/主Play/原文、重试切换、同队保来源、非当前配置/改名keep-save/删除确认和焦点通过；六尺寸每页3/3/1共18组控件命中通过。[最终布局](../../artifacts/qa/hc033-layout-smoke.json)50组含四页/菜单/改名/空态和12读错误视图，控件均fit/hit、无整页滚动/远程/异常，原档案保持。独立源码/实际处理器夹具与浏览器复验P2通过。

最终完整Chrome53225 exit0，[日志](../../artifacts/qa/hc033-browser.log)与本轮重写报告确认26套真实动画、卡内loop/末停/后台暂停、六套新增推荐/职责、NBA转盘/玻璃任务面板/柜位手势、档案专项、两键失败原文/重启/导出/离线、六尺寸及四导航柔光快速/取消/减少动效均通过，无异常/外部请求；没有删除旧断言绕过新布局。独立审查已确认无剩余P1/P2，现进入APK构建与手机数据保留检查。

测试适配记录：首轮新flow在旧页面pagehide真实保存时覆盖了测试预先seed的selection，合法source断言按预期fail-closed；修为新文档app加载前seed并等待新文档，未关闭真实pagehide或放宽来源断言。之后将新rename用例选择器从创建字段lineup-name纠正为原有编辑字段lineup-team-name；专项最终通过。两者是测试修正，不记为产品缺陷。

## APK与手机

1.19.0/code21 [APK](../../artifacts/apk/halfcourt-1.19.0.apk)构建21秒通过；[28资源逐hash检查](../../artifacts/qa/hc033-apk-assets.json)等于dist，无server.url；v2证书与原包一致，证书SHA256 e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26，APK SHA256 c681f290a4926945449c42a1ff6236e4dbad135d9507ccdef0ef5193c1b6fcc4。

ef473680/M2101K9C正常install-r Success后COLD820ms，版本21/1.19.0与前台确认。[安装前](../../artifacts/qa/hc033-device-before.json)即时备份真实原文、[安装后](../../artifacts/qa/hc033-device-after.json)双hash相同：实际0档案dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253，战术选择397c6cb369a367c0cf5b7d4a2a047c2748becc85e1af744731323b2b75ebd9eb；未卸载或清数据。

[真实WebView96报告](../../artifacts/qa/hc033-native-archives.json)393×819，四导航/仅更衣室品牌/控件fit-hit/无整页滚动，加未编辑创建面板打开/明确放弃关闭共五检查通过；错误为零、两文件仍同。原机无球队，未添加真实测试数据，原生非空档案管理并未冒充验收。亲看[手机档案空态](../../artifacts/qa/hc033-native-archives.png)，已回更衣室。专属动态forward清理，运行前既存tcp19223保持。首次原生几何误把自定义checkbox的1px input当点击区域，检查器改核可见label后同APK全程通过，无产品修改。

## 剩余验收

源代码/自动检查/独立审查/构建安装与WebView程序证据分别完成；物理手指/系统返回/输入法/旋转，以及手机真实创建、改名、删除、保存重启和错误重试仍待用户实际操作，不在用户设备写入演示球队。任务保持`awaiting_device`，APK与手机已可使用。独立APK/原生图检结果见[审查记录](../reviews/HC-033-archive-tab-release.md)。

终审已核全部代码/报告、28资源/原v2签名、即时双hash及原生档案/面板图，无未修P1/P2；94份Markdown/571个本地链接通过。测试浏览器/profile/临时服务与本轮手机转发已清理，保留用户既存转发。
