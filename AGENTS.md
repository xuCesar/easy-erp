# AGENTS.md

## 项目定位

本仓库是 Factory ERP Lite，面向中小型制造工厂的轻量企业管理系统。当前以考勤模块为 MVP 切入点，后续扩展到排班、多工厂、工资、计件、门禁和硬件集成。

本项目优先级：

- 正确性。
- 类型安全。
- 多租户隔离。
- 数据可靠性和审计可追溯。
- 小步、清晰、可审查的改动。
- 与现有文档和工程约定保持一致。

默认使用中文沟通和中文说明。代码注释也默认中文，开发时应尽可能补充有助于理解业务意图、边界条件、数据约束和异常处理原因的注释。

---

## 当前主设计源

当前主设计源是 V3 及其拆分文档：

- `docs/design/factory-erp-attendance-design-v3.md`：总体设计。
- `docs/design/factory-erp-er-model.md`：ER 模型。
- `docs/design/prisma-schema-draft.md`：Prisma schema 草案。
- `docs/design/api-contract-v1.md`：API 合同。
- `docs/design/permission-matrix.md`：权限矩阵。
- `docs/design/attendance-calculation-cases.md`：考勤计算用例。
- `docs/design/devops-and-env.md`：环境、部署和运维约束。
- `docs/design/ui-visual-system-v1.md`：Phase 1.7 UI 视觉系统。
- `docs/design/tenant-rls-poc.md`：租户上下文与 RLS POC 边界。
- `docs/plan/factory-erp-mvp-implementation-plan.md`：Phase 0/1 实施计划。
- `docs/plan/phase-1-mvp-readiness-report.md`：Phase 1 MVP 验证报告。
- `docs/plan/phase-1-5-production-pilot-plan.md`：Phase 1.5 生产化试点计划。
- `docs/plan/phase-1-6-pilot-hardening-plan.md`：Phase 1.6 试点硬化计划。
- `docs/plan/phase-1-7-ui-brand-refresh-plan.md`：Phase 1.7 UI 品牌升级计划。

历史文档：

- `docs/design/factory-erp-attendance-design-v1.md`
- `docs/design/factory-erp-v2.docx`

如历史文档与 V3 或拆分文档冲突，以 V3 和拆分文档为准。

---

## Git 工作流

采用 Git Flow 简化版：

- `main`：稳定主分支。
- `develop`：集成开发分支。
- `feature/*`：每个功能或任务一个 feature 分支。

规则：

- 不直接在 `main` 或 `develop` 上开发功能。
- 开发新任务前，从最新 `develop` 拉分支。
- 分支命名建议：`feature/task-<number>-<short-name>`。
- 每个 PR 默认合并到 `develop`。
- PR 合并后，回到 `develop` 执行 `git pull --ff-only origin develop`。
- 关联 issue 不会因为合并到 `develop` 自动关闭时，需要手动关闭并备注合并 PR。

禁止：

- 不经确认执行破坏性命令，例如 `git reset --hard`、强推、删除分支。
- 静默覆盖用户已有改动。
- 把无关重构混入任务 PR。

---

## 工程结构

当前仓库为 pnpm workspace：

```txt
apps/
├── api/       # NestJS API
├── admin/     # Vite + React 管理后台
└── miniapp/   # Taro + React 小程序

packages/
└── shared-types/

docs/
├── design/
└── plan/
```

包管理器固定使用 `pnpm`。不要混用 npm、yarn 或 bun 安装依赖。

---

## 前端 UI 约束

Phase 1.7 起，Admin 与小程序的视觉升级以 `docs/design/ui-visual-system-v1.md` 为准。

Admin：

- 保留 Vite + React + TypeScript。
- 采用 Tailwind-first + shadcn/ui。
- shadcn 组件源码只放在 `apps/admin` 内部，不抽到共享包。
- 不引入 Ant Design、Ant Design Pro 或其他大型后台框架。

小程序：

- 保留 Taro + React + TypeScript。
- 采用 Tailwind CSS + `weapp-tailwindcss`。
- 保留自有 Taro UI 组件，不引入额外小程序 UI 组件库。
- 小程序 build 由开发者本地手动执行并通过微信开发者工具上传，不作为 CI 阻断项。

UI 重构不得修改 API、数据库 schema 或 `packages/shared-types` 契约。

---

## 后端约束

API 位于 `apps/api`。

