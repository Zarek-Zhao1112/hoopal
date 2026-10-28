# HC-025 队徽转盘正式接入独立审查

日期：2026-10-23。状态：代码 / 浏览器审查闭环，无剩余 P1 / P2；1.15.0/code17 已安装并完成实际 WebView 程序检查，完整物理设备验收仍为 `awaiting_device`。任务：[HC-025](../tasks/HC-025-team-carousel-release.md)。设计：[队徽转盘](../design/team-carousel.md)。

## 范围与分工

interaction_design 仅维护本记录及审查索引对应行，正式实现只读；必要时使用内存夹具，不运行共享 Chrome、adb 或构建。主控负责真实浏览器、APK、设备检查与截图，后续按执行者分别记录证据。

本轮审查正式第二任务的组件接入、草稿同步、生命周期、弹窗锁与焦点，以及原有三步创建 / 编辑兼容。HC-024 的独立预览结果仅为设计基线，不能代替正式保存流程与设备验收。

## 接入合同

- 新建与旧中性档案的 initialTeamId 为 null 时，打开 / 重绘 / resize 不自动分配 NBA 球队，不回调选队。新建仍须明确选队；旧中性档案仍可按原规则保存。
- 用户动作、惯性吸附和取消恢复所产生的当前选择，与草稿、中心队名及球衣同步。离开第二步 / 保存不读取滞后的选中；从初始未选取消时允许恢复 null。
- 新拖动可打断吸附；纵向拒绝、pointercancel、丢捕获、隐藏、销毁均停止所属 rAF / 捕获 / 监听，旧实例不得回写新草稿。拖动后的合成 click 不误选。
- busy / closing 时不仅外部按钮禁用，组件指针、箭头、全队入口和未结束的回调也须遵守锁。onAllChange 隔离外部任务控件；Back / Escape 优先关闭全队列表并回入口焦点。
- 保留稳定档案 / 成员 ID、4→3→4 成员池、创建最终一次完整提交、编辑 revision、保存失败可重试、保留 / 放弃草稿与推荐来源协议；不增加存储键或改 schemaVersion。
- 四尺寸可达性、减少动效、WebView96、完整业务回归及设备安装 / 字节保护，待主控实际结果后核对；程序点击与物理触摸分开记录。

## 独立源码与内存夹具

已只读检查 team-carousel.js、ui.js、team-carousel.css、app.css 的样式导入及 sheet.js 既有上下文。组件只处理 DOM / 选中，不读写存储；初始 null 以临时中性项显示，paint 默认不回调。onChange 在同一次绘制中更新当前草稿与球衣，正常吸附后去掉中性项再进入三十队循环。ui.js 按 generation、wizard 步骤和草稿对象身份拒绝旧实例回调，draw 先销毁旧组件，最终保存继续使用既有完整快照 / perform 路径。

全部球队通过 onAllChange 隐藏球衣摘要、真实禁用外围任务按钮；返回 / Escape 先关闭列表并回到入口。忙碌、closing 和旧组件均纳入 isDisabled。destroy 取消 rAF、释放本组件捕获、移除监听并断开 MutationObserver / ResizeObserver。全局 [hidden] 的 display:none!important 保留，未依赖 inert 才隐藏或隔离交互；新增 CSS 位于合法的顶端 @import 序列。

reviewer 使用内存 Mini DOM / 可控时钟执行真实组件与真实 createLineupUI，未写夹具文件或更改实现：

- 组件：初始 null 与 resize 不触发 onChange；拖过选中阈值同步得到 BOS；pointercancel 同步恢复 null；吸附 80ms 的当前 ID 与最后回调相同；destroy 后 rAF 清空、再推进时间 / resize 不回调；全队开关焦点闭环；动态 busy 在下一 tick 停止运动且不回写。
- 正式 UI：新建未选队时不能进第三步且零 onAction；全队列表使继续按钮 disabled，handleBack 只关列表并回入口；吸附 80ms 后中心 / 草稿球衣一致，立即进入第三步保留同队并清掉旧 rAF；旧中性档案失败保存后可重试，最终仍为 null，原成员 ID 保持。

engine 交还后的侧卡相对位移、全队 aria-pressed / 禁焦点、首次连接重新测量及 ResizeObserver 清理已复读；组件夹具在该版本重跑通过。当前未发现可复现 P1 / P2。

UI 最后交还时移除 isDisabled 中 note-dialog.open 条件：临时全文若触发 paint 禁用内部按钮，关闭全文后原路径没有重新 paint，可能保留死按钮。现由上层 native modal 隔离交互，其他生命周期锁保持。reviewer 已复读差异并重跑正式 UI 夹具；真实全文关闭后继续切队已由主控用最终构建定向复验，详见主控验证段，旧 guard 基线的 Chrome 结果不作该项通过证据。

## R1 · P2 · 列表关闭后的尺寸通知取消新动画

位置：frontend/src/lineups/team-carousel.js 的 ResizeObserver 回调（当前约 323–336 行）；实际触发见 tests/e2e/team-carousel-flow.mjs 的末队环绕检查。

主控真实 Chrome 在全部球队选择 WAS 并返回转盘后立即 next，最终停 activeIndex=29，没有绕至 0。全队列表使 stage 隐藏 / 显示，异步尺寸通知可能晚于用户下一次动作；旧回调无条件 freeze，误取消刚开始的吸附。影响不局限于末队，返回列表后立即操作也可能被尺寸通知吞掉。

