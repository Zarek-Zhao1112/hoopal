# HC-028 一页九卡预览独立审查

日期：2026-10-24。状态：预览范围审查通过，无未修 P1 / P2；390×844 九标题与紧凑展开体同屏，360×640 采用单卡覆盖查看，不能混称同一种布局。任务：[HC-028](../tasks/HC-028-single-page-library-preview.md)。设计：[纵向叠卡](../design/stacked-library.md)。

## 范围与分工

仅审查 artifacts/design/single-page-library-preview 的独立 HTML / PNG、交互和空间取舍。正式 1.16.0、6+3 分页、26 套数据、存储、推荐和 APK 保持。reviewer 仅维护本记录及审查索引对应行，其余只读，不运行 Chrome、adb 或构建。主控真实浏览器结果、reviewer 源码 / 夹具 / 图检分别记录。

## 审查合同

- 两种人数各九进攻默认全收、不预选 / 不显示球场 / 无分页；防守四卡。标题 / 初始站位来自实际二十六套定义，不能通过漏卡实现“一页九卡”。
- 点标题单开、同点全收、换卡收旧；切人数 / 攻防清选择，快速操作保最后意图，减少动效直接到终态。关闭内容真实 hidden，不留隐藏 CTA 焦点或旧节点事件误触。
- 390×844 优先九标题同时可达；360×640 记录真实标题 / CTA / 球场尺寸及取舍，不用 overflow:hidden 掩盖裁切或不可点内容，不将过小球场冒称大预览。横屏可将展开卡与其余标题分区。
- 主卡、顶部留白与固定玻璃导航保持；标题 / CTA 完整矩形和中心命中都应核对，不能只测中心可点或文档不滚动。
- previewAPI 的 setMode / setKind / select / collapse / state 与实际显示一致。file 可开，无 Storage / 远程请求；开始演练只显示明确预览说明，不加载实际战术、不写真实来源或进度。

## 独立源码与内存夹具

已只读检查 index / preview.css / preview.js / overview / build-data.mjs，以及既有六卡生产布局。预览独立使用全部目录，不修改生产 layout 上限或分页。builder 只在 artifacts 写经典 catalog / engine；reviewer 在 VM 加载 catalog.js，核对全部 26 个真实标题 / kind / 初始帧，逐项与正式模板首帧 JSON 一致。球场仅静态初始构图，不假造回放；CTA 只 toast“这是布局预览”，不加载实际战术。源码无 Storage、HTTP(S) 请求、业务来源写入或生产导入反向依赖。

默认 selected=''、所有 body 真实 hidden，关闭 CTA tabIndex=-1；切人数 / 攻防重建并清选择，同点收起、换卡只保留一个展开。短屏 overlay 对其余原卡 visibility:hidden / pointer-events:none、aria-hidden=true，标题真实 disabled / tabIndex=-1；当前标题独立显示“收起 · 返回列表”，有明确 aria-label。收起恢复全部标题，不将隐藏卡算作展开时仍可见。横屏根据八个余标题所需高度用一列或两列；减少动效 CSS 直接关闭 transition。

reviewer 用内存 DOM / VM 执行真实 catalog、engine 与 preview.js（没有改实现）：验证默认九张全收、390 类尺寸下九标题仍启用且仅一 body、同卡 toggle / 快速最后选择、短屏恰一标题启用且其余 hidden / disabled / tab-1、独立收回提示可见、CTA 只 toast 不改变选择、collapse 恢复九标题、换人数清选择、防守四卡及横屏九标题可达。夹具验证状态和属性，不模拟真实布局 / CSS / 物理点击。

## 主控最终浏览器证据

reviewer 已只读核对最终 verification.json：90 条检查为四尺寸 × 两人数的默认 / 九张逐个展开 / 防守，另加 rapid / reduced-motion。报告记录均无整页溢出、可见标题 / CTA 等完整矩形与中心命中，Storage 调用为空；errors / remote 为空。主控真实 CTA 点击已断言 toast 的“布局预览”说明；overview 的三个 file iframe 经 CDP 各自 frame 检查，不关闭浏览器 origin 安全检查。执行者为主控，reviewer 未运行 Chrome。

实际空间取舍如下，不宣称全部控件始终保持 44px：

| 尺寸 | 展开方式 | 代表当前标题 / CTA 高度 |
| --- | --- | --- |
| 390×844 | 九标题与一个紧凑横排球场 / 说明 / CTA 同屏 | 33px / 35px |
| 360×640 | 单卡 overlay，仅当前标题 / 球场 / CTA；收起后返回九标题 | 40px / 38px |
| 844×390 | 展开卡在左、八个余标题两列在右 | 38.1875px / 35px |
| 1024×768 | 展开卡在左、八个余标题在右 | 当前标题 46px / CTA 38px；代表余标题约45.125px |

reviewer 重算报告中全部控件矩形与 hit / 溢出 / Storage 条件均通过。这只证明所记录状态；不能把 360 覆盖模式称作“展开后九标题仍同时显示”，也不能把 390 的缩小球场称作原分页大预览。

## 独立图检与生产边界

reviewer 亲看最终 overview.png（1280×1050）、390 的 3v3 收起 / 展开、4v4 展开图，以及 360×640、844×390、1024×768 展开图。390 默认九标题清楚，展开体的球场完整但较紧凑，CTA 与其余八标题不互盖；短屏仅当前卡，最新 360 图右侧独立收回文案可见，球场 / CTA 完整；横屏八个余标题两列，平板单列均无明显裁切。总览三个手机框完整，布局与相应人数 / 战术名称一致。

production-verification.json 中六项生产核心 / 配置 / APK 哈希比较均 Unchanged=true；主控报告正式 1.16.0 保持。独立图检 / 源码 / 内存状态与主控浏览器、生产哈希核对分别记录，无新增 P1 / P2。本轮没有全应用测试或 APK / 设备操作。

## 限制

本轮不是取消正式分页的实现授权，不变更生产或设备。reviewer 未运行 Chrome、adb 或构建，90 条程序检查不是手机物理手感、FPS、完整读屏或正式库载入 / 来源失败验收。390 紧凑预览以较小标题 / 球场换九标题同屏；360 单卡覆盖牺牲展开时同时浏览其余八标题，需收起返回，这一限制已在源码文案和本记录明确。选择是否正式采用仍依据用户对效果的意见，本审查不代替该选择。
