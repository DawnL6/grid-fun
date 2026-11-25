# 测试报告

2026-11-24 本地检查：node -v 返回 v26.10.0；yarn -v 返回1.22.22；docker --version 返回28.0.4。仅证明命令可用，不证明Docker守护进程或镜像可运行。初始git status失败：不是Git仓库。功能测试、构建、数据库、真机及平台类目均未验证。

2026-11-24：本次核对：工程仅含配置、六个子包声明及文档；git status显示文件尚未跟踪。Node版本配置一致性已检查；未运行应用构建或功能测试，兼容性仍待验证。

## 2026-11-25 S00-05 实测

- Yarn依赖安装成功，生成yarn.lock；IPv4优先重试耗时3980.19秒。
- Node26.10.0 / Yarn1.22.22；Docker28.0.4守护进程可用。
- `yarn build:h5`、`yarn build:mp-weixin`、`yarn build:admin`、`yarn build:server`对应工作区命令均退出0。
- H5和Admin构建产物经临时HTTP服务访问返回200；未进行浏览器交互验收。
- Fastify实际监听后GET /health返回200及 {"status":"ok","service":"grid-fun"}；验证后关闭。首次受限环境监听EPERM，获准后重试成功。
- `node tests/compatibility.cjs`通过：better-sqlite3 12.11.1、WAL、事务回滚、Drizzle查询、重开持久化；本机darwin arm64 / Node26.10.0。
- Docker node:26.10.0-bookworm-slim启动成功；在linux arm64中安装better-sqlite3 12.11.1及drizzle-orm 0.44.7，同一SQLite脚本通过。镜像摘要sha256:3ffc19ea878019d9e9ae8971732ad4a03cda44f167107173174b60ed7c65bed3。
- 初次游戏构建因空App.vue脚本失败，补齐入口后双目标重试成功。
- 已知警告：部分传递依赖弃用/peer依赖提示、Vite CJS弃用、后台整包超过500KB、小程序未配置AppID。
- 未验证：微信开发者工具/真机、生产服务器架构、完整应用容器部署、页面交互、业务功能。无真实AppID或密钥；未使用云开发；未连接远程仓库。
