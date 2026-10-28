# HC-031 卡内循环正式接入独立审查

日期：2026-10-25。状态：代码 / 浏览器审查闭环，无剩余 P1 / P2；1.18.0/code20 已安装，实际 WebView96 二十六卡与 Android HOME 生命周期程序检查通过，完整物理验收仍为 `awaiting_device`。任务：[HC-031](../tasks/HC-031-inline-motion-release.md)。设计：[纵向叠卡](../design/stacked-library.md)。

## 范围与执行者

正式 library-preview runtime / 纯 clock、库组件 / CSS 及 app 工厂、可见性 / 后台接线。reviewer 未实现相应源码，仅维护本记录与索引对应行；只读实现，使用必要独立内存夹具，不运行 Chrome、adb 或构建。HC-030 预览不替代正式生命周期、来源和设备证据；主控浏览器 / APK / 原生检查分别记录。

## 独立源码核对

runtime 对 template.build() 调用真实 validatePlay、interpolateBoards、ballPosition 和材料 helper，不读写存储、不引用 artifacts。纯 clock 以毫秒累计，每段 2400ms、前 18% 停顿后 smoothstep，末帧 hold=1000ms；delta 防负值 / 非有限值并限 100ms，避免长间隔直接跳完。暂停保 clock，start 续播、reset 归零，state 为新快照。不是以帧率或胜率估计播放效果。

构造只画初始帧、不自动排 rAF；start 检查 disabled / 连接 / document.hidden / hidden 祖先。单句柄和 generation 使旧回调不清新句柄；pause / reset / destroy 先取消，destroy 另移除 button / document / window 监听。球位由实际插值返回，路径取当前 from，防守卡突出蓝方并只画蓝方职责路径；SVG defs 与 marker 引用为实例前缀，状态角标不截获整块球场按钮点击。

库只在首次打开时创建 runtime，layout 先设置实际 body / court 状态，再 syncBusy 启用后 reset/start。普通同组 render / resize 不启动或重置；收回 / 换卡 pause+reset，换组 destroy，隐藏 / 禁用 / 旧代际 court 强制事件在 capture 阶段拦截。pending / external busy 先 pause 再禁标题 / 收回 / 球场 / CTA，解除后保持暂停。false / throw 保卡，throw 错误仅写仍属于当前组的条目；同组重绘不解除组件 pending ticket。

app 初始按 workspace.view 传 visible；离库 setVisible(false) 暂停，入库沿原 reset 收起，setVisible(true) 不自动续播。beforeNavigate / beforeModalOpen 与 saveBeforeBackground 在任何 await 前暂停卡内 runtime；原「持久清来源→载入→主训练场自动播放」onPlay 路径保留，没有把卡内 position 写到主 Play / 进度。共享引擎、26 套动画、18 规则及 schema / 键不需要修改。

## 独立联合内存夹具

reviewer 用内存 DOM / 可控 rAF 与 Promise，将真实 createLibraryDeck 的 makePreview 接真实 createLibraryPreview；不是仅用假的 runtime 验证库：

- 初始不可见 / 未展开零构造，启用后打开仅创建一次；一条实际 rAF，重开复用实例从零，实际 SVG 球员 / 球位对引擎结果一致。
- same-group render / resize 保位置和同一实例；H497→359 时焦点移到可见标题，无新增 rAF。
- busy 先暂停 / 清 rAF、禁球场，强制 click 无效；解除不自动续，手动球场可续。
- CTA 双击只一次 onPlay；pending 禁收回与球场，同组 render 不解锁；false / throw 后位置 / 展开保留且 paused，能手动继续和明确重试。
- close 归零、重开复用；过期 rAF 回调不破坏新循环。三段自然时钟到末帧，hold400ms 后暂停 3000ms 仍剩600ms，继续补足才 cycle+1。
- setVisible(false) 和 document.hidden 均暂停，显示 / 前台不自动恢复、不补后台时间；换组 destroy 后旧 court 事件无效。
- 防守卡蓝方 opacity=1 / 橙方=.42，所画职责路线均属于蓝方；reset 后全部 rAF 清空。

夹具验证状态和 DOM 属性，不具真实 CSS、原生焦点、磁盘或设备性能。来源失败时主 Play / 两键原文字节保护不能由内存 onPlay 拒绝单独证明，本轮主控正式浏览器故障注入证据另见下节。

## 主控最终浏览器

主控正常构建及完整 npm test exit0，共 195 检查（192 单元 + 3 HTTP）、无 skip；E2E 由主控承接。定向通过后，最终完整 Chrome 亦 exit0：26 主训练场动画、108 组逐卡开合 / 六尺寸、六新推荐与 43 帧、档案 / 转盘 / 玻璃面板 / 存储 / 重启 / 导出 / 离线 / 导航等全部通过，全局 errors / remote 为空；测试 Chrome / profile / 临时服务已清理。产品源码与 APK 输入期间未再改变，仅修测试作用域和 focus 环境。

