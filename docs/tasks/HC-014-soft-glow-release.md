# HC-014 · 600ms 柔光扩散正式接入

- 日期：2026-10-23；状态：`awaiting_device`（代码、审查、自动验证、安装与WebView程序切页完成；完整物理手指验收待做）。
- 授权：用户确认HC-013的C柔光600ms预览「可以，就这样吧」，正式接入并按既有偏好更新指定新手机。
- 设计：[页面动效](../design/page-motion.md)；批准产物 `artifacts/design/soft-glow-preview/index.html` / `soft-glow-600ms.gif`。
- 基线1.9.0/code11，保留现有阵容 / NBA / 左拖下一位与所有存储协议。

## 约定与分工

| 负责人 | 独占写入范围 | 工作 |
| --- | --- | --- |
| engine | frontend/src/workspace/soft-glow.js、tests/unit/soft-glow.test.mjs | 导出SOFT_GLOW_DURATION=600、SOFT_GLOW_FEATHER=43、sampleSoftGlow(p)，与批准预览同三段曲线 / 光晕 |
| ui | workspace/page-transition.js、page-transition.css | 使用新sampler / 羽化mask / 淡银白冰蓝光晕，保持导航z5 / 及时取消 / 降级与DOM契约 |
| 主控 | E2E、版本 / 任务 / 设计、构建 / 手机 | 集成、验证与数据保留 / 新机更新 |
| interaction_design | docs/reviews/HC-014-soft-glow-release.md | 独立只读审查、曲线和快照 / 光晕清理 / 命中 / 图检 |

sampler返回elapsedMs / radiusProgress / glowOpacity / stage(rise,expand,settle)。0–100ms半径.09u²；100–450ms Hermite(.09,.90,.63,.35)；450–600ms Hermite(.90,1,.15,0)。光晕首段smoothstep亮起、末段1-smoothstep淡去。实际半径覆盖最远角与羽化带。43px羽化按视口合理缩放。旧snapshot alpha为预览new-alpha的反向；光晕独立不可交互层、与snapshot同z4且在其后，导航z5在上；所有清理路径删除二者。新页面同步可用，存储不变。

## 验收

- [x] sampler与批准预览一致、边界连续 / 单调、端点光晕归零。
- [x] 600ms真实软边 / 光晕，Chrome快速点击 / 同页 / resize / pagehide / dialog / reduced-motion无残留；隐藏 / 不支持 / 异常等夹具验证，导航命中。
- [x] 六屏实际Chrome、原有战术 / NBA / 阵容 / 推荐 / 手势 / 离线 / 导出回归、独立审查。
- [x] APK签名 / 资源 / 版本，指定ef473680更新冷启、真实档案前后hash保留。
- [x] 真实WebView96程序切页、曲线与双层清理。
- [ ] 完整物理手指 / 旋转 / 返回 / 分享验收；程序点击不替代上述操作，未执行不得声称通过。

## 实现与验证结果

engine交付纯sampler与6项专项测试，ui交付反向宽羽化mask及独立银白冰蓝光晕。主控补充真实浏览器双层 / 曲线 / 命中 / 取消断言，普通截图等待过渡结束；未变更存储键、阵容、球衣或柜位方向。134单元与3HTTP共137项通过，Vite与Android构建通过。完整Chrome回归通过，六尺寸18次转场均正常完成；实际中间样本p=.5275/radius=.641979/glow=1，见 `artifacts/qa/hc014-soft-glow-phone-mid.png` 与 `hc014-motion-metrics.json`。

独立审查无未修P1/P2；reviewer直接对比批准HTML的10001点曲线零误差、30个实际paint夹具、11种双层取消/异常及中间帧图检，详见[审查记录](../reviews/HC-014-soft-glow-release.md)。桌面快照准备5.4–20.7ms；此数值不是帧率。

1.10.0/code12 APK v2签名通过，27个网页资源与dist逐个SHA256一致，无server.url。APK：`artifacts/apk/halfcourt-debug.apk`；SHA256：`49ea5d47d3c7914cfce77a4ddbe3a25394ed401df6a2f0bc8e744f2c00b17a8c`。

重新核对设备列表后只对指定新机ef473680覆盖安装，返回Success；冷启动Status:ok/COLD，版本正确。升级前后1份真实阵容字节hash均为 `c625afadf07cfc09ccccf552e3b5dff77e66ca072d53c4dc9c497166a9759758`，未写入测试档案。证据 `artifacts/qa/hc014-device-before.json` / `hc014-device-after.json` / `device-1.10.0-new-phone.png`。

实际Android12 / WebView96程序点击三页：600ms、羽化mask及光晕存在、中途曲线与正式sampler一致、导航命中、结束reason=complete且两层移除。731节点准备90.7/80.6/80.7ms；没有测量原生FPS，也未自动模拟物理手指。证据 `artifacts/qa/hc014-native-motion.json` / `hc014-native-settled.png`。CDP已关闭并移除本次forward；Chrome与临时服务由测试脚本清理。下一步为用户实际体验切页节奏及完整原生操作，既有设备待办保持。
