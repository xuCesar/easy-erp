import { useState } from 'react';
import type {
  ApprovalItem,
  AttendanceGroup,
  AttendanceResultRow,
  EmployeeProfile,
  LoginRequest,
  LoginResponse,
  MonthlyReportRow,
  OrgUnit,
  PaginatedData,
  Shift,
} from '@easy-erp/shared-types';
import { createAdminDashboardPage } from './pages';
import { requestData, toAdminFeedback, type AdminDashboardScope } from './pages/common';
import {
  clearSession,
  FetchApiClient,
  loadSession,
  saveSession,
  type AdminSession,
} from './api/client';
import { SessionPanel } from './components/ui';
import { Badge } from './components/shadcn/badge';
import { Button } from './components/shadcn/button';
import { Card, CardContent } from './components/shadcn/card';
import { Input } from './components/shadcn/input';
import {
  ApprovalsSection,
  AttendanceGroupsSection,
  AttendanceResultsSection,
  EmployeesSection,
  MonthlyReportSection,
  OrganizationSection,
  ShiftsSection,
} from './components/sections';
import type { AdminDataState, SectionKey } from './types';

const defaultScope: AdminDashboardScope = {
  factoryId: '',
  orgUnitId: null,
  month: new Date().toISOString().slice(0, 7),
};

const emptyPage = <TItem,>(): PaginatedData<TItem> => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
});

const initialData: AdminDataState = {
  organization: [],
  employees: emptyPage<EmployeeProfile>(),
  shifts: [],
  attendanceGroups: [],
  attendanceResults: emptyPage<AttendanceResultRow>(),
  leaveApprovals: emptyPage<ApprovalItem>(),
  repairApprovals: emptyPage<ApprovalItem>(),
  monthlyReport: emptyPage<MonthlyReportRow>(),
};

const navigation: Array<{ key: SectionKey; label: string }> = [
  { key: 'organization', label: '组织' },
  { key: 'employees', label: '员工' },
  { key: 'shifts', label: '班次' },
  { key: 'attendanceGroups', label: '考勤组' },
  { key: 'attendanceResults', label: '考勤结果' },
  { key: 'approvals', label: '审批' },
  { key: 'monthlyReport', label: '月报' },
];

