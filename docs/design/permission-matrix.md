# Factory ERP Lite Permission Matrix

版本：1.0  
来源：`factory-erp-attendance-design-v3.md`  
日期：2026-05  

---

## 1. 权限原则

- 权限判断必须在后端执行。
- 前端隐藏按钮只用于体验优化，不作为安全边界。
- 权限由“角色权限 + 数据范围”共同决定。
- 员工只能访问本人数据。
- 组织负责人只能访问授权组织单元及其子级。
- HR / 考勤管理员按授权工厂或组织单元访问。
- 系统管理员访问当前租户下全部工厂。

---

## 2. 角色定义

| 角色 | 说明 | 默认数据范围 |
| --- | --- | --- |
| `TENANT_ADMIN` | 租户系统管理员 | 当前租户全部工厂 |
| `HR_ADMIN` | HR / 考勤管理员 | 授权工厂或组织单元 |
| `ORG_MANAGER` | 组织负责人 | 授权组织单元及其子级 |
| `EMPLOYEE` | 普通员工 | 本人 |

---

## 3. 权限命名

格式：

```txt
module:resource:action
```

示例：

- `employee:profile:view`
- `attendance:record:view`
- `attendance:report:export`
- `leave:request:approve`
- `repair:request:approve`

---

## 4. 权限矩阵

| 权限 | 管理员 | HR | 组织负责人 | 员工 |
| --- | --- | --- | --- | --- |
| `account:user:view` | 是 | 否 | 否 | 否 |
| `account:user:manage` | 是 | 否 | 否 | 否 |
| `permission:role:manage` | 是 | 否 | 否 | 否 |
| `organization:unit:view` | 是 | 是 | 是 | 否 |
| `organization:unit:manage` | 是 | 是 | 否 | 否 |
| `employee:profile:view` | 是 | 是 | 是 | 本人 |
| `employee:profile:edit` | 是 | 是 | 否 | 否 |
| `shift:rule:view` | 是 | 是 | 是 | 否 |
| `shift:rule:manage` | 是 | 是 | 否 | 否 |
| `attendance:group:view` | 是 | 是 | 是 | 否 |
| `attendance:group:manage` | 是 | 是 | 否 | 否 |
| `attendance:checkin:create` | 否 | 否 | 否 | 本人 |
| `attendance:record:view` | 是 | 是 | 是 | 本人 |
| `attendance:record:edit` | 是 | 是 | 否 | 否 |
| `attendance:result:view` | 是 | 是 | 是 | 本人 |
| `attendance:result:recalculate` | 是 | 是 | 否 | 否 |
| `attendance:report:export` | 是 | 是 | 否 | 否 |
| `leave:request:create` | 是 | 是 | 是 | 本人 |
| `leave:request:view` | 是 | 是 | 是 | 本人 |
| `leave:request:approve` | 是 | 是 | 是 | 否 |
| `repair:request:create` | 是 | 是 | 是 | 本人 |
| `repair:request:view` | 是 | 是 | 是 | 本人 |
| `repair:request:approve` | 是 | 是 | 是 | 否 |
| `audit-log:view` | 是 | 是 | 否 | 否 |

---

## 5. 数据范围规则

### 5.1 管理员

管理员可访问当前 `tenant_id` 下全部数据，但不能跨租户。

### 5.2 HR / 考勤管理员

HR 可被授权到：

- 一个或多个 `factory_id`。
- 一个或多个 `org_unit_id`。

授权到 `org_unit_id` 时，默认包含该组织单元所有子级。

### 5.3 组织负责人

组织负责人可访问：

- 授权组织单元。
- 授权组织单元下所有子级员工。
- 管辖范围内的请假、补卡审批。

组织负责人不可维护角色、账号、班次规则和考勤组规则。

### 5.4 员工

员工只能访问：

- 本人档案摘要。
- 本人打卡记录。
- 本人考勤结果。
- 本人请假和补卡申请。

员工不能通过传入其他 `employeeId` 访问他人数据。

---

## 6. 后端校验要求

每个需要数据范围的接口必须执行：

1. 从 JWT 解析 `tenant_id`、`user_id`、`employee_id`、角色。
2. 查询当前用户数据范围。
3. 将请求目标资源映射到 `factory_id` 或 `org_unit_id`。
4. 判断目标资源是否在授权范围内。
5. 拒绝越权访问，返回 `403xx` 错误码。

禁止：

- 只在前端隐藏按钮。
- 只根据 URL 中的 `tenantId` 判断租户。
- 接口允许客户端任意传入 `employeeId` 后直接查询。

---

## 7. 最小测试用例

| 编号 | 场景 | 期望 |
| --- | --- | --- |
| P001 | 员工查询自己的考勤结果 | 允许 |
| P002 | 员工查询他人考勤结果 | 403 |
| P003 | 组织负责人查询管辖组织员工结果 | 允许 |
| P004 | 组织负责人查询非管辖组织员工结果 | 403 |
| P005 | HR 查询授权工厂员工 | 允许 |
| P006 | HR 查询未授权工厂员工 | 403 |
| P007 | 管理员查询当前租户全部员工 | 允许 |
| P008 | 管理员查询其他租户员工 | 403 |
| P009 | 组织负责人审批管辖员工补卡 | 允许 |
| P010 | 组织负责人审批非管辖员工补卡 | 403 |
