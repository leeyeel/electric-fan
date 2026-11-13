# electric-fan

> Forked from [ElpsyCN/electric-fan](https://github.com/ElpsyCN/electric-fan)

使用 Vue 3 + TypeScript 开发的 Web 电风扇模拟器。本 fork 已同步源仓库 v0.2.0，同时保留 Cloudflare Pages 根路径与 GitHub Pages 子目录部署配置。

## 特性

- CSS 3D 风扇，可拖动旋转视角、双击复位
- 三档风速、惯性加减速、自然风、摇头与定时关闭
- 防护罩彩带随风飘动，风声音量和音调跟随转速
- 实时语音与录音回放，声音仅在本机处理
- 深浅主题、静音与键盘操作
- Vue 风扇组件、框架无关状态机与 Yun Home 插件

## 开发

需要 Node.js >=22.13.0 与 pnpm 11（版本由 package.json 的 packageManager 指定）。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

使用开发服务器输出的本地地址访问页面。

```bash
pnpm build             # 站点产物：dist
pnpm preview           # 预览站点
pnpm build:packages    # 构建组件包、状态机和插件
pnpm check             # lint、包构建、站点构建、类型检查和测试
```

`pnpm test` 同时运行源仓库的状态机/插件测试与本 fork 保留的加减速、音频加载、重试及循环接缝回归测试。

## 部署

Cloudflare Pages 使用 Node.js >=22.13.0，安装命令为 `pnpm install --frozen-lockfile`，构建命令为 `pnpm build`，输出目录为 `dist`，默认部署在根路径 `/`。

若之前设置过 `VITE_BASE_URL=/electric-fan/`，部署到根路径时请删除该设置。部署到子目录时显式设置：

```bash
VITE_BASE_URL=/electric-fan/ pnpm build
```

路由、静态资源、音频和 PWA 共用此 base。GitHub Pages 工作流已配置 `/electric-fan/`。

## Packages

仓库采用 pnpm workspace，站点位于根目录。

| 包 | 说明 |
| --- | --- |
| [`@yunlefun-home/electric-fan`](packages/electric-fan) | CSS 3D Vue 风扇组件，支持内置控件和彩带 |
| `@yunlefun-home/electric-fan/core` | 同一包的子路径，提供状态机与电机模拟，不依赖 Vue |
| [`packages/home-plugin`](packages/home-plugin) | Yun Home 设备插件 |

```ts
import { ElectricFan } from '@yunlefun-home/electric-fan'
import { fanReducer } from '@yunlefun-home/electric-fan/core'
import '@yunlefun-home/electric-fan/style.css'
```

详细组件 API 见 [组件包说明](packages/electric-fan/README.md)，版本变化见 [CHANGELOG](CHANGELOG.md)。源仓库的 npm 发布流程需要对应包的可信发布权限；普通分支同步与站点部署不执行 npm 发布。

## 同步源仓库

`origin` 指向本 fork；`upstream` 指向源仓库，仅用于拉取更新，推送地址已禁用。

```bash
git fetch upstream
git merge upstream/master
git push origin master
```

## 许可

本项目继承原项目的 [MIT 许可](LICENSE)。
