# Phase 1.7 UI Acceptance Checklist

日期：2026-05-20
基础分支：`develop`
关联任务：Task 27

## 1. 验收目标

Phase 1.7 的验收目标是确认 Admin 与小程序已经完成统一的数据驾驶舱视觉升级，并且不改变 Phase 1/1.5/1.6 已稳定的业务契约。

本验收不进入 Phase 2 业务开发，不新增 API、数据库 schema 或 shared-types 字段。Admin 验证以本地构建和浏览器手工检查为主；小程序验证以本地构建、微信开发者工具预览和真机检查为主。小程序构建仍不作为 GitHub Actions CI 阻断项。

## 2. 自动化验证

Admin：

```bash
pnpm --filter @easy-erp/admin typecheck
pnpm --filter @easy-erp/admin build
```

Miniapp：

```bash
pnpm --filter @easy-erp/miniapp typecheck
pnpm --filter @easy-erp/miniapp build
```

文档与口径：

```bash
git diff --check
rg "Phase 1.7|shadcn|Tailwind|weapp-tailwindcss|数据驾驶舱|双主题|小程序" README.md docs apps -n
```

说明：

- Admin 构建可作为 PR 验证项。
- 小程序构建用于开发者本地确认产物可生成，不加入 CI build gate。
- 微信开发者工具预览、真机调试和上传必须由开发者手动完成。

## 3. Admin 手工验收

浏览器桌面宽屏检查：

- 登录页使用 Phase 1.7 数据驾驶舱视觉，登录卡片、标题、副标题和错误反馈清晰。
- 顶层 shell、hero、导航、登录态和关键操作在宽屏下层级清楚。
- 组织、员工、班次、考勤组、考勤结果、审批、月报模块均可切换。
- 范围筛选、状态条、卡片、表格、空态、权限 badge、审批操作和导出查询视觉一致。
- 表格中状态字段不只依赖颜色，必须配合 badge 或明确文本。
- 空态说明下一步动作，不出现空白卡片或无法理解的占位。
- 请求失败时错误反馈可见，不被导航或卡片遮挡。

浏览器窄屏检查：

- 顶部信息和导航在窄屏下不遮挡主内容。
- 表单、按钮和表格在窄屏下可读，不出现横向不可控溢出。
- 关键主操作仍然可见，审批和导出按钮不被压缩到不可点击。
- Tailwind/shadcn 组件在窄屏下保持一致圆角、边框、间距和状态色。

## 4. Miniapp 手工验收

本地构建：

```bash
TARO_APP_API_BASE_URL="http://<pilot-api-host>:3000" pnpm --filter @easy-erp/miniapp build
```

微信开发者工具检查：

- 使用微信开发者工具打开 `apps/miniapp/dist/`。
- 确认 `app-origin.wxss` 不包含未展开的 `@tailwind` 指令。
- 确认登录、打卡、打卡结果、考勤记录、请假、补卡和个人页均可打开。
- 确认页面背景、hero、卡片、输入框、主按钮、状态文本和 badge 视觉一致。
- 确认主按钮点击区域不小于 88rpx，真机上可稳定点击。
- 确认 API 失败、提交成功、加载中或无数据时均有可见反馈。
- 确认考勤状态、锁定状态和错误状态不只依赖颜色表达。

真机联调检查：

- `TARO_APP_API_BASE_URL` 指向手机可访问的试点 API 地址。
- 登录后 session 可持久化，重新进入页面不会误清空登录态。
- 打卡、查看考勤记录、提交请假和提交补卡能访问试点 API。
- 弱网或接口失败时页面显示失败反馈，不静默卡住。

## 5. 已知限制

- 深色主题在 Phase 1.7 只完成 token、状态色和样例预留，不提供全应用主题切换。
- Admin 不引入复杂图表系统，不新增高级表格引擎或虚拟列表。
- 小程序不引入额外 UI 组件库，只保留 `weapp-tailwindcss` + 自有 Taro 组件。
- 小程序上传依赖微信开发者工具，不纳入 GitHub Actions CI gate。
- Phase 1.7 不修改 API、数据库 schema、权限点或 shared-types 契约。

## 6. 后续建议

- 进入 Phase 2 前，基于试点反馈决定是否补充排班、多工厂、工资或硬件集成主线。
- 若试点现场需要夜间监控或大屏展示，再单独评估生产级深色主题和数据可视化。
- 若小程序真机反馈集中在网络、定位或拍照授权，应拆分为移动端可靠性任务，而不是继续扩大 UI 重构范围。