engine 已将可见阶段尺寸通知改为 paint（默认不回调选队）并保留当前 motion；真正隐藏时仍停止手势 / 动画，window resize / blur 的原清理保留。

reviewer 在内存加载真实组件，模拟 stage 隐藏宽 0 / 显示宽 320，依次触发零尺寸通知、关闭列表、next、延迟显示尺寸通知、推进 500ms。将该回调在内存还原为旧无条件 freeze 时，精确复现 WAS / 29、changes=[]，环绕断言失败；当前源码得到 BOS / 0、onChange=[BOS]。源码未被修改。状态：`verified`；主控在最终 dist 的真实 Chrome 专项中环绕断言也通过。

首轮无 ResizeObserver 的环绕 / 生命周期夹具没有覆盖这一真实异步时序，不能当作本项旧实现通过证据。

## 主控验证

主控报告初次构建及 150 项单元 + 3 项 HTTP 检查通过。reviewer 已只读核对最终 dist（index-DUPGJGOX.js）产出的 artifacts/qa/hc025-team-carousel.json：四尺寸初始 / 已选共八条布局记录及初始全队列表状态，页面 / 面板无溢出、报告列出的控件中心命中均为 true。实际触摸 GSW→HOU→GSW、快拨至 IND、打断回 GSW，队名与球衣一致；30 队逐个选择、初始中性、取消回中性、旧中性保存、仅草稿改变、全队焦点隔离、失效 / busy / closing handler 保护均通过。

主控最终专项执行了 WAS→BOS / BOS→WAS 环绕，以及吸附中打开全文、等待 450ms、关闭后继续 next 的断言。此为修后与移除 note guard 后的基线，未混用前次浏览器结果。

主控最终完整 Chrome 测试 exit 0：readOnly 二十套战术、library、pageLayout、HC-025 专项、glass 三任务及保存失败重试、lineup 创建 / 修改 / 推荐 / 重启 / 离线 / 导出、pageMotion 全部通过，无 runtime 或远程资源错误。该运行的 dist index-DUPGJGOX.js 与修后快照一致。执行者为主控，reviewer 未重复浏览器。代码 / 浏览器审查无剩余 P1 / P2。

## 独立图检

reviewer 亲看 artifacts/qa/hc025-team-390-844.png、hc025-team-360-640.png、hc025-team-844-390.png、hc025-team-1024-768.png：中央勇士队徽完整且保持平整，两侧队徽浅退后，当前名称 / 17号目录位置 / 勇士球衣相符。小屏关闭、全队入口、箭头及前后任务可见；横屏 / 平板球衣与转盘分栏，中央队徽与主要控件无裁切。画面保留玻璃任务面板与背景模糊。远侧装饰队徽部分出场属于转盘边界，并非中央选中队徽被裁。静态图不用于推断跟手、帧率或手机性能。

## APK 与实际设备

主控执行 Android 构建 SUCCESS（59s），v2 签名有效，28 项 APK 网页资源与 dist 逐项哈希一致，无 server.url。APK SHA256：`57dddd0f97c236f9508c7cfc585020488420252d30d783909efb95956d54b703`。

主控重新核对 adb devices 后，仅对 ef473680 / M2101K9C 覆盖安装，install -r Success；1.15.0/code17 COLD 启动 595ms 并确认前台。reviewer 已只读核对 artifacts/qa/hc025-device-before.json / hc025-device-after.json：本轮实际均为 0 档案，前后哈希均为 `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`，不沿用历史一份档案的描述。

reviewer 已只读核对 artifacts/qa/hc025-native-carousel.json。主控在实际 WebView96.0.4664.104 内以 DOM 程序点击验证：初始 null / 中性，未选继续被拒绝；明确选择 BOS 后中心与球衣一致；next 到 LAL、prev 返回 BOS；全队列表打开与合成 Escape 返回 / 入口焦点；第三步再回第二步保留 BOS。393×819 的转盘与全队状态均 overflow=false、controlsFit=true，资源异常列表为空。未点击最终保存，最终放弃测试草稿；报告 archiveUnchanged=true，哈希与本轮前后报告一致。

reviewer 亲看 hc025-native-carousel.png 与 hc025-native-all-teams.png：真实手机截图中凯尔特人队徽 / 01目录位置 / 名称 / 绿色球衣一致，关闭、箭头与继续完整；全队页十二张队徽、1/3分页与返回入口完整，外围任务控件呈禁用。图检由 reviewer 执行，安装与原生程序检查由主控执行。

## 验证限制

独立夹具不具有浏览器布局、原生焦点 / 隐式捕获和真实磁盘能力，不能代替尺寸 / 命中、实际触摸、WebView96 或设备检查。reviewer 证据为源码、内存夹具、报告核对与浏览器 / 原生截图图检；本轮未运行 Chrome / adb / 构建或测量 FPS。主控 Chrome 触摸属于模拟器输入，原生检查为程序 DOM 点击与合成 Escape；均不能视为手机物理手指、系统 Back、旋转、IME 或 FPS 验收。实际设备最终保存未执行，完整人工验收仍待做。历史预览、历史设备与本轮结果不混用。
