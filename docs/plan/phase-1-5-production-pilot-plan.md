# Factory ERP Lite Phase 1.5 Production Pilot Plan

日期：2026-05-19  
基础分支：`develop`  
前置状态：Phase 1 MVP 验证门禁已通过，详见 `docs/plan/phase-1-mvp-readiness-report.md`。

## 1. 目标

Phase 1.5 的目标是把考勤 MVP 从“代码闭环”推进到“可部署、可演示、可试点”的状态。

本阶段不进入 Phase 2 功能扩展，不引入排班、多工厂、多级审批、工资、硬件集成等新业务主线。优先补齐真实前端、CI、导出任务持久化、部署初始化和端到端冒烟验收。

## 2. 范围

### 包含

- 文档与 GitHub issue 基线更新。
- GitHub Actions CI 基线。
- 可运行 React 管理后台。
- 可运行 Taro 小程序骨架。
- 月报导出任务数据库持久化。
- 试点部署、初始化和最小 demo 数据流程。
- 端到端冒烟验收清单。

### 不包含

- 排班系统。
- 多工厂数据汇总。
- 多级审批流。
- 工资和计件核算。
- 门禁、人脸识别和活体检测。
- 企业微信、钉钉等外部平台集成。
- 生产级 PostgreSQL RLS policy 启用。

## 3. 任务拆解

### Task 12：文档与 issue 基线更新

GitHub issue：[#24](https://github.com/xuCesar/easy-erp/issues/24)

- 更新 `README.md`、`AGENTS.md` 和实施计划状态。
- 明确 Task 1-11 已完成，Phase 1.5 是后续主线。
- 创建 Task 13-18 GitHub issues。
- 后续继续按 Git Flow 从最新 `develop` 拉 `feature/task-*` 分支。

### Task 13：CI 基线

GitHub issue：[#25](https://github.com/xuCesar/easy-erp/issues/25)

- 新增 GitHub Actions workflow。
- PR 到 `develop` 时执行：
  - `pnpm install --frozen-lockfile`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm lint`
  - `pnpm build`
- CI 不连接生产资源，不依赖本地 `.env`。

### Task 14：管理后台真实化

GitHub issue：[#26](https://github.com/xuCesar/easy-erp/issues/26)

- 将 `apps/admin` 从 TypeScript-only 页面流升级为可运行 React 管理后台。
- 推荐使用 Vite + React + TypeScript。
- 覆盖组织、员工、班次、考勤组、考勤结果、请假审批、补卡审批、月报页面。
- 接入统一 API client、登录态、加载态、错误态、空态和基础权限隐藏。
- 暂不引入复杂低代码后台框架，避免 Phase 1.5 过重。

### Task 15：小程序真实化

GitHub issue：[#27](https://github.com/xuCesar/easy-erp/issues/27)

- 将 `apps/miniapp` 从 TypeScript-only 页面流升级为可运行 Taro + React 小程序骨架。
- 覆盖登录、打卡、打卡结果、考勤记录、请假申请、补卡申请、个人信息页面。
- 优先完成 API 对接和状态语义，不做复杂视觉设计。

### Task 16：导出任务生产化

GitHub issue：[#28](https://github.com/xuCesar/easy-erp/issues/28)

- 将月报导出任务从内存 Map 改为数据库持久化。
- 新增 `report_export_task` 或等价 Prisma model。
- 同步 migration、repository、共享类型和 API 文档。
- 测试覆盖创建、查询、完成、失败、租户隔离和任务不存在。
- Phase 1.5 暂不强制引入 Redis/BullMQ；如后续导出耗时明显，再单独接入队列。

### Task 17：试点部署与初始化

GitHub issue：[#29](https://github.com/xuCesar/easy-erp/issues/29)

- 补齐 `.env.example`、Docker Compose 使用说明和数据库迁移流程。
- 提供最小 seed/demo 数据脚本或明确的初始化命令。
- 编写试点部署 Runbook，覆盖空库初始化、健康检查、回滚注意点和常见故障定位。

### Task 18：端到端冒烟验收

GitHub issue：[#30](https://github.com/xuCesar/easy-erp/issues/30)

- 建立试点验收脚本或手工清单。
- 覆盖管理员登录、创建员工、配置班次和考勤组、员工打卡、考勤结果生成、请假/补卡申请、审批、月报查看、月报锁定和导出任务查询。
- 将冒烟结果作为 Phase 1.5 完成前的阻断项。

## 4. 验证要求

每个任务完成前至少运行与改动范围匹配的验证：

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

涉及 API 或 Prisma 的任务还需要补充：

```bash
pnpm --filter @easy-erp/api test
pnpm --filter @easy-erp/api build
```

涉及数据库迁移的任务必须验证空库可执行：

```bash
pnpm --filter @easy-erp/api exec prisma validate --schema prisma/schema.prisma
pnpm --filter @easy-erp/api exec prisma migrate deploy --schema prisma/schema.prisma
```

## 5. 完成标准

- GitHub issue 中 Task 13-18 全部关闭。
- PR 到 `develop` 的 CI 基线稳定通过。
- 管理后台和小程序至少具备可运行、可演示的最小页面流。
- 月报导出任务状态不依赖进程内存。
- 新环境可以从空库完成迁移和最小初始化。
- 端到端冒烟验收通过并有文档记录。
