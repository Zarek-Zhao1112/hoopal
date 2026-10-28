# HC-046 ·「我的」页正式接入独立审查

- 日期：2026-10-28；审查者：interaction_design，未参与实现。
- 当前结论：源码、独立多面板夹具、最终完整浏览器、APK与真实WebView程序证据通过，无未修P1 / P2；物理操作与真实CRUD仍awaiting_device。账号 / 备份服务本轮尚未开放。
- 范围：[任务](../tasks/HC-046-account-center-release.md) / [设计](../design/account-center.md)，正式目标1.24.0 / code29。仅维护本审查与索引，产品实现只读。

## 真实数据与账号语义

正式archives路由保持，导航显示「我的」。档案来自model.state.profiles，原ID / data-action、三卡分页 / 二十档上限、当前标记、独立选择与管理按钮继续使用。select成功才navigate，失败留原页面；当前队重开不重写来源，管理非当前队不先选择。读锁仍优先展示读取错误，错误不被账号卡或假空态遮盖，创建 / 配置继续使用真实draftStore与perform。

account-cards及account-sheet只有明确的账号 / 备份「尚未开放」说明，没有示例用户 / 球队、登录态、密码表单或服务调用。设置 / 关于同为本机使用说明，未声称登录、上传或恢复成功。组件不访问存储 / 网络 / 原生，也不调用select / clearContext / 保存。独立检查storage / platform / shared / data无改动，执行行为基线26套完整帧 / 元信息、18规则、10推荐 / 人员映射及6身份源检查全部保持。

## 面板生命周期与独立夹具

共用createLineupSheet只增加默认兼容的id / labelledBy参数；wizard仍为lineup-wizard-dialog / lineup-wizard-title，账号使用lineup-account-dialog / lineup-account-title。账号面板标记owned，纳入UI isModalOpen / handleBack / setView / button guard及每次draw的隔离刷新；app既有onModalChange会暂停播放、取消转场并更新背景锁。工作台先处理managed文本dialog，再交owned面板处理，未让工作台直接关掉草稿向导。

两实例不以互相恢复disabled来支持重叠，而由UI互斥：账号open拒绝wizard / 菜单 / pending / externalBusy，普通UI button在账号opening / open / closing均拒绝操作。closing仍算isOpen，关闭动画结束后才恢复背景状态与触发焦点；默认wizard行为不变。

审查者在无浏览器的内存DOM中实际import两组件，并提取真实UI button guard复验：

- 默认与账号的ID / aria-labelledby各自正确，账号内容没有input / form / textarea。
- 账号打开后，强制分发旧背景配置按钮不能打开wizard；closing仍锁，账号也不能重开。
- wizard打开或closing、以及业务busy时均拒绝打开账号；先关闭完成后可正常打开。
- 关闭恢复原disabled / tabindex与触发焦点，原本disabled控件没有被误启用，最终没有遗留打开的dialog。

此夹具核实际状态 / guard，几何、原生Tab / Escape及450ms视觉仍需正式浏览器补证，不能当作真实手机操作。

## 正式完整浏览器与亲看图片

读取[最终run](../../artifacts/qa/runs/1.24.0-1793174647181/run.json)：1.24.0正式dist一次完整执行14组全部通过、errors / remoteRequests为空、tempCleaned=true。包含原13组与新增account-center；26战术、库预览、来源 / 档案故障、推荐 / 保存 / 断网 / 导出、布局 / 建队 / 转盘 / 启动 / 动效继续覆盖。

独立核对[账号专项](../../artifacts/qa/runs/1.24.0-1793174647181/hc046-account-center.json)：空 / 3v3 / 4v4 / 七档案在六尺寸（合同五尺寸另加835×340）分页共36布局，名称 / ID / 当前标记对应实际存入仓库的测试档案；三卡 / 三卡 / 一卡全可达。独立重算36条均aboveNav、无overflow、没有表单、全部已记录控件fit / hit。测试资料只在独立浏览器profile使用，不是用户手机档案，也不是生产代码带入HC-045示例。

