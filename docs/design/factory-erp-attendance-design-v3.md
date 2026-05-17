# Factory ERP Lite

## 工厂企业管理系统：模块化考勤系统设计文档 V3.0

文档状态：Draft  
版本：3.0  
日期：2026-05  
主设计源：本 Markdown 文件  

---

## 1. 文档说明

### 1.1 文档目的

本文档为 Factory ERP Lite 考勤模块的系统设计文档 V3.0，在 V2.0 基础上做以下调整：

- 将 V2 的 Word 文档内容整理为 Markdown，便于版本管理、代码评审和持续演进。
- 收紧 MVP 边界，优先交付“单工厂考勤闭环”，避免平台底座一次性过重。
- 补充账号与员工档案分离设计，避免认证身份与员工业务实体混用。
- 补充考勤组成员历史关系，支持员工调组、换班、离职后的历史回溯。
- 调整考勤结果模型，从单一状态枚举改为“主状态 + 状态标记 + 异常标记”。
- 明确打卡原始记录不可变，补卡、人工修正必须保留审批与审计链路。
- 补充 Prisma + PostgreSQL RLS 的落地风险和 POC 验证要求。
- 调整审批类 API 动作为 `POST`，语义更贴近命令操作。
- 补充小程序弱网打卡、客户端时间、服务端时间和重试幂等策略。
- 补充管理后台核心页面、权限边界、隐私合规和测试样例。

### 1.2 版本变更记录

| 版本 | 日期 | 变更说明 |
| --- | --- | --- |
| V1.0 | 2026-04 | 初版：基础架构、模块划分、技术栈 |
| V2.0 | 2026-05 | 补全数据模型、考勤规则、API 规范、状态机、运维策略 |
| V3.0 | 2026-05 | 收紧 MVP、补充生产化边界、账号员工分离、历史归属、审计与 RLS 验证 |

---

## 2. 项目背景与产品定位

### 2.1 背景

本系统面向中小型制造工厂，优先解决以下核心痛点：

- 纸质考勤、手工统计误差率高。
- 班次复杂，包含白班、夜班、跨天班、倒班等场景。
- 补卡、请假审批流程不规范，缺少审批留痕。
- 多工厂管理数据割裂，后续难以统一统计。
- 工厂一线人员移动端使用频率高，管理人员需要 PC 后台处理异常和报表。

### 2.2 产品目标

核心定位：

> 以考勤模块为切入点，构建可持续扩展的工厂数字化管理平台。

阶段目标：

| 阶段 | 目标 |
| --- | --- |
| 第一阶段 | 完成单工厂考勤管理闭环 |
| 第二阶段 | 支持多工厂协同、排班、加班管理 |
| 第三阶段 | 支持工资、计件、门禁、人脸识别等扩展模块 |

### 2.3 MVP 范围界定

MVP 以“可上线的单工厂考勤闭环”为目标，不追求一次性实现完整 ERP 平台。

| 功能 | MVP 是否包含 | 说明 |
| --- | --- | --- |
| 租户与工厂初始化 | 包含 | 支持单租户、单工厂初始化，为后续多租户预留字段和边界 |
| 账号登录与角色权限 | 包含 | 支持管理员、HR、组织负责人、员工四类基本角色 |
| 员工档案管理 | 包含 | 支持员工增删改查、入离职状态 |
| 组织单元管理 | 包含 | 支持工厂下弹性组织树，小微企业可不建多级车间/班组 |
| 班次管理 | 包含 | 支持固定班次、跨天班、休息时间、宽限期 |
| 考勤组管理 | 包含 | 支持考勤规则配置和员工加入/移出历史 |
| GPS + Wi-Fi 打卡 | 包含 | 小程序端完成基础打卡校验 |
| 拍照打卡 | 可选包含 | 作为考勤组规则开关，不作为所有工厂强制能力 |
| 考勤统计与月报导出 | 包含 | 支持按日、按月查询与 Excel 导出 |
| 补卡申请与审批 | 包含 | 审批通过后生成手工打卡记录并触发重算 |
| 请假申请与审批 | 包含 | Phase 1 可只记录请假，不强制实现假期余额扣减 |
| 多级审批流配置 | 不包含 | Phase 2 |
| 排班系统 | 不包含 | Phase 2 |
| 工资核算 | 不包含 | Phase 3 |
| 人脸识别设备集成 | 不包含 | Phase 3 |
| 企业微信/钉钉集成 | 不包含 | Phase 2 或客户项目定制 |

### 2.4 Phase 1 收敛原则

Phase 1 只做能够支撑上线试点的核心链路：

```txt
登录/租户上下文
  -> 组织/员工
  -> 班次/考勤组
  -> 小程序打卡
  -> 考勤结果计算
  -> 补卡/请假审批
  -> 月报查看与导出
```

以下能力只保留接口或字段预留，不在 Phase 1 做复杂实现：

- API Gateway 独立服务。
- 完整订阅计费。
- 多级审批编排器。
- 硬件设备接入。
- 工资规则引擎。
- 复杂消息通知中心。
- 多时区工厂。

---

## 3. 系统架构

### 3.1 整体架构

系统采用前后端分离架构：

```txt
微信小程序（员工端）
        │
管理后台 React Admin（PC）
        │
Nginx / API 接入层
        │
NestJS API
        │
├─ PostgreSQL：主业务数据
├─ Redis：防重、缓存、队列依赖
└─ MinIO / COS：照片与附件对象存储
```

### 3.2 架构分层

| 层次 | 组件说明 |
| --- | --- |
| 客户端层 | 微信小程序员工端 + React Admin 管理端 |
| 接入层 | Nginx 反向代理；Phase 1 不强制独立 API Gateway |
| 业务层 | NestJS 应用服务，按模块拆分 |
| 缓存层 | Redis：打卡防重、考勤规则缓存、队列依赖 |
| 持久层 | PostgreSQL：主业务数据；MinIO/COS：照片和附件 |
| 任务层 | BullMQ：异步考勤计算、报表生成 |

### 3.3 多租户架构

#### 3.3.1 隔离策略

采用“共享数据库 + 行级隔离字段”的设计，数据库层优先评估 PostgreSQL Row-Level Security（RLS）。

