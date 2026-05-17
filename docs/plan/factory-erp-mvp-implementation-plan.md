# Factory ERP Lite MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-oriented MVP for single-factory attendance management with tenant isolation, account/employee separation, flexible organization units, shifts, attendance groups, check-in, attendance calculation, leave/repair approval, and monthly reports.

**Architecture:** Use a TypeScript monorepo with NestJS API, Prisma/PostgreSQL, Redis/BullMQ, React Admin, and Taro mini-program. Keep Phase 0 focused on project skeleton and isolation POC, then deliver Phase 1 as a vertical attendance loop.

**Tech Stack:** TypeScript, pnpm, NestJS, Prisma, PostgreSQL, Redis, BullMQ, React, Ant Design Pro, Taro, Docker Compose, GitHub Actions.

---

## 1. Reference Documents

- `docs/design/factory-erp-attendance-design-v3.md`
- `docs/design/factory-erp-er-model.md`
- `docs/design/attendance-calculation-cases.md`
- `docs/design/api-contract-v1.md`
- `docs/design/permission-matrix.md`

---

## 2. Target File Structure

```txt
apps/
├── api/
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── core/
│       │   ├── auth/
│       │   ├── tenant/
│       │   ├── account/
│       │   ├── permission/
│       │   ├── audit-log/
│       │   └── exception/
│       ├── modules/
│       │   ├── organization/
│       │   ├── employee/
│       │   ├── shift/
│       │   ├── attendance-group/
│       │   ├── attendance/
│       │   ├── leave/
│       │   ├── repair/
│       │   └── report/
│       └── jobs/
├── admin/
└── miniapp/

packages/
├── shared-types/
└── eslint-config/
```

---

## 3. Implementation Tasks

### Task 1: Initialize Monorepo Skeleton

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `apps/api/package.json`
- Create: `apps/admin/package.json`
- Create: `apps/miniapp/package.json`
- Create: `packages/shared-types/package.json`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create workspace manifests**

Create root `package.json`:

```json
{
  "name": "factory-erp-lite",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "build": "pnpm -r build"
  },
  "devDependencies": {
    "typescript": "^5.8.0"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Create Docker Compose for local services**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: easyerp
      POSTGRES_PASSWORD: easyerp
      POSTGRES_DB: easyerp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

- [ ] **Step 3: Verify workspace install**

Run:

```bash
pnpm install
```

Expected: lockfile generated and workspace packages detected.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml docker-compose.yml apps packages
git commit -m "chore: initialize factory erp workspace"
```

### Task 2: Bootstrap NestJS API and Prisma

**Files:**

- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/.env.example`

- [ ] **Step 1: Add API dependencies**

Run:

```bash
pnpm --filter api add @nestjs/common @nestjs/core @nestjs/platform-express @prisma/client
pnpm --filter api add -D prisma ts-node @types/node
```

Expected: dependencies added to `apps/api/package.json`.

- [ ] **Step 2: Create initial Prisma schema**

Create `apps/api/prisma/schema.prisma` with datasource, generator, and the entities from `docs/design/factory-erp-er-model.md`.

- [ ] **Step 3: Add environment example**

Create `apps/api/.env.example`:

```env
DATABASE_URL="postgresql://easyerp:easyerp@localhost:5432/easyerp?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="replace-with-dev-secret"
JWT_REFRESH_SECRET="replace-with-dev-secret"
```

- [ ] **Step 4: Generate Prisma client**

Run:

```bash
pnpm --filter api prisma generate
```

Expected: Prisma client generated successfully.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "chore(api): bootstrap nestjs and prisma"
```

### Task 3: Implement Tenant Context and RLS POC

**Files:**

- Create: `apps/api/src/core/tenant/tenant-context.ts`
- Create: `apps/api/src/core/tenant/tenant.middleware.ts`
- Create: `apps/api/src/core/tenant/tenant-prisma.service.ts`
- Create: `apps/api/src/core/tenant/tenant-isolation.spec.ts`

