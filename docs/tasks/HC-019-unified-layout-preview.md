# HC-019 · 统一排版效果预览

- 日期：2026-10-23；状态：`completed`（设计预览交付，不是正式UI实施）。
- 目标：根据用户要求，将[HC-018逐屏规范](../design/unified-screens.md)制作成可查看的高保真效果图与本地交互预览，供讨论空间分配。
- 范围：手机阵容/演练/战术库/配置的同屏对照，空/错误/读取状态示例，以及横屏布局示例；保留蓝银更衣室、自然木地板、玻璃导航和标题卡默认收起。
- 非目标：不改正式应用源码/存储/版本/APK，不把示例数据写进真实档案，不以预览交互替代应用功能。
- 接口：预览使用file可直接打开的HTML/CSS/JS及本地资产，不依赖服务、账号或网络。视图/状态控制仅修改预览内存。

| 负责人 | 可修改文件 | 交付与依赖 |
| --- | --- | --- |
| ui | artifacts/design/unified-layout-preview/index.html、preview.css、preview.js | 主页面视觉与预览控件，readme中的现有业务边界与HC-018为输入 |
| 主控 | 本任务/设计/索引；artifacts/design/unified-layout-preview/render-preview.mjs及PNG/verification.json | 集成、Chrome截图/内容可达性与交互检查、交付 |
| interaction_design | docs/reviews/HC-019-unified-layout-preview.md | 集成后只读图检/行为与范围独立审查 |

验收：至少四个主/子页面清晰可比较，状态示例不伪装实际错误，战术卡默认收起/单卡开合可预览；无远程资源和生产存储写入；手机一屏显示不被导航遮挡；交付PNG与本地预览入口。预览通过不等于正式UI实施或真机验收。

## 交付与实际验证

- 本地入口：`artifacts/design/unified-layout-preview/index.html`；默认四页总览，另有状态示例与横屏模式；`?frame=1&view=lineups|play|library|config`可独立查看单屏。
- 图：同目录`overview.png`、`states.png`、`landscape.png`、`library-expanded.png`及四页各自PNG。实现与生成脚本保留于artifacts，不作为正式前端源码。
- Chrome：390×844、360×640、844×390、1024×768各四页，共16组；文档无溢出，主要CTA/导航中心可命中，本地图片全部加载；战术库各尺寸展开后的标题与CTA完整位于内容区且可命中。
- 交互：库默认全收/点开/换卡收旧/同卡关闭；4v4防守名称与4攻4防人数；体型点选；保存按钮明确不写入本机；播放中resize后状态与按钮同步。无页面JS异常，无远程请求。证据在同目录`verification.json`。
- 主控亲看总览、状态、横屏与开卡图；独立审查见[审查记录](../reviews/HC-019-unified-layout-preview.md)。两项独立发现（4v4图文不符、resize按钮状态）与主控发现（横屏展开末标题下沿裁切）均已修复并经实际Chrome复验。
- 文档本地链接检查：README/AGENTS/docs/图标说明共63份Markdown、308个本地链接通过，无失效目标。
- 仅纯本地视觉/交互示例，创建/推荐/队伍/导出用明确说明弹层；演练为3v3示意动画，不代替正式战术引擎。未读写真实阵容、修改生产源码/存储/APK，未安装设备，也未把导航预览当生产600ms转场验收。

## 跟进：顶部留白

用户不喜欢内容贴满顶部，要求上方更宽松。主控接手预览CSS，将普通竖屏顶部内边距从12增至44px，低高度竖屏从9增至28px，手机横屏从8增至16px；标题/内容整体下移，底部导航保留原位。正式前端与APK不改。

调整后重新运行本地Chrome截图检查：16组布局、主要操作/导航命中、各尺寸展开卡片完整性及原交互检查均通过，无JS异常或远程请求；主控亲看新总览，顶部留白明确且底部操作完整。新图`overview-spacious.png`，旧紧凑图留在`overview-compact.png`；默认HTML与其他截图同步更新。此次为主控单独完成的小型视觉跟进，未声称重新完成独立审查或正式应用验收。
