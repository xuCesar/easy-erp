# Phase 1.5 Pilot Deployment Runbook

本文档用于把一个空的 Phase 1.5/1.6 环境初始化到可演示、可冒烟验收的状态。当前范围面向单租户、单工厂试点，不包含生产级对象存储、队列任务和多工厂初始化。

## 1. 前置条件

- Node.js、pnpm、Docker 和 Docker Compose 已安装。
- 已执行 `pnpm install --frozen-lockfile`。
- `apps/api/.env` 从 `apps/api/.env.example` 复制并按环境调整。
- `JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`、数据库密码和 demo 账号密码由部署环境注入，不提交真实值。

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
DEMO_EMPLOYEE_PHONE="13900000001" \
DEMO_EMPLOYEE_PASSWORD="change-me-before-demo" \
  pnpm --filter @easy-erp/api seed:demo
```

脚本会创建：

- 租户：`示例工厂企业`
- 工厂：`杭州一厂`
- 组织单元：`生产一组`
- 管理员账号：默认手机号 `13800000000`
- 员工账号：默认手机号 `13900000001`
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

## 5. CI 冒烟与可观测性

Phase 1.6 之后，GitHub Actions 包含独立的 `API Pilot Smoke` job。该 job 会在 CI PostgreSQL service 上执行：

```bash
pnpm --filter @easy-erp/api exec prisma generate --schema prisma/schema.prisma
pnpm --filter @easy-erp/api exec prisma migrate deploy --schema prisma/schema.prisma
pnpm --filter @easy-erp/api seed:demo
pnpm --filter @easy-erp/api smoke:pilot
```

该门禁覆盖空库迁移、demo 初始化、API health、管理员登录、员工登录、打卡、请假、补卡、审批、月报锁定和导出任务查询。

API 已启用基础 request observability：

- 请求缺少 `X-Request-Id` 时，服务端生成 request id。
- 请求携带 `X-Request-Id` 时，服务端透传该值。
- 响应 header 返回 `X-Request-Id`。
- 访问日志记录 method、path、status、durationMs、tenantId、userId 和 employeeId。
- 访问日志不记录请求体、Authorization token、密码、query string、完整定位轨迹或照片 URL。

## 6. 管理后台与小程序

启动管理后台：

```bash
ADMIN_API_PROXY_TARGET="http://127.0.0.1:3000" pnpm --filter @easy-erp/admin dev
```

启动小程序构建监听：

```bash
pnpm --filter @easy-erp/miniapp dev:weapp
```

如果需要连接试点 API，先明确注入后端地址：

```bash
TARO_APP_API_BASE_URL="http://<pilot-api-host>:3000" pnpm --filter @easy-erp/miniapp dev:weapp
```

构建上传产物：

```bash
TARO_APP_API_BASE_URL="http://<pilot-api-host>:3000" pnpm --filter @easy-erp/miniapp build
```

小程序产物输出到 `apps/miniapp/dist/`，由开发者使用微信开发者工具打开该目录，完成预览、真机调试和手动上传。

小程序构建与上传由开发者手动完成，不作为 CI 阻断项。上传前建议确认：

- `TARO_APP_API_BASE_URL` 指向目标试点 API 地址。
- 已在微信开发者工具中完成预览或真机调试。
- 登录、打卡、考勤记录、请假和补卡页面能访问试点 API。

## 7. 回滚边界

- Prisma 生产迁移不做自动下滚。上线前必须先在 staging 或临时空库执行 `migrate deploy`。
- 本阶段新增表和新增 demo 数据是向前兼容改动；应用回滚通常可先回滚代码版本，数据库保留新增表。
- 若 seed 写入了错误 demo 数据，优先修正 seed 后重复执行；不要在生产环境直接复用 demo seed。
- 涉及真实生产数据的删除、字段重命名和约束收紧必须单独拆任务评估。
- 若 request id 或访问日志影响试点运行，优先回滚 API 应用版本；不要直接删除日志字段或改动数据库。

## 8. 常见故障

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

确认已执行 `seed:demo`，并且 `DEMO_ADMIN_PHONE`、`DEMO_ADMIN_PASSWORD`、`DEMO_EMPLOYEE_PHONE`、`DEMO_EMPLOYEE_PASSWORD` 与登录请求一致。重复执行 seed 会重置 demo 账号密码为当前环境变量值。

### 月报无数据

确认查询参数使用 demo 工厂 ID `22222222-2222-4222-8222-222222222222` 和月份 `2026-05`。Demo seed 只内置 2026-05-18 的一条考勤结果。

### 请求排障缺少上下文

优先从响应 header 中复制 `X-Request-Id`，再用该 request id 检索 API 访问日志。日志中应包含 method、path、status、durationMs、tenantId、userId 和 employeeId，便于定位权限、数据范围或接口失败原因。
