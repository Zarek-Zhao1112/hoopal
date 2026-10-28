# HC-021 阵容主卡与玻璃组队正式接入独立审查

日期：2026-10-23。状态：源码、独立夹具、图检及主控最终浏览器范围通过，无剩余 P1 / P2；1.13.0 已由主控构建 / 安装，真实 WebView96 程序检查通过，完整人工设备验收仍为 `awaiting_device`。任务：[HC-021](../tasks/HC-021-lineup-glass-release.md)。设计：[阵容主卡片与玻璃任务面板](../design/lineup-glass-sheet.md)。

## 范围与分工

interaction_design 不参与实现，独占本审查文件；实现源码只读，不运行共享 Chrome、adb 或构建。主控负责浏览器 / APK / 设备证据，reviewer 将区分其执行结果与本人源码、必要夹具及图检。

本轮正式授权为阵容专属品牌与紧凑主卡、开放式单柜、450ms 玻璃组队任务和最终保存；保留其他页面、600ms 导航、既有档案与存储协议。预览中的“仅内存完成”不作为正式创建的保存语义。

## 审查合同

- 创建接收完整成员的调用时快照，最后一次完整写盘；读锁 / 写失败不生成空档、不先改变成功状态，保留输入可重试，重复提交不得多建档案。
- 编辑保留原 update revision / 来源解除协议；旧中性球队与不完整档案仍可显式保存，新建才要求完整体型；3 / 4 切换保留成员草稿。
- 原生 dialog 与 workspace 通用弹窗处理分开；450ms 打开 / 反向关闭、焦点与背景隔离、关闭确认、快速重开、closing guard、Android 返回与嵌套全文顺序正确。
- WebView96 的隔离不只依赖 inert；单柜保留左拖下一位、右拖返回、取消与隐式捕获转移边界，不露相邻柜。

## 已核对的源码与独立夹具

已读任务、设计及集成后的 lineup-session / locker-room / locker-open.css、ui.js / sheet.js / sheet.css、app.js / workspace 与品牌布局。session.create 在进入串行队列前深拷贝；完整 players 经验证后与新建元数据合并，仅一次 commit，save 成功后才替换内存状态。同 ID 重提被拒绝。旧无 players 调用、update revision 与来源解除协议保留；repository 既有读锁 / 损坏原文备份路径未被绕过。

单柜去掉 endcaps，100% bay 与 -index×100% 位移匹配；保留左拖下一位、右拖返回、水平锁定、取消、子节点隐式捕获转移守卫、拖后点击抑制和非当前柜真实 disabled / tabindex。衣架使用 SVG evenodd 实际镂空；外观与静止边界留待主控真实几何 / 图检证据。

reviewer 使用内存最小 DOM 夹具运行真实 createLineupUI 与 sheet 模块，仅将 Vite 资产 URL 改为 mock。本机 Node 执行，不启动浏览器、不写实现或夹具文件。已通过：

- 四名队员逐个配置后最后按钮前 0 次 onAction；模拟写失败保留弹窗与完整成员，再重试 payload 深等、稳定 ID 不变，成功仅产生一份档案。
- 4→3→4 保留第四名输入；新建完整体型约束与可空能力选择可用。
- 旧中性 / 体型未完整档案仍能编辑；失败保留输入与原状态，成功后 revision=2，空体型与 nbaTeamId=null 保留。
- 关闭后旧 member / section 按钮已真实 disabled，强制派发旧点击也不会异常。
- 模拟点击先聚焦、删除焦点子节点回 body 的浏览器语义，创建 / 配置 / 更换球队三个入口关闭后均返回重建后的同 action 按钮。
- 保留创建 A 后放弃编辑 B，不串删 A；保留编辑 B 后放弃创建 A，不串删 B；两链均 0 次 onAction，无隐式保存。

该夹具不模拟真实 CSS 几何、原生 dialog 栈、键盘或平台存储；不把 mock onAction 当成实际磁盘写入证据。

## 发现与复验

| 编号 | 级别 | 位置 / 触发与影响 | 修复及复验 |
| --- | --- | --- | --- |
| R1 | P2 | ui.js 通用 button 回调没有 closing 守卫；closeWizard 先设 wizard=null，但旧 panel 在 450ms 关闭中仍可点击。干净旧档配置→关闭→立即点旧成员 tab，回调读取 wizard.kind 会抛 TypeError；其他旧选项也可能改保留草稿。 | 主控已加 button 的 sheet.closing 守卫，并在 sheet.close 即刻禁用面板 button / input / select / textarea。独立夹具已确认旧成员 / 分区禁用且强制派发点击安全；主控最终 rapidClose 报告 closing / disabled，旧按钮连点无异常。 |
| R2 | P2 | beginEdit / beginCreate 的 draw 先 root.replaceChildren，sheet.open 才捕获 activeElement；原入口已被移除，可能记录 body，关闭逻辑却把 connected body 当有效返回目标。配置关闭后丢失逻辑触发焦点，回退优先创建也不能准确对应原入口。 | 原独立夹具复现 activeTag=BODY / activeAction=null。主控增加重绘前 rememberTrigger 捕获 action / profileId / node，关闭后只取可见可聚焦的原节点或同逻辑重建入口。独立同夹具复验创建 / 配置 / 更换球队均返回相应入口，未再落到 body；主控实际先 focus 再 click 的三入口 Chrome 复验同样通过。 |
| R3 | P2，主控发现 | 新品牌头与父容器 align-items:center 挤压横屏推荐内容。 | 主控对推荐子页 stretch 并缩小横屏间距；reviewer 只读确认选择器限于 recommendations，主控最终六尺寸推荐及其他布局回归通过。 |
| R4 | P2，主控发现 | 开发后端原未支持 PNG，正式品牌图标请求失败。 | 主控补 image/png MIME 与真实 PNG magic HTTP 断言；reviewer 已只读核对 backend/app.mjs 和 tests/integration/server.test.mjs。不是 APK 资源缺失，也不将主控发现冒充独立发现。 |

