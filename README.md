# 球搭 · HOOPAL

手机本地离线的半场3v3 / 4v4战术动画工具，同时支持电脑浏览器。原生JavaScript / SVG、Vite与Capacitor Android，无账号或业务服务器。

目前提供26套内置战术（18进攻、8防守）、本地球队档案、标签式球员配置、进攻推荐与人员分工。训练场支持步骤讲解、倍速、循环和导出；战术库展开单卡即可循环预览。手机竖屏一屏操作，横屏和平板扩大球场。

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

## 项目目录

~~~text
frontend/                 # 页面、交互与打包素材
  src/
    main.js               # 启动入口
    app.js                # 初始化、来源切换、保存和生命周期协调
    board/                # 共用SVG球场、棋子、路线与可见性
    training/             # 训练播放状态、帧调度与步骤进度
    lineups/
      views/              # 更衣室、档案与推荐结果的绘制
      wizard/             # 建队/配置向导、草稿和成员切换
      components/         # 衣柜、球衣、队徽转盘、玻璃面板
    workspace/            # 页面转场、战术库卡片和公共弹窗
    startup/              # 品牌开场、读取保护与跳过
    storage/              # 档案/战术进度持久化与来源协议
    platform/             # Android与浏览器能力适配
  styles/                 # 全局变量、基础控件和页面框架
shared/                   # 不依赖DOM/平台的校验、插值与推荐
data/
  tactics/offense/        # 3v3/4v4进攻，一套一文件
  tactics/defense/        # 3v3/4v4防守，一套一文件
  recommendations/        # 战术职责、能力要求与规则说明
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

当前整理与验证见[HC-043](docs/tasks/HC-043-project-organization.md)，版本历史见[CHANGELOG](CHANGELOG.md)。操作说明见[使用指南](docs/user-guide.md)，Android构建/设备证据见[离线版说明](docs/android.md)，完整资料见[文档入口](docs/README.md)。

