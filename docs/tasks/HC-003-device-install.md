# HC-003 将测试 APK 安装到用户手机

日期：2026-10-22。状态：`completed`。关联：[HC-001](HC-001-offline-android.md)。

## 任务合同

- 用户明确要求把现有 APK 安装到已通过 USB 连接的手机。
- 负责人：主 agent；依赖：已有 `artifacts/apk/halfcourt-debug.apk` 与可用的 ADB 连接。
- 本任务范围是文件传输、确认安装和打开应用，不包含修改手机安全策略或完整功能验收。

## 实际过程与结果

1. ADB 识别到已授权设备；USB 自动安装及用户要求的重试均返回 `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`。
2. 将同一 APK 传入手机 `/sdcard/Download/halfcourt-debug.apk`，由用户通过正常安装界面完成安装。
3. 用户反馈已安装；ADB `pm path com.halfcourt.tactics` 返回安装包路径，确认不是仅传输了文件。
4. ADB 启动 `com.halfcourt.tactics/.MainActivity` 返回 `Status: ok`，进程存在，系统反馈为当前前台实例。

## 验收

- [x] APK 已传入手机。
- [x] 用户确认安装，系统包管理器确认包名存在。
- [x] 应用已打开，启动结果成功。

安装任务已完成。断网启动、保存恢复、分享和横竖屏等完整真机验收仍由 HC-001 跟踪，不因安装成功而自动勾选。
