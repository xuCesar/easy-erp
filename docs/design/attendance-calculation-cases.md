# Attendance Calculation Cases

版本：1.0  
来源：`factory-erp-attendance-design-v3.md`  
日期：2026-05  

---

## 1. 计算目标

考勤计算器负责将原始打卡记录、班次、考勤组、请假、补卡等事实转换为每日 `attendance_result`。

计算器必须满足：

- 可重复执行，同一输入得到同一输出。
- 不修改原始打卡记录。
- 对缺卡、位置异常、设备异常等情况先标记异常，不静默吞掉。
- 跨天班次按班次开始日期归属。
- 月报锁定后不自动重算。

---

## 2. 输入与输出

### 2.1 输入

| 输入 | 说明 |
| --- | --- |
| `employee` | 员工档案 |
| `attendance_group_member` | 员工在目标日期的考勤组归属 |
| `attendance_group` | 打卡范围、Wi-Fi、照片规则 |
| `shift` | 班次时间、宽限期、加班阈值 |
| `checkin_record[]` | 目标班次窗口内有效打卡 |
| `leave_request[]` | 已批准请假 |
| `repair_request[]` | 已批准补卡，已转成 `MANUAL` 打卡记录 |

### 2.2 输出

| 输出字段 | 说明 |
| --- | --- |
| `primary_status` | `NORMAL`、`ABNORMAL`、`ABSENT`、`LEAVE`、`REST`、`HOLIDAY` |
| `status_flags` | `LATE`、`EARLY_LEAVE` 等可组合状态 |
| `anomaly_flags` | `NO_CLOCK_IN`、`NO_CLOCK_OUT`、`LOCATION_INVALID` 等异常 |
| `work_minutes` | 实际工作分钟数 |
| `late_minutes` | 扣除宽限期后的迟到分钟数 |
| `early_leave_minutes` | 扣除宽限期后的早退分钟数 |
| `absence_minutes` | 缺勤分钟数 |
| `overtime_minutes` | 统计型加班分钟数 |

---

## 3. 基础公式

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

- 所有时间先转换为服务端标准时间。
- Phase 1 固定使用 `Asia/Shanghai`。
- `client_event_at` 只作为异常判断依据，不作为唯一事实时间。
- 加班在 Phase 1 只统计，不自动结算工资。

---

## 4. 班次窗口

### 4.1 白班

| 字段 | 示例 |
| --- | --- |
| 考勤日期 | `2026-05-17` |
| 上班时间 | `2026-05-17 08:00` |
| 下班时间 | `2026-05-17 17:00` |

### 4.2 跨天夜班

| 字段 | 示例 |
| --- | --- |
| 考勤日期 | `2026-05-17` |
| 上班时间 | `2026-05-17 20:00` |
| 下班时间 | `2026-05-18 08:00` |

跨天规则：

- 考勤日期取班次开始日期。
- `end_time < start_time` 时下班时间加一天。
- 查找打卡记录时按班次窗口查，不按自然日查。

---

## 5. 计算用例矩阵

| 编号 | 场景 | 输入 | 期望结果 |
| --- | --- | --- | --- |
| C001 | 正常白班 | 08:00 上班，17:00 下班，班次 08:00-17:00 | `primary_status=NORMAL`，工作 540 分钟 |
| C002 | 宽限内迟到 | 08:03 上班，迟到宽限 5 分钟 | `late_minutes=0`，无 `LATE` |
| C003 | 超出宽限迟到 | 08:10 上班，迟到宽限 5 分钟 | `late_minutes=5`，`status_flags=['LATE']` |
| C004 | 早退 | 16:40 下班，早退宽限 0 | `early_leave_minutes=20`，`status_flags=['EARLY_LEAVE']` |
| C005 | 加班不足阈值 | 17:20 下班，加班阈值 30 分钟 | `overtime_minutes=0` |
| C006 | 加班达到阈值 | 17:45 下班，加班阈值 30 分钟 | `overtime_minutes=45` |
| C007 | 缺上班卡 | 只有 17:00 下班卡 | `primary_status=ABNORMAL`，`anomaly_flags=['NO_CLOCK_IN']` |
| C008 | 缺下班卡 | 只有 08:00 上班卡 | `primary_status=ABNORMAL`，`anomaly_flags=['NO_CLOCK_OUT']` |
| C009 | 双缺卡 | 无有效打卡，无请假 | `primary_status=ABNORMAL`，`anomaly_flags=['NO_CLOCK_IN','NO_CLOCK_OUT']` |
| C010 | 全天请假 | 08:00-17:00 已批准请假 | `primary_status=LEAVE`，缺勤不按旷工处理 |
| C011 | 半天请假 | 13:00-17:00 已批准请假，上午正常打卡 | 上午按出勤，下午按请假覆盖 |
| C012 | 夜班正常 | 20:00 上班，次日 08:00 下班 | 结果归属班次开始日期 |
| C013 | 夜班缺下班卡 | 20:00 上班，无次日下班卡 | `NO_CLOCK_OUT`，归属班次开始日期 |
| C014 | GPS 无效 | 打卡超出范围 | 打卡记录 `is_valid=false`，计算时不作为有效打卡 |
| C015 | 设备不匹配 | 设备 ID 与绑定设备不同 | `anomaly_flags=['DEVICE_MISMATCH']`，是否有效由规则决定 |
| C016 | 补卡通过 | 补 17:00 下班卡，生成 `MANUAL` 记录 | 目标日期重算，选中手工下班卡 |
| C017 | 重复打卡 | 同一幂等键重复提交 | 只生成一条 `checkin_record` |
| C018 | 月报锁定后补卡 | 已锁定月份提交补卡 | 拒绝审批或要求管理员先解锁 |

---

## 6. 状态判定规则

### 6.1 主状态优先级

推荐优先级：

```txt
REST / HOLIDAY
  -> LEAVE
  -> ABNORMAL
  -> ABSENT
  -> NORMAL
```

说明：

- `ABNORMAL` 表示结果需要人工确认。
- `ABSENT` 表示已确认缺勤，不是缺卡的初始默认值。
- `LEAVE` 可覆盖全部或部分工作时间。

### 6.2 状态标记

`status_flags` 可组合：

- `LATE`
- `EARLY_LEAVE`
- `OVERTIME`
- `PARTIAL_LEAVE`

### 6.3 异常标记

`anomaly_flags` 可组合：

- `NO_CLOCK_IN`
- `NO_CLOCK_OUT`
- `LOCATION_INVALID`
- `TIME_MISMATCH`
- `DEVICE_MISMATCH`
- `CLIENT_TIME_DRIFT`

---

## 7. 最小测试建议

后端单元测试应以计算器纯函数为核心，避免直接依赖数据库。

建议测试文件：

- `apps/api/src/modules/attendance/calculator/attendance-calculator.spec.ts`
- `apps/api/src/modules/attendance/checkin/checkin.service.spec.ts`
- `apps/api/src/modules/repair/repair.service.spec.ts`
- `apps/api/src/modules/leave/leave.service.spec.ts`

测试命令：

```bash
pnpm --filter api test attendance-calculator
```
