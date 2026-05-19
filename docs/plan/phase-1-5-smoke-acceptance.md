# Phase 1.5 Smoke Acceptance

本文档记录 Phase 1.5 结束前必须通过的冒烟验收。验收由一个可执行 API smoke 脚本和一份 UI 手工清单组成。

## 1. 阻断条件

以下任一失败均视为 Phase 1.5 阻断项：

- 租户隔离或数据范围越权检查失败。
- 管理员无法登录或无法读取基础配置。
- 员工无法登录、无法打卡、无法提交请假或补卡。
- 请假或补卡审批失败，或审批后未触发对应业务结果。
- 月报无法查询、锁定或创建导出任务。
- 导出任务查询失败，或普通员工可以查询管理员导出任务。

## 2. 前置环境

先按 [Phase 1.5 Pilot Deployment Runbook](phase-1-5-pilot-deployment-runbook.md) 初始化空库并执行 demo seed。

必要命令：

```bash
docker compose up -d postgres redis
pnpm --filter @easy-erp/api exec prisma migrate deploy --schema prisma/schema.prisma
pnpm --filter @easy-erp/api seed:demo
pnpm --filter @easy-erp/api start:dev
```

默认 smoke 目标为：

```bash
PILOT_API_BASE_URL="http://127.0.0.1:3000/api/v1"
```

如果 demo seed 使用了自定义账号密码，运行 smoke 时需要传入同一组环境变量。

## 3. 可执行 Smoke

运行：

```bash
PILOT_API_BASE_URL="http://127.0.0.1:3000/api/v1" \
DEMO_ADMIN_PHONE="13800000000" \
DEMO_ADMIN_PASSWORD="EasyERP@demo123" \
DEMO_EMPLOYEE_PHONE="13900000001" \
DEMO_EMPLOYEE_PASSWORD="EasyERP@demo123" \
  pnpm --filter @easy-erp/api smoke:pilot
```

脚本覆盖：

- API 健康检查。
- 管理员登录。
- 员工登录。
- 管理员创建员工。
- 管理员读取班次。
- 管理员读取考勤组。
- 员工读取打卡上下文。
- 员工 GPS 打卡。
- 员工提交请假。
- 管理员审批请假。
- 员工提交补卡。
- 管理员审批补卡并生成手工打卡记录。
- 管理员查询月报。
- 管理员锁定月报。
- 管理员创建月报导出任务。
- 管理员查询导出任务。
- 员工查询导出任务被权限拦截。

期望结果：

- 每一步输出 `PASS <step name>`。
- 最后一行输出 `Pilot smoke acceptance passed.`。
- 命令退出码为 `0`。

## 4. UI 手工清单

管理后台：

- 打开管理后台，使用 demo 管理员登录。
- 查看组织、员工、班次、考勤组页面，确认 demo 数据可见。
- 在员工页面创建一名试点员工，确认列表可检索。
- 查看月报页面，确认 2026-05 存在 demo 考勤结果。
- 创建导出任务并用任务 ID 查询状态，期望状态为 `PENDING`。

小程序：

- 使用 demo 员工登录。
- 打开移动打卡页面，确认班次和考勤组信息可见。
- 提交一次 GPS 打卡，期望反馈为打卡成功。
- 提交请假申请，记录返回 ID。
- 提交补卡申请，记录返回 ID。

审批闭环：

- 回到管理后台或用 API 对请假 ID 执行审批，期望状态为 `APPROVED`。
- 对补卡 ID 执行审批，期望状态为 `APPROVED` 且生成手工打卡记录。
- 再次查询月报，确认系统仍能返回月报结果。

## 5. 当前边界

- 当前 Phase 1.5 的可执行 smoke 以 API 为主，不自动驱动浏览器或微信开发者工具。
- Demo seed 内置 2026-05-18 的月报样例结果；员工实时打卡后的结果生成仍依赖审批或重算链路触发。
- 导出任务当前验证任务持久化和查询语义，不生成真实 Excel 文件。
