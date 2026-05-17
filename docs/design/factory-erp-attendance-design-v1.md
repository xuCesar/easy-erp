# 工厂企业管理系统（Factory ERP Lite）
## 模块化考勤系统设计文档（V1.0）

---

# 1. 项目背景

本项目定位为：

> 面向工厂场景的模块化企业管理平台。

当前阶段以“考勤模块”为切入点，但整体架构需具备：

- 多租户
- 多工厂
- 模块化
- 可插拔
- 可扩展
- SaaS 化

能力。

系统未来可逐步扩展：

- 排班
- 工资
- 审批
- 计件
- 生产
- 门禁
- 宿舍
- 食堂
- OA

等企业模块。

---

# 2. 系统定位

## 2.1 产品定位

工厂企业管理平台（轻量 ERP + OA）。

第一阶段：

> 工厂考勤管理系统。

第二阶段：

> 工厂组织与生产协同平台。

---

# 3. 核心目标

## 3.1 MVP 目标

支持一个中小型工厂完成：

- 员工管理
- 班组管理
- 班次管理
- 小程序打卡
- 考勤统计
- 补卡审批
- 请假审批
- 月报导出

---

# 4. 系统架构

## 4.1 总体架构

```txt
┌─────────────────────┐
│ 微信小程序（员工端） │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   API Gateway       │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│      NestJS API     │
└─────────┬───────────┘
          │
 ┌────────┴────────┐
 │                 │
▼                 ▼
Redis         PostgreSQL
```

---

# 5. 模块化设计

## 5.1 模块划分

```txt
平台核心模块
├─ 企业管理
├─ 用户体系
├─ 权限系统
├─ 消息通知
├─ 文件管理
└─ 审计日志

业务模块
├─ 考勤模块
├─ 排班模块
├─ 请假模块
├─ 工资模块
├─ 计件模块
└─ 生产模块

扩展模块
├─ 企业微信
├─ 钉钉
├─ 人脸设备
├─ 门禁设备
└─ 开放 API
```

---

# 6. 多租户设计

## 6.1 多租户原则

每个企业独立数据空间。

所有业务表必须包含：

```sql
tenant_id
factory_id
created_at
updated_at
deleted_at
```

---

# 7. 组织架构设计

## 7.1 工厂组织结构

```txt
企业
└─ 工厂
   └─ 车间
      └─ 班组
         └─ 员工
```

---

# 8. 权限系统设计

## 8.1 RBAC 模型

采用：

> 用户 → 角色 → 权限

---

## 8.2 权限命名规范

```txt
module:resource:action
```

示例：

```txt
attendance:record:view
attendance:record:edit
attendance:report:export
employee:profile:view
shift:schedule:manage
```

---

# 9. 考勤模块设计

## 9.1 模块目标

实现工厂员工：

- 打卡
- 统计
- 审批
- 异常处理

完整闭环。

---

# 10. 打卡方案

## 10.1 支持方式

### MVP

- GPS 定位
- Wi-Fi 校验
- 拍照打卡

### 后续扩展

- 蓝牙
- 人脸识别
- 门禁设备
- NFC

---

# 11. 班次设计

## 11.1 班次类型

支持：

- 白班
- 夜班
- 倒班
- 跨天班

---

## 11.2 跨天班次

示例：

```json
{
  "shiftName": "夜班",
  "startTime": "20:00",
  "endTime": "08:00",
  "crossDay": true
}
```

---

# 12. 数据模型设计

## 12.1 核心表

- company
- factory
- department
- employee
- attendance_group
- shift
- checkin_record
- attendance_result
- leave_request
- repair_request

---

# 13. 考勤结果设计

## 13.1 结果结构

```json
{
  "employeeId": "EMP001",
  "date": "2026-05-17",
  "workMinutes": 480,
  "lateMinutes": 10,
  "earlyLeaveMinutes": 0,
  "absenceMinutes": 0,
  "overtimeMinutes": 120,
  "status": "NORMAL"
}
```

---

# 14. 防作弊机制

支持：

- GPS 校验
- Wi-Fi 校验
- 打卡拍照
- 设备绑定
- 异常位置检测

---

# 15. API 设计规范

## 15.1 RESTful 风格

```txt
GET    /attendance/records
POST   /attendance/checkin
PUT    /attendance/rules/:id
DELETE /attendance/groups/:id
```

---

# 16. 后端目录结构

```txt
src/
├─ core/
│  ├─ auth/
│  ├─ tenant/
│  ├─ permission/
│  ├─ logger/
│  └─ module/
│
├─ modules/
│  ├─ attendance/
│  ├─ employee/
│  ├─ organization/
│  ├─ shift/
│  └─ approval/
│
└─ shared/
```

---

# 17. 技术栈建议

后端：

- NestJS
- PostgreSQL
- Redis
- Prisma

前端：

- React
- Taro
- Ant Design Pro

部署：

- Docker
- Nginx
- PM2

对象存储：

- MinIO
- 腾讯云 COS

---

# 18. 开发阶段规划

## Phase 1（MVP）

完成：

- 企业管理
- 员工管理
- 考勤组
- 班次
- 打卡
- 考勤统计
- 补卡
- 请假

---

## Phase 2

完成：

- 排班
- 加班
- 审批流
- 多工厂

---

## Phase 3

完成：

- 工资
- 计件
- 门禁
- 人脸识别

---

# 19. 当前阶段重点

当前阶段优先级：

```txt
平台底座 > 组织架构 > 权限系统 > 考勤模块
```

---

# 20. 最终目标

最终目标不是：

> “做一个打卡小程序”

而是：

> “构建一个可持续扩展的工厂数字化管理平台”
