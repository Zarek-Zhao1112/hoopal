# HC-028 · 战术库一页九卡预览

- 日期：2026-10-24；状态：`completed`。独立预览、效果图、浏览器检查与独立审查完成；生产版本保持1.16.0。
- 用户认为9张标题卡可以同页显示，要求先看效果图。本轮只交付取消6＋3分页后的独立HTML/PNG，正式1.16.0、存储及已安装APK保持。
- 设计沿用[纵向叠卡](../design/stacked-library.md)与[新增战术包](../design/new-tactics-pack.md)。

## 分工与接口

ui只写`artifacts/design/single-page-library-preview/`内HTML/CSS/JS及数据构建脚本；主控负责本任务/索引、该目录render与verification/截图；interaction_design只读预览并写`docs/reviews/HC-028-single-page-library-preview.md`和审查索引。一个文件一个负责人，无依赖安装或生产源码变更。

沿用正式冰川蓝、顶部留白、主卡与玻璃导航，3v3/4v4各九进攻默认全部收为标题，不显示翻页控件；逐卡点开、换卡收旧、再点收回。防守仍四卡。真实标题和初始球场来自现有26套定义。手机竖屏优先保留九标题，展开时缩小间距；横屏可将展开预览与其余标题分区。小屏若九标题与完整预览无法同时容纳，先报告实测限制，不用裁切或不可点控件掩盖问题。

首版空间方案：390×844展开保留九标题，展开体内球场与说明/CTA左右排；360×640短屏不压缩到不可用标题，展开时用选中卡覆盖卡片区，提供明确收回入口恢复全部九标题。横屏/平板默认两列标题，展开左侧球场、右侧九标题。这里是待预览确认的适配，不表示用户已批准正式实施。

预览提供`window.previewAPI`的setMode/setKind/select/collapse/state接口，querymode/kind/selected/embedded用于截图。HTML可file直开、无存储读写/网络依赖，演练CTA只显示预览说明，不冒充已接正式播放。

## 验收与交付

主控Chrome验证390×844、360×640、844×390、1024×768的双人数默认/展开，九标题全部可达、无整页滚动、点击/收回/换卡/切筛选、快速操作与减少动态效果、CTA明确预览。生成默认/展开对比图和可点击HTML；记录实际控件尺寸及空间取舍。独立源码/截图审查后收口；不运行全应用测试或重打APK替代预览验证。

## 已完成的交付与检查

- [三屏对照图](../../artifacts/design/single-page-library-preview/overview.png)、[对照HTML](../../artifacts/design/single-page-library-preview/overview.html)、[交互预览](../../artifacts/design/single-page-library-preview/index.html)。左默认九张，中央3v3无球外弹，右4v4下掩护接手递手。独立HTML支持26套真实初始站位/3v3或4v4/攻防筛选；CTA明确提示布局预览，不播放真实战术。
- 最终冻结源码后主控完整Chrome检查[90项布局与行为](../../artifacts/design/single-page-library-preview/verification.json)：四尺寸×双人数，逐个九标题真实点击/收回、控件中心命中、九卡/四防守计数、无分页/无整页溢出、快速选择终态和减少动态效果。另真实点CTA核对预览提示。无运行时错误、远程请求或Storage读写；Chrome测试进程及临时档案已清理。
- 390×844展开仍有九标题，标题高33px/CTA35px，球场与说明左右排。[360×640图](../../artifacts/design/single-page-library-preview/360x640-expanded.png)显示覆盖方案，选中标题40px/CTA38px，并有独立“收起 · 返回列表”；其他标题在覆盖期间不可聚焦，收起后恢复。横屏844×390展开标题约38.19px/CTA35px，平板1024×768展开标题46px/CTA38px；全部标题可通过收回/分区访问，不宣称小屏展开时九标题同时可见。
- 生成脚本核对26套初始frame与生产定义内容一致、每人数9进攻4防守；经典JS与CSS语法通过。预览只读导出真实定义及球场材料，无新推荐规则、存储或平台逻辑。
- 首次截图脚本在对照页直接读取file iframe.contentDocument被opaque origin隔离，属于验证脚本错误，未改浏览器安全策略；修为CDP各frame独立context检查后，重新完整90项并刷新全部PNG通过。
- [正式文件保护](../../artifacts/design/single-page-library-preview/production-verification.json)：package/lock、正式库三个源文件和1.16.0 APK六项SHA256前后相同。未更新手机；没有把静态预览当APK或真机验收。
- [独立审查](../reviews/HC-028-single-page-library-preview.md)已核源码、真实首帧、状态夹具/筛选/覆盖返回/CTA提示、最终PNG与报告，无未修P1/P2。84份Markdown、452本地链接通过。紧凑预览不宣称大球场或真机验收；用户确认后再另行接入正式版。
