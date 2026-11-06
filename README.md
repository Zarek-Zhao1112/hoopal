# 球搭 · HOOPAL

手机本地离线的半场3v3 / 4v4战术动画工具，同时支持电脑浏览器。原生JavaScript / SVG、Vite与Capacitor Android，无账号或业务服务器。

更衣室、训练场和「我的」右上角可在玻璃和暗色写实外观之间切换。暗色更衣室场景铺满主卡，外观选择保存于本机。见 [HC-067](docs/tasks/HC-067-appearance-release.md)。

玻璃更衣室已按确认的 A 版接入同构图的整卡写实场景，浅蓝雾面搭配暖色柜灯，球衣独立保持清晰。1.36.1 已保数据安装手机，网页核对与预览入口见 [HC-083](docs/tasks/HC-083-glass-locker-scene.md)。

目前提供26套内置战术（18进攻、8防守）、本地球队档案与按整体体型「挑选战术」。球队入口只显示对应人数，先选一大两小等体型，在训练场内的玻璃战术库浏览攻防配合；分类按队记忆。训练场支持步骤讲解、倍速、循环和导出；战术库展开单卡即可循环预览。手机竖屏一屏操作，横屏和平板扩大球场。

在更衣室或球队管理点「配置球员」，可在同一张球员卡里编辑昵称、号码和角色，建队时也可以一起填写。3v3 区分持球发起、掩护策应、空间拉开和得分终结；4v4 再分别保留掩护配合与接球策应。旧4v4空间角色继续兼容，允许重复或暂不设置。从更衣室挑选进攻战术后，球队可按本队号码演练，训练场支持临时交换站位。设计与交付记录见 [HC-065](docs/tasks/HC-065-combined-player-config-release.md)、[HC-076](docs/tasks/HC-076-team-role-secondary-3v3.md) 和 [HC-077](docs/tasks/HC-077-team-role-mapping-4v4.md)。

训练场木地板连续铺满整张卡片，标题、球场、步骤说明和底部胶囊叠在同一画面上，适配玻璃与写实。胶囊集中倍速、当前步骤、节点进度及播放/暂停，点击节点或拖动会同步说明和站位，播放自动循环。横屏将球场放左侧、说明与控制放右侧，设计与手机更新见 [HC-082](docs/tasks/HC-082-training-scene-release.md)。

底部为「更衣室 / 训练场 / 我的」三项。训练场标题旁的「战术库」打开450ms上浮玻璃面板，卡片默认收起、展开真实循环；明确「选用这套战术」才载入并归零暂停，取消保留原动画位置。「我的→球队管理」与体型页使用卡外标题及返回。接入与验收见[HC-059](docs/tasks/HC-059-training-library-release.md)。

训练场与我的使用统一的顶部与内容卡层级，手机高竖屏采用品牌栏，卡内显示训练场或我的球队标题。完整二级页显示自己的标题和返回，不叠加一级页名，见 [HC-071](docs/tasks/HC-071-workspace-player-release.md) 和 [HC-080](docs/tasks/HC-080-local-my-center-release.md)。

底部「我的」展示真实本机球队、当前队员和等宽管理 / 创建按钮，下方为本机使用与关于球搭。三个主页右上角使用纯图标外观按钮，支持玻璃与写实，选择保存在本机。设计与更新见 [HC-080](docs/tasks/HC-080-local-my-center-release.md)。

界面采用冰川蓝、银灰和室内木地板，包含NBA队徽/球衣选择、单人更衣柜、玻璃建队面板和底部柔光切页。球搭品牌开场共约2.4秒，可跳过；后台返回不重播。战术统一来自内置库，阵容档案独立保存在本机。

## 仓库与同步