当前技术栈：

- NestJS。
- TypeScript。
- Prisma 6.x。
- PostgreSQL。
- Vitest。

约束：

- Prisma 当前固定 6.x。不要直接升级到 Prisma 7；Prisma 7 datasource URL 配置方式不同，升级前必须单独评估。
- 多租户查询必须考虑 `tenant_id`。
- 租户上下文当前由 `apps/api/src/core/tenant` 提供。
- `TenantPrismaService.runInTenantTransaction()` 是 RLS POC 的事务入口。
- 当前尚未启用数据库表级 RLS policy，不要在实现中声称已完成生产级 RLS。
- 账号与员工必须分离：`account_user` 是登录身份，`employee` 是业务档案。
- 工厂是稳定边界，组织结构使用 `org_unit` 可选树。
- 考勤组独立于组织结构，通过 `attendance_group_member` 维护历史归属。

---

## 编码规则

通用规则：

- 优先写类型清晰、职责单一、可测试的代码。
- 避免无意义抽象；没有第二个明确使用场景前，不提前抽通用 helper、base service 或复杂继承结构。
- 不主动新增依赖。确需新增时，必须说明解决的问题、影响范围和替代方案。
- 不使用 `any` 绕过类型检查；确实无法确定类型时，优先使用 `unknown` 并做类型收窄。
- 不使用不必要的类型断言、非空断言或宽泛对象类型。
- 命名必须贴合领域文档，避免同一概念出现多个同义名称。

NestJS 规则：

- Controller 只处理输入输出、参数解析和响应组织，不承载复杂业务逻辑。
- Service 负责业务规则、状态流转和事务编排。
- 数据访问逻辑应集中在 Prisma service、repository 风格封装或明确的数据访问方法中，避免复杂查询散落在多个 controller 中。
- 所有外部输入必须有 DTO 和校验规则。
- API 返回结构尽量显式定义，不直接把 Prisma Model 原样暴露给前端。
- 错误处理必须区分参数错误、认证失败、权限不足、资源不存在、业务冲突和系统异常。
- 不向客户端暴露原始数据库错误、堆栈信息或敏感内部实现。

Prisma 与数据库规则：

- 多租户表查询必须显式考虑 `tenant_id`，或通过租户事务入口执行。
- 涉及多表写入、审批状态流转、考勤结果重算、月报锁定等操作必须使用事务。
- 事务代码需要注释说明一致性边界和失败回滚语义。
- Schema 变更必须考虑旧数据、默认值、nullable、索引、唯一约束和外键影响。
- 不写破坏性 migration，除非已经明确迁移策略和回滚路径。

前后端契约规则：

- 修改接口字段、错误码、枚举值、权限点时，必须同步 API 文档、共享类型和调用方。
- 枚举、状态值、权限点命名应与设计文档保持一致。
- 不为短期方便绕过请求封装、鉴权逻辑或统一错误处理。

测试规则：

- 新增业务规则必须配套测试，尤其是租户隔离、权限边界、考勤计算、审批状态机和月报锁定。
- 修复 bug 时，优先补一个能复现问题的失败测试，再实现修复。
- 测试断言应覆盖用户可见行为或业务结果，不依赖脆弱的实现细节。

---

## 测试与验证

完成代码改动前必须运行与改动范围匹配的验证。

常用命令：

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

API 局部命令：

```bash
pnpm --filter @easy-erp/api typecheck
pnpm --filter @easy-erp/api test
pnpm --filter @easy-erp/api build
```

Prisma 验证：

```bash
DATABASE_URL="postgresql://easyerp:easyerp@localhost:5432/easyerp?schema=public" pnpm --filter @easy-erp/api exec prisma validate
DATABASE_URL="postgresql://easyerp:easyerp@localhost:5432/easyerp?schema=public" pnpm --filter @easy-erp/api exec prisma generate
```

说明：

- `prisma generate` 可能需要写入本机 Prisma engine cache。
- 当前环境下 `supertest` 绑定本地端口可能触发沙箱 `EPERM`，优先写不依赖端口监听的控制器或服务测试。
- 没有实际运行过的命令，不要写成“已通过”。

---

## TDD 要求

新增业务行为、权限边界、租户隔离、考勤计算、审批状态机等必须优先写测试。

推荐节奏：

