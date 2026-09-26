# Infinite Canvas Alpha 测试包

这是跨平台本地预览测试包，同一个 ZIP 同时支持 macOS 与 Windows 11。

## macOS

1. 完整解压 ZIP。
2. 双击 `START_PREVIEW_MAC.command`。
3. 启动器会等待本地服务在 `127.0.0.1:4173` 就绪后，再自动打开 `/canvas`。
4. 测试结束后，在终端窗口按 `Control + C` 停止服务。

如果 macOS 第一次阻止 `.command`，请在 Finder 中右键该文件并选择“打开”。

## Windows 11

1. 完整解压 ZIP。
2. 双击 `START_PREVIEW_WINDOWS.bat`。
3. 启动器会等待本地服务在 `127.0.0.1:4173` 就绪后，再自动打开 `/canvas`。
4. 测试期间请保持预览服务器窗口开启。

## 运行环境

本地启动器需要 Python 3。启动器不会直接打开 `index.html`，而是通过内置 `_preview_server.py` 提供 SPA 路由回退，以保证 `/canvas` 等路由正常工作。