Phase 1 推荐分两步落地：

1. 应用层强制 `tenant_id` 条件，所有业务表带 `tenant_id`。
2. 在最小 POC 通过后，再启用 PostgreSQL RLS 作为数据库层兜底。

选择理由：

- 中小工厂客户数量初期有限，Schema-per-Tenant 运维复杂度高。
- 共享数据库更利于快速迭代和统一迁移。
- RLS 可降低应用层遗漏 `tenant_id` 过滤导致越权的风险。
- 未来单租户数据量过大时，可按 `tenant_id` 分区或迁移独立库。

#### 3.3.2 租户上下文传递

每个 HTTP 请求通过 JWT 携带 `tenant_id` 和当前用户身份。NestJS 中间件解析 Token 后，将租户上下文注入 AsyncLocalStorage。

```ts
// 示例：租户上下文注入。实际实现需结合认证 Guard 和异常处理。
tenantStorage.run(
  {
    tenantId: req.user.tenantId,
    userId: req.user.sub,
    factoryIds: req.user.factoryIds,
  },
  next,
);
```

应用层 Repository 必须显式处理租户条件。禁止在业务模块中直接绕过统一数据访问层访问跨租户数据。

#### 3.3.3 RLS 落地 POC 要求

在正式启用 RLS 前，必须完成以下验证：

- Prisma 普通查询能正确注入当前租户上下文。
- Prisma 事务中 `SET LOCAL app.tenant_id` 的生命周期正确。
- BullMQ 后台任务能显式传入并恢复租户上下文。
- Raw SQL 查询不能绕过 RLS。
- Migration、Seed、数据修复脚本具备明确的系统角色或维护通道。
- 连接池复用不会串租户。
- 测试用例覆盖“租户 A 无法读取租户 B 数据”。

#### 3.3.4 所有业务表强制字段

| 字段名 | 说明 |
| --- | --- |
| `tenant_id` | UUID，租户标识，NOT NULL，建立索引 |
| `factory_id` | UUID，所属工厂；平台级配置可为空，但业务数据原则上不为空 |
| `created_at` | TIMESTAMPTZ，创建时间 |
| `updated_at` | TIMESTAMPTZ，最后更新时间 |
| `deleted_at` | TIMESTAMPTZ，软删除时间，NULL 表示未删除 |

---

## 4. 模块设计

### 4.1 模块划分

| 模块 | 职责 |
| --- | --- |
| 平台核心 / auth | 登录、JWT 签发、刷新、登出、密码策略 |
| 平台核心 / tenant | 企业、工厂初始化，租户上下文 |
| 平台核心 / account | 系统账号、登录身份、账号与员工关联 |
| 平台核心 / permission | RBAC 权限模型、角色管理、权限分配 |
| 平台核心 / notification | 消息模板、推送渠道预留 |
| 平台核心 / audit-log | 关键变更操作审计日志，不可物理删除 |
| 业务 / employee | 员工档案、入离职管理、设备绑定 |
| 业务 / organization | 企业、工厂、弹性组织单元树 |
| 业务 / shift | 班次定义、休息时间、宽限期 |
| 业务 / attendance-group | 考勤组规则、成员历史归属 |
| 业务 / attendance | 打卡记录接收、考勤结果计算、统计查询 |
| 业务 / leave | 请假申请、审批、与考勤重算联动 |
| 业务 / repair | 补卡申请、审批、手工打卡记录生成 |
| 业务 / report | 日报、月报、Excel 导出 |

### 4.2 账号与员工分离

不要将员工档案直接等同于登录账号。管理员、HR、组织负责人、普通员工都可能登录系统，但他们不一定都只是一条员工记录。

推荐模型：

```txt
account_user（认证身份）
  ├─ employee_id?（可选关联员工档案）
  ├─ tenant_id
  ├─ phone / password_hash / status
  └─ roles

employee（员工业务档案）
  ├─ emp_no / name / phone / entry_date / exit_date
  ├─ factory_id / org_unit_id
  └─ employment status
```

约束：

- `account_user.phone` 用于登录认证。
- `employee.phone` 用于员工联系方式，可与账号手机号一致，但不强制承担认证语义。
- 一个员工通常关联一个账号，但系统应允许员工没有账号，例如只被管理员维护档案。
- 管理员账号可以不关联员工档案。

### 4.3 权限命名规范

统一采用：

```txt
module:resource:action
```

示例：

| 权限标识 | 说明 |
| --- | --- |
| `attendance:record:view` | 查看考勤记录 |
| `attendance:record:edit` | 修改考勤记录或人工标记 |
| `attendance:report:export` | 导出考勤报表 |
| `employee:profile:view` | 查看员工档案 |
| `employee:profile:edit` | 编辑员工档案 |
| `shift:rule:manage` | 管理班次和考勤规则 |
| `leave:request:approve` | 审批请假申请 |
| `repair:request:approve` | 审批补卡申请 |

### 4.4 基础角色与数据范围

| 角色 | 数据范围 | 典型权限 |
| --- | --- | --- |
| 系统管理员 | 当前租户全部工厂 | 用户、角色、组织、考勤规则、所有报表 |
| HR / 考勤管理员 | 授权工厂或组织单元 | 员工、考勤异常、审批、报表 |
| 组织负责人 | 授权组织单元及其子级 | 查看管辖范围考勤，审批管辖范围请假/补卡 |
| 员工 | 本人 | 打卡、查看本人记录、提交申请 |

权限校验必须在后端执行，前端只负责隐藏或禁用入口，不作为安全边界。

---

## 5. 核心数据模型

以下为核心表设计方向，最终以 Prisma Schema 和迁移文件为准。

### 5.1 账号表 `account_user`

| 字段 | 类型 / 说明 |
| --- | --- |
| `id` | UUID PK |
| `tenant_id` | UUID NOT NULL |
| `employee_id` | UUID FK -> employee，可为空 |
| `phone` | VARCHAR(20)，登录手机号，`UNIQUE(tenant_id, phone)` |
| `password_hash` | VARCHAR，密码哈希 |
| `status` | ENUM('ACTIVE','DISABLED') |
| `last_login_at` | TIMESTAMPTZ |
| `created_at / updated_at / deleted_at` | 标准时间戳字段 |

