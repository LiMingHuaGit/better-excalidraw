# Better Excalidraw Workspace

一个 Chrome Manifest V3 扩展，把本地目录作为 Excalidraw 工作区使用。

## MVP 功能

- 使用 Chrome Side Panel 打开本地工作区目录。
- 递归读取目录和子目录内的 `.excalidraw` 文件。
- 搜索并切换画布，在官方 `https://excalidraw.com/` 中加载。
- 切换画布前自动保存，保存失败时停止切换，避免编辑内容丢失。
- 支持手动保存和定时自动保存；默认 30 秒，可设置 5–3600 秒，设为 0 可关闭。
- 手动保存和切换保存期间在画布上显示保存中动画。
- 记住上次选择的目录；浏览器重启后可能需要重新点击授权。
- 支持画布内嵌图片数据的读取和保存。

## 构建

```bash
pnpm install
pnpm build
```

构建产物位于 `dist/`。

## 安装到 Chrome

1. 打开 `chrome://extensions/`。
2. 开启右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目的 `dist/` 目录。
5. 打开 `https://excalidraw.com/`。
6. 点击扩展图标，Chrome 会打开工作区侧栏。

## 当前限制

- MVP 仅支持官方 `https://excalidraw.com/`。
- Chrome 的目录权限可能在浏览器重启后失效，此时需要在侧栏重新授权。
- 协作房间中的内容不建议直接保存到本地工作区文件。
