# Prisma Schema Draft

版本：1.0  
来源：`factory-erp-er-model.md`  
日期：2026-05  

---

## 1. 文档目的

本文档将 ER 设计转换为 Prisma Schema 草案，作为后续创建 `apps/api/prisma/schema.prisma` 的起点。

注意：

- 这是 schema 草案，不是已验证可迁移的最终文件。
- PostgreSQL RLS、部分唯一索引、`inet` 类型、数组默认值等能力可能需要手写 SQL migration 补充。
- 生产实现前必须运行 `prisma validate`、`prisma migrate dev` 和租户隔离测试。

---

## 2. Prisma Schema 草案

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum EntityStatus {
  ACTIVE
  DISABLED
}

enum AccountStatus {
  ACTIVE
  DISABLED
}

enum EmployeeStatus {
  ACTIVE
  INACTIVE
  RESIGNED
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum OrgUnitType {
  DEPARTMENT
  WORKSHOP
  LINE
  TEAM
  GROUP
  CUSTOM
}

enum CheckinType {
  CLOCK_IN
  CLOCK_OUT
}

enum CheckinMethod {
  GPS
  WIFI
  PHOTO
  DEVICE
  MANUAL
}

enum AttendancePrimaryStatus {
  NORMAL
  ABNORMAL
  ABSENT
  LEAVE
  REST
  HOLIDAY
}

enum LeaveType {
  ANNUAL
  SICK
  PERSONAL
  MARRIAGE
  MATERNITY
  OTHER
}

enum ApprovalStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
  CANCELLED
  REVOKED
}

model Tenant {
  id        String       @id @default(uuid()) @db.Uuid
  name      String       @db.VarChar(128)
  status    EntityStatus @default(ACTIVE)
  createdAt DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime     @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime?    @map("deleted_at") @db.Timestamptz(6)

  factories    Factory[]
  accounts     AccountUser[]
  employees    Employee[]
  orgUnits     OrgUnit[]
  shifts       Shift[]
  auditLogs    AuditLog[]

  @@map("tenant")
}

model Factory {
  id        String       @id @default(uuid()) @db.Uuid
  tenantId  String       @map("tenant_id") @db.Uuid
  name      String       @db.VarChar(128)
  address   String?      @db.VarChar(256)
  timezone  String       @default("Asia/Shanghai") @db.VarChar(64)
  status    EntityStatus @default(ACTIVE)
  createdAt DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime     @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime?    @map("deleted_at") @db.Timestamptz(6)

  tenant           Tenant                  @relation(fields: [tenantId], references: [id])
  orgUnits         OrgUnit[]
  employees        Employee[]
  shifts           Shift[]
  attendanceGroups AttendanceGroup[]
  checkinRecords   CheckinRecord[]
  attendanceResults AttendanceResult[]

  @@index([tenantId, status])
  @@map("factory")
}

model OrgUnit {
  id        String       @id @default(uuid()) @db.Uuid
  tenantId  String       @map("tenant_id") @db.Uuid
  factoryId String       @map("factory_id") @db.Uuid
  parentId  String?      @map("parent_id") @db.Uuid
  name      String       @db.VarChar(64)
  type      OrgUnitType
  sortOrder Int          @default(0) @map("sort_order")
  status    EntityStatus @default(ACTIVE)
  createdAt DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime     @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime?    @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant    @relation(fields: [tenantId], references: [id])
  factory  Factory   @relation(fields: [factoryId], references: [id])
  parent   OrgUnit?  @relation("OrgUnitTree", fields: [parentId], references: [id])
  children OrgUnit[] @relation("OrgUnitTree")
  employees Employee[]

  @@index([tenantId, factoryId, parentId])
  @@index([tenantId, factoryId, status])
  @@map("org_unit")
}

model AccountUser {
  id           String        @id @default(uuid()) @db.Uuid
  tenantId     String        @map("tenant_id") @db.Uuid
  employeeId   String?       @map("employee_id") @db.Uuid
  phone        String        @db.VarChar(20)
  passwordHash String        @map("password_hash") @db.VarChar(255)
  status       AccountStatus @default(ACTIVE)
  lastLoginAt  DateTime?     @map("last_login_at") @db.Timestamptz(6)
  createdAt    DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime?     @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant    @relation(fields: [tenantId], references: [id])
  employee Employee? @relation(fields: [employeeId], references: [id])

  createdAttendanceGroupMembers AttendanceGroupMember[]
  auditLogs AuditLog[]

  @@unique([tenantId, phone])
  @@index([tenantId, employeeId])
  @@map("account_user")
}