workspace 对 lineup-owned dialog 不注册通用取消 / 遮罩关闭，closeTopDialog 将上层受管理的全文弹窗优先处理，再交 UI 关闭草稿；app 的 Escape / Android Back 顺序与此一致。sheet 对背景控件真实 disabled / tabindex 隔离，controls 的 busy 也包含 isModalOpen，避免后续重绘重开背景 select；WebView96 不只依赖 inert。focusable 已加入实际 rect 筛选，键盘隐藏的元素不充当首尾目标。以上为源码核对，原生返回与实际焦点栈须按对应环境证据记录。

## 主控证据与限制

主控最终报告：150 单元 + 3 HTTP，共 153 检查通过；第二轮完整 Chrome 回归通过，覆盖 20 战术、NBA、单柜真实触摸、推荐 / 来源、重启、导出、离线、六尺寸布局与主导航动效。reviewer 只读核对 `artifacts/qa/hc021-glass-flow.json`：四名成员 ID、失败磁盘保留、4→3→4、单份完整档案、Escape 确认 / 会话保留、rapidClose 和三入口焦点返回均记录通过。主控还核对前两步无档案写入、恢复写入后的最终连点，以及横屏推荐空间；执行者为主控，reviewer 未重复浏览器运行。

同份报告的打开采样为面板 top 506.95 → 202.72 → 135.03px，背景 blur 2.08 → 5.11 → 6px；前两次存在 duration=450ms 的活动 CSS 动画，终态清空。它证明实际位置与滤镜渐进，不代表持续帧率或所有设备耗时。

reviewer 亲看最终 `lineup-configure-phone.png`、`hc021-save-failure.png`、`manager-roster-3v3-phone.png`、`manager-roster-4v4-360-640.png` 与 `manager-roster-4v4-844-390.png`：品牌区与卡内标题分工清楚；静止仅一柜，镂空衣架 / 挂钩、球衣和暖灯可辨；手机成员摘要横条、字段 / 选项、失败提示、保存及玻璃导航均保留。实际文字与按钮可达性采用主控几何证据，不以静态图替代。

## APK 与设备

执行者为主控：android:build 成功，1.13.0 / code15，v2 签名通过，28 份 APK 网页资源逐个与 dist SHA-256 相同，无 server.url。APK SHA-256：`ec132ec22f5aed18ff6dc1730f203c73fca1f728bbc7545f808fc40fdca4b16a`。指定新机 ef473680 覆盖安装 Success，版本确认，COLD 启动耗时 706ms；不将该冷启动耗时解释为动画帧率。

reviewer 只读核对 `artifacts/qa/hc021-device-before.json` / `hc021-device-after.json`：两次实际均为 0 档案，SHA-256 同为 `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`，after 为 1.13.0 / code15、foregroundVerified / lineupsUnchanged 均 true。不是沿用历史的一份档案，也不声称验证了本轮新增档案保存。

`artifacts/qa/hc021-native-sheet.json` 已只读核对：实际 M2101K9C Android12 WebView96.0.4664.104，品牌图片 naturalWidth=256；DOM 程序操作到第三任务，4 名成员 ready、保存按钮启用、controlsFit=true、背景 blur=6px。主控记录嵌套全文先关闭、草稿保留，放弃后关闭 / 焦点 / 导航恢复；最终保存始终未点击，档案哈希不变。中途 top=338.68 / blur=4.05 与终态不同，但不据离散采样给出设备 FPS 结论。

reviewer 亲看真实 `hc021-native-step3.png` 与 `device-1.13.0-new-phone.png`：前者为四人草稿第三任务，完整按钮与系统栏可见；后者为实际 0 档案品牌 / 空柜 / 固定导航页。它们是主控采集的设备截图，不是 reviewer 亲自操作设备或浏览器模拟；草稿示例未被保存成虚假档案。

reviewer 未运行 Chrome、adb、APK 构建或设备功能；本轮未验收 WebView96 的物理触摸、系统输入法、原生返回、旋转和分享。程序 Escape 不替代原生 Back，DOM 配置未保存不替代原生最终保存成功 / 失败验证。代码、浏览器、APK / 安装与完整设备验收分开记录。
