# HC-036 · 更衣室玻璃主卡统一尺寸审查

- 日期：2026-10-26；审查者：interaction_design，未参与实现。
- 当前结论：代码 / 96组几何 / 图检及相关定向浏览器回归通过，1.21.0已覆盖安装并完成原生四页核对，无未修 P1 / P2；物理设备操作仍 `awaiting_device`。
- 范围：[合同](../tasks/HC-036-locker-card-frame.md)内卡框CSS及版本调整；不以本轮布局修复重验未改动的26套长时动画。

## 独立检查

只读检查 `frontend/src/lineups/styles.css` 末尾HC-036段、`frontend/styles/app.css` 更衣室断点，并对照四页现有布局规则。高优先级限定更衣室空态 / profile卡，清除旧max-width / max-height及减高残留，按workspace满宽高伸展、最大1040px；只改外框，不放大柜体自身上限。推荐子页通过 `:not([data-subview=recommendations])` 排除；读锁、存储状态及业务操作实现没有变化。600px横屏品牌行与其他页对齐，宽屏workspace的30px边距和品牌内容起点一致。

独立读取[修前报告](../../artifacts/qa/hc036-before-frames.json)和[修后报告](../../artifacts/qa/hc036-after-frames.json)，按状态及视口重新分组计算四页x / y / width / height：

- 各96记录 = 八尺寸 × 空态 / 三人 / 四人 × 四页，形成24组对照。修前最大差280px，18组差值大于1px；修后24组的四维最大差全部0px。
- 八尺寸为360×640、390×844、393×819、640×360、844×390、1024×768、1280×800、1440×900。修后无整页溢出或控件fit / hit失败，品牌显示仅更衣室；报告 `storageAndPlayUnchanged=true`。

亲看最终[390空态](../../artifacts/qa/hc036-after-390x844-empty-lineups.png)、[640横屏四人](../../artifacts/qa/hc036-after-640x360-4v4-lineups.png)、[1024三人](../../artifacts/qa/hc036-after-1024x768-3v3-lineups.png)。玻璃卡填满统一区域，单柜仍保自身比例，成员、身份详情、推荐 / 配置与导航完整可见；没有依赖裁切隐藏缺失操作。此为实际正式截图，未用旧预览代替。

## 定向回归与后续证据

当前无需实现修复。主控最终源码205检查通过，定向session92640 exit0，已核对[回归日志](../../artifacts/qa/hc036-regression.log)：原 `runPageLayoutFlow` / `runLineupFlow` / `runPageMotionFlow` 完整通过，保留主卡 / 库展开、真实创建编辑与写失败重试 / 推荐 / 档案及柜位touch、短屏输入 / 旧中性、四页转场rapid / cancel / reduced-motion断言。本轮是CSS外框调整，按合同执行相关回归，没有重跑全部26套长时动画，不将未执行项目写成通过。

代码及相关浏览器阶段已收口，无未修问题。APK与原生证据如下，执行者与独立审查范围分别记录。

## APK与原生设备证据

- 主控构建1.21.0 / code23成功（43秒），[资源报告](../../artifacts/qa/hc036-apk-assets.json)记录28项dist资源逐哈希一致、无server.url，APK SHA256 `db1eff86f616307677d702b5f51774d7925b1a12a81832e108fe43fef7b14d50`。[签名文本](../../artifacts/qa/hc036-apk-signature.txt)确认v2有效，原证书SHA256 `e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26`。
- 指定手机ef473680正常覆盖安装Success，主控报告COLD启动746ms。[安装前](../../artifacts/qa/hc036-device-before.json) / [安装后](../../artifacts/qa/hc036-device-after.json)实读均零档案；档案SHA256 `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`相同，内置选择采用本轮实际值 `7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c`，前后相同。未沿用HC-035的历史选择哈希，真实原文已由主控备份。
- 读取[原生四页报告](../../artifacts/qa/hc036-native-frames.json)：实际WebView96 / Android12 / M2101K9C / 393×819程序导航；独立重算四页box最大差0px，均x=18、y=116、宽357.0909、高620.2728px，品牌仅更衣室，控件fit / hit、无溢出 / errors，主Play及档案 / 选择双文件保持。没有创建、编辑或保存测试档案。
- 独立亲看[设备更衣室图](../../artifacts/qa/hc036-native-lineups.png)，真实空柜、品牌、换球队 / 创建入口与四栏完整，卡框到达统一底线。设备导航 / 测量由主控执行，审查者只读报告和图；主控清理本轮专属动态转发，保留原9333 / 19223连接。

审查者未运行Chrome、ADB或构建，只核源码、报告并图检。原生程序检查不能代替手机物理手势、输入法、系统返回、旋转或真实CRUD，这些项目仍待人工设备验收，任务保持 `awaiting_device`。