model Employee {
  id          String         @id @default(uuid()) @db.Uuid
  tenantId    String         @map("tenant_id") @db.Uuid
  factoryId   String         @map("factory_id") @db.Uuid
  orgUnitId   String?        @map("org_unit_id") @db.Uuid
  empNo       String         @map("emp_no") @db.VarChar(32)
  name        String         @db.VarChar(64)
  phone       String?        @db.VarChar(20)
  idCard      String?        @map("id_card") @db.VarChar(32)
  gender      Gender?
  entryDate   DateTime       @map("entry_date") @db.Date
  exitDate    DateTime?      @map("exit_date") @db.Date
  status      EmployeeStatus @default(ACTIVE)
  deviceId    String?        @map("device_id") @db.VarChar(128)
  createdAt   DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime?      @map("deleted_at") @db.Timestamptz(6)

  tenant    Tenant    @relation(fields: [tenantId], references: [id])
  factory   Factory   @relation(fields: [factoryId], references: [id])
  orgUnit   OrgUnit?  @relation(fields: [orgUnitId], references: [id])
  accounts  AccountUser[]

  attendanceGroupMembers AttendanceGroupMember[]
  checkinRecords         CheckinRecord[]
  attendanceResults      AttendanceResult[]
  leaveRequests          LeaveRequest[]
  repairRequests         RepairRequest[]

  @@unique([tenantId, empNo])
  @@index([tenantId, factoryId, status])
  @@index([tenantId, orgUnitId])
  @@map("employee")
}

model Shift {
  id                       String   @id @default(uuid()) @db.Uuid
  tenantId                 String   @map("tenant_id") @db.Uuid
  factoryId                String   @map("factory_id") @db.Uuid
  name                     String   @db.VarChar(64)
  startTime                DateTime @map("start_time") @db.Time(6)
  endTime                  DateTime @map("end_time") @db.Time(6)
  crossDay                 Boolean  @default(false) @map("cross_day")
  workMinutes              Int      @map("work_minutes")
  lateGraceMinutes         Int      @default(0) @map("late_grace_minutes")
  earlyLeaveGraceMinutes   Int      @default(0) @map("early_leave_grace_minutes")
  overtimeStartMinutes     Int      @default(30) @map("overtime_start_minutes")
  restStartTime            DateTime? @map("rest_start_time") @db.Time(6)
  restEndTime              DateTime? @map("rest_end_time") @db.Time(6)
  color                    String?  @db.VarChar(7)
  createdAt                DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt                DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt                DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id])
  factory Factory @relation(fields: [factoryId], references: [id])
  attendanceGroups AttendanceGroup[]
  attendanceResults AttendanceResult[]

  @@index([tenantId, factoryId])
  @@map("shift")
}

model AttendanceGroup {
  id                  String   @id @default(uuid()) @db.Uuid
  tenantId            String   @map("tenant_id") @db.Uuid
  factoryId           String   @map("factory_id") @db.Uuid
  name                String   @db.VarChar(64)
  shiftId             String   @map("shift_id") @db.Uuid
  checkinMethods      String[] @map("checkin_methods")
  gpsLat              Decimal? @map("gps_lat") @db.Decimal(10, 7)
  gpsLng              Decimal? @map("gps_lng") @db.Decimal(10, 7)
  gpsRadiusMeters     Int?     @map("gps_radius_meters")
  wifiSsid            String?  @map("wifi_ssid") @db.VarChar(64)
  wifiBssid           String?  @map("wifi_bssid") @db.VarChar(64)
  requirePhoto        Boolean  @default(false) @map("require_photo")
  allowOutsideCheckin Boolean  @default(false) @map("allow_outside_checkin")
  createdAt           DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt           DateTime? @map("deleted_at") @db.Timestamptz(6)

  factory Factory @relation(fields: [factoryId], references: [id])
  shift Shift @relation(fields: [shiftId], references: [id])
  members AttendanceGroupMember[]
  attendanceResults AttendanceResult[]

  @@index([tenantId, factoryId])
  @@map("attendance_group")
}

model AttendanceGroupMember {
  id                String   @id @default(uuid()) @db.Uuid
  tenantId          String   @map("tenant_id") @db.Uuid
  factoryId         String   @map("factory_id") @db.Uuid
  employeeId        String   @map("employee_id") @db.Uuid
  attendanceGroupId String   @map("attendance_group_id") @db.Uuid
  effectiveFrom     DateTime @map("effective_from") @db.Date
  effectiveTo       DateTime? @map("effective_to") @db.Date
  createdBy         String   @map("created_by") @db.Uuid
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt         DateTime? @map("deleted_at") @db.Timestamptz(6)

  employee Employee @relation(fields: [employeeId], references: [id])
  attendanceGroup AttendanceGroup @relation(fields: [attendanceGroupId], references: [id])
  creator AccountUser @relation(fields: [createdBy], references: [id])

  @@index([tenantId, employeeId, effectiveFrom, effectiveTo])
  @@index([tenantId, attendanceGroupId])
  @@map("attendance_group_member")
}

