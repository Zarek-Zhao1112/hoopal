# HC-029 一页九卡正式接入独立审查

日期：2026-10-25。状态：代码 / 浏览器审查闭环，无剩余 P1 / P2；1.17.0/code19 已安装，实际 WebView96 十八张程序浏览通过，完整物理验收仍为 `awaiting_device`。任务：[HC-029](../tasks/HC-029-single-page-library-release.md)。设计：[纵向叠卡](../design/stacked-library.md)。

## 范围与证据约定

正式库组件 / 纯布局 / CSS、应用 CTA 与来源保护接线，以及本轮真实浏览器、截图、1.17.0/code19 APK / 设备结果。reviewer 只维护本记录及审查索引对应行，其余实现只读，可用必要独立内存夹具；不运行 Chrome、adb 或构建。独立源码 / 夹具 / 图检与主控自动 / 设备执行分别记录，HC-028 预览不代替本轮正式证据。

## 待审合同

- 同组全部九进攻 / 四防守，不漏卡、不显示 pager；page / pages 如保留仅兼容 0 / 1。默认全收、同点收起、换卡收旧，进入库 / 筛选重置，同组普通 render 保展开。
- 390 常规竖屏为九标题加紧凑展开体；deck 高不足 430px 的短屏为单卡 overlay，不冒称其他八标题同时可见。非当前卡真实不可见 / 不聚焦 / 不响应，当前标题独立“收起 · 返回列表”可达。
- resize 进入 overlay 时，焦点若在将隐藏的卡，移到当前可见标题；收回恢复所有标题。横屏一 / 两列、快速操作、减少动效均以当前状态收敛，不仅检查中心可点，也检查完整矩形与遮挡。
- pending / external busy 锁标题、CTA 与收回；onPlay 返回 false 或 throw 后展开与来源原文保留供重试，双击不重复载入。换组旧 handler 依 generation 失效。
- 仅 CTA 调用既有 onPlay / clearContext / load / autoplay；浏览、收回、筛选不写选择或清来源，不改变 26 套动画、18 条规则、存储键 / schema / 旧个人 Play 清理。成功清来源后再失败不回挂旧身份。

## 独立源码与夹具

已只读检查正式 library-deck.js / -state.js / CSS 及相关既有 page-layout.css。组件已移除 pager DOM，兼容 page / pages 为 0 / 1、paged=false，全部目录一次建立 entries；纯布局上限九卡，short overlay、wide 一 / 两列及 entry.header / hidden 显式返回。CSS 新增 #template-list 范围避免后导入的旧 compact 规则盖掉卡片内布局；正式尺寸 / 文字可读性仍需浏览器，而非以源码优先级代替。

overlay 对非当前卡同时 visibility:hidden、pointer-events:none、aria-hidden=true，标题真实 disabled / tabIndex=-1，正文真实 hidden。当前标题旁独立收回文案及 aria-label；layout 遍历时记录将隐藏卡内的焦点，syncBusy 更新所有 disabled 后再移至当前启用标题。同组 render 保节点 / 展开，换组 generation 增加且旧 entries 移除，旧回调按代际 / entries.includes / concealed 拦截。

组件仅显式 CTA 走原 onPlay；pending 是独立 ticket，不因普通 app render 的 busy=false 解除。收回与其他标题同样先判断 pending / external busy；false 保原卡，throw 仅给仍属于当前组的卡写错误。没有引入存储、来源或 schema 写入。layoutToken 保护过期动画收尾，旧回调不能清空新 timer 的句柄。

reviewer 用内存 DOM / 可控 Promise 执行真实 createLibraryDeck，分别使用实际 3v3 / 4v4 九套进攻目录验证：

- 九卡、无分页节点、默认全收，same-group 复制模板对象 render 保同一标题节点与展开。
- deck 高 497→359 时，把将隐藏的其他标题焦点移至当前可见标题；其余八卡 aria-hidden / disabled / tab-1，强制派发旧隐藏标题 / CTA 无效。
- pending 双击只一次 onPlay，强制收回或其他标题、同组 render 不解除锁；false / throw 后保当前展开并恢复启用 CTA，throw 的错误文字保留，可明确重试。
- external busy 锁收回，解锁后同卡收回恢复标题；wide / reduced motion 收敛；换防守组后四卡、旧组 handler 强制触发无效。
- 过期 timer 回调不改新 transition 状态，随后 refreshLayout 仍能清理新 timer，句柄未被旧回调覆盖。

另对六个代表 deck 区域、4 / 9 卡及各 selected 共 90 个纯布局组合检查可见矩形有界、header 不大于卡框、可见卡互不重叠；overlay 只检查当前可见卡，未把隐藏八卡算作同时可见。该数值夹具不等同真实六屏浏览器，也不模拟 CSS、原生焦点或真实磁盘。

## 正式 E2E 与首批图检

reviewer 已只读检查冻结的 library-deck-flow、helpers、page-layout-flow 和 offense-expansion-flow。新增六尺寸 × 双人数 × 九张标题共 108 组实际中心点击展开 / 收回，并检查控件完整矩形、overlay 返回与隐藏卡禁用 / 焦点、wide 分区；另用 CDP objectId 验证同组 render 保留实际节点、档案 / 演练事实不变，真实 resize 后焦点落当前可见标题，快速操作 / reduced-motion / 重入筛选重置保留断言。