export function App() {
  const [session, setSession] = useState<AdminSession | null>(() => loadSession());
  const [scope, setScope] = useState<AdminDashboardScope>(defaultScope);
  const [activeSection, setActiveSection] = useState<SectionKey>('organization');
  const [data, setData] = useState<AdminDataState>(initialData);
  const [status, setStatus] = useState('请先登录并设置工厂范围。');
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginRequest>({ phone: '', password: '' });
  const [taskId, setTaskId] = useState('');

  const client = new FetchApiClient('', () => session);
  const dashboard = createAdminDashboardPage(client, scope);
  const canManage = Boolean(session?.roles.some((role) => role === 'TENANT_ADMIN' || role === 'HR_ADMIN'));
  const totalRecords =
    data.organization.length +
    data.employees.total +
    data.shifts.length +
    data.attendanceGroups.length +
    data.attendanceResults.total +
    data.monthlyReport.total;

  async function login() {
    setIsLoading(true);
    setStatus('正在登录...');

    try {
      const result = await requestData(client.post<LoginResponse, LoginRequest>('/api/v1/auth/login', loginForm));
      const nextSession: AdminSession = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tenantId: result.user.tenantId,
        roles: result.user.roles,
        expiresAt: Date.now() + result.expiresIn * 1000,
      };

      saveSession(nextSession);
      setSession(nextSession);
      setStatus('登录成功，请设置工厂 ID 后加载数据。');
    } catch (error) {
      setStatus(toAdminFeedback(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDashboard() {
    if (!scope.factoryId) {
      setStatus('请先填写工厂 ID。');
      return;
    }

    setIsLoading(true);
    setStatus('正在加载后台数据...');

    const today = new Date().toISOString().slice(0, 10);
    const monthStart = `${scope.month}-01`;
    const [
      organization,
      employees,
      shifts,
      attendanceGroups,
      attendanceResults,
      monthlyReport,
    ] = await Promise.allSettled([
      dashboard.organization.load(),
      dashboard.employees.search(),
      dashboard.shifts.load(),
      dashboard.attendanceGroups.load(),
      dashboard.attendanceResults.search({ startDate: monthStart, endDate: today }),
      dashboard.monthlyReport.load(),
    ]);

    setData((current) => ({
      ...current,
      organization: valueOr(organization, []),
      employees: valueOr(employees, emptyPage<EmployeeProfile>()),
      shifts: valueOr(shifts, []),
      attendanceGroups: valueOr(attendanceGroups, []),
      attendanceResults: valueOr(attendanceResults, emptyPage<AttendanceResultRow>()),
      monthlyReport: valueOr(monthlyReport, emptyPage<MonthlyReportRow>()),
    }));
    setStatus('数据加载完成；单个接口失败时会保留空态，避免影响其他模块演示。');
    setIsLoading(false);
  }

  function logout() {
    clearSession();
    setSession(null);
    setData(initialData);
    setStatus('已退出登录。');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_8%,rgba(217,150,44,0.18),transparent_26%),linear-gradient(135deg,#f4f7f2_0%,#e7efe8_55%,#f8f6ef_100%)] px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-5">
        <header className="grid gap-5 overflow-hidden rounded-[2rem] border border-primary/10 bg-primary text-primary-foreground shadow-[0_28px_90px_rgba(18,63,53,0.28)] lg:grid-cols-[1fr_380px]">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="absolute right-[-120px] top-[-120px] h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
            <div className="relative">
              <Badge className="mb-5 bg-white/15 text-primary-foreground">Phase 1.7 Data Cockpit</Badge>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-accent">
                Factory ERP Lite
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">
                考勤试点驾驶舱
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-primary-foreground/75 sm:text-lg">
                统一组织、员工、班次、考勤组、审批和月报视图，让试点排障和管理动作集中在一个清晰工作台里。
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <MetricCard label="已加载记录" value={String(totalRecords)} />
                <MetricCard label="员工档案" value={String(data.employees.total)} />
                <MetricCard label="考勤结果" value={String(data.attendanceResults.total)} />
              </div>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <SessionPanel
              session={session}
              form={loginForm}
              isLoading={isLoading}
              onFormChange={setLoginForm}
              onLogin={login}
              onLogout={logout}
            />
          </div>
        </header>

        <Card className="border-border/80 bg-white/85 shadow-[0_18px_55px_rgba(26,45,36,0.10)] backdrop-blur-xl">
          <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_180px_auto] lg:items-end">
            <label className="grid gap-2 text-sm font-medium text-muted-foreground">
              工厂 ID
              <Input
                value={scope.factoryId}
                placeholder="factory uuid"
                onChange={(event) => setScope({ ...scope, factoryId: event.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-muted-foreground">
              组织 ID（可选）
              <Input
                value={scope.orgUnitId ?? ''}
                placeholder="org unit uuid"
                onChange={(event) => setScope({ ...scope, orgUnitId: event.target.value || null })}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-muted-foreground">
              月份
              <Input
                type="month"
                value={scope.month}
                onChange={(event) => setScope({ ...scope, month: event.target.value })}
              />
            </label>
            <Button disabled={!session || isLoading} onClick={loadDashboard}>
              加载数据
            </Button>
          </CardContent>
        </Card>

        <section className={`rounded-3xl border px-5 py-4 text-sm shadow-sm ${
          isLoading
            ? 'border-warning/20 bg-warning/10 text-warning'
            : 'border-primary/10 bg-white/75 text-primary'
        }`}>
          {status}
        </section>

        <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
          <nav className="grid content-start gap-2 rounded-3xl border border-border/80 bg-white/75 p-3 shadow-[0_18px_55px_rgba(26,45,36,0.08)] backdrop-blur-xl">
            {navigation.map((item) => (
              <Button
                key={item.key}
                variant={activeSection === item.key ? 'default' : 'ghost'}
                className="justify-start"
                onClick={() => setActiveSection(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </nav>

          <section className="min-w-0">
            {activeSection === 'organization' && (
              <OrganizationSection client={client} scope={scope} data={data.organization} canManage={canManage} onChanged={loadDashboard} />
            )}
            {activeSection === 'employees' && (
              <EmployeesSection client={client} scope={scope} data={data.employees} canManage={canManage} onChanged={loadDashboard} />
            )}
            {activeSection === 'shifts' && (
              <ShiftsSection client={client} scope={scope} data={data.shifts} canManage={canManage} onChanged={loadDashboard} />
            )}
            {activeSection === 'attendanceGroups' && (
              <AttendanceGroupsSection
                client={client}
                scope={scope}
                data={data.attendanceGroups}
                shifts={data.shifts}
                canManage={canManage}
                onChanged={loadDashboard}
              />
            )}
            {activeSection === 'attendanceResults' && <AttendanceResultsSection data={data.attendanceResults} />}
            {activeSection === 'approvals' && (
              <ApprovalsSection client={client} scope={scope} canManage={canManage} onStatus={setStatus} />
            )}
            {activeSection === 'monthlyReport' && (
              <MonthlyReportSection
                dashboard={dashboard}
                data={data.monthlyReport}
                taskId={taskId}
                setTaskId={setTaskId}
                canManage={canManage}
                onStatus={setStatus}
              />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-foreground/55">
        {props.label}
      </p>
      <strong className="mt-2 block text-3xl font-semibold">{props.value}</strong>
    </div>
  );
}

function valueOr<TValue>(result: PromiseSettledResult<TValue>, fallback: TValue): TValue {
  return result.status === 'fulfilled' ? result.value : fallback;
}
