# Factory ERP Lite Phase 1.8 UI/UE Plan

日期：2026-05-20

## 目标

Phase 1.8 继续推进 Phase 1.7 后的 UI/UE 调整，但重点从视觉 token 和组件统一，转向可感知的信息架构与工作流变化。

本阶段拆成两部分：

- Phase 1.8A：Admin 路由化工作台与核心业务页重构。
- Phase 1.8B：小程序打卡主链路增强。

## Phase 1.8A Admin

Admin 从单页 section 切换升级为 Vite SPA 内的路由化工作台：

- `/workbench`：运营工作台，集中展示员工、考勤异常、待审批、月报锁定。
- `/attendance-results`：考勤结果异常优先视图。
- `/approvals`：请假与补卡审批列表、详情与原位审批。
- `/monthly-report`：月报锁定与导出任务工作区。
- `/organization`、`/employees`、`/shifts`、`/attendance-groups`：基础资料页保留现有创建能力，但增加页面级摘要和更明确的信息层级。

本阶段允许新增 `react-router-dom`，不引入大型后台框架、表格引擎或图表库。

## Phase 1.8B Miniapp

小程序保留打卡直达入口，不新增今日首页。打卡页本身升级为今日工作台式入口：

- 首屏展示考勤组、班次、日期、上下班打卡状态和下一步动作。
- 主按钮区明确区分上班打卡、下班打卡、无需打卡和提交中状态。
- 结果页强化有效/异常结论，并提供查看记录和补卡入口。
- 记录页异常优先排序。
- 请假与补卡页增加提交前确认、提交中禁用和提交后反馈。

## 接口与契约

本阶段不修改数据库 schema，不改变现有审批写入流程。

新增最小只读审批列表能力：

- `GET /api/v1/leave/requests`
- `GET /api/v1/repair/requests`

查询参数：

- `factoryId`
- `orgUnitId`
- `status`
- `page`
- `pageSize`

返回 `PaginatedData<ApprovalItem>`，并继续遵守租户隔离和数据范围权限。

## 验收重点

- Admin 登录后默认进入 `/workbench`。
- 工厂、组织和月份范围在路由切换后不丢失。
- 审批页不再依赖手动输入审批单 ID 才能操作。
- 考勤结果默认突出异常记录。
- 月报页能明确区分锁定状态和导出任务状态。
- 小程序打卡页能在第一屏回答：今天归哪个考勤组、现在该做什么、上下班是否已打卡。
- 小程序打卡结果页对异常结果给出补卡路径。

## 不在本阶段处理

- 不启用数据库表级 RLS policy。
- 不新增审批状态机写入动作。
- 不引入图表库、虚拟表格或全局状态管理库。
- 不新增小程序统一首页。
