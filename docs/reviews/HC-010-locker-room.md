# HC-010 更衣室与玻璃导航独立审查

日期：2026-10-23。状态：独立审查完成，发现的两项 P2 已修复并复验；未发现剩余 P1 / P2。新机已由用户正常安装，主控完成版本、冷启与稳定截图核对；手机交互人工验收仍为 `awaiting_device`。任务：[HC-010](../tasks/HC-010-locker-room.md)，设计：[冰川蓝更衣室](../design/locker-room.md)。

## 计划与参考图

interaction_design 未参与实现。已只读核对设计、任务、AGENTS.md 与 `artifacts/design/locker-room-glacier-v2-glass.png`。单人更衣室、场景随水平滑动、当前球员详情 / 配置联动、冰川蓝与玻璃导航的范围清楚，没有发现与既有档案、推荐、内置战术或离线约束冲突，也没有新增用户审批。

效果图用于视觉方向，球场透视、队员号码位置和场景细节不作为修改实际战术坐标、球权或能力规则的依据。参考图不能代替六屏布局与真实手势验证。

## 审查范围

- 场景单指与水平轴锁；纵向 / 斜向、pointercancel / lostpointercapture、末端、旋转与多指边界；正常点击和拖动后合成 click 分开，避免误触全名、配置或推荐。
- 临时选择按档案 ID / 成员 ID 隔离；切队、删除及成员校验后收敛，前后按钮可替代手势，从当前球员进入配置仍选同一人；不持久化选中状态，不改变推荐来源。
- 姓名 / 号码 / 标签与真实成员一致，长文本仍有完整入口；原回调、保存失败保护与双向草稿隔离继续有效。
- 玻璃导航具备不支持 backdrop-filter 时的清晰背景回退，安全区、导航浮层和图层不遮挡演练、配置保存 / 关闭入口；六屏与低高度输入分别检查。
- 拟物 SVG 的渐变、阴影和图案引用自包含，ID 不与其他场景或缩略图重名；独立 PNG 保留纹理、路线、棋子与标题，绘图不改变动画与存储协议。

已只读审查 `frontend/src/lineups/{locker-room.js,ui.js,styles.css}`、`frontend/src/board/appearance.js`、`frontend/src/app.js` 绘图、`frontend/styles/app.css`、页面与原生外观配置。临时选人沿用档案 ID → 成员 ID，不写入存储；草稿、推荐来源与存储协议没有本轮迁移。

## 问题与修复

| 问题 | 位置与复现 | 处理与复验 |
| --- | --- | --- |
| R1 / P2：真实触摸被子节点丢失捕获提前取消 | `frontend/src/lineups/locker-room.js:168`。触摸球衣 SVG 子节点产生隐式捕获；水平锁定后 viewport 接管捕获，旧子节点的 `lostpointercapture` 冒泡，原处理无条件取消手势，导致滑动不换人。 | 主控在真实 Chrome 发现并修复：仅事件目标为 viewport 时取消。reviewer 夹具确认子节点失捕不取消后续移动，viewport 自身失捕仍取消；主控报告真实触摸左右切换通过。 |
| R2 / P2：档案主题色选项没有可见效果 | `frontend/src/lineups/ui.js:9,99,122`。冰川蓝球衣和队徽重绘后原 color 参数未体现在画面，选橙 / 蓝 / 绿效果相同。 | reviewer 发现，ui 修复为队徽细边与球衣小胸标使用实际档案色，主色仍为冰川蓝。reviewer 调用真实 UI 渲染，逐一检查三色队徽边线与全部球衣胸标，均匹配档案值。 |

两项修复均由实现负责人完成，reviewer 未改实现。没有用静态布局或测试通过替代问题触发条件的复验。

## reviewer 独立证据

未启动共享 Chrome。以下夹具使用 Node、最小 DOM 与真实导出的模块 / 绘图函数，不访问设备，也不是浏览器手势或布局引擎的替代：

- 3v3 / 4v4 共 34 项手势与控件检查：右滑下一位、左滑上一位、首尾、纵向 / 斜向锁定、小位移、一次最多换一位、pointercancel、自身 / 子节点失捕、多指打断、错误 pointerId、resize、destroy、按钮起手、拖后合成 click 抑制及 disabled。非当前柜位实际 disabled、tabIndex=-1、aria-hidden，通过无需原生 inert 的假 DOM 检查。
- 15 项 UI 状态 / 焦点 / 配色检查：两档案故意使用相同成员 ID，选人仍各自隔离；场景、详情、配置指向同一人；删除成员 / 档案后选中收敛；原配置草稿保留；临时选人不触发 onAction，也不改变原档案或 playbackContext；focusin / focusout 及重绘回收输入焦点类；三种主题细节色与真实值一致。
- 调用实际绘图函数覆盖 20 套模板、112 帧、209 条可见路线与 788 个主场球员正面圆：SVG pattern / gradient / filter 引用均在本 SVG 内可解析，主场、20 个库缩略图与推荐预览的 ID 不重复；路线与 marker 色一致；球员正面圆仍以原坐标为中心、半径 24。导出使用显式颜色，无 CSS 变量 / currentColor / undefined 颜色依赖。
- 用 PostCSS 解析实际样式：5 处 dvh 声明均有前置同属性 vh 回退；无 :has 选择器。输入压缩使用真实焦点类，导航先有高不透明底色，再由 @supports 增强模糊。

