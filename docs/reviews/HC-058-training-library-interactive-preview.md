# HC-058 · 训练场战术库与二级标题预览审查

日期2026-11-02。审查者未实现原型/测试，只读检查frontend/previews/training-library及实际浏览器，单独维护本记录。

## 范围与当前状态

依据[HC-058合同](../tasks/HC-058-training-library-interactive-preview.md)和[HC-057静态候选](../tasks/HC-057-training-library-header-concept.md)。仅独立本地网页、内存示例数据，正式1.28、真实球队/存储、APK和手机不在本轮修改范围。

已对独立页面及其只读依赖做源码检查，使用自有临时HTTP服务/Chrome进行验证，没有改动原型实现、正式源码或主控QA。最终没有未修复的可复现P1/P2问题。

- 原型与只读依赖不能触及Storage/IndexedDB/Capacitor或真实账号数据；正式206份文件SHA需与主控基线逐项相同。
- 主训练名称为静态标题、底栏只有三项；战术库通过训练场按钮/更衣室快捷入口打开同一玻璃面板。
- 打开库暂停主训练且保存位置，浏览/收回/切体型不能更换主Play；只有明确选用才重置新战术进度。
- 每次展开真实卡内预览需停旧RAF；关闭/离页/后台不残留动画，隐藏期间不catch-up。
- 库玻璃浮起/背景blur需要自然中间帧，closing阶段仍隔离背景；Tab、Escape、快速连续意图与焦点返回均需验证。
- 体型/球队管理的标题需位于主卡外并保持顶部留白；3/4人数和纯体型描述不能混成位置/能力判断。
- 短屏/横屏表单与面板要以实际中心hit验证，矩形在视口内不足以证明可点；长列表仅内部滚动。

## 独立浏览器证据

运行`artifacts/qa/hc058/independent-review.mjs`，结果见[独立16组记录](../../artifacts/qa/hc058/independent-review-results.json)。16组实际浏览器检查通过：

- 三项底栏、单一战术库按钮、静态名称与真实球场SVG；主训练产生非零小数位置后，开库暂停、关闭保留精确位置/战术并回焦按钮。
- 自然opening中间帧有非最终transform和背景blur；closing仍保持dialog打开、主内容/nav inert，重复Escape不产生残留层；Tab持续隔离在面板内。
- 展开卡片真实位置变化且RAF=1；切卡后旧节点playing=false、RAF=0；浏览不换主战术，明确选用才加载新战术并归零、保持暂停。关闭后previews为空。
- 体型Back取消保原偏好/主进度；应用只更新示例内存；3v3为3项、4v4为4项；球队管理与体型标题都在主卡外，上方留白。切4人队后的所有可见卡片均为4v4。
- 390×844、360×640、360×400、844×390、1024×768中，选用/体型应用按钮中心均以真实鼠标命中执行，主页面无横纵向溢出；长内容仅内部滚动。已图检自有390×844和360×400截图。
- reduced-motion开合、206份正式文件逐项SHA不变、Storage/IndexedDB/fetch/XHR/Beacon调用拦截记录为空，外部请求/浏览器运行错误为空。

[补充记录](../../artifacts/qa/hc058/independent-review-loop-results.json)另含3项通过：真实4帧卡片等待完整周期后cycle=1且RAF=1；26套模板均真实build，14种人数/体型/攻防目录组合不混人数或攻防；再次核对206份正式文件与原型三文件SHA。自有QA Chrome/HTTP服务与临时profile均已清理，保留用户预览服务由主控维护。

实际独立浏览器测量时原型SHA256：index.html=`bde1d76e33e84b5ec32f7b69efe1b5215db085787c9df52be2c80ad6fb87eb7c`；preview.css=`c4708a5aad8ffd099827f7f97ace1a8c65311b05bbe8916156d8201afa5e22d6`；preview.js=`7501d6083f94747744ea058f9dcf645894ca9ed5b57def2df86cc99e89a5aad0`。

最终收尾时主控仅去掉preview.js文件末尾一个额外CRLF，交付SHA为`eb7ec9b62c4331be8c5e8bbc9fffa06156858e68b9527de5add3284b7763636b`。审查者重新读取交付文件，给其追加一个CRLF后算出的SHA精确等于上面的浏览器测量SHA，确认只有该空行差异；没有重跑浏览器，也不把两种SHA混称同一实测版本。

## 启动与可复用QA脚本收尾审查

只读检查新增`scripts/preview-training-library.mjs`与`scripts/qa/check-training-library-preview.mjs`，没有阻塞问题。启动脚本从自身位置定位仓库、只监听127.0.0.1、端口占用回退动态端口、记录限定artifacts内，并仅关闭自己的HTTP连接；没有新托管或正式数据写入。可复用QA脚本以独立Chrome/动态HTTP服务运行原16组断言，建立当次正式文件SHA快照，结果分目录写入artifacts，finally关闭自有session，有失败时置非零退出码；合成pagehide与真实后台证据名称明确分开。

同时只读核对主控已运行的[可复用QA结果](../../artifacts/qa/runs/hc058-2026-11-02T09-50-52-752Z/results.json)：16项通过，浏览器错误与外部请求为空。这是主控运行证据，不计为审查者又一次独立浏览器执行。本轮收尾未重启浏览器或重复测试。

## 问题与复验

静态检查曾指出创建表单人数不一致：`openForm('create')`沿用当前4v4，而select未设置selected时显示3v3，可能造成显示与创建人数不同。实现agent在浏览器检查前补上`option.selected = mode === form.mode`；没有旧版浏览器复现证据。独立Chrome切到4v4后创建，实际显示4v4且新队保存4v4，修后检查通过。位置：`frontend/previews/training-library/preview.js`的`renderForm()`。

补充记录中首次“actual other-tab visibility”项目未满足测试前提：headless Chrome在focus emulation开启时，`Target.activateTarget`切到新tab后，原页`document.hidden`仍是false。这是验证方法未触发真实隐藏，不是应用缺陷，也不计为后台通过，原失败证据保留。首轮合成pagehide另记，不能替代真实visibility。

随后根据既有项目QA方法，另跑独立的`independent-review-hidden.mjs`：切tab前关闭focus emulation，确实观察到`document.hidden=true`。见[真实隐藏补验](../../artifacts/qa/hc058/independent-review-hidden-results.json)，两项通过：卡片从playing=true变为false/RAF0，主训练从playing=true/非零位置变为暂停；隐藏1.5秒及恢复后0.25秒位置均不变化、没有追赶跳动。finally关自有新tab、恢复主tab/focus emulation，关闭自有Chrome/HTTP/profile；无浏览器错误或外部请求。手机系统后台、物理手势和原生Back仍未实测。

## 结论

独立本地预览可交用户体验，独立16组+补充3组+真实隐藏2组通过，已验证范围没有未修P1/P2；另保留首次hidden前提失败，不以最终通过抹去。本记录不代表正式App改动、设备安装、真实保存、账号/云功能或人工手势已完成。
