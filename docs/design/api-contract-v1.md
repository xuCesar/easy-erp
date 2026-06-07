# Factory ERP Lite API Contract V1

版本：1.0  
来源：`factory-erp-attendance-design-v3.md`  
日期：2026-05  

---

## 1. 基本规范

- API 前缀：`/api/v1`
- 请求格式：`application/json`
- 认证方式：`Authorization: Bearer <token>`
- 时间格式：ISO 8601，例如 `2026-05-17T08:00:00+08:00`
- 分页参数：`page=1&pageSize=20`，默认 20，最大 100
- 响应必须包含 `requestId`

---

## 2. 统一响应

### 2.1 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "requestId": "018f8c9a-77a0-7c01-9a7a-0b3a4c5d6e7f"
}
```

### 2.2 分页响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  },
  "requestId": "018f8c9a-77a0-7c01-9a7a-0b3a4c5d6e7f"
}
```

### 2.3 错误响应

```json
{
  "code": 40001,
  "message": "员工不存在",
  "data": null,
  "requestId": "018f8c9a-77a0-7c01-9a7a-0b3a4c5d6e7f"
}
```

---

## 3. 错误码

| 错误码范围 | 含义 |
| --- | --- |
| `0` | 成功 |
| `40001 - 40099` | 参数校验错误 |
| `40101 - 40199` | 认证失败 |
| `40301 - 40399` | 权限不足 |
| `40401 - 40499` | 资源不存在 |
| `40901 - 40999` | 业务冲突 |
| `42201 - 42299` | 业务规则校验失败 |
| `50001 - 50099` | 服务器内部错误 |

---

## 4. 认证

### `POST /api/v1/auth/login`

请求：

```json
{
  "phone": "13800000000",
  "password": "password123"
}
```