reviewer 已核对本轮重新生成的 hc031-library-metrics.json 255 条、hc031-page-layout-metrics.json 49 条，报告所列控件 hit 均为 true，文档无溢出；沿用 HC-027 名称的 expansion 报告为本轮 12 条、共 43 帧与六条实际推荐。最终 hc031-inline-playback.json 三组观察为真实自动运动 / 暂停及 SVG 对实际引擎、give-go 自然完整循环 / 末停保剩余、真实 tab hidden / 手动继续，mainPlayAndStorageUnchanged / singleAnimationLoop / actualHiddenChecked 均为 true。不把三组专项称为所有 26 卡均自然跑完整一轮。

reviewer 已读对应 E2E：真实暂停 SVG 对实际 engine、主训练场 Play / 球员与 selection / archive 原文保持、离页全卡 rAF=0、resize 保暂停场景、rapid 单循环、蓝方防守焦点等断言保留。来源 clear 失败还保持原非零步骤 / 主球员及两键原文、原展开卡；实际预览 playing=false / rafCount=0，等待后 progress 不变且可重试。最初两次未通过属于测试适配：全局 [data-ball] 把隐藏卡内 SVG 算进主球层，现限定 #ball-layer 并新增隐藏库 rAF 总0；共享 runner 固定 focus 导致 tab 不能 hidden，现先解除 override、激活真实新 target 并等待 visibilityState=hidden，finally 关闭 target / 返回并恢复 override。不是修改生产行为或伪造 visibility，不登记为已修产品缺陷。

## APK 与实际设备

主控构建 APK 成功（23s），核对 28 个网页资源与 dist 逐项哈希相同、无 server.url、v2 旧证书有效。reviewer 已读 hc031-apk-assets.json：webAssets=28、serverUrlAbsent=true，APK SHA256 为 `4e1e5e20b1ec061420b39ffba789f6186b3879ee59199eb2eb0189e527a9d3f8`；reviewer 未自行构建 / 解包 / 签名。

主控重新识别指定 ef473680，安装前即时刷新两文件基线，install -r Success，1.18.0/code20 COLD 启动 851ms。reviewer 已读 hc031-device-before.json / hc031-device-after.json：实际均 0 档案，归档 SHA256 均为 `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`；selectionSha256 均为 `397c6cb369a367c0cf5b7d4a2a047c2748becc85e1af744731323b2b75ebd9eb`，after 版本与前台校验通过。

reviewer 已读 hc031-native-library.json 并核对全部 metrics：实际 Android12 / WebView96.0.4664.104、393×819，26 套进攻 / 防守卡均程序开 / 暂停 / 收，播放时 playing=true / rafCount=1，暂停时 playing=false / rafCount=0，控件 fit / hit=true、overflow=false，CTA 为进入训练场。give-go 实际移动、暂停稳定，自然完整 cycle1 含末停；hold 暂停时剩约745.72ms，等待期间冻结、继续补足才循环。mainPlayUnchanged / archiveAndSelectionUnchanged 均为 true。

主控实际 Android HOME 到 MIUI launcher，等待真实生命周期暂停后回本 App，仍 paused，再手动继续；这不是伪造 document.hidden。首次仅等待300ms立即断言未通过，诊断 visible / playing=true 属事件到达前采样；改为 -W 确认 HOME 焦点并等待真实 Native 事件后，在同一源码 / APK 完整复验通过。不据此宣称修过产品源码或把事件前采样当后台逻辑缺陷。HOME 为程序系统操作，不等于物理手指操作验收。

原生未点进入训练场 CTA 或最终保存测试档案；双文件与主 Play 保持。主控清理本轮9228转发，既存tcp13000非本轮，未改动。

## 独立图检

reviewer 亲看 hc031-390x844-3v3-expanded.png、hc031-360x640-4v4-expanded.png、hc031-native-3v3-paused.png、hc031-native-4v4-defense.png。390 卡内循环角标 / 进度线、球场与 CTA 完整且保留其余八标题；360 当前卡覆盖带独立收回，球场 / 状态 / CTA / 导航完整。原生暂停角标与图中停留球位一致；防守卡蓝方突出、橙方淡化、蓝色职责路径清楚，没有新增遮挡或裁切 P1 / P2。静态图不单独证明运动、暂停或帧率，动态结论来自实际时序报告与独立夹具。

## 发现与限制

正式源码 / 独立联合夹具 / 图检无可复现 P1 / P2，主控完整 Chrome 与实际原生程序检查通过。reviewer 未运行 Chrome / adb / 构建，内存失败不单独证明真实写入失败；正式故障注入与原生证据已另列，不借用 HC-030 预览结果。

原生未执行进入训练场 CTA 或最终保存；真实手指、FPS、旋转、系统 Back 和实际保存仍未完整验收，任务保留 `awaiting_device`。已测程序 HOME 生命周期不能替代这些物理 / 系统流程，不以安装、程序点击或静态截图宣称全部设备完成。
