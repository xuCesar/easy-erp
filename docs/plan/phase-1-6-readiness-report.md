# Factory ERP Lite Phase 1.6 Readiness Report

日期：2026-05-20
基础分支：`develop`
周期范围：Task 19-22，试点硬化周期

## 1. 结论

Phase 1.6 的试点硬化目标已完成：API CI 冒烟门禁、基础可观测性、试点 Runbook 和 readiness report 已形成闭环。

当前系统仍定位为单工厂考勤 MVP 的真实试点版本，不进入 Phase 2 业务扩展。建议先用当前版本完成小范围真实试点，收集考勤规则、审批、导出和移动端使用反馈后，再拆分 Phase 2 业务议题。

## 2. 本周期完成项

| Task | 内容 | 状态 |
| --- | --- | --- |
| Task 19 | Phase 1.6 文档与 issue 基线 | 已完成 |
| Task 20 | API pilot smoke CI gate | 已完成 |
| Task 21 | API observability baseline | 已完成 |
| Task 22 | Readiness report 与 Runbook 更新 | 已完成 |

## 3. CI 与验证状态

当前 GitHub Actions CI 分为两类门禁：

- `Typecheck, Test, Lint, Build`：覆盖 `@easy-erp/shared-types`、`@easy-erp/api`、`@easy-erp/admin`。
- `API Pilot Smoke`：使用 PostgreSQL service 在空库执行 Prisma migration、demo seed、API health check 和 `smoke:pilot`。

小程序不作为 CI 阻断项。小程序由开发者本地执行构建，并通过微信开发者工具预览、真机调试和手动上传。

本周期本地验证命令：

```bash
pnpm --filter @easy-erp/api typecheck
pnpm --filter @easy-erp/api test
pnpm --filter @easy-erp/api build
git diff --check
rg "Phase 1\\.6|readiness|小程序|miniapp|X-Request-Id|API Pilot Smoke" README.md docs/plan -n
```

Task 20 CI smoke 覆盖：

```bash
pnpm --filter @easy-erp/api exec prisma generate --schema prisma/schema.prisma
pnpm --filter @easy-erp/api exec prisma migrate deploy --schema prisma/schema.prisma
pnpm --filter @easy-erp/api seed:demo
pnpm --filter @easy-erp/api smoke:pilot
```

`smoke:pilot` 覆盖 API 健康检查、管理员登录、员工登录、员工打卡、请假、补卡、审批、月报锁定和导出任务查询。

## 4. 可观测性状态

API 已具备基础 request observability：

- 请求缺少 `X-Request-Id` 时，服务端生成 request id。
- 请求携带 `X-Request-Id` 时，服务端透传该值。
- 响应 header 返回 `X-Request-Id`，不改变既有 JSON 响应结构。
- 访问日志记录 `requestId`、`method`、`path`、`status`、`durationMs`、`tenantId`、`userId` 和 `employeeId`。
- 访问日志不记录请求体、Authorization token、密码、query string、完整定位轨迹或照片 URL。

## 5. Runbook 状态

试点 Runbook 已覆盖：

- 空库迁移和 Prisma Client 生成。
- 幂等 demo seed。
- API 启动、健康检查和登录检查。
- API pilot smoke 验收入口。
- 管理后台本地启动。
- 小程序本地构建、微信开发者工具预览和手动上传边界。
- 基础故障定位和回滚边界。

小程序上传前仍需开发者手动确认：

- `TARO_APP_API_BASE_URL` 指向目标试点 API 地址。
- 微信开发者工具可打开 `apps/miniapp/dist/`。
- 登录、打卡、考勤记录、请假和补卡页面可访问试点 API。
- 真机网络能访问 API 域名或局域网地址。

## 6. 已知限制

- 当前仍是单租户、单工厂试点路径，多工厂汇总与跨工厂报表未进入本周期。
- PostgreSQL 表级 RLS policy 尚未启用生产化，仅保留应用层租户隔离和 RLS POC 边界。
- 导出任务当前验证持久化和查询语义，不生成真实 Excel 文件。
- 小程序构建与上传依赖微信开发者工具，不纳入 GitHub Actions CI gate。
- API 访问日志为基础排障日志，尚未接入集中式日志平台、指标系统或链路追踪。
- Demo seed 仅适合试点初始化和冒烟验收，不应直接用于真实生产数据初始化。

## 7. 回滚边界

- API 代码可按普通应用版本回滚；数据库 migration 不做自动下滚。
- 已执行的向前兼容 migration 建议保留，回滚应用版本前先确认旧版本是否兼容新增表或字段。
- demo seed 写入错误时，优先修正 seed 后重新执行；不要在真实生产环境直接删除业务数据来恢复。
- 若发现 request id 或访问日志影响运行，应优先临时回滚 API 版本，而不是删除日志相关字段或修改数据库。

## 8. Phase 2 前建议

进入 Phase 2 前建议先完成一轮真实试点反馈整理：

- 收集至少一周真实打卡、请假、补卡和审批数据。
- 复盘异常考勤处理、月报锁定和导出任务是否符合工厂实际流程。
- 确认小程序真机网络、定位授权和 API 域名配置的稳定性。
- 基于试点反馈重新排序 Phase 2 议题，优先拆分排班、多工厂、工资、硬件集成中最有业务价值的一条主线。
- 如试点进入更长周期，应优先补集中日志、备份恢复演练和更明确的生产迁移策略。