20组说明面板覆盖账号 / 备份 / 本机使用 / 关于、关闭 / 本地继续 / Escape / 原生dialog cancel程序事件 / 遮罩 / reduced。默认wizard与account ID唯一，仅一个owned弹层；背景强制DOM点击也不能切页或打开向导，Tab / 反向Tab和触发复焦、closing继续禁导航通过。活动CSS动画duration=450并有早 / 中 / 末真实位置变化；该报告为分时采样，未声称逐rAF全段或FPS测量。Storage写入 / 删除 / 清空和fetch / XHR审计为空，主Play / 来源 / 双键原文保持；保留编辑草稿经说明 / 切页后重开仍在，取消删除 / 创建不保存，真实选择写失败保持原状态，恢复重试才切队并清来源。

专项明确nativeBridgeBackNotSimulated=true：浏览器验证的是dialog cancel / Escape与源代码Back分发，不是假造Capacitor Android Back通过。

亲看正式[空态](../../artifacts/qa/runs/1.24.0-1793174647181/hc046-empty-390-844-my.png)、[七档案首屏](../../artifacts/qa/runs/1.24.0-1793174647181/hc046-multi-390-844-my.png)与[360×400账号说明](../../artifacts/qa/runs/1.24.0-1793174647181/hc046-multi-360-400-account.png)：我的 / 我的球队 / 三卡分页与四栏完整，账号 / 备份明确尚未开放；短屏面板标题、关闭、说明和继续本地使用可见，无凭据字段。这些为正式页面，不引用原型图替代。

## APK、安装与原生程序终审

主控28秒Android构建；读取[APK报告](../../artifacts/qa/hc046/apk/apk.json)：1.24.0 / code29、球搭 / com.halfcourt.tactics，30网页资源同dist、15图标同1.23.0，无server.url；v2有效且证书保持e13d5e107d797d5233b8bf18f24f498d3edccaf8db6e15fcde791af5d2465e26。审查者另读实际版本APK独立重算SHA256，确为65eea001c8973f82a5443ed3c5474c116a9ba51ac404a7626f95ecfbab483b05。

指定ef473680 / M2101K9C覆盖安装Success，[启动](../../artifacts/qa/hc046/device-launch.txt)明确COLD754ms / Wait760ms。[before](../../artifacts/qa/hc046/device-before.json)为1.23.0 / code28，[after](../../artifacts/qa/hc046/device-after.json)为1.24.0 / code29且前台已核，两者实际0队。档案SHA256均dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253，选择SHA256均7ad33bfb7b3680e01933afc54e22624f8e7549cf05af50543556b42115417e7c。preflight记录无打开向导 / 当前渲染草稿指示 / 忙态，并明确不证明全部关闭内存草稿均不存在。

读取[原生报告](../../artifacts/qa/hc046/native-account.json)：实际已安装WebView96、竖屏约393×819，我的页与四种说明共5组metrics。独立重算均无overflow、inputs=0、已记录控件全部fit / hit。连续trace724条，opening148 / closing135，独立分出四次开合；面板由约868.27移至329.27并反向收回，背景filter同步变化。此为原生实际绘制样本，不是FPS或物理手势认证。主控严格检查导航禁用 / 恢复、说明尚未开放、mainPlay及双文件hash保持，errors为空，未保存测试球队。

亲看[手机我的页](../../artifacts/qa/hc046/native-my-page.png)与[手机账号说明](../../artifacts/qa/hc046/native-account.png)：实际0队空态、账号尚未开放、创建 / 工具及四栏完整，玻璃说明标题、关闭、本地继续和不可用解释可见；没有原型示例用户 / 球队或密码字段。这两张是手机程序检查期间的真实界面，与浏览器测试fixture图片分开。主控已清理本轮动态转发 / 探针并恢复原视图。

## 验证边界

主控冻结源npm test225、完整Chrome14组、APK构建 / 签名 / 资源、覆盖安装及原生程序结果通过；独立源码 / 基线 / 多面板夹具、报告与实帧重算、实际APK哈希及正式图检无未修P1 / P2。审查者未执行Chrome、ADB或构建，不以HC-045预览替代正式验收。手机本轮未实际CRUD、物理Back、IME / 旋转 / 分享验收，任务仍awaiting_device；真实账号认证、云备份 / 换机恢复需要后续服务，不在本次通过结论中。
