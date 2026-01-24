# electric-fan

> Forked from [ElpsyCN/electric-fan](https://github.com/ElpsyCN/electric-fan)

一个简单的 Web 电风扇模拟器，使用 Vue 3 + TypeScript 开发。

![Electric Fan](https://img.shields.io/badge/Vue-3.2-42b883)
![TypeScript](https://img.shields.io/badge/TypeScript-4.5-3178c6)

## 特性

- 纯 CSS + JavaScript 绘制风扇，低功耗
- 三档风速调节
- 平滑的加速/减速动画效果
- 开关音效反馈
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

- 将动画周期从 1080°（3 圈）改为 120°
- 使用 JavaScript `requestAnimationFrame` 替代 CSS `infinite` 动画
- 添加线性加速/减速效果（启动和关闭）
- 修复 `vue-about-me` 导入兼容性问题
- 配置 GitHub Pages 部署

## 许可

本项目继承原项目的开源许可。
