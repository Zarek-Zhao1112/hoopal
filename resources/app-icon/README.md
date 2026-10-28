# HALFCOURT · 批准的头像图标母版

用户于2026-10-23批准本目录 `curry-approved.png`。来源为内置 **image_gen**（非CLI），生成文件 `exec-4bb5497e-2b9c-4f16-8800-d431ec0c5c52.png`。本母版为原文件逐字节复制，没有重新绘制、抠图或改变人物。

SHA256：`92f00107b9a45174dc425f56306eebea68dda326af70bd6f5c6138f8815a0bb3`。

生成提示词原文：

> Use case: logo-brand. Create ONE polished square app-icon concept for HALFCOURT, an offline half-court basketball tactics app. Subject: a recognizable but extremely simplified chibi cartoon Stephen Curry, as a friendly confident little basketball-coach/game mascot. This is LOGO FIRST, CHARACTER SECOND: a compact iconic mark rather than a character illustration. Composition: an oversized rounded head and just a tiny shoulder silhouette peek diagonally into the square from the LOWER RIGHT corner; head fills about 80% of the canvas, generous clear space toward upper left, head silhouette and face readable even at very small icon size. Retain Curry's recognizable short tight-curly haircut, warm light-brown face, neatly trimmed moustache and small goatee, and a relaxed confident gentle smile. Hair is ONE chunky rounded scalloped silhouette, not individual curls; facial hair is a few clean joined rounded shapes. Face uses tiny dark oval eyes, a very minimal rounded nose, a simple smile, no intricate facial anatomy. No hands, no ball, no props. Palette strictly THREE primary colors total: solid muted deep slate blue background (#496B83), warm soft tan-cream skin (#E3B98E), and very dark ink navy hair/facial features/shoulder (#24394C). Do not add white eye highlights or white teeth as extra graphic colors. Friendly, substantial rounded geometry, smooth thick contours and economical negative space, no sharp corners or fine outlines. Style: premium minimal vector-like FLAT-first logo, with only barely perceptible soft tonal shading at the edge of the cheek and a tiny subtle inset feel, not a thick 3D render, not clay, not glossy plastic. A single finished icon artwork, flat front view, edge-to-edge solid background on a square canvas; all character elements composed for a rounded-square app mask. No wordmark, no letters, no number 30, no team emblem, no NBA logo, no gold/orange Warriors palette, no border, no presentation board, no phone mockup, no watermark. The final must look like an elegant memorable product logo compressed from a cute mascot.

## 技术导出

在仓库根目录运行 `pwsh -File scripts/generate-app-icons.ps1`。脚本使用Windows System.Drawing进行确定性格式缩放、圆形alpha和Android前景留白；这不是再次生成或编辑角色。输出Android五密度launcher/round/foreground及网页favicon，预览/元数据写 `artifacts/design/app-icon/`。前景108dp画布中间72dp放原图，核心五官检查落在官方66dp安全区内；外围肩部允许随mask裁切。

对应[设计](../../docs/design/app-icon.md)、[HC-017](../../docs/tasks/HC-017-curry-app-icon.md)。桌面OEM形状及缓存显示需要真机单独核对，资源模拟图不能替代实际launcher验收。