索引建议：

- `UNIQUE (tenant_id, phone)`
- `INDEX (tenant_id, employee_id)`

### 5.2 员工表 `employee`

| 字段 | 类型 / 说明 |
| --- | --- |
| `id` | UUID PK |
| `tenant_id / factory_id` | UUID NOT NULL |
| `org_unit_id` | UUID FK -> org_unit，可为空，表示直属工厂 |
| `emp_no` | VARCHAR(32)，员工工号，`UNIQUE(tenant_id, emp_no)` |
| `name` | VARCHAR(64) NOT NULL |
| `phone` | VARCHAR(20)，联系方式 |
| `id_card` | VARCHAR(32)，身份证号，可选，需脱敏展示 |
| `gender` | ENUM('MALE','FEMALE','OTHER') |
| `entry_date` | DATE，入职日期 |
| `exit_date` | DATE，离职日期，NULL 表示在职 |
| `status` | ENUM('ACTIVE','INACTIVE','RESIGNED') |
| `device_id` | VARCHAR(128)，绑定设备 ID，用于防作弊 |
| `created_at / updated_at / deleted_at` | 标准时间戳字段 |

索引建议：

- `INDEX (tenant_id, factory_id, status)`
- `INDEX (tenant_id, org_unit_id)`
- `UNIQUE (tenant_id, emp_no)`

说明：

- 不在 `employee` 上直接存当前 `attendance_group_id` 作为唯一事实来源。
- 员工加入考勤组的历史关系由 `attendance_group_member` 维护。

### 5.3 组织表

组织结构不强制固定为“车间 -> 班组”。对小微企业来说，过深层级会增加录入和维护成本；对中大型工厂，又需要表达车间、产线、班组等管理层级。因此 V3 采用“固定租户/工厂边界 + 弹性组织单元树”。

推荐模型：

```txt
tenant / company
  -> factory
    -> org_unit（可选树）
      -> employee
```

小微企业可以不创建任何多级组织，员工直接归属工厂：

```txt
企业
└─ 工厂
   └─ 员工
```

也可以只创建一层小组：

```txt
企业
└─ 工厂
   └─ 生产组
      └─ 员工
```

中大型企业可以按需创建多层：

```txt
企业
└─ 工厂
   └─ 车间
      └─ 产线
         └─ 班组
            └─ 员工
```

推荐表：`org_unit`

| 字段 | 类型 / 说明 |
| --- | --- |
| `id` | UUID PK |
| `tenant_id / factory_id` | UUID NOT NULL |
| `parent_id` | UUID FK -> org_unit，可为空，表示工厂直属组织 |
| `name` | VARCHAR(64)，组织名称 |
| `type` | ENUM('DEPARTMENT','WORKSHOP','LINE','TEAM','GROUP','CUSTOM') |
| `sort_order` | INTEGER，排序 |
| `status` | ENUM('ACTIVE','DISABLED') |
| `created_at / updated_at / deleted_at` | 标准时间戳字段 |

设计约束：

- `factory` 是稳定边界，用于考勤地点、Wi-Fi、数据权限和报表汇总。
- `org_unit` 是可选树，不要求每个企业都有车间、产线或班组。
- 员工表只保存当前 `org_unit_id`；如果员工直接归属工厂，`org_unit_id` 可为空。
- Phase 1 默认只维护员工当前组织归属；如果后续需要按历史组织追溯报表，可增加 `employee_org_unit_assignment(employee_id, org_unit_id, effective_from, effective_to)`。
- 权限和报表查询需要支持按某个 `org_unit` 向下展开子级。
- 考勤组不要等同于组织结构。考勤组独立存在，可按组织单元批量加入员工，也可手动维护成员。
- UI 可以根据 `org_unit.type` 展示“部门、车间、产线、班组、小组”，但底层不写死固定层级。

### 5.4 班次表 `shift`

| 字段 | 类型 / 说明 |
| --- | --- |
| `id` | UUID PK |
| `tenant_id / factory_id` | UUID NOT NULL |
| `name` | VARCHAR(64)，如“白班”“夜班” |
| `start_time` | TIME NOT NULL，如 08:00 |
| `end_time` | TIME NOT NULL，如 17:00 |
| `cross_day` | BOOLEAN，是否跨天班次 |
| `work_minutes` | INTEGER，标准工作时长 |
| `late_grace_minutes` | INTEGER，迟到宽限分钟 |
| `early_leave_grace_minutes` | INTEGER，早退宽限分钟 |
| `overtime_start_minutes` | INTEGER，加班起算阈值 |
| `rest_start_time` | TIME，可选 |
| `rest_end_time` | TIME，可选 |
| `color` | VARCHAR(7)，前端展示颜色 |
| `created_at / updated_at / deleted_at` | 标准时间戳字段 |

约束：

- `cross_day` 可由 `end_time < start_time` 推导，但建议仍存储显式字段，便于查询和校验。
- 休息时间跨天时，需要单独在计算器中处理，不能只靠 `TIME` 比较。

### 5.5 考勤组表 `attendance_group`

| 字段 | 类型 / 说明 |
| --- | --- |
| `id` | UUID PK |
| `tenant_id / factory_id` | UUID NOT NULL |
| `name` | VARCHAR(64) |
| `shift_id` | UUID FK -> shift，默认班次 |
| `checkin_methods` | ENUM('GPS','WIFI','PHOTO')[]，允许的打卡方式 |
| `gps_lat / gps_lng` | DECIMAL(10,7)，厂区中心坐标 |
| `gps_radius_meters` | INTEGER，GPS 打卡范围 |
| `wifi_ssid` | VARCHAR(64)，允许打卡的 Wi-Fi SSID |
| `wifi_bssid` | VARCHAR(64)，Wi-Fi BSSID |
| `require_photo` | BOOLEAN，是否强制拍照 |
| `allow_outside_checkin` | BOOLEAN，是否允许外勤 |
| `created_at / updated_at / deleted_at` | 标准时间戳字段 |

### 5.6 考勤组成员历史表 `attendance_group_member`

用于记录员工在不同时间段所属的考勤组，避免员工调组后历史月报归属错误。