model CheckinRecord {
  id               String        @id @default(uuid()) @db.Uuid
  tenantId         String        @map("tenant_id") @db.Uuid
  factoryId        String        @map("factory_id") @db.Uuid
  employeeId       String        @map("employee_id") @db.Uuid
  checkinType      CheckinType   @map("checkin_type")
  checkinAt        DateTime      @map("checkin_at") @db.Timestamptz(6)
  clientEventAt    DateTime?     @map("client_event_at") @db.Timestamptz(6)
  serverReceivedAt DateTime      @default(now()) @map("server_received_at") @db.Timestamptz(6)
  method           CheckinMethod
  latitude         Decimal?      @db.Decimal(10, 7)
  longitude        Decimal?      @db.Decimal(10, 7)
  wifiSsid         String?       @map("wifi_ssid") @db.VarChar(64)
  wifiBssid        String?       @map("wifi_bssid") @db.VarChar(64)
  photoUrl         String?       @map("photo_url") @db.VarChar(512)
  deviceId         String?       @map("device_id") @db.VarChar(128)
  idempotencyKey   String?       @map("idempotency_key") @db.VarChar(128)
  sourceRequestId  String?       @map("source_request_id") @db.Uuid
  isValid          Boolean       @default(true) @map("is_valid")
  invalidReason    String?       @map("invalid_reason") @db.VarChar(256)
  ipAddress        String?       @map("ip_address") @db.VarChar(64)
  rawData          Json          @map("raw_data")
  createdAt        DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt        DateTime?     @map("deleted_at") @db.Timestamptz(6)

  factory Factory @relation(fields: [factoryId], references: [id])
  employee Employee @relation(fields: [employeeId], references: [id])
  clockInResults AttendanceResult[] @relation("ClockInRecord")
  clockOutResults AttendanceResult[] @relation("ClockOutRecord")

  @@unique([tenantId, employeeId, idempotencyKey])
  @@index([tenantId, employeeId, checkinAt])
  @@index([tenantId, factoryId, checkinAt])
  @@map("checkin_record")
}

model AttendanceResult {
  id                String                  @id @default(uuid()) @db.Uuid
  tenantId          String                  @map("tenant_id") @db.Uuid
  factoryId         String                  @map("factory_id") @db.Uuid
  employeeId        String                  @map("employee_id") @db.Uuid
  attendanceGroupId String                  @map("attendance_group_id") @db.Uuid
  shiftId           String                  @map("shift_id") @db.Uuid
  date              DateTime                @db.Date
  clockInRecordId   String?                 @map("clock_in_record_id") @db.Uuid
  clockOutRecordId  String?                 @map("clock_out_record_id") @db.Uuid
  clockInAt         DateTime?               @map("clock_in_at") @db.Timestamptz(6)
  clockOutAt        DateTime?               @map("clock_out_at") @db.Timestamptz(6)
  workMinutes       Int                     @default(0) @map("work_minutes")
  lateMinutes       Int                     @default(0) @map("late_minutes")
  earlyLeaveMinutes Int                     @default(0) @map("early_leave_minutes")
  absenceMinutes    Int                     @default(0) @map("absence_minutes")
  overtimeMinutes   Int                     @default(0) @map("overtime_minutes")
  primaryStatus     AttendancePrimaryStatus @map("primary_status")
  statusFlags       String[]                @map("status_flags")
  anomalyFlags      String[]                @map("anomaly_flags")
  calculatedAt      DateTime                @map("calculated_at") @db.Timestamptz(6)
  calculationVersion Int                    @default(1) @map("calculation_version")
  isFinalized       Boolean                 @default(false) @map("is_finalized")
  finalizedAt       DateTime?               @map("finalized_at") @db.Timestamptz(6)
  createdAt         DateTime                @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime                @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt         DateTime?               @map("deleted_at") @db.Timestamptz(6)

  factory Factory @relation(fields: [factoryId], references: [id])
  employee Employee @relation(fields: [employeeId], references: [id])
  attendanceGroup AttendanceGroup @relation(fields: [attendanceGroupId], references: [id])
  shift Shift @relation(fields: [shiftId], references: [id])
  clockInRecord CheckinRecord? @relation("ClockInRecord", fields: [clockInRecordId], references: [id])
  clockOutRecord CheckinRecord? @relation("ClockOutRecord", fields: [clockOutRecordId], references: [id])

  @@unique([tenantId, employeeId, date])
  @@index([tenantId, factoryId, date, primaryStatus])
  @@index([tenantId, attendanceGroupId, date])
  @@map("attendance_result")
}

