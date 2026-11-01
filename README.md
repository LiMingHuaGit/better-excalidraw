# Better Excalidraw Workspace

[English](#english) · [简体中文](#简体中文) · [Landing page](https://liminghua.fyi/better-excalidraw/) · [Chrome Web Store](https://chromewebstore.google.com/detail/failnnidjndkmiabcleibfjmfnpdhflm)

## English

Better Excalidraw Workspace is an open-source Chrome Manifest V3 extension that turns a local folder into a practical project workspace for the official Excalidraw website.

### Highlights

- Browse, search, create, switch, and save local `.excalidraw` files.
- Save before canvas switching and configure periodic auto-save.
- Draw additional native-style geometry and flowchart shapes with click-and-drag placement.
- Copy, rotate, and flip selected extended shapes.
- Keep canvas files local. No account or cloud upload is required.
- Use the extension in English or Simplified Chinese based on the browser language.

### Build from source

```bash
pnpm install
pnpm build
```

Load the generated `dist/` directory from `chrome://extensions/` with Developer mode enabled.

## 简体中文

一个开源的 Chrome Manifest V3 扩展，把本地目录作为 Excalidraw 工作区使用。

## MVP 功能

- 使用 Chrome Side Panel 打开本地工作区目录。
- 递归读取目录和子目录内的 `.excalidraw` 文件。
- 可在当前工作区根目录新建画布并立即打开。
- 搜索并切换画布，在官方 `https://excalidraw.com/` 中加载。
- 自动跟随 Chrome/系统语言显示中文或英文界面。
- 切换画布前自动保存，保存失败时停止切换，避免编辑内容丢失。
- 支持手动保存和定时自动保存；默认 30 秒，可设置 5–3600 秒，设为 0 可关闭。
- 手动保存和切换保存期间在画布上显示保存中动画。
- 永久保存上次选择的目录句柄；Chrome 撤销目录权限后只需点击一次重新授权，无需重新选择目录。
- 支持画布内嵌图片数据的读取和保存。
- 在 Excalidraw 左上角提供工作区按钮，可直接打开扩展侧栏。
- 工作区、扩展图形和操作按钮会跟随 Excalidraw 原生按钮的实际尺寸与位置对齐。
- 在原生工具栏旁提供按“基础 / 箭头 / 流程图”分类的扩展图形面板。
- 基础图形包含多边形、星形、箭头形、气泡、加号、饼图和立方体；另提供左右/双向箭头以及选择/判断菱形等常用流程图符号。
- 选择扩展图形后进入十字光标绘制模式，可在画布上拖拽决定图形的位置和大小。
- 扩展图形通过 Excalidraw 原生剪贴板通道加入场景，不重新加载页面，并支持撤销、缩放、改色、复制和删除。
- 扩展图形旁提供选中图形操作菜单，支持复制一份、顺/逆时针旋转 90°、水平翻转和垂直翻转。

### 构建

```bash
pnpm install
pnpm build
```

构建产物位于 `dist/`。

### 安装到 Chrome

1. 打开 `chrome://extensions/`。
2. 开启右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目的 `dist/` 目录。
5. 打开 `https://excalidraw.com/`。
6. 点击扩展图标，Chrome 会打开工作区侧栏。

### 当前限制

- MVP 仅支持官方 `https://excalidraw.com/`。
- Chrome 的目录权限可能在浏览器重启后失效，此时需要在侧栏重新授权。
- 标准 Chrome 扩展无法获取目录的真实系统路径，因此不能直接在 Finder/资源管理器中打开当前工作区；该能力需要额外安装 Native Messaging 本地助手。
- 下载管理扩展能用 `chrome.downloads.show(downloadId)` 定位 Chrome 下载记录；工作区文件不是下载记录，不能用该接口定位原文件。
- 协作房间中的内容不建议直接保存到本地工作区文件。

## Privacy / 隐私

The extension reads and writes only the local workspace selected by the user and runs its content script only on the official Excalidraw website. See the [bilingual privacy policy](https://legal.liminghua.fyi/products/better-excalidraw/privacy/).

扩展仅读写用户主动选择的本地工作区，并且内容脚本只运行在 Excalidraw 官方网站。请查看[中英文隐私政策](https://legal.liminghua.fyi/products/better-excalidraw/privacy/)。

## License

[MIT](./LICENSE) © 2026 Minghua Li
