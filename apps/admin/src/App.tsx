import { useEffect, useState } from 'react';
import type {
  AccountUserListItem,
  ApprovalItem,
  AttendancePrimaryStatus,
  AttendanceGroup,
  AttendanceResultRow,
  CurrentUserProfile,
  EmployeeProfile,
  LoginRequest,
  LoginResponse,
  MonthlyReportRow,
  OrgUnit,
  PaginatedData,
  Shift,
  ApprovalStatus,
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
import {
  AccountsSection,
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
  accounts: emptyPage<AccountUserListItem>(),
  monthlyReport: emptyPage<MonthlyReportRow>(),
};

const navigation: Array<{ key: SectionKey; label: string }> = [
  { key: 'organization', label: '组织' },
  { key: 'employees', label: '员工' },
  { key: 'shifts', label: '班次' },
  { key: 'attendanceGroups', label: '考勤组' },
  { key: 'attendanceResults', label: '考勤结果' },
  { key: 'approvals', label: '审批' },
  { key: 'accounts', label: '账号' },
  { key: 'monthlyReport', label: '月报' },
];

export function App() {
  const [session, setSession] = useState<AdminSession | null>(() => loadSession());
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [scope, setScope] = useState<AdminDashboardScope>(defaultScope);
  const [activeSection, setActiveSection] = useState<SectionKey>('organization');
  const [data, setData] = useState<AdminDataState>(initialData);
  const [status, setStatus] = useState('请先登录并设置工厂范围。');
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginRequest>({ phone: '', password: '' });
  const [taskId, setTaskId] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('PENDING');
  const [resultStatus, setResultStatus] = useState('');

  const client = new FetchApiClient('', () => session);
  const dashboard = createAdminDashboardPage(client, scope);
  const canManage = Boolean(session?.roles.some((role) => role === 'TENANT_ADMIN' || role === 'HR_ADMIN'));

  useEffect(() => {
    if (session && !profile) {
      void loadProfile(session).catch((error) => setStatus(toAdminFeedback(error).message));
    }
  }, [session, profile]);

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
      await loadProfile(nextSession);
      setStatus('登录成功，已加载默认工作范围。');
    } catch (error) {
      setStatus(toAdminFeedback(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadProfile(nextSession = session) {
    const profileClient = new FetchApiClient('', () => nextSession);
    const nextProfile = await requestData(profileClient.get<CurrentUserProfile>('/api/v1/auth/me'));
    const firstFactoryId = nextProfile.defaultScope.factoryId ?? nextProfile.factories[0]?.id ?? '';

    setProfile(nextProfile);
    setScope((current) => ({
      ...current,
      factoryId: firstFactoryId,
      orgUnitId: nextProfile.defaultScope.orgUnitId,
    }));
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
      leaveApprovals,
      repairApprovals,
      accounts,
      monthlyReport,
    ] = await Promise.allSettled([
      dashboard.organization.load(),
      dashboard.employees.search(),
      dashboard.shifts.load(),
      dashboard.attendanceGroups.load(),
      dashboard.attendanceResults.search({
        startDate: monthStart,
        endDate: today,
        ...(resultStatus ? { primaryStatus: resultStatus as AttendancePrimaryStatus } : {}),
      }),
      dashboard.leaveApprovals.list({ status: approvalStatus }),
      dashboard.repairApprovals.list({ status: approvalStatus }),
      dashboard.accounts.list(),
      dashboard.monthlyReport.load(),
    ]);

    setData((current) => ({
      ...current,
      organization: valueOr(organization, []),
      employees: valueOr(employees, emptyPage<EmployeeProfile>()),
      shifts: valueOr(shifts, []),
      attendanceGroups: valueOr(attendanceGroups, []),
      attendanceResults: valueOr(attendanceResults, emptyPage<AttendanceResultRow>()),
      leaveApprovals: valueOr(leaveApprovals, emptyPage()),
      repairApprovals: valueOr(repairApprovals, emptyPage()),
      accounts: valueOr(accounts, emptyPage<AccountUserListItem>()),
      monthlyReport: valueOr(monthlyReport, emptyPage<MonthlyReportRow>()),
    }));
    setStatus('数据加载完成；单个接口失败时会保留空态，避免影响其他模块演示。');
    setIsLoading(false);
  }

  function logout() {
    clearSession();
    setSession(null);
    setProfile(null);
    setData(initialData);
    setStatus('已退出登录。');
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Factory ERP Lite</p>
          <h1>考勤 MVP 管理后台</h1>
          <p className="heroText">
            Phase 1.5 试点界面，覆盖组织、员工、班次、考勤组、考勤结果、审批和月报闭环。
          </p>
        </div>
        <SessionPanel
          session={session}
          form={loginForm}
          isLoading={isLoading}
          onFormChange={setLoginForm}
          onLogin={login}
          onLogout={logout}
        />
      </header>

      <section className="controlPanel">
        <label>
          工厂
          <select
            value={scope.factoryId}
            onChange={(event) => setScope({ ...scope, factoryId: event.target.value })}
          >
            <option value="">请选择工厂</option>
            {profile?.factories.map((factory) => (
              <option key={factory.id} value={factory.id}>{factory.name}</option>
            ))}
          </select>
        </label>
        <label>
          组织
          <select
            value={scope.orgUnitId ?? ''}
            onChange={(event) => setScope({ ...scope, orgUnitId: event.target.value || null })}
          >
            <option value="">全部组织</option>
            {profile?.orgUnits
              .filter((unit) => unit.factoryId === scope.factoryId)
              .map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
          </select>
        </label>
        <label>
          月份
          <input
            type="month"
            value={scope.month}
            onChange={(event) => setScope({ ...scope, month: event.target.value })}
          />
        </label>
        <button disabled={!session || isLoading} onClick={loadDashboard}>
          加载数据
        </button>
      </section>

      <section className={`status ${isLoading ? 'isLoading' : ''}`}>{status}</section>

      <div className="workspace">
        <nav className="sidebar">
          {navigation.map((item) => (
            <button
              key={item.key}
              className={activeSection === item.key ? 'active' : ''}
              onClick={() => setActiveSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className="content">
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
          {activeSection === 'attendanceResults' && (
            <AttendanceResultsSection
              data={data.attendanceResults}
              resultStatus={resultStatus}
              setResultStatus={setResultStatus}
              onReload={loadDashboard}
            />
          )}
          {activeSection === 'approvals' && (
            <ApprovalsSection
              client={client}
              scope={scope}
              leaveData={data.leaveApprovals}
              repairData={data.repairApprovals}
              approvalStatus={approvalStatus}
              setApprovalStatus={setApprovalStatus}
              canManage={canManage}
              onStatus={setStatus}
              onChanged={loadDashboard}
            />
          )}
          {activeSection === 'accounts' && (
            <AccountsSection
              dashboard={dashboard}
              data={data.accounts}
              employees={data.employees.items}
              canManage={canManage}
              onChanged={loadDashboard}
              onStatus={setStatus}
            />
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
    </main>
  );
}

function valueOr<TValue>(result: PromiseSettledResult<TValue>, fallback: TValue): TValue {
  return result.status === 'fulfilled' ? result.value : fallback;
}
