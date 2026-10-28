# 内置战术唯一来源

日期：2026-10-22。依据用户明确删除个人战术的要求，范围先写入 [HC-006](../tasks/HC-006-builtins-only.md)，本文在实施时整理。

## 行为

十二套内置模板为唯一入口。移除个人库、个人保存、新建、改名、导入及切换时自动归档。编辑仍可用于本次演练，PNG / JSON 可导出；切换模板或重启从内置数据重新构建，外部已导出文件不删除。

## 数据清理和记录

`storage/builtins.js` 在初始化前直接将旧 `halfcourt-draft-v1` 写为 `null`、旧 `halfcourt-library-v1` 写为 `[]`，并同步清空原 WebView localStorage 两键；不读旧 Play、不生成删除前备份。平台 `cleanupLegacyExtras()` 只清理这两键的 `.corrupt-` 备份及原生临时写入文件：原生范围仅 DATA 的 `halfcourt/storage/`，精确匹配文件名，不递归、不碰导出或其他设置。

每个清理步骤失败独立收集错误，`legacyCleared=false`，界面持续提示重启重试；下次启动重新执行。即使清理失败，也不读取或恢复旧个人战术。

新键 `halfcourt-builtin-selection-v1` 仅保存 `{templateId,frameIndex}`，模板 ID 必须属于现有目录，步骤限制在该内置模板原始帧数范围。未知或损坏选择安全回退；读取失败锁定写入，成功重读后恢复。临时新增到 60 步也不会持久保存成 Play，重新打开回到原始模板。

## 模块与验证

`app.js → storage/builtins.js → 平台存储`；`shared/` 和内置数据不变。旧通用 `storage/repository.js` 与测试保留为历史兼容代码，当前应用不引用。

专项测试覆盖删除范围、失败重试、不同存储副本、只保存 ID / 步骤及并发快照；浏览器验证旧个人数据不会显示或复活、临时编辑重启恢复原始模板、十二套动画、六屏一屏布局、60 个临时步骤和长讲解。设备核对版本与旧文件实际内容，详见任务和 [审查](../reviews/HC-006-builtins-only.md)。
