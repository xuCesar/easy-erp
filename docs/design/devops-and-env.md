# DevOps And Environment Design

版本：1.0  
来源：`factory-erp-attendance-design-v3.md`  
日期：2026-05  

---

## 1. 文档目的

本文档定义 Factory ERP Lite MVP 的环境变量、Docker、本地开发、CI/CD、数据库迁移、备份恢复、日志监控和运维约束。

目标：

- 本地环境可复现。
- 测试、预发、生产环境边界清晰。
- 数据库迁移可回滚、可审计。
- 考勤核心数据可备份和恢复。
- 敏感配置不进入仓库。

---

## 2. 环境划分

| 环境 | 用途 | 数据 |
| --- | --- | --- |
| local | 本地开发 | 本地 Docker Compose 数据 |
| test | CI 和自动化测试 | 自动创建、可清空 |
| staging | 预发布验证 | 脱敏或模拟数据 |
| production | 生产运行 | 真实客户数据 |

约束：

- 生产数据不得复制到本地。
- staging 如需使用生产快照，必须先脱敏手机号、身份证、定位、照片 URL。
- local 和 test 可使用默认 Seed。

---

## 3. 环境变量

### 3.1 API 服务

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `development` | Node 运行环境 |
| `PORT` | `3000` | API 端口 |
| `DATABASE_URL` | `postgresql://easyerp:easyerp@localhost:5432/easyerp?schema=public` | PostgreSQL 连接串 |
| `REDIS_URL` | `redis://localhost:6379` | Redis 连接串 |
| `JWT_ACCESS_SECRET` | `replace-with-dev-secret` | Access Token 签名密钥 |
| `JWT_REFRESH_SECRET` | `replace-with-dev-secret` | Refresh Token 签名密钥 |
| `JWT_ACCESS_EXPIRES_IN` | `2h` | Access Token 有效期 |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | Refresh Token 有效期 |
| `APP_TIMEZONE` | `Asia/Shanghai` | Phase 1 默认时区 |
| `OBJECT_STORAGE_PROVIDER` | `minio` | `minio` 或 `cos` |
| `OBJECT_STORAGE_BUCKET` | `factory-erp` | 对象存储桶 |
| `OBJECT_STORAGE_ENDPOINT` | `http://localhost:9000` | MinIO 或 COS endpoint |
| `OBJECT_STORAGE_ACCESS_KEY` | `minioadmin` | 对象存储 access key |
| `OBJECT_STORAGE_SECRET_KEY` | `minioadmin` | 对象存储 secret key |
| `SIGNED_URL_EXPIRES_SECONDS` | `300` | 签名 URL 有效期 |
| `LOG_LEVEL` | `info` | 日志等级 |

### 3.2 管理后台

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:3000/api/v1` | API 地址 |
| `VITE_APP_NAME` | `Factory ERP Lite` | 应用名称 |

### 3.3 小程序

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `TARO_APP_API_BASE_URL` | `https://api.example.com/api/v1` | API 地址 |
| `TARO_APP_WECHAT_APP_ID` | `wx-example` | 微信小程序 AppID |

### 3.4 安全约束

- `.env` 不进入仓库。
- `.env.example` 只放占位值。
- JWT 密钥、对象存储密钥、数据库密码通过部署平台 Secret 注入。
- 日志不得输出任何 Secret。

---

## 4. 本地开发 Docker Compose

本地至少需要 PostgreSQL 和 Redis。

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: easyerp
      POSTGRES_PASSWORD: easyerp
      POSTGRES_DB: easyerp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

本地启动顺序：

```bash
docker compose up -d postgres redis minio
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed
pnpm --filter api start:dev
```

---

## 5. 数据库迁移策略

### 5.1 开发环境

开发环境使用：

```bash
pnpm --filter api prisma migrate dev
```

要求：

- 每次 schema 修改生成独立 migration。
- 不手动编辑已合并并共享的 migration。
- 本地可重建空库并完整执行全部 migration。

### 5.2 生产环境

生产环境使用：

```bash
pnpm --filter api prisma migrate deploy
```

上线前检查：

- migration 已在 staging 执行成功。
- migration 不包含破坏性删除。
- 如需回填数据，回填脚本支持分批执行和重复执行。
- RLS 策略变更已通过租户隔离测试。

### 5.3 回滚策略

Prisma migration 不提供自动下滚生产数据的安全方案。生产回滚原则：