| 字段 | 类型 / 说明 |
| --- | --- |
| `id` | UUID PK |
| `tenant_id / factory_id` | UUID NOT NULL |
| `employee_id` | UUID FK -> employee |
| `attendance_group_id` | UUID FK -> attendance_group |
| `effective_from` | DATE，生效开始日期 |
| `effective_to` | DATE，生效结束日期，NULL 表示当前仍有效 |
| `created_by` | UUID FK -> account_user |
| `created_at / updated_at / deleted_at` | 标准时间戳字段 |

约束：

- 同一员工在同一天只能归属一个有效考勤组。
- 新增成员关系时，应自动关闭上一条有效记录的 `effective_to`。
- 考勤计算按考勤日期查询当日有效考勤组，而不是读取员工当前组。

索引建议：

- `INDEX (tenant_id, employee_id, effective_from, effective_to)`
- `INDEX (tenant_id, attendance_group_id)`

### 5.7 打卡记录表 `checkin_record`

打卡记录是原始事实记录，原则上不可物理删除、不可覆盖修改。人工补卡和管理员修正也应通过新增记录或调整记录表达。

| 字段 | 类型 / 说明 |
| --- | --- |
| `id` | UUID PK |
| `tenant_id / factory_id` | UUID NOT NULL |
| `employee_id` | UUID FK -> employee |
| `checkin_type` | ENUM('CLOCK_IN','CLOCK_OUT') |
| `checkin_at` | TIMESTAMPTZ NOT NULL，最终参与计算的打卡时间 |
| `client_event_at` | TIMESTAMPTZ，客户端发起打卡时间 |
| `server_received_at` | TIMESTAMPTZ，服务端收到请求时间 |
| `method` | ENUM('GPS','WIFI','PHOTO','DEVICE','MANUAL') |
| `latitude / longitude` | DECIMAL(10,7)，打卡位置 |
| `wifi_ssid / wifi_bssid` | VARCHAR(64)，打卡时连接 Wi-Fi |
| `photo_url` | VARCHAR(512)，打卡照片 OSS 地址 |
| `device_id` | VARCHAR(128)，打卡设备 |
| `idempotency_key` | VARCHAR(128)，客户端幂等键 |
| `source_request_id` | UUID，补卡申请或人工调整来源，可为空 |
| `is_valid` | BOOLEAN，是否有效 |
| `invalid_reason` | VARCHAR(256)，无效原因 |
| `ip_address` | INET，客户端 IP |
| `raw_data` | JSONB，原始设备数据，用于审计 |
| `created_at / updated_at / deleted_at` | 标准时间戳字段；一般不使用软删除 |

索引建议：

- `INDEX (tenant_id, employee_id, checkin_at DESC)`
- `INDEX (tenant_id, factory_id, checkin_at)`
- `UNIQUE (tenant_id, employee_id, idempotency_key)`，当幂等键不为空时生效。

### 5.8 考勤结果表 `attendance_result`

V3 不再只依赖一个 `status` 枚举表达所有结果，改为主状态、状态标记和异常标记组合。

| 字段 | 类型 / 说明 |
| --- | --- |
| `id` | UUID PK |
| `tenant_id / factory_id` | UUID NOT NULL |
| `employee_id` | UUID FK -> employee |
| `attendance_group_id` | UUID FK -> attendance_group，当天归属 |
| `shift_id` | UUID FK -> shift，当天班次 |
| `date` | DATE，考勤日期，跨天班取班次开始日期 |
| `clock_in_record_id` | UUID FK -> checkin_record，可为空 |
| `clock_out_record_id` | UUID FK -> checkin_record，可为空 |
| `clock_in_at` | TIMESTAMPTZ，实际上班打卡时间 |
| `clock_out_at` | TIMESTAMPTZ，实际下班打卡时间 |
| `work_minutes` | INTEGER，实际工作分钟数 |
| `late_minutes` | INTEGER，迟到分钟数 |
| `early_leave_minutes` | INTEGER，早退分钟数 |
| `absence_minutes` | INTEGER，缺勤分钟数 |
| `overtime_minutes` | INTEGER，加班分钟数 |
| `primary_status` | ENUM('NORMAL','ABNORMAL','ABSENT','LEAVE','REST','HOLIDAY') |
| `status_flags` | TEXT[]，如 `['LATE','EARLY_LEAVE']` |
| `anomaly_flags` | TEXT[]，如 `['NO_CLOCK_OUT','LOCATION_INVALID']` |
| `calculated_at` | TIMESTAMPTZ，计算时间 |
| `calculation_version` | INTEGER，计算规则版本 |
| `is_finalized` | BOOLEAN，是否已锁定 |
| `finalized_at` | TIMESTAMPTZ，锁定时间 |
| `created_at / updated_at / deleted_at` | 标准时间戳字段 |

约束：

- `UNIQUE (tenant_id, employee_id, date)`
- 月报锁定后不允许直接修改结果，只能通过具备权限的“解锁/重算/审计”流程处理。
- 缺卡初始不直接等同于旷工，优先标记为 `ABNORMAL + NO_CLOCK_IN/NO_CLOCK_OUT`，待补卡、请假或管理员确认后再形成最终缺勤。

### 5.9 请假申请表 `leave_request`

| 字段 | 类型 / 说明 |
| --- | --- |
| `id` | UUID PK |
| `tenant_id / factory_id` | UUID NOT NULL |
| `employee_id` | UUID FK -> employee |
| `leave_type` | ENUM('ANNUAL','SICK','PERSONAL','MARRIAGE','MATERNITY','OTHER') |
| `start_at / end_at` | TIMESTAMPTZ，请假开始/结束时间 |
| `duration_hours` | DECIMAL(5,1)，请假时长 |
| `reason` | TEXT |
| `attachments` | TEXT[]，附件 OSS URL |
| `status` | ENUM，见审批状态机 |
| `approver_id` | UUID FK -> account_user |
| `approved_at` | TIMESTAMPTZ |
| `reject_reason` | TEXT |
| `cancel_reason` | TEXT |
| `created_at / updated_at / deleted_at` | 标准时间戳字段 |

Phase 1 策略：

