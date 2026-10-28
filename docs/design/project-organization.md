# 目录与重构边界

2026-10-28用户确认目标目录并授权开始，[HC-043](../tasks/HC-043-project-organization.md)实施。目标是职责清晰、可回退、临时产物有去处，外观和使用行为保持。

```text
frontend/                   # 页面、素材与交互
  src/
    main.js                 # 启动入口
    app.js                  # 读写/来源/页面/生命周期协调
    board/                  # SVG球场、棋子、路线共用绘制
    training/               # 训练播放状态、RAF与进度
    lineups/
      views/                # 更衣室/档案/推荐页面绘制
      wizard/               # 三步配置、草稿和成员交互
      components/           # 衣柜/球衣/队徽转盘/面板
    workspace/              # 页面转场、库卡与弹窗
    startup/                # 品牌开场/单次启动
    storage/                # 串行持久化、来源/版本协调
    platform/               # 浏览器/Android能力
  styles/                   # 全局变量、基础控件、页面框架及入口
shared/                     # DOM/平台无关的校验、插值与推荐
data/tactics/{offense,defense}/{3v3,4v4}/ # 一套一文件、稳定索引
data/recommendations/       # 职责需求与规则
backend/                    # 静态开发预览，APK无需运行服务
resources/                  # 图标等原始资产
scripts/qa/                 # 可复用的检查/清理工具
tests/{unit,integration,e2e}/ # 正式行为回归
docs/{design,tasks,reviews}/ # 需求、任务、审查证据
artifacts/{apk,design,qa}/  # 安装包、预览和必要验收输出
artifacts/temp/             # 可清理测试下载和浏览器临时目录
.tools/                    # 本机编译工具与离线缓存，保留
dist/                      # 自动构建资源
```

依赖方向仍为UI→纯逻辑/存储接口，存储→platform；业务模块不直接操作localStorage，绘制/时钟不持久化。训练场与库预览各有播放策略，共用绘制不合并其不同末停、暂停取整或来源规则。向导保存仍一次提交完整快照、保revision、串行写、失败保草稿及焦点/Back优先级。

数据迁移为无：战术文件搬移保持26套生成帧和顺序逐项一致，推荐结果及人员一一映射与基线比较；球衣号、档案ID、旧清理键、来源解除顺序不改。导出格式保持。CSS分组必须保持原有顺序和WebView96回退，不靠新CSS特性重写。

清理仅作用于明确残留文件并留清单；旧截图、通过/失败记录和设计预览仍可查，历史APK可归档但同步链接。基线Git标签保旧源码，正式README收敛当前说明，版本历史迁入CHANGELOG，目录说明和审查分别更新。