来源故障专项先设真实非零步骤，再在 360×640 overlay 中注入 clear 持久失败；同步检查所有标题 / CTA 与收回均被 pending 锁住。失败后比较 archive / selection 原文及模板 / 标题 / 进度 / 步骤 / 球员 DOM 全部事实，保展开供重试，恢复后才清来源并播放。保留新增六套 43 帧和六条真实推荐图例检查，未把原文保护简化成单独模板 ID。以上为测试源码审查，不是该轮执行成功的提前证明。

reviewer 已亲看 hc029-390x844-3v3-collapsed.png、hc029-390x844-4v4-expanded.png、hc029-360x640-4v4-expanded.png：正式九标题 / 无分页、390 展开仍保八标题、360 当前卡独立收回 / 球场 / CTA / 导航完整。390 球场较紧凑，360 明确单卡覆盖，不混称九标题与展开体同时可见。

另亲看 hc029-844x390-4v4-expanded.png 和 hc029-1024x768-4v4-expanded.png：左侧完整球场 / 说明 / CTA，横屏余八标题两列、平板一列，保留标题与人数攻防、顶部留白 / 导航，无新增裁切 / 遮挡 P1 / P2。静态图不能证明真实点击、跟手或帧率。

## 主控最终浏览器

主控正常 npm test 构建及 182 检查（179 单元 + 3 HTTP）全部通过、无 skip。最终完整 Chrome exit 0：26 套动画、队徽 / 柜位触摸、阵容 / 推荐 / 重启 / 导出 / 离线、六尺寸、导航快速 / 取消 / 减少动效回归通过，errors / remote 为空，测试 profile / 临时服务 / Chrome 已清理。执行者为主控，reviewer 未运行 npm / Vite 构建或共享浏览器。

reviewer 已读本轮报告并重算数量 / 矩形命中 / 溢出字段：hc029-library-metrics.json 为 255 条，包含六屏双人数 108 组逐卡真实中心展开 / 收回及闭卡、四防守、焦点 / 快切等状态，portrait / overlay / wide 全有记录；所有 controls hit=true、文档无溢出。hc029-page-layout-metrics.json 为 49 条、覆盖同六尺寸，命中与溢出字段通过。hc027-expansion-playback-recommendations.json 在本轮重新生成，12 条记录为六套共 43 帧 + 六条实际推荐完整图例，不能因文件名沿用 HC-027 当作旧结果。来源 clear 失败的非零步骤 / 存储原文 / 球员事实保护与重试由本轮完整 flow 执行通过。

主控构建 APK 成功（48s），源码与最终 Chrome 输入未再变更；最终安装与资源证据见下节。

## APK 与实际设备

主控核对 APK 的 28 个网页资源与 dist 逐项哈希一致、无 server.url、v2 签名有效且沿用既有证书。reviewer 已读 hc029-apk-assets.json：webAssets=28、serverUrlAbsent=true，APK SHA256 为 `2e1140d1016539a3189d98c4f87924a02e4f5960a6e657a1f56f455d0004d6c1`。reviewer 未自行解包、签名或构建。

主控重新识别指定 ef473680，安装前立即刷新双文件基线后 install -r Success；1.17.0/code19 COLD 启动 725ms、前台校验通过。reviewer 已读 hc029-device-before.json / hc029-device-after.json：均实际 0 档案，归档 SHA256 同为 `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`；selectionSha256 同为 `397c6cb369a367c0cf5b7d4a2a047c2748becc85e1af744731323b2b75ebd9eb`。没有沿用早期陈旧进度哈希，也未卸载 / 清数据。

reviewer 已核对 hc029-native-library.json：实际 Android12 / WebView96.0.4664.104，393×819，以 DOM 程序点击两人数全部十八张进攻的展开 / 收回、九卡无 pager、防守四卡，十八条记录均为 portrait，报告控件 fit / hit、无 overflow。archiveAndSelectionUnchanged=true，程序仅浏览，未点开始演练 CTA 或最终保存测试阵容；主控恢复原 lineups / 3v3 / offense，并移除调试 forward。

首次原生几何断言未通过且没有完整诊断；主控随后复查时已不在本 App 前台，未截图其他 App。重新带本 App 前台后，在相同源码 / APK 上完成十八项复验。记录为中断 / 复验，不断定首次失败的原因，也不虚构已修源码 bug。

reviewer 亲看 hc029-native-3v3-collapsed.png 与 hc029-native-4v4-expanded.png：真实手机九标题清楚、无翻页；4v4 STS 紧凑展开时仍保留其余八标题，球场 / 描述 / CTA / 导航完整，无新遮挡或裁切 P1 / P2。安装、原生程序与哈希检查由主控执行，图检由 reviewer 执行。

## 限制与后续

正式源码、独立夹具、E2E 源码与浏览器 / 原生图检无可复现 P1 / P2，主控完整浏览器与实际 WebView 程序浏览通过。reviewer 没有运行 Chrome、adb 或构建。

原生未点开始演练 CTA 或最终保存；手机物理手指、FPS、旋转、原生 Back 及真实保存仍未验收，任务保留 `awaiting_device`，不以预览、内存、浏览器触摸、程序 DOM 点击或编译替代。