- 请假余额管理可暂不实现，只记录请假事实并参与考勤计算。
- 若客户明确需要年假余额扣减，应单独设计 `leave_balance` 和调整流水。

### 5.10 补卡申请表 `repair_request`

| 字段 | 类型 / 说明 |
| --- | --- |
| `id` | UUID PK |
| `tenant_id / factory_id` | UUID NOT NULL |
| `employee_id` | UUID FK -> employee |
| `target_date` | DATE，补卡日期 |
| `repair_type` | ENUM('CLOCK_IN','CLOCK_OUT') |
| `repair_at` | TIMESTAMPTZ，申请补打的时间 |
| `reason` | TEXT NOT NULL |
| `attachments` | TEXT[]，佐证材料 |
| `status` | ENUM，见审批状态机 |
| `approver_id` | UUID FK -> account_user |
| `approved_at` | TIMESTAMPTZ |
| `reject_reason` | TEXT |
| `created_at / updated_at / deleted_at` | 标准时间戳字段 |

约束：

- 审批通过后生成一条 `checkin_record(method='MANUAL')`。
- `checkin_record.source_request_id` 指向补卡申请。
- 同一员工、同一日期、同一补卡类型只能存在一条已通过补卡。
- 补卡截止规则应可配置，默认不允许补上一个已锁定月份的卡。

### 5.11 审计日志表 `audit_log`

| 字段 | 类型 / 说明 |
| --- | --- |
| `id` | UUID PK |
| `tenant_id / factory_id` | UUID |
| `actor_user_id` | UUID，操作者账号 |
| `actor_employee_id` | UUID，可为空 |
| `action` | VARCHAR，如 `repair.approve` |
| `resource_type` | VARCHAR，如 `repair_request` |
| `resource_id` | UUID |
| `before` | JSONB，变更前关键字段 |
| `after` | JSONB，变更后关键字段 |
| `request_id` | UUID |
| `ip_address` | INET |
| `created_at` | TIMESTAMPTZ |

约束：

- 审计日志不可软删除。
- 不记录密码、Token、完整身份证号等敏感信息。

---

## 6. 考勤计算规则

### 6.1 计算触发时机

| 触发事件 | 处理方式 |
| --- | --- |
| 员工打卡 | 写入原始记录后进入异步队列，30 秒内完成当天预计算 |
| 每日定时任务 | 次日 01:00 批量计算前一天未确认结果，处理缺卡 |
| 补卡审批通过 | 生成手工打卡记录，触发对应日期重算 |
| 请假审批通过 | 触发请假时间覆盖范围内结果重算 |
| 管理员手动重算 | 支持指定员工、指定日期范围重算 |
| 月报锁定 | 锁定结果，不再自动重算 |

### 6.2 迟到、早退、加班计算

宽限期内不记录迟到或早退。

```ts
lateMinutes = max(0, clockInAt - (shiftStart + lateGraceMinutes));

earlyLeaveMinutes = max(
  0,
  (shiftEnd - earlyLeaveGraceMinutes) - clockOutAt,
);

rawOvertimeMinutes = max(0, clockOutAt - shiftEnd);

overtimeMinutes =
  rawOvertimeMinutes >= overtimeStartMinutes ? rawOvertimeMinutes : 0;
```

说明：

- 所有计算以服务端标准化后的时间为准。
- 客户端时间只用于辅助判断异常，不直接作为唯一事实来源。
- 加班是否需要审批属于待决策项。Phase 1 默认只统计，不自动进入工资核算。

### 6.3 跨天班次处理

跨天班次示例：

```json
{
  "shiftName": "夜班",
  "startTime": "20:00",
  "endTime": "08:00",
  "crossDay": true
}
```

计算规则：

- 考勤日期归属以班次开始日期为准。
- 当 `end_time < start_time` 时，`effectiveEnd` 自动加一天。
- 次日下班卡归入前一天夜班结果。
- 查找打卡记录时，需要使用班次窗口，而不是简单按自然日查询。
- 两班交接场景应通过员工当天有效考勤组和班次窗口匹配，避免和次日白班冲突。

### 6.4 异常场景处理

| 异常场景 | 处理策略 |
| --- | --- |
| 仅有上班卡，无下班卡 | `primary_status=ABNORMAL`，`anomaly_flags=['NO_CLOCK_OUT']` |
| 仅有下班卡，无上班卡 | `primary_status=ABNORMAL`，`anomaly_flags=['NO_CLOCK_IN']` |
| GPS 偏差超出范围 | 打卡记录 `is_valid=false`，`invalid_reason='LOCATION_INVALID'` |
| 同一分钟重复打卡 | 使用幂等键和 Redis 防重，重复请求返回第一次结果 |
| 打卡时间与班次窗口不匹配 | 标记 `TIME_MISMATCH`，进入人工审核 |
| 设备 ID 不一致 | 标记 `DEVICE_MISMATCH`，不一定直接判无效，由规则决定 |
| 弱网重试 | 保留 `client_event_at`、`server_received_at`、`retry_count`，用于审计 |

### 6.5 考勤结果锁定

月报导出或管理员确认后，可对指定月份执行锁定。

锁定后：

- 不允许普通补卡、请假审批自动修改已锁定结果。
- 管理员如需调整，必须先执行解锁或发起修正流程。
- 所有解锁、重算、再次锁定行为必须写入审计日志。

---

## 7. 审批流状态机

### 7.1 通用状态

| 状态 | 说明 |
| --- | --- |
| `DRAFT` | 草稿，未提交 |
| `PENDING` | 待审批 |
| `APPROVED` | 已批准 |
| `REJECTED` | 已拒绝 |
| `CANCELLED` | 员工主动撤回 |
| `REVOKED` | 管理员撤销已批准结果 |

### 7.2 状态流转规则

```txt
DRAFT -> PENDING
PENDING -> APPROVED
PENDING -> REJECTED
PENDING -> CANCELLED
APPROVED -> REVOKED
```

约束：

- `APPROVED`、`REJECTED` 后不允许回退到 `DRAFT`。
- `APPROVED -> REVOKED` 只允许管理员在考勤未锁定前执行。
- 审批人必须具备目标员工所在数据范围的审批权限。
- 审批操作必须写入审计日志。

