# Factory ERP Lite

面向中小型制造工厂的轻量企业管理系统。当前阶段以考勤模块为切入点，目标是先交付单工厂考勤闭环，再逐步扩展到排班、多工厂、工资、计件、门禁和硬件集成。

当前仓库状态：Phase 1 单工厂考勤 MVP 与 Phase 1.5 生产化试点任务均已完成。当前进入 Phase 1.6 试点硬化周期，重点补齐 API CI 冒烟门禁、基础可观测性、试点 Runbook 和 readiness report。

---

## 1. 当前范围

MVP 聚焦以下闭环：

```txt
登录/租户上下文
  -> 工厂/组织单元/员工
  -> 班次/考勤组
  -> 小程序打卡
  -> 考勤结果计算
  -> 补卡/请假审批
  -> 月报查看与导出
```

Phase 1 不包含：

- 多级审批流配置。
- 工资核算。
- 人脸识别和门禁硬件集成。
- 企业微信/钉钉集成。
- 多时区工厂。

---

## 2. 文档索引

| 文档 | 说明 |
| --- | --- |
| [V3 总体设计](docs/design/factory-erp-attendance-design-v3.md) | 系统定位、模块划分、MVP 范围、整体架构 |
| [ER Model](docs/design/factory-erp-er-model.md) | 核心实体、关系、字段、索引与约束 |
| [Prisma Schema Draft](docs/design/prisma-schema-draft.md) | Prisma schema 草案和需要手写 SQL 的约束 |
| [API Contract V1](docs/design/api-contract-v1.md) | API 规范、错误码、请求/响应示例 |
| [Permission Matrix](docs/design/permission-matrix.md) | 角色、权限点、数据范围与后端校验规则 |
| [Attendance Calculation Cases](docs/design/attendance-calculation-cases.md) | 考勤计算规则和 C001-C018 用例矩阵 |
| [DevOps And Env](docs/design/devops-and-env.md) | 环境变量、Docker、CI、迁移、备份、运维约束 |
| [MVP Implementation Plan](docs/plan/factory-erp-mvp-implementation-plan.md) | Phase 0/1 实施任务拆解 |
| [Phase 1 MVP Readiness Report](docs/plan/phase-1-mvp-readiness-report.md) | Phase 1 验证门禁结果 |
| [Phase 1.5 Production Pilot Plan](docs/plan/phase-1-5-production-pilot-plan.md) | 生产化试点任务拆解与完成标准 |
| [Phase 1.5 Pilot Deployment Runbook](docs/plan/phase-1-5-pilot-deployment-runbook.md) | 试点部署、空库初始化、demo seed 和故障定位 |
| [Phase 1.5 Smoke Acceptance](docs/plan/phase-1-5-smoke-acceptance.md) | 端到端冒烟脚本、UI 清单和阻断条件 |
| [Phase 1.6 Pilot Hardening Plan](docs/plan/phase-1-6-pilot-hardening-plan.md) | 试点硬化任务拆解与完成标准 |

历史文档：

- `docs/design/factory-erp-attendance-design-v1.md`
- `docs/design/factory-erp-v2.docx`

V3 及其拆分文档是当前主设计源。

---

## 3. 推荐工程结构

当前采用 TypeScript monorepo：

```txt
apps/
├── api/       # NestJS API
├── admin/     # React 管理后台
└── miniapp/   # Taro 小程序

packages/
└── shared-types/

docs/
├── design/
└── plan/
```

包管理器优先使用 `pnpm`。

---

## 4. 技术栈方向

| 层次 | 技术 |
| --- | --- |
| 后端 | NestJS + TypeScript |
| ORM | Prisma |
| 数据库 | PostgreSQL 15+ |
| 缓存/队列 | Redis + BullMQ 为后续预留；Phase 1.5 暂不强制引入 |
| 管理后台 | Vite + React + TypeScript |
| 小程序 | Taro + React |
| 对象存储 | MinIO / 腾讯云 COS |
| 容器 | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## 5. 核心设计原则

- 账号与员工分离：`account_user` 负责登录认证，`employee` 负责员工档案。
- 工厂是稳定边界：考勤地点、Wi-Fi、报表和权限都以 `factory_id` 为重要边界。
- 组织结构弹性化：工厂下使用 `org_unit` 可选树，不强制小微企业维护车间/班组。
- 考勤组独立于组织结构：员工通过 `attendance_group_member` 历史表维护考勤规则归属。
- 打卡记录不可变：补卡和人工修正通过新增记录与审计链路表达。
- 缺卡不直接等于旷工：初始进入异常状态，待补卡、请假、人工确认或月度锁定后形成最终结果。
- 多租户隔离优先：应用层强制 `tenant_id`，RLS 在 Phase 0 POC 通过后再启用。

---

## 6. 当前里程碑

当前 Task 1-18 均已完成，Task 19-22 为 Phase 1.6 试点硬化周期：

- Task 1-11：Phase 1 单工厂考勤 MVP 与验证门禁。
- Task 12-18：Phase 1.5 生产化试点，包括 CI、真实前端、导出任务持久化、试点部署初始化和端到端冒烟验收。
- Task 19-22：Phase 1.6 试点硬化，包括 API CI 冒烟门禁、基础可观测性、Runbook 更新和 readiness report。

Phase 1.6 不进入 Phase 2 业务开发；排班、多工厂、工资、硬件集成等新主线需等试点硬化完成后再单独规划。

---

## 7. 本地运行

完整试点部署步骤见 [Phase 1.5 Pilot Deployment Runbook](docs/plan/phase-1-5-pilot-deployment-runbook.md)。

API 试点环境快速启动：

```bash
docker compose up -d postgres redis
pnpm --filter @easy-erp/api exec prisma migrate deploy --schema prisma/schema.prisma
pnpm --filter @easy-erp/api seed:demo
pnpm --filter @easy-erp/api start:dev
```

默认 demo 管理员账号为 `13800000000`，密码由 `DEMO_ADMIN_PASSWORD` 控制；默认 demo 员工账号为 `13900000001`，密码由 `DEMO_EMPLOYEE_PASSWORD` 控制。本地未设置时脚本使用 `EasyERP@demo123`。生产或正式演示环境必须通过 Secret 注入强密码。

端到端冒烟验收：

```bash
pnpm --filter @easy-erp/api smoke:pilot
```

管理后台：

```bash
pnpm --filter @easy-erp/admin dev
```

默认会将 `/api` 代理到 `http://127.0.0.1:3000`。如果 API 使用其他地址，可以设置：

```bash
ADMIN_API_PROXY_TARGET="http://127.0.0.1:3001" pnpm --filter @easy-erp/admin dev
```

小程序：

```bash
pnpm --filter @easy-erp/miniapp dev:weapp
```

真机或局域网联调时通过 `TARO_APP_API_BASE_URL` 指定后端地址，例如：

```bash
TARO_APP_API_BASE_URL="http://<your-lan-ip>:3000" pnpm --filter @easy-erp/miniapp dev:weapp
```

构建微信小程序产物：

```bash
pnpm --filter @easy-erp/miniapp build
```

小程序构建不作为 CI 阻断项。产物输出到 `apps/miniapp/dist/`，由开发者使用微信开发者工具打开该目录，完成预览、真机调试和手动上传。

---

## 8. 验证要求

常用验证命令：

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

关键阻断项：

- 租户隔离测试失败。
- 权限边界测试失败。
- 考勤计算 C001-C018 失败。
- Prisma migration 无法在空库执行。
- 月报锁定后仍可被普通补卡修改。