- [ ] **Step 1: Implement AsyncLocalStorage tenant context**

Create `tenant-context.ts` exposing `runWithTenantContext()` and `getTenantContext()`.

- [ ] **Step 2: Add Prisma wrapper**

Create `tenant-prisma.service.ts` so all application queries can read the active `tenantId`.

- [ ] **Step 3: Write isolation tests**

Add tests covering:

- tenant A cannot read tenant B employee.
- transaction keeps tenant context.
- raw query path is blocked or explicitly reviewed.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter api test tenant-isolation
```

Expected: all tenant isolation tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/core/tenant
git commit -m "feat(api): add tenant context isolation"
```

### Task 4: Implement Auth, Account, and Permission Foundation

**Files:**

- Create: `apps/api/src/core/auth/*`
- Create: `apps/api/src/core/account/*`
- Create: `apps/api/src/core/permission/*`
- Test: `apps/api/src/core/permission/permission.guard.spec.ts`

- [ ] **Step 1: Implement account login**

Support `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, and `POST /api/v1/auth/logout` following `docs/design/api-contract-v1.md`.

- [ ] **Step 2: Implement role permission guard**

Use role names and permissions from `docs/design/permission-matrix.md`.

- [ ] **Step 3: Implement data scope checks**

Support `TENANT_ADMIN`, `HR_ADMIN`, `ORG_MANAGER`, and `EMPLOYEE`.

- [ ] **Step 4: Run permission tests**

```bash
pnpm --filter api test permission
```

Expected: employee self-access and cross-employee denial cases pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/core/auth apps/api/src/core/account apps/api/src/core/permission
git commit -m "feat(api): add auth account and permissions"
```

### Task 5: Implement Organization and Employee Modules

**Files:**

- Create: `apps/api/src/modules/organization/*`
- Create: `apps/api/src/modules/employee/*`
- Test: `apps/api/src/modules/organization/organization.service.spec.ts`
- Test: `apps/api/src/modules/employee/employee.service.spec.ts`

- [ ] **Step 1: Implement `org_unit` CRUD**

Support flexible organization tree under factory. Do not hard-code workshop/team depth.

- [ ] **Step 2: Implement employee CRUD**

Use `org_unit_id` as optional current organization assignment.

- [ ] **Step 3: Run module tests**

```bash
pnpm --filter api test organization employee
```