model LeaveRequest {
  id            String         @id @default(uuid()) @db.Uuid
  tenantId      String         @map("tenant_id") @db.Uuid
  factoryId     String         @map("factory_id") @db.Uuid
  employeeId    String         @map("employee_id") @db.Uuid
  leaveType     LeaveType      @map("leave_type")
  startAt       DateTime       @map("start_at") @db.Timestamptz(6)
  endAt         DateTime       @map("end_at") @db.Timestamptz(6)
  durationHours Decimal        @map("duration_hours") @db.Decimal(5, 1)
  reason        String
  attachments   String[]
  status        ApprovalStatus
  approverId    String?        @map("approver_id") @db.Uuid
  approvedAt    DateTime?      @map("approved_at") @db.Timestamptz(6)
  rejectReason  String?        @map("reject_reason")
  cancelReason  String?        @map("cancel_reason")
  createdAt     DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt     DateTime?      @map("deleted_at") @db.Timestamptz(6)

  employee Employee @relation(fields: [employeeId], references: [id])

  @@index([tenantId, employeeId, startAt, endAt])
  @@map("leave_request")
}

model RepairRequest {
  id           String         @id @default(uuid()) @db.Uuid
  tenantId     String         @map("tenant_id") @db.Uuid
  factoryId    String         @map("factory_id") @db.Uuid
  employeeId   String         @map("employee_id") @db.Uuid
  targetDate   DateTime       @map("target_date") @db.Date
  repairType   CheckinType    @map("repair_type")
  repairAt     DateTime       @map("repair_at") @db.Timestamptz(6)
  reason       String
  attachments  String[]
  status       ApprovalStatus
  approverId   String?        @map("approver_id") @db.Uuid
  approvedAt   DateTime?      @map("approved_at") @db.Timestamptz(6)
  rejectReason String?        @map("reject_reason")
  createdAt    DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime?      @map("deleted_at") @db.Timestamptz(6)

  employee Employee @relation(fields: [employeeId], references: [id])

  @@index([tenantId, employeeId, targetDate])
  @@map("repair_request")
}

model AuditLog {
  id              String   @id @default(uuid()) @db.Uuid
  tenantId        String   @map("tenant_id") @db.Uuid
  factoryId       String?  @map("factory_id") @db.Uuid
  actorUserId     String   @map("actor_user_id") @db.Uuid
  actorEmployeeId String?  @map("actor_employee_id") @db.Uuid
  action          String   @db.VarChar(64)
  resourceType    String   @map("resource_type") @db.VarChar(64)
  resourceId      String   @map("resource_id") @db.Uuid
  before          Json?
  after           Json?
  requestId       String   @map("request_id") @db.Uuid
  ipAddress       String?  @map("ip_address") @db.VarChar(64)
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id])
  actor AccountUser @relation(fields: [actorUserId], references: [id])

  @@index([tenantId, resourceType, resourceId])
  @@index([tenantId, actorUserId, createdAt])
  @@map("audit_log")
}
```

---

## 3. 需要手写 SQL Migration 的约束

### 3.1 部分唯一索引：已批准补卡唯一

Prisma Schema 不能直接表达“仅 `APPROVED` 状态唯一”的部分索引，需在 migration SQL 中补充：

```sql
CREATE UNIQUE INDEX repair_request_approved_unique_idx
ON repair_request (tenant_id, employee_id, target_date, repair_type)
WHERE status = 'APPROVED' AND deleted_at IS NULL;
```

### 3.2 考勤组成员有效期不重叠

PostgreSQL 可使用 exclusion constraint 或事务内业务校验。Phase 1 推荐先用事务内查询加锁校验，避免引入过早复杂约束。

校验规则：

```txt
同一 tenant_id + employee_id 下，任意日期只能命中一条 effective_from/effective_to 范围。
```

### 3.3 RLS 策略

RLS 在 Phase 0 POC 通过后启用。策略示例：

```sql
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_employee
ON employee
USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

应用侧必须在事务内设置：

```sql
SET LOCAL app.tenant_id = '<tenant uuid>';
```

---

## 4. Schema 实施顺序

推荐首批 migration 顺序：

1. 创建枚举。
2. 创建 `tenant`、`factory`。
3. 创建 `org_unit`、`employee`、`account_user`。
4. 创建 `shift`、`attendance_group`、`attendance_group_member`。
5. 创建 `checkin_record`、`attendance_result`。
6. 创建 `leave_request`、`repair_request`。
7. 创建 `audit_log`。
8. 补充手写 SQL 索引和 RLS POC migration。

---

## 5. 验证命令

后续工程初始化后执行：

```bash
pnpm --filter api prisma validate
pnpm --filter api prisma migrate dev
pnpm --filter api prisma generate
```

通过标准：

- Prisma schema 校验通过。
- 空库 migration 成功。
- Prisma client 正常生成。
- 租户隔离测试通过。