GitHub：[Zarek-Zhao1112/hoopal](https://github.com/Zarek-Zhao1112/hoopal)，私有仓库，主分支为`main`，本地`origin`已绑定。后续开发完成并检查后，将本次源码和文档修改提交，再用`git push`同步；其他电脑继续开发前先用`git pull --ff-only`更新。

整理前源码保留在`baseline/pre-hc043`标签。APK、效果图和本机验收记录位于被忽略的`artifacts/`，工具/缓存、依赖及签名私钥也不进入源码仓库。建库与远程校验见[HC-044](docs/tasks/HC-044-github-sync.md)。

## 本地运行

需要Node.js 22.12+。首次安装依赖后，Windows可双击 start.cmd，或运行：

~~~sh
npm ci
npm start
~~~

电脑访问 http://localhost:4173 。手机网页预览使用启动窗口显示的局域网地址；安装后的APK独立运行，无需电脑服务。开发热更新运行 npm run dev。

训练场内战术库与二级标题的独立交互方案可运行：

~~~sh
node scripts/preview-training-library.mjs
~~~

打开终端打印的本地URL（默认127.0.0.1:4188）。预览含三底栏、玻璃战术库、真实循环动画、体型选择与球队管理，只使用内存示例；刷新即重置，不读写正式档案，也不进入APK。体验与验收见[HC-058](docs/tasks/HC-058-training-library-interactive-preview.md)。

玻璃与暗色写实双外观网页可运行 `node scripts/preview-appearance.mjs`，打开 [交互预览](http://127.0.0.1:4196/) 或 [静态效果图](http://127.0.0.1:4196/previews/appearance/concepts.html)。预览使用独立端口和内存示例队。详细范围见 [HC-066](docs/tasks/HC-066-appearance-web-preview.md)。

## 项目目录

~~~text
frontend/                 # 页面、交互与打包素材
  previews/               # 独立交互原型，不进入默认APK
  src/
    main.js               # 启动入口
    app.js                # 初始化、来源切换、保存和生命周期协调
    board/                # 共用SVG球场、棋子、路线与可见性
    training/             # 训练播放状态、帧调度与步骤进度
    lineups/
      views/              # 更衣室、档案和基本资料的绘制
      wizard/             # 建队/配置向导、草稿和成员切换
      components/         # 衣柜、球衣、队徽转盘、玻璃面板
    selection/            # 整体体型、同人数战术过滤、玻璃选单与真实预览
    workspace/            # 页面转场、战术库卡片和公共弹窗
    startup/              # 品牌开场、读取保护与跳过
    storage/              # 档案/战术进度持久化与来源协议
    platform/             # Android与浏览器能力适配
  styles/                 # 全局变量、基础控件和页面框架
shared/                   # 不依赖DOM/平台的校验、插值、体型分类与旧计划兼容
data/
  tactics/offense/        # 3v3/4v4进攻，一套一文件
  tactics/defense/        # 3v3/4v4防守，一套一文件
  recommendations/        # 已退役的旧推荐算法说明（历史文档）
  nba/                    # 球队素材来源资料
backend/                  # 电脑/局域网静态预览服务
android/                  # Android原生工程与打包配置
resources/                # 图标母版等原始资产
scripts/qa/               # 可复用检查、浏览器会话和清理工具
tests/                    # 单元、HTTP与完整浏览器流程
docs/                     # 架构、需求、任务、审查与使用说明
artifacts/
  apk/                    # 当前安装包与回退包，旧包归archive
  design/                 # 效果图和交互预览
  qa/                     # 必要验收证据；新回归按runs分目录
  temp/                   # 测试浏览器和下载临时文件，结束清理
.tools/                   # 本机Android SDK/Java/Gradle与缓存
dist/                     # 自动构建的网页资源，供预览与APK共用
~~~

模块接口与兼容入口见[架构说明](docs/architecture.md)。组件样式跟随组件，全局样式由 frontend/styles/app.css 汇总。data/templates.js维护稳定战术顺序，shared/templates.js生成独立可播放数据。

## 检查与打包

~~~sh
npm test                  # 构建、单元及HTTP检查
npm run test:browser      # 已构建资源的完整浏览器回归
npm run check:docs        # 文档本地链接检查
npm run clean:artifacts   # 仅预览下载残留清理清单
npm run android:build     # 构建并打包Android离线APK
~~~

清理脚本默认只列候选，显式传 -Apply 才删除限定的旧下载残留。保留.tools、已确认设计/原图和被引用验收资料；源码基线由本地Git管理。临时产物、依赖和工具不作为源码提交。

「我的」页[交互原型](frontend/previews/account-center/index.html)可在本地直接打开，[三态对照](frontend/previews/account-center/overview.html)展示未登录、已登录示例与玻璃面板。原型不连接正式档案或账号服务，不进入APK；账号第一版方向为个人备份与换机恢复，见[HC-045](docs/tasks/HC-045-account-center-preview.md)。

当前整理与验证见[HC-043](docs/tasks/HC-043-project-organization.md)，版本历史见[CHANGELOG](CHANGELOG.md)。操作说明见[使用指南](docs/user-guide.md)，Android构建/设备证据见[离线版说明](docs/android.md)，完整资料见[文档入口](docs/README.md)。

