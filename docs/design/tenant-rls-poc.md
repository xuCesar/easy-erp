# Tenant RLS POC

版本：1.0  
日期：2026-05-18  
关联任务：GitHub Issue #3

---

## 1. 目的

Task 3 的目标不是立即在生产 schema 中全面启用 PostgreSQL RLS，而是建立应用侧租户上下文和一个可验证的 RLS 接入点。

当前实现包含：

- `AsyncLocalStorage` 租户上下文。
- `TenantMiddleware` 从认证后的 `req.user` 注入租户上下文。
- `TenantPrismaService.runInTenantTransaction()` 在事务内执行 `set_config('app.tenant_id', tenantId, true)`。
- 单元测试覆盖上下文隔离和缺失上下文拒绝。

---

## 2. 当前边界

已完成：

- 应用内可以安全读取当前 `tenantId`、`userId`、`factoryIds`。
- 嵌套上下文不会污染外层上下文。
- 缺少上下文时，租户事务会直接拒绝执行。
- 事务开始时会设置 PostgreSQL session-local `app.tenant_id`。

未完成：

- 尚未启用数据库表级 RLS policy。
- 尚未添加真实数据库集成测试。
- 尚未覆盖 BullMQ 后台任务的租户上下文恢复。
- 尚未禁止所有直接使用裸 Prisma Client 的路径。

---

## 3. 后续启用 RLS 的最低要求

启用任何生产表 RLS 前，必须完成：

1. 为目标表添加 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`。
2. 添加基于 `current_setting('app.tenant_id')::uuid` 的 policy。
3. 添加集成测试证明租户 A 无法读取租户 B 数据。
4. 验证 Prisma `$transaction` 内 `set_config(..., true)` 只在当前事务生效。
5. 验证后台任务显式传入并恢复租户上下文。
6. 约束业务模块只能通过租户感知数据访问层访问业务表。

---

## 4. POC SQL 示例

```sql
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_employee
ON employee
USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

事务内设置：

```sql
SELECT set_config('app.tenant_id', '<tenant uuid>', true);
```

第三个参数为 `true` 时，配置仅在当前事务中生效。