### 7.3 请假审批

请假审批通过后：

- 触发请假覆盖日期的考勤结果重算。
- 若只覆盖半天，应按小时或分钟参与缺勤计算。
- Phase 1 可不做请假余额扣减，但需要保留后续余额系统接入点。

### 7.4 补卡审批

补卡审批通过后：

- 生成一条 `checkin_record(method='MANUAL')`。
- 将 `source_request_id` 关联到补卡申请。
- 触发目标日期考勤结果重算。
- 若目标月份已锁定，默认禁止审批通过，除非管理员先解锁。

---

## 8. 打卡防作弊机制

| 机制 | 实现方式 |
| --- | --- |
| GPS 定位校验 | 使用 Haversine 距离计算与厂区中心点距离 |
| Wi-Fi 校验 | 比对 SSID + BSSID |
| 拍照打卡 | 上传照片至对象存储；Phase 2 可接入活体检测 |
| 设备绑定 | 首次打卡绑定设备 ID，后续不一致触发异常 |
| 打卡防重 | Redis SET NX + 幂等键双层防重 |
| IP 异常检测 | 同一 IP 短时间多个员工打卡触发风险告警 |
| 模拟位置检测 | 客户端上报 `is_mock_location`，服务端记录并标记 |

安全边界：

- 客户端上报的定位、设备、时间信息都不能完全信任。
- 防作弊结果应作为风险标记，不应在没有规则确认时直接静默丢弃。
- 对员工可见的失败原因应清晰，例如“定位超出范围”“Wi-Fi 不匹配”“设备异常，请联系管理员”。

---

## 9. API 设计规范

### 9.1 基本规范

- API 前缀：`/api/v1`
- 请求格式：`application/json`
- 认证方式：`Authorization: Bearer <token>`
- 时间格式：ISO 8601，例如 `2026-05-17T08:00:00+08:00`
- 分页参数：`page=1&pageSize=20`，默认 20，最大 100
- 所有响应包含 `requestId`

### 9.2 统一响应格式

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "requestId": "uuid"
}
```

分页响应：

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
  "requestId": "uuid"
}
```

错误响应：

```json
{
  "code": 40001,
  "message": "员工不存在",
  "data": null,
  "requestId": "uuid"
}
```

### 9.3 错误码规范

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

### 9.4 核心 API 端点

| 方法 + 路径 | 说明 |
| --- | --- |
| `POST /api/v1/auth/login` | 手机号 + 密码登录 |
| `POST /api/v1/auth/refresh` | 刷新 Token |
| `POST /api/v1/auth/logout` | 登出 |
| `GET /api/v1/accounts` | 查询账号列表 |
| `POST /api/v1/accounts` | 创建账号 |
| `PATCH /api/v1/accounts/:id` | 更新账号状态或角色 |
| `GET /api/v1/employees` | 分页查询员工 |
| `POST /api/v1/employees` | 创建员工 |
| `GET /api/v1/employees/:id` | 获取员工详情 |
| `PATCH /api/v1/employees/:id` | 更新员工信息 |
| `GET /api/v1/shifts` | 查询班次 |
| `POST /api/v1/shifts` | 创建班次 |
| `GET /api/v1/attendance-groups` | 查询考勤组 |
| `POST /api/v1/attendance-groups` | 创建考勤组 |
| `POST /api/v1/attendance-groups/:id/members` | 添加员工到考勤组 |
| `GET /api/v1/attendance/checkin-context` | 获取当前员工今日打卡上下文 |
| `POST /api/v1/attendance/checkin` | 员工打卡 |
| `GET /api/v1/attendance/records` | 查询打卡记录 |
| `GET /api/v1/attendance/results` | 查询考勤结果 |
| `GET /api/v1/attendance/results/summary` | 查询考勤汇总 |
| `POST /api/v1/attendance/results/recalculate` | 管理员触发重算 |
| `POST /api/v1/leave/requests` | 提交请假申请 |
| `GET /api/v1/leave/requests` | 查询请假申请 |
| `POST /api/v1/leave/requests/:id/approve` | 审批通过 |
| `POST /api/v1/leave/requests/:id/reject` | 审批拒绝 |
| `POST /api/v1/leave/requests/:id/cancel` | 撤销申请 |
| `POST /api/v1/repair/requests` | 提交补卡申请 |
| `GET /api/v1/repair/requests` | 查询补卡申请 |
| `POST /api/v1/repair/requests/:id/approve` | 审批补卡 |
| `POST /api/v1/repair/requests/:id/reject` | 拒绝补卡 |
| `GET /api/v1/reports/monthly` | 获取月报数据 |
| `POST /api/v1/reports/monthly/export` | 导出月报 Excel |
| `GET /api/v1/reports/tasks/:taskId` | 查询导出任务状态 |

审批类端点使用 `POST`，因为它们表达业务命令，而不是完整替换资源。

### 9.5 打卡幂等请求

小程序打卡请求必须携带幂等键：

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
  "deviceId": "device-fingerprint"
}
```

服务端规则：

- 同一员工、同一幂等键只生成一条打卡记录。
- 重复请求返回第一次打卡结果。
- 客户端时间与服务端时间偏差超过 5 分钟时，打卡可记录为异常，是否有效由规则决定。

---

## 10. 小程序端设计（员工端）

### 10.1 核心页面流程

| 页面 | 功能说明 |
| --- | --- |
| 登录页 | 手机号 + 密码登录，支持记住登录态 |
| 首页/打卡页 | 显示今日班次、上/下班按钮、当前状态 |
| 打卡结果页 | 显示成功/失败原因、时间、地点、方式 |
| 考勤记录页 | 按月展示本人考勤日历，查看日详情 |
| 申请列表页 | 查看本人请假、补卡申请 |
| 发起请假页 | 选择类型、时间范围、填写原因、上传附件 |
| 发起补卡页 | 选择日期、类型、补卡时间、填写原因 |
| 审批待办页 | 组织负责人查看待审批申请并处理 |
| 个人信息页 | 查看本人档案、所属组织、本月统计 |

### 10.2 打卡页状态

按钮状态：

```txt
待上班打卡
  -> 已上班打卡，待下班
  -> 已下班打卡
