# Money Pig

Money Pig 是一个本地优先的 Electron 记账本，用于记录日常支出、收入、转账和资产账户。

## 技术栈

- Electron：桌面壳和主进程能力
- React + Vite + TypeScript：渲染层
- sql.js：本地 SQLite 数据库文件，无需原生编译
- IPC API：渲染层只调用账本 API，不直接访问数据库

## 运行

```bash
pnpm install
pnpm run build
pnpm start
```

开发模式：

```bash
pnpm run dev:electron
```

如果 Electron 下载慢，可以使用镜像：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ pnpm install
```

## 本地数据

数据库文件保存到 Electron 的 `userData` 目录，文件名为：

```text
money-pig.sqlite3
```

应用顶部会显示实际路径。当前实现会在每次写入后导出 SQLite 文件并落盘。

## 已实现

- 资产、负债、净资产、本月收入、本月支出、本月结余
- 支出、收入、账户间转账
- 默认账户和常用收支分类
- 新增账户、新增分类
- 最近 200 条流水
- 本月支出分类排行
- 删除流水

## 可扩展边界

- `src/main/database.ts`：账本仓储和 SQLite schema。后续可以替换为 `better-sqlite3`、加迁移版本、预算表、周期账单表。
- `src/main/ipc.ts`：桌面 API 边界。新增能力先在 shared 类型里定义，再注册 IPC handler。
- `src/shared/types.ts`：主进程和渲染层共享领域类型。
- `src/renderer/App.tsx`：当前 UI。后续可以拆成 `features/transactions`、`features/accounts`、`features/reports`。

## Linux sandbox

当前脚本使用 `electron --no-sandbox`，用于避免部分 Linux 开发环境中 `chrome-sandbox` 权限未配置导致 Electron 无法启动。正式发布时建议按目标发行方式配置 Electron 打包和 sandbox 权限。
