# NBA 队徽来源

队徽从 [NBA 官方球队目录](https://www.nba.com/teams) 使用的 `cdn.nba.com/logos/nba/{nbaId}/primary/L/logo.svg` 获取，原始文件保存在 `frontend/assets/nba/`，构建时一起打包。运行和离线使用不访问 CDN。

`logo-sources.json` 记录获取时间、逐文件来源、字节数和 SHA-256；`node scripts/fetch-nba-assets.mjs` 是显式维护脚本，不属于构建或应用启动流程。脚本拒绝含脚本、事件处理器、外部图片 / 链接的 SVG。界面以 `img` 加载本地队徽，不把外部标记注入 DOM。

`data/nba-teams.js` 提供稳定球队代码、中文名称与代表性球衣风格。球衣采用自绘 SVG 版型、球队色和文字，不是当前赛季球衣的逐像素复刻，不包含球星姓名或现实阵容。