1. 写失败测试。
2. 运行并确认失败原因正确。
3. 写最小实现。
4. 运行并确认通过。
5. 再做必要重构。

例外：

- 纯配置文件。
- 生成文件。
- 文档变更。
- package manifest 或 Docker Compose 这类工程骨架。

即使例外不适合 TDD，也必须用可执行命令验证。

---

## 注释规则

代码应尽可能添加注释，尤其是以下场景：

- 业务规则、状态流转或权限边界不直观。
- 多租户隔离、RLS、事务边界或并发写入存在隐含约束。
- 考勤计算、补卡、请假、月报锁定等逻辑涉及边界条件。
- 类型收窄、泛型、映射关系或 Prisma 查询条件不容易直接看懂。
- 错误处理、降级策略或兼容历史数据的原因需要保留上下文。

注释应优先解释“为什么这样做”和“不能随意改动的约束点”。不要写只重复代码表面行为的注释，例如“给变量赋值”“调用函数”“遍历数组”。

---

## 文档维护

以下变更必须同步文档：

- 修改数据库模型或 Prisma schema。
- 修改 API 请求/响应结构。
- 修改权限点、角色或数据范围。
- 修改考勤计算规则。
- 修改环境变量、启动方式、部署方式或迁移策略。

文档位置：

- 设计类：`docs/design/`
- 实施计划：`docs/plan/`

不要让 `README.md`、V3 设计文档、拆分设计文档互相矛盾。

---

## 依赖管理

原则：

- 不主动新增依赖。
- 确需新增时，说明解决的问题和影响范围。
- 依赖必须加在正确 workspace 包中。
- 不提交 `node_modules/`、`.pnpm-store/`、构建产物或本地 `.env`。

当前 `.gitignore` 已忽略：

- `node_modules/`
- `.pnpm-store/`
- `dist/`
- `.env`
- `.env.*`

其中 `.env.example` 允许提交，用于记录必要环境变量的占位值和说明。

---

## 安全与数据可靠性

必须谨慎处理：

- 手机号。
- 身份证号。
- 定位坐标。
- 打卡照片。
- 设备 ID。
- Token 和密码。

要求：

- 日志不得输出密码、Token、完整身份证号或对象存储长期公开 URL。
- 权限判断必须在后端执行，前端隐藏按钮不算权限边界。
- 打卡原始记录原则上不可变，补卡和人工修正必须保留审计链路。
- 月报锁定后不允许普通流程静默修改考勤结果。

---

## 当前开发节奏

按 GitHub issue 和实施计划逐一推进：

- Task 1：Monorepo skeleton，已完成。
- Task 2：NestJS API + Prisma bootstrap，已完成。
- Task 3：Tenant context + RLS POC，已完成。
- Task 4：Auth、Account、Permission foundation，已完成。
- Task 5：Organization and Employee modules，已完成。
- Task 6：Shift and Attendance Group modules，已完成。
- Task 7：Check-In and Attendance Calculator，已完成。
- Task 8：Leave and Repair Approval，已完成。
- Task 9：Reports and Monthly Locking，已完成。
- Task 10：Minimal Admin and Miniapp Flows，已完成。
- Task 11：Phase 1 MVP readiness verification，已完成。
- Task 12：文档与 issue 基线更新，已完成。
- Task 13：CI 基线，已完成。
- Task 14：管理后台真实化，已完成。
- Task 15：小程序真实化，已完成。
- Task 16：导出任务生产化，已完成。
- Task 17：试点部署与初始化，已完成。
- Task 18：端到端冒烟验收，已完成。
- Task 19：Phase 1.6 文档与 issue 基线，当前阶段。
- Task 20：API pilot smoke gate，待开始。
- Task 21：API observability baseline，待开始。
- Task 22：Phase 1.6 readiness report 与 Runbook 更新，待开始。

Phase 1.5 生产化试点已完成，详见 `docs/plan/phase-1-5-production-pilot-plan.md`。当前进入 Phase 1.6 试点硬化周期，详见 `docs/plan/phase-1-6-pilot-hardening-plan.md`。小程序构建不作为 CI 阻断项，由开发者本地打包并通过微信开发者工具手动上传。

开始新任务前：

1. 确认对应 issue。
2. 切回 `develop`。
3. 拉取最新远端。
4. 创建 feature 分支。
5. 按 TDD 和验证要求实现。
6. 推送并创建指向 `develop` 的 PR。