响应：

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "expiresIn": 7200,
  "user": {
    "id": "user-id",
    "tenantId": "tenant-id",
    "employeeId": "employee-id",
    "roles": ["EMPLOYEE"]
  }
}
```

### `POST /api/v1/auth/refresh`

请求：

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

### `POST /api/v1/auth/logout`

请求：

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

### `GET /api/v1/auth/me`

返回当前账号、角色、数据范围和后台默认工作范围。管理后台应优先使用该接口自动选择工厂和组织，避免要求用户手动输入内部 ID。

响应数据：

```json
{
  "user": {
    "id": "user-id",
    "tenantId": "tenant-id",
    "employeeId": "employee-id",
    "phone": "13800000000",
    "roles": ["HR_ADMIN"],
    "status": "ACTIVE",
    "dataScopes": [{ "type": "FACTORY", "factoryId": "factory-id" }]
  },
  "employee": {
    "id": "employee-id",
    "factoryId": "factory-id",
    "orgUnitId": "org-unit-id",
    "empNo": "E001",
    "name": "张三",
    "phone": "13800000000",
    "entryDate": "2026-05-17",
    "status": "ACTIVE"
  },
  "factories": [{ "id": "factory-id", "name": "杭州工厂", "timezone": "Asia/Shanghai", "status": "ACTIVE" }],
  "orgUnits": [],
  "defaultScope": { "factoryId": "factory-id", "orgUnitId": "org-unit-id" }
}
```

### 账号管理接口

轻量账号管理仅维护考勤 MVP 所需的账号、员工绑定、角色和状态，不提供自定义权限模板。

- `GET /api/v1/accounts`
- `POST /api/v1/accounts`
- `PATCH /api/v1/accounts/:id`

创建请求：

```json
{
  "phone": "13800000000",
  "password": "password123",
  "employeeId": "employee-id",
  "roles": ["EMPLOYEE"],
  "status": "ACTIVE"
}
```

---

## 5. 组织与员工

### `GET /api/v1/org-units`

查询工厂下组织树。

查询参数：

| 参数 | 说明 |
| --- | --- |
| `factoryId` | 工厂 ID |

### `POST /api/v1/org-units`

请求：

```json
{
  "factoryId": "factory-id",
  "parentId": null,
  "name": "生产一组",
  "type": "GROUP",
  "sortOrder": 10
}
```

### `PATCH /api/v1/org-units/:id`

请求：

```json
{
  "parentId": null,
  "name": "生产二组",
  "type": "GROUP",
  "sortOrder": 20,
  "status": "ACTIVE"
}
```

说明：

- `parentId` 可以为 `null`，表示调整为工厂直属组织。
- 不允许跨租户或跨工厂挂载父组织。

### `DELETE /api/v1/org-units/:id`

软删除组织单元。

删除前必须确认：

- 不存在有效子组织。
- 不存在有效员工。

### `GET /api/v1/employees`

查询参数：

| 参数 | 说明 |
| --- | --- |
| `factoryId` | 工厂 ID |
| `orgUnitId` | 组织单元 ID，可向下包含子级 |
| `status` | `ACTIVE`、`INACTIVE`、`RESIGNED` |
| `keyword` | 员工姓名、工号、手机号 |
| `page` | 页码 |
| `pageSize` | 每页数量 |

### `POST /api/v1/employees`

请求：

```json
{
  "factoryId": "factory-id",
  "orgUnitId": "org-unit-id",
  "empNo": "E001",
  "name": "张三",
  "phone": "13800000000",
  "entryDate": "2026-05-17",
  "status": "ACTIVE"
}
```

### `PATCH /api/v1/employees/:id`

请求：

```json
{
  "orgUnitId": null,
  "name": "张三",
  "phone": "13800000000",
  "status": "ACTIVE"
}
```

说明：

- `orgUnitId` 可以为 `null`，表示员工直接归属工厂。
- 更新 `orgUnitId` 时必须属于同一租户与同一工厂。
- 更新 `empNo` 时必须保持租户内唯一。

### `DELETE /api/v1/employees/:id`

软删除员工档案，后续涉及考勤、审批和报表时需保留历史数据引用。

---

## 6. 班次与考勤组

### `GET /api/v1/shifts`

查询工厂下班次。

查询参数：

| 参数 | 说明 |
| --- | --- |
| `factoryId` | 工厂 ID |

### `POST /api/v1/shifts`

请求：

```json
{
  "factoryId": "factory-id",
  "name": "白班",
  "startTime": "08:00",
  "endTime": "17:00",
  "crossDay": false,
  "workMinutes": 540,
  "lateGraceMinutes": 5,
  "earlyLeaveGraceMinutes": 0,
  "overtimeStartMinutes": 30,
  "restStartTime": "12:00",
  "restEndTime": "13:00",
  "color": "#1677ff"
}
```

### `PATCH /api/v1/shifts/:id`

请求字段同创建接口，所有字段均可按需传入。

说明：

- `crossDay = false` 时，`endTime` 必须晚于 `startTime`。
- `crossDay = true` 时，`endTime` 应早于 `startTime`。

### `DELETE /api/v1/shifts/:id`

软删除班次规则。后续如存在考勤组引用该班次，应先迁移考勤组规则。

### `GET /api/v1/attendance-groups`

查询工厂下考勤组。

查询参数：

| 参数 | 说明 |
| --- | --- |
| `factoryId` | 工厂 ID |

### `POST /api/v1/attendance-groups`

请求：

```json
{
  "factoryId": "factory-id",
  "name": "生产一组考勤",
  "shiftId": "shift-id",
  "checkinMethods": ["GPS", "WIFI"],
  "gpsLat": 30.1234567,
  "gpsLng": 120.1234567,
  "gpsRadiusMeters": 200,
  "wifiSsid": "factory-wifi",
  "wifiBssid": "00:11:22:33:44:55",
  "requirePhoto": false,
  "allowOutsideCheckin": false
}
```

### `PATCH /api/v1/attendance-groups/:id`

请求字段同创建接口，所有字段均可按需传入。

说明：

- 更新 `shiftId` 时，班次必须属于同一租户与同一工厂。
- 启用 GPS 打卡时必须提供经纬度与半径。
- 启用 Wi-Fi 打卡时必须提供 SSID 与 BSSID。

### `DELETE /api/v1/attendance-groups/:id`

软删除考勤组规则。历史成员归属和已生成考勤结果不应被物理删除。

### `POST /api/v1/attendance-groups/:id/members`

请求：

```json
{
  "employeeIds": ["employee-id-1", "employee-id-2"],
  "effectiveFrom": "2026-05-17"
}
```

说明：

- 新增成员归属时，会关闭员工上一条有效考勤组归属。
- 同一员工同一日期最多只能有一个有效考勤组。

---

## 7. 打卡

### `GET /api/v1/attendance/checkin-context`

返回当前员工今日班次、考勤组、已打卡状态。

响应数据：

```json
{
  "date": "2026-05-17",
  "shift": {
    "id": "shift-id",
    "name": "白班",
    "startTime": "08:00",
    "endTime": "17:00",
    "crossDay": false
  },
  "attendanceGroup": {
    "id": "group-id",
    "name": "生产一组考勤",
    "checkinMethods": ["GPS", "WIFI"],
    "gpsLat": 30.1234567,
    "gpsLng": 120.1234567,
    "gpsRadiusMeters": 300,
    "wifiSsid": "factory-wifi",
    "wifiBssid": "00:11:22:33:44:55",
    "requirePhoto": false,
    "allowOutsideCheckin": true
  },
  "status": {
    "clockInAt": null,
    "clockOutAt": null,
    "nextAction": "CLOCK_IN"
  }
}
```

### `POST /api/v1/attendance/checkin`

请求必须携带幂等键。

```json
{
  "checkinType": "CLOCK_IN",
  "clientEventAt": "2026-05-17T08:00:03+08:00",
  "idempotencyKey": "device-uuid:2026-05-17:CLOCK_IN:nonce",
  "location": {
    "latitude": 30.1234567,
    "longitude": 120.1234567
  },
  "wifi": {
    "ssid": "factory-wifi",
    "bssid": "00:11:22:33:44:55"
  },
  "deviceId": "device-fingerprint",
  "photoUrl": null
}
```

响应数据：

```json
{
  "recordId": "checkin-record-id",
  "checkinType": "CLOCK_IN",
  "checkinAt": "2026-05-17T08:00:05+08:00",
  "isValid": true,
  "invalidReason": null,
  "message": "打卡成功"
}
```

说明：

- GPS、Wi-Fi、拍照会按考勤组规则校验。
- `allowOutsideCheckin=true` 时，不满足规则仍可记录，但 `isValid=false` 且 `invalidReason` 说明异常原因。
- `allowOutsideCheckin=false` 时，不满足必需规则会返回业务冲突错误，不创建打卡记录。

---

## 8. 考勤结果

### `GET /api/v1/attendance/results`

查询参数：

| 参数 | 说明 |
| --- | --- |
| `factoryId` | 工厂 ID |
| `employeeId` | 员工 ID |
| `orgUnitId` | 组织单元 ID |
| `startDate` | 开始日期 |
| `endDate` | 结束日期 |
| `primaryStatus` | 主状态 |
| `page` | 页码 |
| `pageSize` | 每页数量 |

`primaryStatus` 当前取值：`NORMAL`、`ABNORMAL`、`ABSENT`、`LEAVE`、`REST`、`HOLIDAY`。迟到、早退、缺卡等细分原因由结果行中的分钟数和异常标记表达。

### `POST /api/v1/attendance/results/recalculate`

请求：

```json
{
  "employeeIds": ["employee-id"],
  "startDate": "2026-05-01",
  "endDate": "2026-05-31",
  "reason": "补卡审批通过后重算"
}
```

---

## 9. 请假与补卡

### `GET /api/v1/leave/requests`

查询参数：

| 参数 | 说明 |
| --- | --- |
| `factoryId` | 工厂 ID |
| `status` | `PENDING`、`APPROVED`、`REJECTED` |
| `keyword` | 员工姓名、工号或原因 |
| `page` | 页码 |
| `pageSize` | 每页数量 |

### `POST /api/v1/leave/requests`

```json
{
  "leaveType": "PERSONAL",
  "startAt": "2026-05-17T13:00:00+08:00",
  "endAt": "2026-05-17T17:00:00+08:00",
  "durationHours": 4,
  "reason": "个人事务",
  "attachments": []
}
```

### `POST /api/v1/leave/requests/:id/approve`

```json
{
  "comment": "同意"
}
```

### `POST /api/v1/leave/requests/:id/reject`

```json
{
  "rejectReason": "请假原因不充分"
}
```

### `POST /api/v1/repair/requests`

```json
{
  "targetDate": "2026-05-17",
  "repairType": "CLOCK_OUT",
  "repairAt": "2026-05-17T17:00:00+08:00",
  "reason": "下班忘记打卡",
  "attachments": []
}
```

### `GET /api/v1/repair/requests`

查询参数同请假审批列表。返回项统一包含 `type`、`employeeName`、`empNo`、`status`、`reason` 和补卡目标日期。

### `POST /api/v1/repair/requests/:id/approve`

```json
{
  "comment": "同意补卡"
}
```

---

## 10. 报表

### `GET /api/v1/reports/monthly`

查询参数：

| 参数 | 说明 |
| --- | --- |
| `factoryId` | 工厂 ID |
| `orgUnitId` | 组织单元 ID |
| `month` | `2026-05` |

### `POST /api/v1/reports/monthly/export`

请求：

```json
{
  "factoryId": "factory-id",
  "orgUnitId": null,
  "month": "2026-05"
}
```

响应数据：

```json
{
  "taskId": "report-task-id"
}
```

### `GET /api/v1/reports/tasks/:taskId`

响应数据：

```json
{
  "taskId": "report-task-id",
  "status": "COMPLETED",
  "downloadUrl": "signed-download-url"
}
```