- 优先通过应用版本回滚解决。
- schema 变更采用向前兼容方式，例如先加字段、双写、迁移数据、再删除旧字段。
- 涉及删除字段或重命名字段时，必须分多次发布。

---

## 6. Seed 策略

local/test 环境默认 Seed：

- 一个租户：`示例工厂企业`
- 一个工厂：`杭州一厂`
- 一个管理员账号：`13800000000`
- 四个角色：`TENANT_ADMIN`、`HR_ADMIN`、`ORG_MANAGER`、`EMPLOYEE`
- 一个组织单元：`生产一组`
- 一个白班：`08:00-17:00`
- 一个考勤组：`生产一组考勤`
- 两个员工样例。

生产环境 Seed：

- 只创建系统基础权限和角色。
- 不创建示例员工。
- 初始管理员通过部署流程或初始化命令创建。

---

## 7. CI/CD

### 7.1 Pull Request 检查

PR 必须执行：

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

阻断项：

- TypeScript 类型检查失败。
- 单元测试失败。
- 租户隔离测试失败。
- 权限边界测试失败。
- 考勤计算 C001-C018 失败。
- Prisma schema 校验失败。

### 7.2 部署流程

推荐流程：

```txt
merge main
  -> build Docker image
  -> push image
  -> deploy staging
  -> run migration deploy
  -> smoke test
  -> approve production deploy
  -> deploy production
  -> run migration deploy
  -> smoke test
```

Smoke test 必须包含：

- 登录。
- 查询本人信息。
- 创建一条测试打卡或调用健康检查。
- 查询数据库 migration 状态。

---

## 8. 日志与监控

### 8.1 日志字段

INFO 及以上日志应包含：

- `requestId`
- `tenantId`
- `userId`
- `employeeId`
- `operation`
- `durationMs`

禁止记录：

- 密码。
- Token。
- 完整身份证号。
- 对象存储长期公开 URL。
- 完整定位轨迹。

### 8.2 指标

关键指标：

- API P95/P99 延迟。
- 打卡接口 P99 延迟，目标 `< 500ms`。
- 考勤计算队列积压。
- 报表导出失败率。
- 数据库连接池使用率。
- Redis 内存使用率。
- RLS 或租户隔离测试失败次数。

---

## 9. 备份与恢复

### 9.1 PostgreSQL

建议策略：

- 每日全量备份。
- 开启 WAL 归档以支持时间点恢复。
- 备份保留 30 天。
- 每月至少进行一次恢复演练。

恢复演练必须验证：

- 租户数据完整。
- 打卡记录完整。
- 考勤结果可查询。
- 审批记录可追溯。

### 9.2 对象存储

打卡照片和附件：

- 默认私有读。
- 通过短期签名 URL 访问。
- 按客户合同配置保留周期。
- 生产环境开启版本管理或跨区域备份。

---

## 10. 运维 Runbook

### 10.1 队列积压

处理步骤：

1. 查看 BullMQ 队列长度。
2. 查看 Redis 内存和连接数。
3. 查看 worker 错误日志。
4. 暂停非关键报表导出任务。
5. 扩容 worker 实例。
6. 恢复后补跑积压考勤计算任务。

### 10.2 数据库连接池耗尽

处理步骤：

1. 查看 API 实例数量和连接池配置。
2. 查看慢查询。
3. 临时降低 worker 并发。
4. 释放异常长事务。
5. 调整连接池上限前确认 PostgreSQL 最大连接数。

### 10.3 月报误锁定

处理步骤：

1. 管理员发起解锁操作。
2. 记录 `audit_log`，包含解锁原因。
3. 重新处理补卡、请假或人工修正。
4. 手动触发目标月份重算。
5. 重新锁定月报。

### 10.4 租户隔离异常

处理步骤：

1. 立即停止相关接口流量。
2. 保存请求日志和审计日志。
3. 检查 Repository 是否绕过租户过滤。
4. 检查 RLS session 变量是否正确设置。
5. 修复后补充回归测试。
6. 评估是否需要通知受影响客户。

---

## 11. 上线前检查清单

- `pnpm typecheck` 通过。
- `pnpm test` 通过。
- `pnpm lint` 通过。
- `pnpm build` 通过。
- Prisma migration 在空库和 staging 执行成功。
- Seed 可重复执行。
- 租户隔离测试通过。
- 权限矩阵测试通过。
- 考勤计算 C001-C018 通过。
- `.env.example` 与实际环境变量同步。
- 数据库备份任务已配置。
- 对象存储桶权限为私有。
- 日志不包含敏感信息。
