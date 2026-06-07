# Factory ERP Lite Phase 1.6 Pilot Hardening Plan

日期：2026-05-20
基础分支：`develop`
周期长度：1 周
前置状态：Phase 1 MVP 与 Phase 1.5 生产化试点已完成，详见 `docs/plan/phase-1-5-production-pilot-plan.md`。

## 1. 目标

Phase 1.6 的目标是把当前考勤 MVP 从“可试点”推进到“更适合真实试点运行和排障”的状态。

本周期不进入 Phase 2 业务扩展，不新增排班、多工厂、多级审批、工资、硬件集成等业务主线。重点补齐 API CI 冒烟门禁、基础可观测性、试点 Runbook 和 readiness report。

## 2. 范围

### 包含

- Phase 1.6 文档与 GitHub issue 基线。
- API 侧 pilot smoke CI gate。
- API request id 与基础访问日志。
- 试点 Runbook 更新。
- Phase 1.6 readiness report。

### 不包含

- 排班系统。
- 多工厂数据汇总。
- 多级审批流。
- 工资和计件核算。
- 门禁、人脸识别和活体检测。
- 小程序 CI build gate。小程序由开发者本地打包，并通过微信开发者工具手动上传。
- 生产级 PostgreSQL RLS policy 启用。

## 3. 任务拆解

### Task 19：Phase 1.6 文档与 issue 基线

GitHub issue：[#42](https://github.com/xuCesar/easy-erp/issues/42)

- 新增本计划文档。
- 更新 `README.md`、`AGENTS.md` 和试点 Runbook 的下一周期说明。
- 创建 Task 20-22 GitHub issues。
- 明确小程序构建不作为 CI 阻断项。

### Task 20：API pilot smoke gate

GitHub issue：[#43](https://github.com/xuCesar/easy-erp/issues/43)

- 扩展 `.github/workflows/ci.yml`。
- 在 CI 中启动 PostgreSQL service。
- 对 CI 空库执行 Prisma migration。
- 执行 demo seed。
- 启动 API 并运行 `pnpm --filter @easy-erp/api smoke:pilot`。
- 不加入 `apps/miniapp` build gate。

### Task 21：API observability baseline

GitHub issue：[#44](https://github.com/xuCesar/easy-erp/issues/44)

- 增加或透传 `X-Request-Id`。
- 在响应 header 中返回 `X-Request-Id`。
- 增加基础访问日志，记录 method、path、status、durationMs、tenantId、userId、employeeId。
- 不记录密码、Authorization token、完整定位轨迹或打卡照片 URL。

### Task 22：Phase 1.6 readiness report 与 Runbook 更新

GitHub issue：[#45](https://github.com/xuCesar/easy-erp/issues/45)

- 新增 `docs/plan/phase-1-6-readiness-report.md`。
- 记录 CI smoke、API 可观测性和试点验证结果。
- 更新 Runbook，明确 API CI 门禁与小程序手动打包上传的边界。
- 给出进入 Phase 2 前的建议和剩余风险。

## 4. 验证要求

每个任务完成前至少运行与改动范围匹配的验证：

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

涉及 API 的任务还需要补充：

```bash
pnpm --filter @easy-erp/api typecheck
pnpm --filter @easy-erp/api test
pnpm --filter @easy-erp/api build
```

Task 20 必须在 CI 中验证：

```bash
pnpm --filter @easy-erp/api exec prisma migrate deploy --schema prisma/schema.prisma
pnpm --filter @easy-erp/api seed:demo
pnpm --filter @easy-erp/api smoke:pilot
```

## 5. 完成标准

- GitHub issue 中 Task 19-22 全部关闭。
- PR 到 `develop` 的 CI 基线和 API pilot smoke gate 稳定通过。
- API 响应和日志具备可追踪 request id。
- 试点 Runbook 明确小程序本地打包和手动上传流程。
- Phase 1.6 readiness report 记录验证结果、已知限制和进入 Phase 2 前建议。
