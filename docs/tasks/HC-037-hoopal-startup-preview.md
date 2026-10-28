# HC-037 · 球搭 HOOPAL 启动展开预览

- 日期：2026-10-27；状态：`completed`。
- 授权：用户确定「球搭 · HOOPAL」后要求看效果图。本次交付独立效果图及可播放HTML预览，沿用批准头像、冰川蓝/银灰/浅木与现有更衣室风格。
- 关联：[命名与启动讨论](../design/app-icon.md)。正式App仍为1.21.0，本轮不更名APK、不安装，不接入全场/训练功能。

## 设计与范围

HOOPAL主字标搭配中文球搭。参考用户提供的ScrollExpand：中央圆角画框展开至完整视口、内部画面轻微拉远、标题向上淡出，后段显现更衣室与四项玻璃导航。自动驱动约1400ms（起始250、展开850、收尾300），提供重播、暂停/进度控制和跳过便于讨论；参数为预览提案，非最终验收后的生产时序。减少动态效果时直接到达最终画面，手动定位仍可比较静态阶段。

静态输出至少含起始、展开中、结束三阶段对照，390×844手机效果为主，兼顾360×640、844×390、1024×768；无整页/舞台溢出，触控按钮可达。预览舞台展示更衣室空态或明确示例，不冒充真实用户档案；示例操作有可见说明，不假装保存。无外部网络、存储、正式模块导入、React或依赖安装；头像引用本地已批准资源。

布局范围细化：上述无整页滚动适用于纯舞台/产品展示。独立预览的外围控制说明页在手机上允许自然纵向滚动，保持手机舞台比例并让重播/进度可达；禁止横向溢出，不通过裁切隐藏控制。验证需滚动到各控件再实际命中，不把这页预览工具的布局当作正式App排版。

## 分工与接口

- ui：独占`artifacts/design/hoopal-startup-preview/index.html`、`preview.css`、`preview.js`、`overview.html`，实现舞台与静态对照。可只读借用既有柜体SVG/样式，其他文件不改。
- 主控：任务/设计/索引、`render-preview.mjs`与截图/验证报告、浏览器运行及最终展示。保留正式源码/打包输入基线并核对不变，关闭仅本轮创建的服务/Chrome/profile。
- interaction_design：实现完成后只读独立审查，独占本任务review文件与reviews索引；查可复现动效/尺寸/误导问题。
- 预览接口：`window.hoopalPreview`暴露`play()`、`pause()`、`seek(ms)`、`finish()`、`reset()`、`getState()`；getState至少返回timeMs/durationMs/playing/phase/reducedMotion。`?autoplay=0`保持初始，默认自动播放一次；seek暂停并定位，重播reset+play，连点不叠加RAF，resize不重播，后台停止并安全恢复，不读写真实状态。

## 验证与交付

真实Chrome/file预览，核对四尺寸布局与有效按钮命中、三个静态阶段、自然播放逐RAF采样的frame/title/内容变化、1400ms单次结束/RAF停止、暂停继续/seek/重播/跳过、resize及减少动效；运行异常和非本地请求为0。亲看最终图片，独立审查问题修复后复验。普通预览不构建APK、不重跑无关业务回归。完成后附可打开HTML、三阶段效果图与证据；自动浏览器检查不能冒充Android启动/物理设备验证。

## 实现与验证结果

ui已冻结交还四文件。圆角裁切窗与柜体全程连续DOM，不以三张切图冒充播放；transform从1.13拉远至1，标题34px上移并淡出，末300ms显现页面。一个可取消RAF循环、暂停后续播无时间跳变，用户在资源ready前手动操作优先于默认自动播放；结束前room按钮真实disabled/tab-1，结束后点击示例可见说明，不伪造业务结果。

最终真实Chrome94720 exit0，[验证报告](../../artifacts/design/hoopal-startup-preview/verification.json)18布局通过：四尺寸×三阶段、resize中间态、四种外围控制页与减少动效；手机舞台与横屏/平板无整页或舞台溢出，外围控制页自然滚动后的控件fit/hit通过。自然播放85个真实RAF样本，实测1406.7ms，clipPath/scale/标题透明度存在连续中间值，末帧停止。暂停继续/seek/resize不重播/快速finish、真实后台Target切换触发visibility暂停、真实skip、默认单次播放、演示提示及实际重播/暂停/继续/进度handler/结束均通过，errors/remote/failed为空，92正式文件hash保持。ui另做语法/CSS解析及内存RAF夹具，自查不替代主控浏览器证据。

首轮resize后立即测量先读到旧geometry，主控给尺寸切换加两RAF屏障，产品几何未改；第二轮发现844×390外围工具页overflow:hidden导致实际不可滚动，ui修短窗口为舞台占视口、控制在下方自然滚动，第三轮保留可达断言通过。主控亲看[三阶段对照](../../artifacts/design/hoopal-startup-preview/overview.png)、[起始](../../artifacts/design/hoopal-startup-preview/390-start.png)、[展开中](../../artifacts/design/hoopal-startup-preview/390-expanding.png)、[结束](../../artifacts/design/hoopal-startup-preview/390-room.png)与[横屏](../../artifacts/design/hoopal-startup-preview/844-room.png)，画面/头像/字标/柜位和四项底栏完整。

交付[可播放预览](../../artifacts/design/hoopal-startup-preview/index.html)和[三阶段网页](../../artifacts/design/hoopal-startup-preview/overview.html)。无依赖安装、正式源码修改、APK构建或手机安装；正式1.21.0名称与原数据保持。独立审查另记，预览收口后用户继续讨论字标大小/时序与展开方式，再决定正式集成。

## 独立终审与交付

[独立审查](../reviews/HC-037-hoopal-startup-preview.md)通过，无未修P1/P2；审查者亲看三阶段/横屏/控制页，独立核18布局、85自然RAF和92文件hash，并运行时钟函数夹具检查单RAF/旧token/暂停续播/seek/hidden/reduced。外围短横屏裁切P2已修verified，QA resize两RAF屏障单独说明。审查者未运行Chrome/ADB或构建，未参与实现。

已在用户浏览器打开`index.html?autoplay=0`，由用户点重播控制观看，不让一次自动播放在切回窗口前结束；HTML默认入口仍自动播放一次。最终静态PNG、可播放页面、证据与审查均已齐；本轮无需Android验收，满足预览合同后completed。只清理本轮headless Chrome/profile，保留用户可见预览窗口。
