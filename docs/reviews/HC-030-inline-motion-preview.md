# HC-030 卡内循环动画预览独立审查

日期：2026-10-25。状态：预览范围审查通过，无未修 P1 / P2。任务：[HC-030](../tasks/HC-030-inline-motion-preview.md)。设计：[纵向叠卡](../design/stacked-library.md)。

## 范围

只审 artifacts/design/inline-motion-preview 的独立 HTML / 经典脚本 / CSS、真实帧动画与图片。生产 1.17.0、库组件、存储、APK 和设备保持；reviewer 仅写本文件与审查索引对应行，未运行 Chrome、adb 或构建。源码 / 独立内存夹具 / 图检与主控实际浏览器分别记录。

## 独立源码与数据

已只读检查 preview.js、CSS、build-data、index / overview 及相关真实引擎接口。build-data 从正式模板导出完整 frames，实际 engine / appearance 以各自闭包链接，仅写预览目录。reviewer 在 VM 加载 catalog.js，将全部 26 套共 155 帧与正式 template.build().frames JSON 逐项比较，一致。

采样使用真实 interpolateBoards / ballPosition，保留每段前 18% 停顿与后续 smoothstep，绘制当前 from.paths、实际球员及自由球位；不根据中间 holderId 为空把球重新吸附到原持球人。箭头 / 掩护标记随当前路线更新，防守模板仍以蓝方为焦点。没有 CSS 假跑位、录制视频、Storage 或远程请求替代。

状态机每段 2400ms，最后一帧进入独立 1000ms hold；暂停不清 position / hold，resume 重置时间锚。rAF 单句柄与 runGeneration 防止取消后的旧回调覆盖新任务；重复 resume 不再排队。收回 / 换卡 / 切组重置并取消旧任务，重新展开从头；resize 只 layout，后台 visibility / pagehide 暂停、保持位置，回前台仍可手动继续且不追赶后台时间。整块球场是真实 button，隐藏时 disabled / tab-1；当前角标和 aria-label 提供暂停 / 继续状态，CTA 只暂停并显示预览说明。

## 独立时间与生命周期夹具

reviewer 用内存 DOM / VM 加载真实 catalog / engine / preview.js，以可控 rAF 时钟验证：

- 选卡只一条 rAF，重复 resume 仍为一条；give-go 从起点推进 2400ms 得到总三段的 1/3 进度。
- 中途 pause 后推进时钟状态不变，resume 从原位置继续，没有计入暂停时间。
- seek(1) 暂停定格末帧，resume 后累计 hold=400ms；暂停 5000ms 后仍剩 600ms，续播再满 600ms 才 cycle+1 / 回到起点，不重新等待完整一秒。
- 手动调用已取消的旧回调不能覆盖新卡或制造额外 rAF；resize 保位置，进入短屏 overlay 不重播。
- hidden 后 playing=false / rAF=0，隐藏时 resume 无效；返回后手动继续第一帧不跳跃；collapse / 切人数 / 攻防后 rAF=0，重新展开进度为零。

夹具不是浏览器时序 / CSS / 磁盘或设备性能证据，未声称所有二十六套自然运行完整一轮。

## 主控最终浏览器报告

reviewer 已只读核对最终冻结后 verification.json（主控第二轮，非首轮）：25 条四尺寸双人数默认 / 播放 / 暂停及相关状态，全部列出控件完整且中心命中、无整页溢出，Storage 调用为空；errors / remote 为空。78 条样本为 26 套各 progress=0/.5/1 的实际 SVG 球员与球位对正式引擎比对，不将三点抽样称为全段密采样或二十六套完整轮播。

主控让 give-go 自然运行三段约 7.2s 到末帧，holdElapsed≈400.1ms 时暂停，剩≈599.9ms 冻结 300ms；继续补足累计 1000ms 才 cycle=1。另真实新标签页使原文档 hidden，确认暂停 / rAF=0 / 进度冻结；快速操作仅当前一条 rAF、收回 / 切组为零，resize 保暂停位置，减少动效下球场可操作、CTA 仅预览 toast。执行者为主控，reviewer 未重复 Chrome。

报告 productionVersion=1.17.0、productionHashesUnchanged=6；没有生产写入、安装或设备更新。主控最终第二轮退出 0，旧首轮通过不替代最终角标 / 球属性 / 焦点版本结果。

## 独立图检与限制

reviewer 亲看最终 overview.png 和 360x640-paused.png：总览默认九标题 / 3v3 循环 / 4v4 暂停三框完整，角标位于球场右上且不拦截点击，当前路线 / 球员 / 球在场内；短屏当前卡带独立收回、完整球场与“已暂停”角标、进入训练场 CTA 和导航，没有明显裁切 / 遮挡。390 紧凑预览保其余标题；360 overlay 需收回才返回全部标题，不混称展开时九标题同时可见。

当前无可复现 P1 / P2。静态图不证明动态过程或 FPS；时间证据来自独立可控夹具与主控自然播放 / 实际 hidden 检查。后台后保持暂停、由用户继续；减少动效关闭卡位过渡，显式预览动画仍可暂停。未验手机物理手指、原生返回、旋转或正式库来源 / 存储联动，本轮仅预览，不为效果图重跑全应用或更新 APK。