已亲自查看参考图、七张实现页面截图与实际导出 `artifacts/qa/downloads-readonly-1792689522408/四人协防轮转.png`：浅木地板、蓝色油漆区、白色场线、橙蓝棋子厚度 / 阴影与淡底深色导出标题可见；阵容、配置、推荐和玻璃导航的视觉方向一致。

早期页面图在 340ms 场景动画未结束时截图，不能据此判断静止中心。reviewer 提出截图时机建议后，主控统一等待 380ms 并加入六尺寸当前柜位中心误差 ≤2px 断言，无应用源码变更。reviewer 又亲自查看最终 `artifacts/qa/locker-1.7.0-{3v3-phone,4v4-phone,small-phone,landscape}.png`：当前铭牌 / 球衣居中，手机小屏与横屏仍可见详情、换人、配置 / 推荐及导航入口。静态图片不用于证明手势行为或点击可达。

## 主控执行的集成证据

以下由 root 执行并报告，reviewer 没有亲自跑 Chrome、APK 或 adb：

- 109 项单元 / 集成与 3 项构建 HTTP 检查，共 112 项通过。
- 最终真实 Chrome 覆盖 20 套动画、离线、PNG / JSON、档案保存恢复 / 来源清除写失败、草稿、两人数实际触摸左右滑动、纵向拒绝 / cancel / 首尾、配置同人、跨档案焦点隔离、临时切换磁盘字节不变、reduced-motion；六尺寸三视图、配置四分区、推荐四分区、长名 / emoji / 输入焦点通过。所有可见启用控件中心 elementFromPoint 无遮挡；静止柜位中心断言通过。
- APK 1.7.0 / versionCode 9 已构建，v2 签名、9 项 dist 资源哈希与无 server.url 检查通过。SHA-256：`0b7ff582b51766b418b9badb33102318aecdf1141a6d3a5da5175f9e95205877`。

## 兼容与设备边界

用户中途更换手机，并明确后续只安装新机。主控实测目标为 M2101K9C / `ef473680`、Android API 31、WebView 96.0.4664.104；该设备原先没有本应用，本次按首次安装记录，不沿用旧手机序列号或旧机一份档案的升级哈希，也不写入假档案。

静态兼容检查与上述夹具已通过。主控已在这台 WebView 96 设备上核对启动后的空阵容页显示，但尚未完成完整功能交互；不能将源码回退、桌面 Chrome 或启动截图等同于该版本全部渲染 / 输入支持。

安装过程先由主控报告 USB 安装返回 `INSTALL_FAILED_USER_RESTRICTED`，随后正常推送 APK 至 `/sdcard/Download/halfcourt-1.7.0.apk`，用户通过文件管理器正常确认并完成安装，未修改设备安全策略。其后 root 核对 pm path 存在、版本 1.7.0 / versionCode 9；am force-stop 后 am start -W 返回 `Status: ok` / `LaunchState: COLD`，进程存在。

用户切过其他 app 后，root 再将本应用任务带至前台，核对 mResumedActivity 归属并等待动画结束，保存及亲自查看稳定真实截图 `artifacts/qa/device-1.7.0-new-phone.png`：0 档案空更衣柜页、玻璃导航和浅色系统栏正常显示，未写入假数据。以上安装由用户完成，命令 / 截图核对由 root 执行并报告；reviewer 本次仅据报告更新，没有操作设备或亲看该设备截图。新机首次安装不作为升级保留旧档案的证据。

## 未验证范围与结论

在上述源码、夹具与图检范围内未发现剩余 P1 / P2，两项已知 P2 已修复并有针对性复验。reviewer 只维护本审查文档，没有修改实现或索引。

新机首次安装、版本 / 冷启和启动页截图核对已完成。仍待手机手势、输入法、系统返回、旋转、离线操作与原生分享的人工验收；真实 WebView 96 证据目前限于启动及空阵容页显示。桌面真实 Chrome、静态图检、Node 最小 DOM、安装冷启与手机人工操作是不同证据，任务应保留 `awaiting_device`。