Expected: create organization, create employee under organization, create employee directly under factory.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/organization apps/api/src/modules/employee
git commit -m "feat(api): add organization and employee modules"
```

### Task 6: Implement Shift and Attendance Group Modules

**Files:**

- Create: `apps/api/src/modules/shift/*`
- Create: `apps/api/src/modules/attendance-group/*`
- Test: `apps/api/src/modules/attendance-group/attendance-group.service.spec.ts`

- [ ] **Step 1: Implement shift CRUD**

Support white shift and cross-day shift.

- [ ] **Step 2: Implement attendance group CRUD**

Support GPS, Wi-Fi, photo-required switch, and default shift.

- [ ] **Step 3: Implement member history**

When adding employees to a group, close previous active `attendance_group_member` records and create new effective records.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter api test attendance-group
```

Expected: employee has only one effective attendance group per date.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/shift apps/api/src/modules/attendance-group
git commit -m "feat(api): add shift and attendance group modules"
```

### Task 7: Implement Check-In and Attendance Calculator

**Files:**

- Create: `apps/api/src/modules/attendance/checkin/*`
- Create: `apps/api/src/modules/attendance/calculator/*`
- Create: `apps/api/src/modules/attendance/result/*`
- Test: `apps/api/src/modules/attendance/calculator/attendance-calculator.spec.ts`

- [ ] **Step 1: Write calculator tests from case matrix**

Implement tests for C001-C018 from `docs/design/attendance-calculation-cases.md`.

- [ ] **Step 2: Implement pure calculator**

The calculator accepts employee, shift, attendance group, check-in records, leave records, and returns an `attendance_result` payload.

- [ ] **Step 3: Implement check-in API**

Support `GET /api/v1/attendance/checkin-context` and `POST /api/v1/attendance/checkin`.

- [ ] **Step 4: Implement idempotency**

Use `tenant_id + employee_id + idempotency_key` to avoid duplicate records.

- [ ] **Step 5: Run tests**

```bash
pnpm --filter api test attendance-calculator checkin
```

Expected: all calculation cases and duplicate check-in cases pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/attendance
git commit -m "feat(api): add attendance checkin and calculator"
```

### Task 8: Implement Leave and Repair Approval

**Files:**

- Create: `apps/api/src/modules/leave/*`
- Create: `apps/api/src/modules/repair/*`
- Test: `apps/api/src/modules/repair/repair.service.spec.ts`
- Test: `apps/api/src/modules/leave/leave.service.spec.ts`

- [ ] **Step 1: Implement state machine**

Support `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `REVOKED`.

- [ ] **Step 2: Implement repair approval side effect**

Approved repair creates `checkin_record(method='MANUAL')` with `source_request_id`.

- [ ] **Step 3: Implement leave approval side effect**

Approved leave triggers affected date recalculation.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter api test leave repair
```

Expected: approved repair creates manual record and triggers recalculation.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/leave apps/api/src/modules/repair
git commit -m "feat(api): add leave and repair approvals"
```

### Task 9: Implement Reports and Monthly Locking

**Files:**

- Create: `apps/api/src/modules/report/*`
- Create: `apps/api/src/jobs/report-export.job.ts`
- Test: `apps/api/src/modules/report/report.service.spec.ts`

- [ ] **Step 1: Implement monthly query**

Support `GET /api/v1/reports/monthly`.

- [ ] **Step 2: Implement export job**

Support `POST /api/v1/reports/monthly/export` and `GET /api/v1/reports/tasks/:taskId`.

- [ ] **Step 3: Implement monthly locking**

After confirmed export, set `attendance_result.is_finalized=true`.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter api test report
```

Expected: finalized results cannot be changed by normal repair approval.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/report apps/api/src/jobs
git commit -m "feat(api): add monthly reports and locking"
```

### Task 10: Build Minimal Admin and Miniapp Flows

**Files:**

- Create: `apps/admin/src/pages/*`
- Create: `apps/miniapp/src/pages/*`
- Create: `packages/shared-types/src/*`

- [ ] **Step 1: Add shared API types**

Mirror request and response DTOs from `docs/design/api-contract-v1.md`.

- [ ] **Step 2: Build admin MVP pages**

Implement organization, employee, shift, attendance group, result, leave approval, repair approval, and monthly report pages.

- [ ] **Step 3: Build miniapp MVP pages**

Implement login, check-in page, check-in result, attendance records, leave request, repair request, and profile page.

- [ ] **Step 4: Run frontend checks**

```bash
pnpm --filter admin typecheck
pnpm --filter miniapp typecheck
```

Expected: both frontend apps pass type checks.

- [ ] **Step 5: Commit**

```bash
git add apps/admin apps/miniapp packages/shared-types
git commit -m "feat: add admin and miniapp mvp flows"
```

---

## 4. Verification Gate

Before declaring Phase 1 complete, run:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

Expected:

- All TypeScript projects pass type checks.
- API unit and integration tests pass.
- Frontend builds complete.
- Tenant isolation and permission tests pass.
- Attendance calculation C001-C018 pass.

---

## 5. Known Scope Boundaries

Phase 1 excludes:

- Multi-level configurable approval workflow.
- Payroll calculation.
- Face recognition hardware integration.
- Enterprise WeChat / DingTalk integration.
- Multi-timezone factory support.

These are Phase 2 or Phase 3 features and should not be pulled into the MVP implementation.