```

补充状态：

- `loading`：正在获取定位、Wi-Fi 或提交请求。
- `permission_required`：缺少定位或 Wi-Fi 权限。
- `retryable_failed`：弱网或超时，可重试。
- `blocked`：已完成打卡或规则不允许打卡。

### 10.3 弱网处理

弱网场景不应静默吞掉打卡。

策略：

- 请求超时 5 秒后展示重试按钮。
- 本地保存打卡意图和幂等键，最多自动重试 3 次。
- 每次重试使用相同幂等键。
- 服务端记录 `client_event_at` 和 `server_received_at`。
- 若最终失败，用户应看到明确反馈，并可重新发起打卡或走补卡流程。

---

## 11. 管理后台设计（PC 端）

### 11.1 核心页面

| 页面 | 功能说明 |
| --- | --- |
| 工作台 | 今日打卡概览、异常人数、待审批数量 |
| 组织管理 | 工厂与弹性组织单元维护 |
| 员工管理 | 员工档案、入离职、设备绑定、账号关联 |
| 账号与角色 | 管理登录账号、角色、数据范围 |
| 班次管理 | 创建班次、宽限期、跨天规则 |
| 考勤组管理 | 配置打卡规则、维护成员历史 |
| 打卡记录 | 查询原始打卡记录、查看异常原因 |
| 考勤结果 | 日/月维度查看结果、手动重算 |
| 异常处理 | 缺卡、位置异常、设备异常集中处理 |
| 请假审批 | 查看、批准、拒绝请假 |
| 补卡审批 | 查看、批准、拒绝补卡 |
| 月报导出 | 生成、下载、锁定月度考勤 |
| 审计日志 | 查看关键操作记录 |

### 11.2 管理后台优先级

Phase 1 最小后台：

1. 组织与员工管理。
2. 班次与考勤组管理。
3. 考勤结果和异常列表。
4. 请假、补卡审批。
5. 月报导出。

账号角色、审计日志可以先做基础能力，但不必在第一版追求复杂筛选和高级报表。

---

## 12. 后端工程结构

推荐结构：

```txt
src/
├── core/
│   ├── auth/
│   ├── tenant/
│   ├── account/
│   ├── permission/
│   ├── logger/
│   ├── audit-log/
│   └── exception/
│
├── modules/
│   ├── employee/
│   ├── organization/
│   ├── shift/
│   ├── attendance-group/
│   ├── attendance/
│   │   ├── checkin/
│   │   ├── calculator/
│   │   └── result/
│   ├── leave/
│   ├── repair/
│   └── report/
│
├── shared/
│   ├── decorators/
│   ├── pipes/
│   ├── utils/
│   └── types/
│
├── jobs/
│   ├── attendance-calc.job.ts
│   └── report-export.job.ts
│
└── prisma/
    └── schema.prisma
