# Factory ERP Lite Phase 1.7 UI Brand Refresh Plan

日期：2026-05-20
基础分支：`develop`
周期定位：UI 技术栈与品牌视觉升级

## 1. 目标

Phase 1.7 的目标是把当前可演示的 Admin 与小程序界面升级为统一的数据驾驶舱产品体验。

本周期不进入 Phase 2 业务扩展，不修改 API、数据库 schema 或 `packages/shared-types`。重点是建立 Tailwind-first 的双端视觉系统，并完成 Admin 全后台与小程序核心员工链路的 UI 重构。

## 2. 技术路线

Admin：

- 保留 Vite + React + TypeScript。
- 引入 Tailwind CSS 与 shadcn/ui 基线。
- shadcn 组件以源码方式放在 `apps/admin` 内部，不抽到共享包。
- 不引入 Ant Design、Ant Design Pro 或其他后台框架。

小程序：

- 保留 Taro + React + TypeScript。
- 引入 Tailwind CSS 与 `weapp-tailwindcss`。
- 继续维护自有 Taro 组件，如 `PageShell`、`Card`、`Field`、`PrimaryButton`、`StatusText`。
- 不引入额外小程序 UI 组件库。

主题：

- 默认完整落地浅色数据驾驶舱主题。
- 深色主题只定义 token、状态色和少量样例，不在本周期强制实现全应用切换。

## 3. 范围

### 包含

- Phase 1.7 计划与 issue 基线。
- `docs/design/ui-visual-system-v1.md` 视觉规范。
- Admin Tailwind/shadcn 基线接入。
- Admin 全后台视觉重构，覆盖组织、员工、班次、考勤组、考勤结果、审批和月报。
- 小程序 weapp-tailwindcss 接入。
- 小程序登录、打卡、考勤记录、请假、补卡和个人页视觉重构。
- UI 验收清单、截图验收说明和小程序手动构建上传说明。

### 不包含

- Phase 2 业务功能。
- 新增或修改 API 字段。
- 新增数据库迁移。
- 管理后台复杂图表系统。
- 生产级深色主题切换。
- 小程序 CI build gate。

## 4. 任务拆解

### Task 23：Phase 1.7 文档与 issue 基线

- 新增本计划文档。
- 新增 `docs/design/ui-visual-system-v1.md`。
- 更新 `README.md` 与 `AGENTS.md`。
- 创建 Task 24-27 GitHub issues。

### Task 24：Admin Tailwind + shadcn 基线

GitHub issue：[#50](https://github.com/xuCesar/easy-erp/issues/50)

- 在 `apps/admin` 接入 Tailwind CSS。
- 配置 Vite、PostCSS 或 Tailwind 官方推荐入口。
- 配置 shadcn/ui 所需路径别名、`components.json` 和基础组件。
- 建立数据驾驶舱浅色 token 与深色预留 token。
- 验证 Admin typecheck/build。

### Task 25：Admin 全后台 UI 重构

GitHub issue：[#51](https://github.com/xuCesar/easy-erp/issues/51)

- 重构 shell、hero、导航、登录卡片、范围筛选、状态条和内容布局。
- 重构所有 section 的卡片、表单、表格、空态、权限 badge 和操作区。
- 保持现有请求封装、状态流和业务字段不变。
- 优先保证桌面宽屏和窄屏可读性。

### Task 26：Miniapp weapp-tailwindcss 与自有组件重构

GitHub issue：[#52](https://github.com/xuCesar/easy-erp/issues/52)

- 在 `apps/miniapp` 接入 Tailwind CSS 与 `weapp-tailwindcss`。
- 重构自有 Taro UI 组件。
- 重构登录、打卡、考勤记录、请假、补卡和个人页视觉。
- 保持小程序构建由开发者本地手动执行，不加入 CI gate。

### Task 27：UI 验收与 Runbook 更新

GitHub issue：[#53](https://github.com/xuCesar/easy-erp/issues/53)

- 新增 [Phase 1.7 UI Acceptance Checklist](phase-1-7-ui-acceptance-checklist.md)。
- 记录 Admin 桌面/窄屏验收项。
- 记录小程序微信开发者工具预览与真机检查项。
- 同步 Runbook 中的小程序手动构建上传注意事项。

## 5. 设计约束

- 数据驾驶舱风格应服务于考勤试点排障和管理决策，不做装饰性堆叠。
- 状态色必须稳定区分正常、异常、待审批、已锁定和失败。
- 表格密度应适合工厂管理人员快速扫读，不追求复杂数据可视化。
- 小程序视觉优先保证一线员工可读性、点击面积和弱网反馈。
- 新依赖必须限定在对应 workspace 包内，不能污染 API 或共享类型包。

## 6. 验证要求

文档任务：

```bash
git diff --check
rg "Phase 1.7|shadcn|Tailwind|weapp-tailwindcss|数据驾驶舱|双主题" README.md AGENTS.md docs apps -n
```

Admin 任务：

```bash
pnpm --filter @easy-erp/admin typecheck
pnpm --filter @easy-erp/admin build
```

小程序任务：

```bash
pnpm --filter @easy-erp/miniapp typecheck
pnpm --filter @easy-erp/miniapp build
```

说明：小程序 build 只作为本地验证，不作为 GitHub Actions CI 阻断项。

## 7. 完成标准

- Task 23-27 issue 全部创建并指向 `develop`。
- Admin 采用 Tailwind-first 视觉系统，完成全后台 UI 重构。
- 小程序核心员工链路采用同一视觉语言。
- README、Runbook 和 UI 验收文档口径一致。
- 不改变后端 API、数据库 schema 或共享类型契约。
