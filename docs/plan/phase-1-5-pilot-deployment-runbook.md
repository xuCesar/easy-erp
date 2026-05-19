# Phase 1.5 Pilot Deployment Runbook

本文档用于把一个空的 Phase 1.5 环境初始化到可演示、可冒烟验收的状态。当前范围面向单租户、单工厂试点，不包含生产级对象存储、队列任务和多工厂初始化。

## 1. 前置条件

- Node.js、pnpm、Docker 和 Docker Compose 已安装。
- 已执行 `pnpm install --frozen-lockfile`。
- `apps/api/.env` 从 `apps/api/.env.example` 复制并按环境调整。
- `JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`、数据库密码和 demo 管理员密码由部署环境注入，不提交真实值。

本地试点默认连接串：

```bash
DATABASE_URL="postgresql://easyerp:easyerp@localhost:5432/easyerp?schema=public"
```

## 2. 空库初始化

启动本地依赖：

```bash
docker compose up -d postgres redis
```

校验 Prisma schema：

```bash
pnpm --filter @easy-erp/api exec prisma validate --schema prisma/schema.prisma
```

对空库执行迁移：

```bash
DATABASE_URL="postgresql://easyerp:easyerp@localhost:5432/easyerp?schema=public" \
  pnpm --filter @easy-erp/api exec prisma migrate deploy --schema prisma/schema.prisma
```

生成 Prisma Client：

```bash
DATABASE_URL="postgresql://easyerp:easyerp@localhost:5432/easyerp?schema=public" \
  pnpm --filter @easy-erp/api exec prisma generate --schema prisma/schema.prisma
```

## 3. Demo 初始化

执行幂等 demo seed：

```bash
DATABASE_URL="postgresql://easyerp:easyerp@localhost:5432/easyerp?schema=public" \
DEMO_ADMIN_PHONE="13800000000" \
DEMO_ADMIN_PASSWORD="change-me-before-demo" \
  pnpm --filter @easy-erp/api seed:demo
```

脚本会创建：

- 租户：`示例工厂企业`
- 工厂：`杭州一厂`
- 组织单元：`生产一组`
- 管理员账号：默认手机号 `13800000000`
- 班次：`白班 08:00-17:00`
- 考勤组：`生产一组考勤`
- 员工样例：`试点管理员`、`张三`
- 一条 2026-05-18 的 demo 打卡记录和考勤结果

脚本可重复执行。重复执行会更新同一批固定 demo 记录，不会追加重复租户或员工。

## 4. 启动与健康检查

启动 API：

```bash
JWT_ACCESS_SECRET="replace-with-dev-secret" \
JWT_REFRESH_SECRET="replace-with-dev-secret" \
DATABASE_URL="postgresql://easyerp:easyerp@localhost:5432/easyerp?schema=public" \
  pnpm --filter @easy-erp/api start:dev
```

健康检查：

```bash
curl -s http://127.0.0.1:3000/api/v1/health
```

期望响应：

```json
{"status":"ok","service":"easy-erp-api"}
```

登录检查：

```bash
curl -s http://127.0.0.1:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800000000","password":"change-me-before-demo"}'
```

返回 `accessToken` 后，可用该 token 查询 demo 月报：

```bash
curl -s "http://127.0.0.1:3000/api/v1/reports/monthly?factoryId=22222222-2222-4222-8222-222222222222&month=2026-05" \
  -H "Authorization: Bearer <accessToken>"
```

## 5. 管理后台与小程序

启动管理后台：

```bash
ADMIN_API_PROXY_TARGET="http://127.0.0.1:3000" pnpm --filter @easy-erp/admin dev
```

启动小程序构建监听：

```bash
pnpm --filter @easy-erp/miniapp dev:weapp
```

小程序产物输出到 `apps/miniapp/dist/`，可用微信开发者工具打开。

## 6. 回滚边界

- Prisma 生产迁移不做自动下滚。上线前必须先在 staging 或临时空库执行 `migrate deploy`。
- 本阶段新增表和新增 demo 数据是向前兼容改动；应用回滚通常可先回滚代码版本，数据库保留新增表。
- 若 seed 写入了错误 demo 数据，优先修正 seed 后重复执行；不要在生产环境直接复用 demo seed。
- 涉及真实生产数据的删除、字段重命名和约束收紧必须单独拆任务评估。

## 7. 常见故障

### 数据库连接失败

检查：

```bash
docker compose ps
docker compose logs postgres
```

确认 `DATABASE_URL` 的数据库名、用户名、密码、端口和 `schema=public` 一致。

### Prisma migrate 报 schema engine 错误

先在本地确认 PostgreSQL 容器可用，再重跑：

```bash
pnpm --filter @easy-erp/api exec prisma migrate status --schema prisma/schema.prisma
```

在受限沙箱或 CI 环境中，连接本地 Docker 端口可能需要提升权限或使用 CI service container。

### 登录失败

确认已执行 `seed:demo`，并且 `DEMO_ADMIN_PHONE`、`DEMO_ADMIN_PASSWORD` 与登录请求一致。重复执行 seed 会重置 demo 管理员密码为当前环境变量值。

### 月报无数据

确认查询参数使用 demo 工厂 ID `22222222-2222-4222-8222-222222222222` 和月份 `2026-05`。Demo seed 只内置 2026-05-18 的一条考勤结果。
