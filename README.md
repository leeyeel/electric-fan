# electric-fan

> Forked from [ElpsyCN/electric-fan](https://github.com/ElpsyCN/electric-fan)

一个简单的 Web 电风扇模拟器，使用 Vue 3 + TypeScript 开发。

![Electric Fan](https://img.shields.io/badge/Vue-3.2-42b883)
![TypeScript](https://img.shields.io/badge/TypeScript-4.5-3178c6)

## 特性

- SVG 绘制风扇，支持深浅主题和屏幕缩放
- 三档风速调节（60 / 180 / 360 RPM）
- 平滑的加速/减速，随实际转速增强的旋转拖影与视觉模糊
- 开关音效和无缝循环风声，音调、音量随实际转速变化
- 支持深色模式

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000/ 查看效果

### 构建

```bash
npm run build
```

构建产物将生成在 `dist` 目录

### Cloudflare Pages 部署

构建命令为 `npm run build`，输出目录为 `dist`，默认部署在域名根路径 `/`。
如果 Cloudflare 中之前设置过 `VITE_BASE_URL=/electric-fan/`，请删除该设置后重新构建。

需要部署到子目录时，设置 `VITE_BASE_URL`，例如 GitHub Pages：

```bash
VITE_BASE_URL=/electric-fan/ npm run build
```

路由、静态资源、音频和 PWA 使用同一个 base；GitHub Pages 工作流已单独设置子目录。
音频在点击档位时解锁，完整下载并解码后使用 Web Audio 循环播放，不依赖媒体时长加载或服务器 Range 请求。
若浏览器限制声音或资源加载失败，页面会提供“重试声音”按钮。

### 回归测试

使用 Node.js 18 或更高版本执行 `npm test`，检查加减速、音频冷加载、快速切档、失败重试和循环接缝。

### 预览构建结果

```bash
npm run preview
```

## 项目结构

```
electric-fan/
├── src/
│   ├── components/       # 组件
│   │   ├── Fan.vue       # 风扇主组件
│   │   ├── FanSwitch.vue # 风扇开关组件
│   │   └── BaseFooter.vue
│   ├── pages/            # 页面
│   ├── stores/           # 状态管理
│   └── styles/           # 样式文件
├── public/               # 静态资源
│   └── audio/            # 音效文件
└── vite.config.ts        # Vite 配置
```

## 技术栈

- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Windi CSS](https://windicss.org/) - 工具优先的 CSS 框架

## 修改内容

本版本在原项目基础上进行了以下改进：

- 使用 SVG 曲面扇叶及多重曝光拖影，拉开三档转速差异
- 使用 JavaScript `requestAnimationFrame` 实现与刷新率无关的加减速
- 用 Web Audio 取代依赖 `duration` 的递归音频定时器，处理加载失败、快速切档与卸载清理
- 统一部署 base，兼容 Cloudflare Pages 根路径与 GitHub Pages 子目录
- 修复 `vue-about-me` 导入兼容性问题
- 配置 GitHub Pages 部署

## 许可

本项目继承原项目的开源许可。