```

边界要求：

- Controller 只处理输入输出、权限装饰和 DTO。
- Service 处理业务规则和事务边界。
- Repository 处理持久化查询和租户过滤。
- Calculator 只处理考勤计算逻辑，不直接处理 HTTP 或审批。
- Job 任务必须显式携带 `tenant_id` 和必要上下文。

---

## 13. 技术栈

| 层次 | 技术 | 选型理由 |
| --- | --- | --- |
| 后端框架 | NestJS + TypeScript | 模块化、DI、适合中大型业务系统 |
| ORM | Prisma | 类型安全、迁移管理清晰 |
| 数据库 | PostgreSQL 15+ | RLS、JSONB、索引和事务能力成熟 |
| 缓存/队列 | Redis + BullMQ | 防重锁、异步计算、报表导出 |
| 对象存储 | MinIO / 腾讯云 COS | 私有化和 SaaS 场景兼容 |
| 小程序端 | Taro + React | 跨端能力，复用 React 生态 |
| 管理后台 | React + Ant Design Pro | 企业后台开发效率高 |
| 日志 | Pino | 高性能结构化日志 |
| 监控 | Prometheus + Grafana | 指标采集和可视化 |
| 容器化 | Docker + Docker Compose | 本地与部署环境一致 |
| CI/CD | GitHub Actions | 自动测试、构建、部署 |

---

## 14. 监控、日志与运维

### 14.1 日志规范

| 日志等级 | 使用场景 |
| --- | --- |
| ERROR | 未捕获异常、第三方 API 失败、数据库连接中断 |
| WARN | 业务规则失败、防作弊触发、Token 即将过期 |
| INFO | 登录、打卡成功、审批操作、报表导出 |
| DEBUG | 开发环境 SQL、缓存命中等调试信息 |

INFO 及以上日志建议包含：

- `requestId`
- `tenantId`
- `userId`
- `employeeId`，如适用
- `operation`
- `durationMs`

禁止记录：

- 密码、Token、完整身份证号。
- 打卡照片的可公开访问 URL。
- 过度详细的个人隐私数据。

### 14.2 关键监控指标

- 打卡接口 P99 延迟，目标 `< 500ms`。
- 考勤计算任务队列积压量，告警阈值：`> 1000` 持续 5 分钟。
- 数据库连接池使用率，告警阈值：`> 80%`。
- Redis 内存使用率，告警阈值：`> 70%`。
- 异常打卡比例，例如 `DEVICE_MISMATCH` 超过日均 5%。
- 报表导出失败率。
- RLS 或租户越权测试失败次数。

### 14.3 数据保留策略

| 数据 | 保留策略 |
| --- | --- |
| 打卡原始记录 | 永久保留，作为争议和合规依据 |
| 考勤结果 | 永久保留 |
| 审批流程记录 | 永久保留 |
| 审计日志 | 长期保留，不允许物理删除 |
| 系统运行日志 | 在线保留 90 天，超期归档冷存储 |
| 打卡照片 | 默认至少保留 1 年，具体按客户合同配置 |

---

## 15. 隐私、安全与合规

### 15.1 敏感数据

敏感数据包括：

- 手机号。
- 身份证号。
- 定位坐标。
- 打卡照片。
- 设备 ID。
- IP 地址。

### 15.2 处理要求

- 前端展示身份证号、手机号时默认脱敏。
- 对象存储文件默认私有，访问需通过后端签名 URL 或鉴权代理。
- 日志中不得输出完整身份证号、Token、密码、照片公开 URL。
- 员工只能访问本人考勤、申请和档案摘要。
- 管理员访问范围由角色和数据范围共同决定。

---

## 16. 测试策略

### 16.1 后端测试重点

- 租户隔离：租户 A 不能读取租户 B 数据。
- 权限边界：员工、组织负责人、HR、管理员的数据范围不同。
- 打卡幂等：重复请求不产生重复记录。
- 跨天班次：夜班下班卡归入前一天考勤结果。
- 缺卡异常：缺上班卡/下班卡先进入异常状态。
- 补卡审批：审批通过后生成手工打卡记录并触发重算。
- 请假审批：请假覆盖时间正确影响考勤结果。
- 月报锁定：锁定后禁止普通重算和补卡修改。

### 16.2 考勤计算样例

| 场景 | 输入 | 期望 |
| --- | --- | --- |
| 正常白班 | 08:00 上班，17:00 下班 | `primary_status=NORMAL` |
| 迟到 10 分钟 | 08:10 上班，宽限 5 分钟 | `late_minutes=5`，`status_flags=['LATE']` |
| 早退 | 16:40 下班，宽限 0 | `early_leave_minutes=20` |
| 缺下班卡 | 只有 08:00 上班卡 | `primary_status=ABNORMAL`，`anomaly_flags=['NO_CLOCK_OUT']` |
| 夜班跨天 | 20:00 上班，次日 08:00 下班 | 归属班次开始日期 |
| 位置异常 | GPS 超出范围 | 打卡记录无效，结果标记异常 |
| 补卡通过 | 补 17:00 下班卡 | 生成 `MANUAL` 记录并重算 |
| 月报锁定后补卡 | 已锁定月份申请补卡 | 默认拒绝或要求管理员解锁 |

### 16.3 前端测试重点

- 打卡按钮状态切换。
- 定位/Wi-Fi 权限失败提示。
- 弱网重试和幂等键复用。
- 申请提交、撤回、审批结果展示。
- 管理后台异常列表筛选和审批操作。

---

## 17. 开发阶段规划

### 17.1 Phase 0：工程与风险验证

目标：先建立可运行骨架和关键风险 POC。

交付物：

- Monorepo 或单仓结构确认。
- NestJS API 基础工程。
- PostgreSQL + Prisma + Docker Compose。
- 租户上下文与 RLS POC。
- 账号登录最小闭环。
- 基础 CI：类型检查、测试、构建。

### 17.2 Phase 1：单工厂考勤闭环

目标：完成可试点上线的单工厂考勤系统。

核心交付物：

- 组织、员工、账号、角色基础管理。
- 班次、考勤组、成员历史。
- 小程序打卡。
- 考勤计算引擎。
- 补卡、请假审批。
- 月报查询和 Excel 导出。
- 管理后台最小闭环。

### 17.3 Phase 2：排班与多工厂

目标：支持更复杂的组织和班次管理。

核心交付物：

- 排班系统。
- 多工厂数据汇总。
- 加班申请或确认机制。
- 企业微信消息推送。
- 多级审批流。

### 17.4 Phase 3：工资与硬件集成

目标：扩展到更完整的工厂管理场景。

核心交付物：

- 工资核算引擎。
- 计件数据接入。
- 门禁设备集成。
- 人脸识别和活体检测。
- 更完整的开放 API。

---

## 18. 待决策事项

| 事项 | 推荐决策 | 说明 |
| --- | --- | --- |
| 请假余额管理 | Phase 1 只记录，不扣减 | 余额系统涉及年假规则和调休流水，建议后置 |
| 加班审批 | Phase 1 只统计，不结算 | 先不进入工资，避免规则复杂化 |
| 多审批人 | Phase 1 单审批人 | 多级审批流放 Phase 2 |
| 时区处理 | Phase 1 仅 Asia/Shanghai | 多时区工厂后续评估 |
| RLS 启用时机 | Phase 0 POC 后决定 | 避免 Prisma + 连接池上下文踩坑 |
| 拍照打卡 | 作为考勤组可选规则 | 不强制所有客户使用 |
| 缺卡是否直接旷工 | 不直接旷工 | 先异常待确认，锁定后再形成最终结论 |

---

## 19. 名词解释

| 名词 | 说明 |
| --- | --- |
| 租户 Tenant | 一个企业主体，是数据隔离的最高单元 |
| 工厂 Factory | 隶属于租户的生产场所，一个租户可有多个工厂 |
| 账号 Account | 系统登录身份，可关联员工，也可不关联 |
| 员工 Employee | 工厂人员业务档案 |
| 考勤组 Attendance Group | 一组共享相同打卡规则的员工集合 |
| 班次 Shift | 定义上下班时间、宽限期、加班规则的模板 |
| 宽限期 Grace Period | 迟到或早退判断的缓冲时间 |
| 跨天班 Cross-day Shift | 下班时间早于上班时间的班次，如 20:00-08:00 |
| 补卡 Repair Check-in | 因故未打卡，事后通过审批补录打卡记录 |
| 考勤锁定 Finalized | 月报确认后锁定当月考勤数据，禁止普通修改 |
| 幂等键 Idempotency Key | 防止弱网重试或重复点击产生重复打卡的请求唯一标识 |

---

## 20. 拆分文档索引

本文档保留为系统总览，细化设计与实施计划拆分到以下文件：

- `docs/design/factory-erp-er-model.md`：ERD 与表关系说明。
- `docs/design/prisma-schema-draft.md`：Prisma Schema 草案与需要手写 SQL 的约束。
- `docs/design/attendance-calculation-cases.md`：考勤计算用例矩阵。
- `docs/design/api-contract-v1.md`：接口请求/响应 DTO。
- `docs/design/permission-matrix.md`：角色权限和数据范围矩阵。
- `docs/design/devops-and-env.md`：环境变量、Docker、CI、迁移、备份和运维约束。
- `docs/plan/factory-erp-mvp-implementation-plan.md`：Phase 0 和 Phase 1 实施计划。

---

文档结束。
