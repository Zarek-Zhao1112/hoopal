# HC-017 · 批准的库里卡通 App 图标

- 日期：2026-10-23；状态：`completed`（本次图标接入、安装与真实桌面显示已验；旧业务设备待办不变）。
- 授权：用户批准imagegen生成的极简Q版库里头像「可以就这个吧」，替换正式App图标并按既有偏好更新指定新手机ef473680。
- 目标：保持批准图的人脸/卷发/胡须/微笑/三色构图；接Android传统/圆形/自适应图标与启动图标，检查不同mask和小尺寸。不重新生成角色、不改业务界面配色、战术或档案。
- 数据：不改存储键、包名、签名、来源或阵容协议，无迁移。覆盖安装保留数据。
- 设计：[图标适配](../design/app-icon.md)；母版与原提示词：[资产说明](../../resources/app-icon/README.md)。
- 设计/来源：原图由内置imagegen生成，用户批准文件exec-4bb5497e-2b9c-4f16-8800-d431ec0c5c52.png；复制到resources/app-icon/curry-approved.png作为项目母版，不只引用Codex生成目录。前景按108dp技术画布及中间72dp原图布局，核心五官位于安全区，外围肩部允许随mask裁切。参考[Android官方自适应图标](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive)。

## 分工

| 负责人 | 独占范围 | 工作 |
| --- | --- | --- |
| ui | scripts/generate-app-icons.ps1；五个mipmap密度目录内ic_launcher.png/ic_launcher_round.png/ic_launcher_foreground.png；artifacts/design/app-icon/预览 | 从批准母版确定性缩放导出，不改变人物；生成圆形/圆角/小尺寸接触表并验证尺寸/alpha |
| 主控 | 母版/设计记录、XML/色值与启动引用、版本/构建/设备 | 原始像素保留、Android资源选择、避免图标背景改到页面status/nav色，安装和阵容哈希保护 |
| interaction_design | docs/reviews/HC-017-curry-app-icon.md | 独立检查资源分辨率/优先级/XML与mask图检、APK与设备证据边界 |

传统PNG尺寸48/72/96/144/192，圆形同尺寸真实alpha；前景PNG108/162/216/324/432，中央2/3尺寸放完整批准图、外圈延伸背景。自适应icon/round共用新前景；API24/25不能仍命中旧anydpi向量。页面状态栏/导航栏保持原浅背景；启动图标与新launcher一致。只做格式缩放/平台留白，生成器不进行创意改绘。

## 验收

- [x] 母版哈希与批准图一致，传统/圆形/自适应五密度尺寸正确、小尺寸五官可读、mask不切眼睛嘴巴。
- [x] XML资源选择、启动图标与状态栏兼容；独立审查，APK版本/签名/资源打包验证。
- [x] 指定新机覆盖安装冷启、现有阵容文件字节保持；安装/资源/离线mask图检和真实launcher显示分别记录。

## 交付与验证

项目母版保留批准原图1254×1254，SHA256 `92f00107b9a45174dc425f56306eebea68dda326af70bd6f5c6138f8815a0bb3`。生成器从母版做确定性缩放，15张Android PNG和256px网页图标经两次生成hash相同；圆形边角真实alpha，前景中心72/108原图、外围#496B83。实际图检圆形/圆角及32/48px五官清楚。`artifacts/design/app-icon/contact-sheet.png`仅资源模拟，`validation.json`为生成检查记录。

旧anydpi篮球向量入口删除，26+ adaptive引用新mipmap前景，24/25选择密度PNG；启动icon指向新launcher。icon背景与status/nav/启动背景独立，原页面浅蓝灰保持。正式JS/CSS业务文件未改，构建后JS/CSS资源名和HC-016一致；不重复运行上一版完整业务回归，本轮3项HTTP检查、Vite/Gradle构建与图标专项验证通过。

1.12.0/code14 APK v2签名通过，28个网页资源逐文件hash与dist一致，15个编译PNG与源PNG解码后逐像素完全相同，无server.url；aapt核对foreground资源ID映射到mipmap/ic_launcher_foreground，icon背景和window背景分离。APK `artifacts/apk/halfcourt-debug.apk`，SHA256 `4857610ab4fb3ed7e75ba70cefedb5a0bd5084622cd93c7ea2721121e492aa8b`；`artifacts/qa/hc017-apk-assets.json`、`verify-hc017-apk.ps1`为证据。独立资源/代码/图检无P1/P2，见[审查记录](../reviews/HC-017-curry-app-icon.md)。

重新核对新机ef473680后覆盖安装Success，冷启动Status:ok/COLD，版本核对正确。本次升级前实读0份阵容（不沿用历史1份的数量），档案文件存在且前/后hash均为 `dd42b596eba63db184dd3e4e60ff2c52b48a712743f538d6e668d2eab397e253`，未创建/恢复/删除队员。`hc017-device-before.json` / `hc017-device-after.json`记录这次基线。

真实系统详情页通过本应用名称与系统前台校验，截图确认新头像及1.12.0；报告 `hc017-installed-icon.json`、`hc017-installed-app-details.png`。第一次仅用dumpsys intent URI校验时保护退出，MIUI不保留该字段；后续只读UI名称验证通过，未改变系统设置或模拟触摸。

真实MIUI启动器com.miui.home当前主页找到「半场战术板」，仅保存本应用图标与名称小块 `hc017-actual-launcher-tile.png`，主控亲看为批准头像；`hc017-launcher-check.json`记录visible=true。未滑动、重排或清缓存，未保存其余桌面内容，检查后返回应用。没有把离线mask图冒充真机，未声称录制启动动画或验证全部OEM。完整业务操作仍按原任务待办，本图标任务验收完成。
