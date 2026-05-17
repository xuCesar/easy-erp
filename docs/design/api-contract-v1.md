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

---

## 6. 班次与考勤组

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

### `POST /api/v1/attendance-groups/:id/members`

请求：

```json
{
  "employeeIds": ["employee-id-1", "employee-id-2"],
  "effectiveFrom": "2026-05-17"
}
```

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
    "requirePhoto": false
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
