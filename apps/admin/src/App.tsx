import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  ConfigProvider,
  Descriptions,
  Empty,
  Form,
  Input,
  List,
  Select,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
  App as AntApp,
  theme as antdTheme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ApartmentOutlined,
  AuditOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  FieldTimeOutlined,
  FileDoneOutlined,
  LockOutlined,
  LogoutOutlined,
  MobileOutlined,
  MoonOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SunOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard, ProLayout, StatisticCard } from '@ant-design/pro-components';
import type {
  ApprovalItem,
  ApprovalKind,
  ApprovalStatus,
  AttendanceGroup,
  AttendancePrimaryStatus,
  AttendanceResultRow,
  CreateAttendanceGroupRequest,
  CreateEmployeeRequest,
  CreateOrgUnitRequest,
  CreateShiftRequest,
  EmployeeProfile,
  FactoryProfile,
  LoginRequest,
  LoginResponse,
  MonthlyReportRow,
  OrgUnit,
  PaginatedData,
  ReportTask,
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
import type { AdminDataState } from './types';

const { Text, Title } = Typography;

const scopeStorageKey = 'easy-erp-admin-scope-v1';
const themeStorageKey = 'easy-erp-admin-theme-v1';
const today = new Date().toISOString().slice(0, 10);
type ThemeMode = 'light' | 'dark';

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

const navigation = [
  { path: '/workbench', name: '工作台', icon: <DashboardOutlined /> },
  { path: '/attendance-results', name: '考勤结果', icon: <FieldTimeOutlined /> },
  { path: '/approvals', name: '审批', icon: <AuditOutlined /> },
  { path: '/monthly-report', name: '月报', icon: <FileDoneOutlined /> },
  { path: '/organization', name: '组织', icon: <ApartmentOutlined /> },
  { path: '/employees', name: '员工', icon: <TeamOutlined /> },
  { path: '/shifts', name: '班次', icon: <ClockCircleOutlined /> },
  { path: '/attendance-groups', name: '考勤组', icon: <CalendarOutlined /> },
] as const;

export function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const isDark = themeMode === 'dark';

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem(themeStorageKey, themeMode);
  }, [themeMode]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#059669',
          colorInfo: isDark ? '#94a3b8' : '#334155',
          colorSuccess: '#059669',
          colorWarning: isDark ? '#f59e0b' : '#d97706',
          colorError: isDark ? '#f87171' : '#dc2626',
          colorTextBase: isDark ? '#e5edf7' : '#0f172a',
          colorBgLayout: isDark ? '#07111f' : '#f5f7fb',
          colorBgContainer: isDark ? '#0f1b2d' : '#ffffff',
          colorBorder: isDark ? '#253247' : '#e2e8f0',
          borderRadius: 8,
          fontFamily: 'Inter, "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        components: {
          Card: {
            headerBg: isDark ? '#0f1b2d' : '#ffffff',
          },
          Table: {
            headerBg: isDark ? '#111c2f' : '#f8fafc',
            headerColor: isDark ? '#cbd5e1' : '#475569',
            rowHoverBg: isDark ? 'rgba(5, 150, 105, 0.14)' : '#ecfdf5',
          },
        },
      }}
    >
      <AntApp>
        <AdminApp themeMode={themeMode} onThemeChange={setThemeMode} />
      </AntApp>
    </ConfigProvider>
  );
}

function AdminApp(props: { themeMode: ThemeMode; onThemeChange: (mode: ThemeMode) => void }) {
  const { message } = AntApp.useApp();
  const [session, setSession] = useState<AdminSession | null>(() => loadSession());
  const [scope, setScopeState] = useState<AdminDashboardScope>(() => loadScope());
  const [data, setData] = useState<AdminDataState>(initialData);
  const [factories, setFactories] = useState<FactoryProfile[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [status, setStatus] = useState('请先登录并设置工厂范围。');
  const [isLoading, setIsLoading] = useState(false);
  const [isScopeLoading, setIsScopeLoading] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginRequest>({ phone: '', password: '' });
  const [taskId, setTaskId] = useState('');
  const client = useMemo(() => new FetchApiClient('', () => session), [session]);
  const dashboard = useMemo(() => createAdminDashboardPage(client, scope), [client, scope]);
  const canManage = Boolean(session?.roles.some((role) => role === 'TENANT_ADMIN' || role === 'HR_ADMIN'));

  function notifyStatus(nextStatus: string, options: { silent?: boolean } = {}) {
    setStatus(nextStatus);

    if (options.silent || nextStatus.includes('正在')) {
      return;
    }

    const type = feedbackType(nextStatus);
    if (type === 'success') {
      void message.success(nextStatus);
      return;
    }

    if (type === 'warning') {
      void message.warning(nextStatus);
      return;
    }

    if (type === 'error') {
      void message.error(nextStatus);
      return;
    }

    void message.info(nextStatus);
  }

  function setScope(nextScope: AdminDashboardScope) {
    setScopeState(nextScope);
    localStorage.setItem(scopeStorageKey, JSON.stringify(nextScope));
  }

  async function applyScope(nextScope: AdminDashboardScope) {
    setScope(nextScope);

    if (nextScope.factoryId) {
      await loadScopeOptions(nextScope.factoryId, nextScope, true, true);
    }
  }

  async function loadScopeOptions(
    factoryId = scope.factoryId,
    scopeOverride?: AdminDashboardScope,
    refreshAfterLoad = false,
    silent = false,
  ) {
    if (!session) {
      return;
    }

    setIsScopeLoading(true);
    try {
      const nextFactories = await requestData(client.get<FactoryProfile[]>('/api/v1/factories'));
      setFactories(nextFactories);

      const resolvedFactoryId = factoryId || nextFactories[0]?.id || '';
      const nextOrgUnits = resolvedFactoryId
        ? await requestData(client.get<OrgUnit[]>(`/api/v1/org-units?factoryId=${resolvedFactoryId}`))
        : [];
      const candidateScope = scopeOverride ?? scope;
      const resolvedScope: AdminDashboardScope = {
        ...candidateScope,
        factoryId: resolvedFactoryId,
        orgUnitId: nextOrgUnits.some((unit) => unit.id === candidateScope.orgUnitId)
          ? candidateScope.orgUnitId
          : null,
      };

      setOrgUnits(nextOrgUnits);
      setScope(resolvedScope);
      notifyStatus(
        resolvedFactoryId
          ? '工厂与组织范围已加载。'
          : '当前账号暂无可选工厂，请联系管理员确认数据范围。',
        { silent: silent && Boolean(resolvedFactoryId) },
      );

      if (refreshAfterLoad && resolvedScope.factoryId) {
        await loadDashboard(resolvedScope, { silent });
      }
    } catch (error) {
      notifyStatus(toAdminFeedback(error).message);
    } finally {
      setIsScopeLoading(false);
    }
  }

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
      setStatus('登录成功，请设置工厂范围后加载工作台。');
    } catch (error) {
      setStatus(toAdminFeedback(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDashboard(
    scopeOverride = scope,
    options: { silent?: boolean } = {},
  ) {
    if (!scopeOverride.factoryId) {
      notifyStatus('请先填写工厂 ID。');
      return;
    }

    setIsLoading(true);
    setStatus('正在刷新后台数据...');

    const dashboardPage = createAdminDashboardPage(client, scopeOverride);
    const monthStart = `${scopeOverride.month}-01`;
    const [
      organization,
      employees,
      shifts,
      attendanceGroups,
      attendanceResults,
      monthlyReport,
      leaveApprovals,
      repairApprovals,
    ] = await Promise.allSettled([
      dashboardPage.organization.load(),
      dashboardPage.employees.search(),
      dashboardPage.shifts.load(),
      dashboardPage.attendanceGroups.load(),
      dashboardPage.attendanceResults.search({ startDate: monthStart, endDate: today, pageSize: 50 }),
      dashboardPage.monthlyReport.load(),
      dashboardPage.leaveApprovals.list({ status: 'PENDING', pageSize: 50 }),
      dashboardPage.repairApprovals.list({ status: 'PENDING', pageSize: 50 }),
    ]);

    setData((current) => ({
      ...current,
      organization: valueOr(organization, []),
      employees: valueOr(employees, emptyPage<EmployeeProfile>()),
      shifts: valueOr(shifts, []),
      attendanceGroups: valueOr(attendanceGroups, []),
      attendanceResults: valueOr(attendanceResults, emptyPage<AttendanceResultRow>()),
      monthlyReport: valueOr(monthlyReport, emptyPage<MonthlyReportRow>()),
      leaveApprovals: valueOr(leaveApprovals, emptyPage<ApprovalItem>()),
      repairApprovals: valueOr(repairApprovals, emptyPage<ApprovalItem>()),
    }));
    notifyStatus('后台数据已刷新。', { silent: options.silent });
    setIsLoading(false);
  }

  function logout() {
    clearSession();
    setSession(null);
    setData(initialData);
    setFactories([]);
    setOrgUnits([]);
    notifyStatus('已退出登录。');
  }

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadScopeOptions(scope.factoryId, scope, true, true);
    // 登录态建立后加载一次范围选项；后续选择变化由 applyScope 显式处理。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  if (!session) {
    return (
      <LoginPage
        form={loginForm}
        isLoading={isLoading}
        status={status}
        themeMode={props.themeMode}
        onFormChange={setLoginForm}
        onLogin={login}
        onThemeChange={props.onThemeChange}
      />
    );
  }

  return (
    <AdminShell
      session={session}
      scope={scope}
      isLoading={isLoading}
      isScopeLoading={isScopeLoading}
      factories={factories}
      orgUnits={orgUnits}
      onScopeChange={applyScope}
      onRefresh={loadDashboard}
      onLogout={logout}
      themeMode={props.themeMode}
      onThemeChange={props.onThemeChange}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/workbench" replace />} />
        <Route path="/login" element={<Navigate to="/workbench" replace />} />
        <Route
          path="/workbench"
          element={
            <WorkbenchPage
              data={data}
              scope={scope}
              canManage={canManage}
            />
          }
        />
        <Route
          path="/attendance-results"
          element={<AttendanceResultsPage data={data.attendanceResults} />}
        />
        <Route
          path="/approvals"
          element={
            <ApprovalsPage
              dashboard={dashboard}
              canManage={canManage}
              onStatus={notifyStatus}
              onChanged={loadDashboard}
            />
          }
        />
        <Route
          path="/monthly-report"
          element={
            <MonthlyReportPage
              dashboard={dashboard}
              data={data.monthlyReport}
              scope={scope}
              taskId={taskId}
              setTaskId={setTaskId}
              isLoading={isLoading}
              canManage={canManage}
              onStatus={notifyStatus}
              onMonthChange={async (month) => {
                const nextScope = { ...scope, month };
                setScope(nextScope);
                await loadDashboard(nextScope);
              }}
            />
          }
        />
        <Route
          path="/organization"
          element={
            <OrganizationPage
              client={client}
              scope={scope}
              data={data.organization}
              canManage={canManage}
              onChanged={loadDashboard}
              onStatus={notifyStatus}
            />
          }
        />
        <Route
          path="/employees"
          element={
            <EmployeesPage
              client={client}
              scope={scope}
              data={data.employees}
              canManage={canManage}
              onChanged={loadDashboard}
              onStatus={notifyStatus}
            />
          }
        />
        <Route
          path="/shifts"
          element={
            <ShiftsPage
              client={client}
              scope={scope}
              data={data.shifts}
              canManage={canManage}
              onChanged={loadDashboard}
              onStatus={notifyStatus}
            />
          }
        />
        <Route
          path="/attendance-groups"
          element={
            <AttendanceGroupsPage
              client={client}
              scope={scope}
              data={data.attendanceGroups}
              shifts={data.shifts}
              canManage={canManage}
              onChanged={loadDashboard}
              onStatus={notifyStatus}
            />
          }
        />
      </Routes>
    </AdminShell>
  );
}

function LoginPage(props: {
  form: LoginRequest;
  isLoading: boolean;
  status: string;
  themeMode: ThemeMode;
  onFormChange: (form: LoginRequest) => void;
  onLogin: () => void;
  onThemeChange: (mode: ThemeMode) => void;
}) {
  const showStatus =
    props.status !== '请先登录并设置工厂范围。' &&
    props.status !== '已退出登录。';

  return (
    <main className="login-pro-shell">
      <div className="login-theme-toggle">
        <ThemeSwitch themeMode={props.themeMode} onThemeChange={props.onThemeChange} />
      </div>
      <section className="login-pro-window">
        <div className="login-pro-grid">
          <div className="login-pro-hero">
            <div className="login-pro-brand">
              <div className="login-pro-brand-mark">F</div>
              <div>
                <strong>Factory ERP Lite</strong>
                <span>Attendance Operations</span>
              </div>
            </div>
            <div className="login-pro-hero-copy">
              <Title level={1}>考勤管理后台</Title>
              <Text className="login-pro-slogan">简洁 · 高效 · 智能</Text>
            </div>
            <div className="login-pro-illustration" aria-hidden="true">
              <div className="login-pro-orbit login-pro-orbit-left" />
              <div className="login-pro-orbit login-pro-orbit-right" />
              <div className="login-pro-shield">
                <SafetyCertificateOutlined />
              </div>
              <div className="login-pro-cardlet login-pro-cardlet-left" />
              <div className="login-pro-cardlet login-pro-cardlet-right" />
              <div className="login-pro-cube login-pro-cube-one" />
              <div className="login-pro-cube login-pro-cube-two" />
            </div>
          </div>
          <div className="login-pro-panel">
            <div className="login-pro-card-head">
              <Title level={3}>管理员登录</Title>
              <Text type="secondary">使用管理员账号进入工厂考勤后台。</Text>
            </div>
            {showStatus ? (
              <Alert className="admin-status-alert" type={feedbackType(props.status)} message={props.status} showIcon />
            ) : null}
            <Form<LoginRequest>
              layout="vertical"
              className="login-pro-form"
              onFinish={props.onLogin}
            >
              <Form.Item label="手机号" required>
                <Input
                  prefix={<MobileOutlined />}
                  size="large"
                  value={props.form.phone}
                  placeholder="请输入手机号"
                  autoComplete="username"
                  onChange={(event) => props.onFormChange({ ...props.form, phone: event.target.value })}
                />
              </Form.Item>
              <Form.Item label="密码" required>
                <Input.Password
                  prefix={<LockOutlined />}
                  size="large"
                  value={props.form.password}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  onChange={(event) => props.onFormChange({ ...props.form, password: event.target.value })}
                />
              </Form.Item>
              <Button block type="primary" htmlType="submit" size="large" loading={props.isLoading}>
                登录
              </Button>
            </Form>
            <Text className="login-pro-helper" type="secondary">
              登录后进入运营工作台，可继续选择工厂和组织范围。
            </Text>
          </div>
        </div>
      </section>
    </main>
  );
}

function AdminShell(props: {
  session: AdminSession;
  scope: AdminDashboardScope;
  isLoading: boolean;
  isScopeLoading: boolean;
  factories: FactoryProfile[];
  orgUnits: OrgUnit[];
  children: React.ReactNode;
  onScopeChange: (scope: AdminDashboardScope) => void;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}) {
  const location = useLocation();
  const isDark = props.themeMode === 'dark';

  return (
    <ProLayout
      className="admin-pro-layout"
      title="Factory ERP Lite"
      logo={<div className="admin-pro-logo">F</div>}
      route={{ path: '/', routes: navigation }}
      location={{ pathname: location.pathname }}
      layout="mix"
      fixedHeader
      fixSiderbar
      menu={{ type: 'group' }}
      menuItemRender={(item, dom) => (item.path ? <NavLink to={item.path}>{dom}</NavLink> : dom)}
      avatarProps={{
        title: props.session.roles.join(' / '),
        size: 'small',
      }}
      actionsRender={() => [
        <ThemeSwitch key="theme" themeMode={props.themeMode} onThemeChange={props.onThemeChange} />,
        <Button key="refresh" type="text" icon={<ReloadOutlined />} loading={props.isLoading} onClick={props.onRefresh}>
          刷新
        </Button>,
        <Button key="logout" type="text" icon={<LogoutOutlined />} onClick={props.onLogout}>
          退出
        </Button>,
      ]}
      token={{
        header: {
          colorBgHeader: isDark ? '#0b1524' : '#ffffff',
          colorHeaderTitle: isDark ? '#e5edf7' : '#0f172a',
        },
        sider: {
          colorMenuBackground: isDark ? '#07111f' : '#0f172a',
          colorTextMenu: 'rgba(255,255,255,0.72)',
          colorTextMenuSelected: '#ffffff',
          colorBgMenuItemSelected: 'rgba(5,150,105,0.22)',
        },
      }}
    >
      <div className="admin-pro-content">
        <ScopeConsole
          session={props.session}
          scope={props.scope}
          isLoading={props.isLoading}
          isScopeLoading={props.isScopeLoading}
          factories={props.factories}
          orgUnits={props.orgUnits}
          onScopeChange={props.onScopeChange}
          onRefresh={props.onRefresh}
        />
        {props.children}
      </div>
    </ProLayout>
  );
}

function ScopeConsole(props: {
  session: AdminSession;
  scope: AdminDashboardScope;
  isLoading: boolean;
  isScopeLoading: boolean;
  factories: FactoryProfile[];
  orgUnits: OrgUnit[];
  onScopeChange: (scope: AdminDashboardScope) => void;
  onRefresh: () => Promise<void>;
}) {
  return (
    <ProCard className="scope-console" bordered>
      <div className="scope-console-grid">
        <Form.Item label="工厂" className="scope-console-item">
          <Select
            showSearch
            value={props.scope.factoryId}
            placeholder="选择工厂"
            loading={props.isScopeLoading}
            optionFilterProp="label"
            options={props.factories.map((factory) => ({
              label: factory.name,
              value: factory.id,
            }))}
            onChange={(factoryId) => props.onScopeChange({ ...props.scope, factoryId, orgUnitId: null })}
          />
        </Form.Item>
        <Form.Item label="组织" className="scope-console-item">
          <Select
            allowClear
            showSearch
            value={props.scope.orgUnitId ?? ''}
            placeholder="全部组织"
            loading={props.isScopeLoading}
            optionFilterProp="label"
            disabled={!props.scope.factoryId}
            options={[
              { label: '全部组织', value: '' },
              ...props.orgUnits.map((unit) => ({
                label: `${unit.name} · ${translateOrgUnitType(unit.type)}`,
                value: unit.id,
              })),
            ]}
            onChange={(orgUnitId) => props.onScopeChange({ ...props.scope, orgUnitId: orgUnitId || null })}
          />
        </Form.Item>
        <Button type="primary" icon={<ReloadOutlined />} loading={props.isLoading} onClick={props.onRefresh}>
          刷新数据
        </Button>
      </div>
    </ProCard>
  );
}

function WorkbenchPage(props: {
  data: AdminDataState;
  scope: AdminDashboardScope;
  canManage: boolean;
}) {
  const navigate = useNavigate();
  const pendingApprovals = props.data.leaveApprovals.total + props.data.repairApprovals.total;
  const attendanceRisk = summarizeAttendance(props.data.attendanceResults.items);
  const unlockedReports = props.data.monthlyReport.items.filter((row) => !row.isFinalized).length;
  const expectedAttendance = props.data.attendanceResults.total + attendanceRisk.absent;
  const checkinRate = expectedAttendance > 0
    ? Math.round(((props.data.attendanceResults.total - attendanceRisk.missingClock) / expectedAttendance) * 1000) / 10
    : 0;
  const pendingItems = [
    { label: '请假申请', value: props.data.leaveApprovals.total, path: '/approvals' },
    { label: '补卡申请', value: props.data.repairApprovals.total, path: '/approvals' },
    { label: '考勤异常', value: attendanceRisk.total, path: '/attendance-results' },
    { label: '月报未锁定', value: unlockedReports, path: '/monthly-report' },
  ];
  const statusItems = [
    { label: '正常', value: props.data.attendanceResults.items.filter((row) => row.primaryStatus === 'NORMAL').length, color: '#5268ff' },
    { label: '迟到', value: attendanceRisk.late, color: '#fb923c' },
    { label: '早退', value: attendanceRisk.earlyLeave, color: '#f59e0b' },
    { label: '缺勤', value: attendanceRisk.absent, color: '#ff5a6e' },
    { label: '缺卡', value: attendanceRisk.missingClock, color: '#22c55e' },
  ];
  const totalStatus = statusItems.reduce((sum, item) => sum + item.value, 0);
  const trendPoints = buildAttendanceTrend(props.data.attendanceResults.items);
  const trendPolyline = trendPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const trendArea = trendPolyline
    ? `36,182 ${trendPolyline} 324,182`
    : '';

  return (
    <PageContainer
      title={false}
    >
      <section className="workbench-dashboard">
        <div className="workbench-title-row">
          <div>
            <Title level={2}>工作台</Title>
            <Text type="secondary">先看今日考勤、审批待办和月报锁定，再进入资料维护。</Text>
          </div>
          <Tag color={props.canManage ? 'blue' : 'default'}>{props.canManage ? '可管理' : '只读'}</Tag>
        </div>

        <div className="workbench-metric-grid">
          <WorkbenchMetricCard
            label="员工档案"
            value={props.data.employees.total}
            helper="当前范围"
            delta={`${props.data.organization.length} 个组织`}
            tone="blue"
            icon={<TeamOutlined />}
          />
          <WorkbenchMetricCard
            label="待审批"
            value={pendingApprovals}
            helper="请假 / 补卡"
            delta={`${props.data.leaveApprovals.total} / ${props.data.repairApprovals.total}`}
            tone="orange"
            icon={<AuditOutlined />}
          />
          <WorkbenchMetricCard
            label="异常记录"
            value={attendanceRisk.total}
            helper="迟到、早退、缺勤、缺卡"
            delta={attendanceRisk.total > 0 ? '需处理' : '平稳'}
            tone="red"
            icon={<ClockCircleOutlined />}
          />
          <WorkbenchMetricCard
            label="打卡率"
            value={`${checkinRate}%`}
            helper="当前加载数据"
            delta={`未锁定月报 ${unlockedReports}`}
            tone="green"
            icon={<CheckCircleOutlined />}
          />
        </div>

        <div className="workbench-main-grid">
          <ProCard className="workbench-card workbench-pending-card" bordered>
            <div className="workbench-card-title">
              <span><AuditOutlined /> 今日待办审批</span>
            </div>
            <div className="workbench-pending-list">
              {pendingItems.map((item) => (
                <button key={item.label} type="button" className="workbench-pending-item" onClick={() => navigate(item.path)}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </button>
              ))}
            </div>
            <Button type="link" onClick={() => navigate('/approvals')}>
              查看全部
            </Button>
          </ProCard>

          <ProCard className="workbench-card workbench-status-card" bordered>
            <div className="workbench-card-title">
              <span><TeamOutlined /> 员工出勤状态（今日）</span>
            </div>
            <div className="workbench-status-body">
              <div
                className="workbench-donut"
                style={{ '--donut-fill': buildDonutGradient(statusItems) } as CSSProperties}
              >
                <div className="workbench-donut-center">
                  <strong>{totalStatus}</strong>
                  <span>应出勤人数</span>
                </div>
              </div>
              <div className="workbench-status-legend">
                {statusItems.map((item) => (
                  <div key={item.label}>
                    <span className="workbench-status-dot" style={{ background: item.color }} />
                    <Text>{item.label}</Text>
                    <strong>{item.value}</strong>
                    <Text type="secondary">{formatPercent(item.value, totalStatus)}</Text>
                  </div>
                ))}
              </div>
            </div>
            <Button type="link" onClick={() => navigate('/attendance-results')}>
              查看更多
            </Button>
          </ProCard>

          <ProCard className="workbench-card workbench-trend-card" bordered>
            <div className="workbench-card-title">
              <span><FieldTimeOutlined /> 本周打卡趋势</span>
            </div>
            <svg className="workbench-trend-chart" viewBox="0 0 360 220" role="img" aria-label="本周打卡趋势">
              {[0, 1, 2, 3].map((line) => (
                <line key={line} x1="36" x2="324" y1={30 + line * 50} y2={30 + line * 50} />
              ))}
              {[0, 1, 2, 3, 4, 5, 6].map((line) => (
                <line key={line} x1={36 + line * 48} x2={36 + line * 48} y1="30" y2="182" />
              ))}
              {trendArea ? <polygon points={trendArea} /> : null}
              {trendPolyline ? <polyline points={trendPolyline} /> : null}
              {trendPoints.map((point) => (
                <circle key={point.label} cx={point.x} cy={point.y} r="4.5" />
              ))}
              {trendPoints.map((point) => (
                <text key={point.label} x={point.x} y="208">{point.label}</text>
              ))}
            </svg>
          </ProCard>
        </div>
      </section>
    </PageContainer>
  );
}

function WorkbenchMetricCard(props: {
  label: string;
  value: string | number;
  helper: string;
  delta: string;
  tone: 'blue' | 'orange' | 'red' | 'green';
  icon: ReactNode;
}) {
  return (
    <ProCard className={`workbench-metric-card workbench-metric-${props.tone}`} bordered>
      <div className="workbench-metric-content">
        <Text strong>{props.label}</Text>
        <strong>{props.value}</strong>
        <span>
          {props.helper}
          <em>{props.delta}</em>
        </span>
      </div>
      <div className="workbench-metric-icon">{props.icon}</div>
    </ProCard>
  );
}

function AttendanceResultsPage(props: { data: PaginatedData<AttendanceResultRow> }) {
  const [statusFilter, setStatusFilter] = useState<AttendancePrimaryStatus | 'ALL' | 'RISK'>('RISK');
  const [keyword, setKeyword] = useState('');
  const normalizedKeyword = keyword.trim().toLowerCase();
  const searchedRows = normalizedKeyword
    ? props.data.items.filter((row) =>
        [row.employeeName, row.empNo, row.date]
          .some((value) => value.toLowerCase().includes(normalizedKeyword)),
      )
    : props.data.items;
  const riskRows = searchedRows.filter((row) => row.primaryStatus !== 'NORMAL');
  const rows = statusFilter === 'ALL'
    ? searchedRows
    : statusFilter === 'RISK'
      ? riskRows
      : searchedRows.filter((row) => row.primaryStatus === statusFilter);

  return (
    <PageContainer title={false}>
      <section className="attendance-page">
        <div className="attendance-page-title">
          <Title level={2}>考勤记录</Title>
          <Text type="secondary">按员工、日期和考勤状态快速核对异常记录。</Text>
        </div>

        <ProCard className="attendance-filter-card" bordered>
          <div className="attendance-filter-row">
            <Select
              value="当前工厂范围"
              disabled
              options={[{ label: '当前工厂范围', value: '当前工厂范围' }]}
            />
            <Select
              value="当前组织范围"
              disabled
              options={[{ label: '当前组织范围', value: '当前组织范围' }]}
            />
            <Input
              value={keyword}
              allowClear
              placeholder="搜索姓名、工号、日期"
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Button onClick={() => { setKeyword(''); setStatusFilter('ALL'); }}>
              重置
            </Button>
          </div>
          <Segmented
            className="attendance-status-tabs"
            value={statusFilter}
            options={[
              { label: '全部记录', value: 'ALL' },
              { label: '异常记录', value: 'RISK' },
              { label: '正常出勤', value: 'NORMAL' },
              { label: '迟到', value: 'LATE' },
              { label: '早退', value: 'EARLY_LEAVE' },
              { label: '请假', value: 'LEAVE' },
              { label: '缺勤', value: 'ABSENT' },
              { label: '缺卡', value: 'MISSING_CLOCK' },
            ]}
            onChange={(value) => setStatusFilter(value as AttendancePrimaryStatus | 'ALL' | 'RISK')}
          />
        </ProCard>

        <ProCard className="attendance-table-card" bordered>
          <AttendanceResultsTable rows={rows} total={props.data.total} />
        </ProCard>
      </section>
    </PageContainer>
  );
}

function ApprovalsPage(props: {
  dashboard: ReturnType<typeof createAdminDashboardPage>;
  canManage: boolean;
  onStatus: (status: string) => void;
  onChanged: () => Promise<void>;
}) {
  const [kind, setKind] = useState<ApprovalKind>('LEAVE');
  const [status, setStatus] = useState<ApprovalStatus>('PENDING');
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [selected, setSelected] = useState<ApprovalItem | null>(null);
  const [comment, setComment] = useState('同意。');
  const [isLoading, setIsLoading] = useState(false);
  const page = kind === 'LEAVE' ? props.dashboard.leaveApprovals : props.dashboard.repairApprovals;

  async function load() {
    setIsLoading(true);
    try {
      const nextPage = await page.list({ status, pageSize: 50 });
      setItems(nextPage.items);
      setSelected(nextPage.items[0] ?? null);
      props.onStatus(`审批列表已加载：${nextPage.total} 条。`);
    } catch (error) {
      props.onStatus(toAdminFeedback(error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function decide(action: 'approve' | 'reject') {
    if (!selected) {
      props.onStatus('请先选择一条审批单。');
      return;
    }

    const feedback = action === 'approve'
      ? await page.approveSafely(selected.id, comment)
      : await page.rejectSafely(selected.id, comment);
    props.onStatus(feedback.message);
    await load();
    await props.onChanged();
  }

  return (
    <PageContainer
      title="审批工作区"
      subTitle="从待办列表直接选择请假或补卡单据，减少手动复制审批 ID。"
      tags={<Tag color={props.canManage ? 'success' : 'default'}>{props.canManage ? '可审批' : '只读'}</Tag>}
    >
      <ProCard bordered>
        <div className="approval-toolbar">
          <Segmented
            value={kind}
            options={[
              { label: '请假', value: 'LEAVE' },
              { label: '补卡', value: 'REPAIR' },
            ]}
            onChange={(value) => {
              setKind(value as ApprovalKind);
              setSelected(null);
            }}
          />
          <Segmented
            value={status}
            options={[
              { label: '待处理', value: 'PENDING' },
              { label: '已通过', value: 'APPROVED' },
              { label: '已驳回', value: 'REJECTED' },
            ]}
            onChange={(value) => {
              setStatus(value as ApprovalStatus);
              setSelected(null);
            }}
          />
          <Button type="primary" loading={isLoading} onClick={load}>
            刷新列表
          </Button>
        </div>
      </ProCard>

      <div className="admin-grid-approval">
        <ProCard title="审批列表" bordered>
          {items.length === 0 ? (
            <Empty description="当前筛选条件下没有审批记录" />
          ) : (
            <List
              itemLayout="vertical"
              dataSource={items}
              renderItem={(item) => (
                <List.Item
                  className={selected?.id === item.id ? 'approval-list-item-selected' : undefined}
                  onClick={() => setSelected(item)}
                  extra={<ApprovalTag status={item.status} />}
                >
                  <List.Item.Meta
                    title={`${item.employeeName}（${item.empNo}）`}
                    description={formatApprovalMeta(item)}
                  />
                  <Text type="secondary">{item.reason}</Text>
                </List.Item>
              )}
            />
          )}
        </ProCard>

        <ProCard title="审批详情" bordered>
          {selected ? (
            <Space direction="vertical" size="middle" className="admin-full-width">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="员工">{selected.employeeName}（{selected.empNo}）</Descriptions.Item>
                <Descriptions.Item label="类型">{selected.type === 'LEAVE' ? '请假' : '补卡'}</Descriptions.Item>
                <Descriptions.Item label="状态"><ApprovalTag status={selected.status} /></Descriptions.Item>
                <Descriptions.Item label="时间">{formatApprovalMeta(selected)}</Descriptions.Item>
                <Descriptions.Item label="原因">{selected.reason}</Descriptions.Item>
              </Descriptions>
              <Input.TextArea
                rows={4}
                value={comment}
                placeholder="审批意见"
                onChange={(event) => setComment(event.target.value)}
              />
              <Space>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  disabled={!props.canManage || selected.status !== 'PENDING'}
                  onClick={() => decide('approve')}
                >
                  通过
                </Button>
                <Button
                  danger
                  disabled={!props.canManage || selected.status !== 'PENDING'}
                  onClick={() => decide('reject')}
                >
                  驳回
                </Button>
              </Space>
            </Space>
          ) : (
            <Empty description="选择一条审批单后查看详情" />
          )}
        </ProCard>
      </div>
    </PageContainer>
  );
}

function MonthlyReportPage(props: {
  dashboard: ReturnType<typeof createAdminDashboardPage>;
  data: PaginatedData<MonthlyReportRow>;
  scope: AdminDashboardScope;
  taskId: string;
  setTaskId: (taskId: string) => void;
  isLoading: boolean;
  canManage: boolean;
  onStatus: (status: string) => void;
  onMonthChange: (month: string) => Promise<void>;
}) {
  const [task, setTask] = useState<ReportTask | null>(null);
  const locked = props.data.items.filter((row) => row.isFinalized).length;
  const unlocked = props.data.items.length - locked;

  async function exportReport() {
    try {
      const result = await props.dashboard.monthlyReport.export();
      props.setTaskId(result.taskId);
      props.onStatus(`导出任务已创建：${result.taskId}`);
    } catch (error) {
      props.onStatus(toAdminFeedback(error).message);
    }
  }

  async function queryTask() {
    if (!props.taskId) {
      props.onStatus('请先填写导出任务 ID。');
      return;
    }

    try {
      const nextTask = await props.dashboard.monthlyReport.getTask(props.taskId);
      setTask(nextTask);
      props.onStatus(`导出任务 ${nextTask.taskId} 当前状态：${nextTask.status}`);
    } catch (error) {
      props.onStatus(toAdminFeedback(error).message);
    }
  }

  return (
    <PageContainer title="月报与导出" subTitle="把月报锁定状态和导出任务分开处理，避免长任务状态淹没在表格里。">
      <ProCard className="monthly-scope-card" bordered>
        <Space wrap size="middle" align="center">
          <Text strong>月报月份</Text>
          <Input
            className="monthly-scope-input"
            type="month"
            value={props.scope.month}
            onChange={(event) => void props.onMonthChange(event.target.value)}
          />
          <Button icon={<ReloadOutlined />} loading={props.isLoading} onClick={() => props.onMonthChange(props.scope.month)}>
            刷新月报
          </Button>
        </Space>
      </ProCard>
      <StatisticCard.Group className="dashboard-stat-group">
        <StatisticCard className="metric-card" statistic={{ title: '月报员工', value: props.data.total }} />
        <StatisticCard className="metric-card" statistic={{ title: '已锁定', value: locked }} />
        <StatisticCard className="metric-card" statistic={{ title: '未锁定', value: unlocked }} />
      </StatisticCard.Group>
      <div className="admin-grid-report">
        <ProCard title="月报列表" bordered>
          <MonthlyReportTable rows={props.data.items} />
        </ProCard>
        <ProCard title="导出任务" bordered>
          <Space direction="vertical" size="middle" className="admin-full-width">
            <Space.Compact className="admin-full-width">
              <Input
                value={props.taskId}
                placeholder="导出任务 ID"
                onChange={(event) => props.setTaskId(event.target.value)}
              />
              <Button onClick={queryTask}>查询</Button>
            </Space.Compact>
            <Button type="primary" block disabled={!props.canManage} onClick={exportReport}>
              创建导出任务
            </Button>
            <Alert
              type={task?.status === 'FAILED' ? 'error' : task?.status === 'COMPLETED' ? 'success' : 'info'}
              message={task ? `任务状态：${task.status}` : '最近任务会在查询后显示在这里。'}
              description={task?.downloadUrl ? `下载地址：${task.downloadUrl}` : undefined}
              showIcon
            />
          </Space>
        </ProCard>
      </div>
    </PageContainer>
  );
}

function OrganizationPage(props: {
  client: FetchApiClient;
  scope: AdminDashboardScope;
  data: OrgUnit[];
  canManage: boolean;
  onChanged: () => Promise<void>;
  onStatus: (status: string) => void;
}) {
  const [form] = Form.useForm<{ name: string }>();
  const columns: ColumnsType<OrgUnit> = [
    { title: '名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', render: (value: OrgUnit['type']) => <Tag>{translateOrgUnitType(value)}</Tag> },
    { title: '排序', dataIndex: 'sortOrder', width: 96 },
    { title: '状态', dataIndex: 'status', render: (value: OrgUnit['status']) => <StatusTag value={value} /> },
  ];

  async function create(values: { name: string }) {
    const body: CreateOrgUnitRequest = {
      factoryId: props.scope.factoryId,
      parentId: props.scope.orgUnitId ?? null,
      name: values.name,
      type: 'DEPARTMENT',
      sortOrder: props.data.length + 1,
    };

    await submitResourceAction(
      requestData(props.client.post<OrgUnit, CreateOrgUnitRequest>('/api/v1/org-units', body)),
      '组织单元已创建。',
      props,
      () => form.resetFields(),
    );
  }

  return (
    <ResourcePage title="组织结构" description="按工厂与组织边界维护试点数据范围。">
      <ProCard title="新增组织单元" bordered>
        <Form layout="inline" form={form} onFinish={create} disabled={!props.canManage || !props.scope.factoryId}>
          <Form.Item name="name" rules={[{ required: true, message: '请输入组织名称' }]}>
            <Input placeholder="新组织名称" />
          </Form.Item>
          <Button type="primary" htmlType="submit">新增</Button>
        </Form>
      </ProCard>
      <ProCard title="组织列表" bordered>
        <Table rowKey="id" columns={columns} dataSource={props.data} pagination={false} scroll={{ x: 720 }} />
      </ProCard>
    </ResourcePage>
  );
}

function EmployeesPage(props: {
  client: FetchApiClient;
  scope: AdminDashboardScope;
  data: PaginatedData<EmployeeProfile>;
  canManage: boolean;
  onChanged: () => Promise<void>;
  onStatus: (status: string) => void;
}) {
  const [form] = Form.useForm<{ empNo: string; name: string; phone: string }>();
  const columns: ColumnsType<EmployeeProfile> = [
    { title: '工号', dataIndex: 'empNo', width: 140 },
    { title: '姓名', dataIndex: 'name', width: 140 },
    { title: '手机号', dataIndex: 'phone', width: 180 },
    { title: '组织 ID', dataIndex: 'orgUnitId', render: (value: string | null) => value ?? '-' },
    { title: '入职日期', dataIndex: 'entryDate', width: 140 },
    { title: '状态', dataIndex: 'status', width: 110, render: (value: EmployeeProfile['status']) => <StatusTag value={value} /> },
  ];

  async function create(values: { empNo: string; name: string; phone: string }) {
    const body: CreateEmployeeRequest = {
      factoryId: props.scope.factoryId,
      orgUnitId: props.scope.orgUnitId ?? null,
      empNo: values.empNo,
      name: values.name,
      phone: values.phone,
      entryDate: today,
      status: 'ACTIVE',
    };

    await submitResourceAction(
      requestData(props.client.post<EmployeeProfile, CreateEmployeeRequest>('/api/v1/employees', body)),
      '员工档案已创建。',
      props,
      () => form.resetFields(),
    );
  }

  return (
    <ResourcePage title="员工档案" description="优先保证工号、手机号、在职状态和组织归属可排查。">
      <ProCard title="新增员工" bordered>
        <Form layout="inline" form={form} onFinish={create} disabled={!props.canManage || !props.scope.factoryId}>
          <Form.Item name="empNo" rules={[{ required: true, message: '请输入工号' }]}>
            <Input placeholder="工号" />
          </Form.Item>
          <Form.Item name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="姓名" />
          </Form.Item>
          <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input placeholder="手机号" />
          </Form.Item>
          <Button type="primary" htmlType="submit">新增</Button>
        </Form>
      </ProCard>
      <ProCard title="员工列表" bordered>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={props.data.items}
          pagination={{ pageSize: props.data.pageSize, total: props.data.total, showSizeChanger: false }}
          scroll={{ x: 880 }}
        />
      </ProCard>
    </ResourcePage>
  );
}

function ShiftsPage(props: {
  client: FetchApiClient;
  scope: AdminDashboardScope;
  data: Shift[];
  canManage: boolean;
  onChanged: () => Promise<void>;
  onStatus: (status: string) => void;
}) {
  const [form] = Form.useForm<{ name: string; startTime: string; endTime: string; workMinutes: number }>();
  const columns: ColumnsType<Shift> = [
    { title: '名称', dataIndex: 'name' },
    { title: '上班', dataIndex: 'startTime', width: 120 },
    { title: '下班', dataIndex: 'endTime', width: 120 },
    { title: '工时', dataIndex: 'workMinutes', width: 120, render: (value: number) => `${value} 分钟` },
    { title: '迟到宽限', dataIndex: 'lateGraceMinutes', width: 120, render: (value: number) => `${value} 分钟` },
    { title: '早退宽限', dataIndex: 'earlyLeaveGraceMinutes', width: 120, render: (value: number) => `${value} 分钟` },
  ];

  async function create(values: { name: string; startTime?: string; endTime?: string; workMinutes?: number }) {
    const body: CreateShiftRequest = {
      factoryId: props.scope.factoryId,
      name: values.name,
      startTime: values.startTime || '09:00',
      endTime: values.endTime || '18:00',
      crossDay: false,
      workMinutes: Number(values.workMinutes ?? 480),
      lateGraceMinutes: 5,
      earlyLeaveGraceMinutes: 5,
      overtimeStartMinutes: 30,
      restStartTime: '12:00',
      restEndTime: '13:00',
      color: '#059669',
    };

    await submitResourceAction(
      requestData(props.client.post<Shift, CreateShiftRequest>('/api/v1/shifts', body)),
      '班次规则已创建。',
      props,
      () => form.resetFields(),
    );
  }

  return (
    <ResourcePage title="班次规则" description="把上班、下班、工时和宽限配置集中展示，便于检查考勤计算基础。">
      <ProCard title="新增班次" bordered>
        <Form
          layout="inline"
          form={form}
          onFinish={create}
          disabled={!props.canManage || !props.scope.factoryId}
          initialValues={{ startTime: '09:00', endTime: '18:00', workMinutes: 480 }}
        >
          <Form.Item name="name" rules={[{ required: true, message: '请输入班次名称' }]}>
            <Input placeholder="班次名称" />
          </Form.Item>
          <Form.Item name="startTime">
            <Input placeholder="09:00" />
          </Form.Item>
          <Form.Item name="endTime">
            <Input placeholder="18:00" />
          </Form.Item>
          <Form.Item name="workMinutes">
            <Input type="number" placeholder="480" />
          </Form.Item>
          <Button type="primary" htmlType="submit">新增</Button>
        </Form>
      </ProCard>
      <ProCard title="班次列表" bordered>
        <Table rowKey="id" columns={columns} dataSource={props.data} pagination={false} scroll={{ x: 820 }} />
      </ProCard>
    </ResourcePage>
  );
}

function AttendanceGroupsPage(props: {
  client: FetchApiClient;
  scope: AdminDashboardScope;
  data: AttendanceGroup[];
  shifts: Shift[];
  canManage: boolean;
  onChanged: () => Promise<void>;
  onStatus: (status: string) => void;
}) {
  const [form] = Form.useForm<{ name: string; shiftId: string; requirePhoto: boolean; allowOutsideCheckin: boolean }>();
  const columns: ColumnsType<AttendanceGroup> = [
    { title: '名称', dataIndex: 'name' },
    {
      title: '班次',
      dataIndex: 'shiftId',
      render: (value: string) => props.shifts.find((shift) => shift.id === value)?.name ?? value,
    },
    { title: '打卡方式', dataIndex: 'checkinMethods', render: (value: AttendanceGroup['checkinMethods']) => value.join(', ') },
    { title: '允许外勤', dataIndex: 'allowOutsideCheckin', render: (value: boolean) => <BooleanTag value={value} trueText="是" falseText="否" /> },
    { title: '拍照', dataIndex: 'requirePhoto', render: (value: boolean) => <BooleanTag value={value} trueText="必填" falseText="不强制" /> },
  ];

  async function create(values: { name: string; shiftId?: string; requirePhoto?: boolean; allowOutsideCheckin?: boolean }) {
    const shiftId = values.shiftId || props.shifts[0]?.id;
    if (!shiftId) {
      props.onStatus('请先创建至少一个班次。');
      return;
    }

    const body: CreateAttendanceGroupRequest = {
      factoryId: props.scope.factoryId,
      name: values.name,
      shiftId,
      checkinMethods: ['GPS'],
      gpsLat: null,
      gpsLng: null,
      gpsRadiusMeters: null,
      wifiSsid: null,
      wifiBssid: null,
      requirePhoto: Boolean(values.requirePhoto),
      allowOutsideCheckin: values.allowOutsideCheckin ?? true,
    };

    await submitResourceAction(
      requestData(props.client.post<AttendanceGroup, CreateAttendanceGroupRequest>('/api/v1/attendance-groups', body)),
      '考勤组已创建。',
      props,
      () => form.resetFields(),
    );
  }

  return (
    <ResourcePage title="考勤组" description="检查员工打卡规则、班次绑定、外勤和拍照策略。">
      <ProCard title="新增考勤组" bordered>
        <Form
          layout="inline"
          form={form}
          onFinish={create}
          disabled={!props.canManage || !props.scope.factoryId || props.shifts.length === 0}
          initialValues={{ shiftId: props.shifts[0]?.id, allowOutsideCheckin: true, requirePhoto: false }}
        >
          <Form.Item name="name" rules={[{ required: true, message: '请输入考勤组名称' }]}>
            <Input placeholder="考勤组名称" />
          </Form.Item>
          <Form.Item name="shiftId" rules={[{ required: true, message: '请选择班次' }]}>
            <Select
              placeholder="选择班次"
              style={{ minWidth: 180 }}
              options={props.shifts.map((shift) => ({ label: shift.name, value: shift.id }))}
            />
          </Form.Item>
          <Form.Item name="allowOutsideCheckin">
            <Select
              style={{ minWidth: 120 }}
              options={[
                { label: '允许外勤', value: true },
                { label: '禁止外勤', value: false },
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit">新增</Button>
        </Form>
        {props.shifts.length === 0 ? (
          <Alert className="admin-status-alert" type="warning" message="请先创建至少一个班次，再新增考勤组。" showIcon />
        ) : null}
      </ProCard>
      <ProCard title="考勤组列表" bordered>
        <Table rowKey="id" columns={columns} dataSource={props.data} pagination={false} scroll={{ x: 860 }} />
      </ProCard>
    </ResourcePage>
  );
}

function ResourcePage(props: { title: string; description: string; children: React.ReactNode }) {
  return (
    <PageContainer title={props.title} subTitle={props.description} tags={<Tag color="blue">资料维护</Tag>}>
      <Space direction="vertical" size="large" className="admin-full-width">
        {props.children}
      </Space>
    </PageContainer>
  );
}

function ThemeSwitch(props: { themeMode: ThemeMode; onThemeChange: (mode: ThemeMode) => void }) {
  const isDark = props.themeMode === 'dark';

  return (
    <Button
      className="theme-icon-button"
      type="text"
      shape="circle"
      icon={isDark ? <SunOutlined /> : <MoonOutlined />}
      aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}
      onClick={() => props.onThemeChange(isDark ? 'light' : 'dark')}
    />
  );
}

async function submitResourceAction(
  request: Promise<unknown>,
  successMessage: string,
  props: { onChanged: () => Promise<void>; onStatus: (status: string) => void },
  onSuccess?: () => void,
) {
  try {
    await request;
    onSuccess?.();
    props.onStatus(successMessage);
    await props.onChanged();
  } catch (error) {
    props.onStatus(toAdminFeedback(error).message);
  }
}

function AttendanceResultsTable(props: { rows: AttendanceResultRow[]; total: number }) {
  const columns: ColumnsType<AttendanceResultRow> = [
    {
      title: '姓名',
      dataIndex: 'employeeName',
      width: 180,
      render: (_, row) => (
        <Space size={12}>
          <div className="attendance-avatar">{row.employeeName.slice(0, 1)}</div>
          <span>{row.employeeName}</span>
        </Space>
      ),
    },
    { title: '工号', dataIndex: 'empNo', width: 130 },
    { title: '日期', dataIndex: 'date', width: 140 },
    { title: '班次', key: 'shift', width: 160, render: () => '09:00-18:00' },
    { title: '上班打卡', dataIndex: 'clockInAt', width: 140, render: (value: string | null) => formatTime(value) },
    { title: '下班打卡', dataIndex: 'clockOutAt', width: 140, render: (value: string | null) => formatTime(value) },
    { title: '状态', dataIndex: 'primaryStatus', width: 120, render: (value: AttendancePrimaryStatus) => <AttendanceStatusTag value={value} /> },
    {
      title: '操作',
      key: 'action',
      width: 110,
      render: () => <Button type="link">查看</Button>,
    },
  ];

  return (
    <div className="attendance-table-wrap">
      <Table
        rowKey="id"
        columns={columns}
        dataSource={props.rows}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        scroll={{ x: 980 }}
        locale={{ emptyText: <Empty description="当前筛选下没有考勤记录" /> }}
      />
      <Text className="attendance-table-total" type="secondary">
        共 {props.total} 条记录
      </Text>
    </div>
  );
}

function MonthlyReportTable(props: { rows: MonthlyReportRow[] }) {
  const columns: ColumnsType<MonthlyReportRow> = [
    { title: '员工', dataIndex: 'employeeName', render: (_, row) => `${row.employeeName}（${row.empNo}）` },
    { title: '正常天数', dataIndex: 'normalDays', width: 120 },
    { title: '迟到', dataIndex: 'lateCount', width: 100 },
    { title: '早退', dataIndex: 'earlyLeaveCount', width: 100 },
    { title: '缺勤', dataIndex: 'absentDays', width: 100 },
    { title: '请假小时', dataIndex: 'leaveHours', width: 120 },
    { title: '加班分钟', dataIndex: 'overtimeMinutes', width: 120 },
    { title: '锁定', dataIndex: 'isFinalized', width: 110, render: (value: boolean) => <BooleanTag value={value} trueText="已锁定" falseText="未锁定" /> },
  ];

  return (
    <Table
      rowKey="employeeId"
      columns={columns}
      dataSource={props.rows}
      pagination={{ pageSize: 12, showSizeChanger: false }}
      scroll={{ x: 920 }}
      locale={{ emptyText: <Empty description="当前范围下没有月报数据" /> }}
    />
  );
}

function ApprovalTag(props: { status: ApprovalStatus }) {
  const config: Record<ApprovalStatus, { color: string; label: string }> = {
    PENDING: { color: 'warning', label: '待处理' },
    APPROVED: { color: 'success', label: '已通过' },
    REJECTED: { color: 'error', label: '已驳回' },
  };

  return <Tag color={config[props.status].color}>{config[props.status].label}</Tag>;
}

function AttendanceStatusTag(props: { value: AttendancePrimaryStatus }) {
  if (props.value === 'NORMAL') {
    return <Tag color="success">正常</Tag>;
  }

  if (props.value === 'ABSENT' || props.value === 'MISSING_CLOCK') {
    return <Tag color="error">{translateAttendanceStatus(props.value)}</Tag>;
  }

  return <Tag color="warning">{translateAttendanceStatus(props.value)}</Tag>;
}

function StatusTag(props: { value: string }) {
  if (props.value === 'ACTIVE') {
    return <Tag color="success">启用</Tag>;
  }

  if (props.value === 'RESIGNED') {
    return <Tag color="default">离职</Tag>;
  }

  return <Tag color="warning">停用</Tag>;
}

function BooleanTag(props: { value: boolean; trueText: string; falseText: string }) {
  return <Tag color={props.value ? 'success' : 'default'}>{props.value ? props.trueText : props.falseText}</Tag>;
}

function summarizeAttendance(rows: AttendanceResultRow[]) {
  const late = rows.filter((row) => row.primaryStatus === 'LATE').length;
  const earlyLeave = rows.filter((row) => row.primaryStatus === 'EARLY_LEAVE').length;
  const absent = rows.filter((row) => row.primaryStatus === 'ABSENT').length;
  const missingClock = rows.filter((row) => row.primaryStatus === 'MISSING_CLOCK').length;

  return {
    late,
    earlyLeave,
    absent,
    missingClock,
    total: late + earlyLeave + absent + missingClock,
  };
}

function formatPercent(value: number, total: number): string {
  if (total <= 0) {
    return '0%';
  }

  return `${Math.round((value / total) * 1000) / 10}%`;
}

function buildDonutGradient(items: Array<{ value: number; color: string }>): string {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) {
    return 'conic-gradient(#e5e7eb 0deg 360deg)';
  }

  let cursor = 0;
  const segments = items
    .filter((item) => item.value > 0)
    .map((item) => {
      const start = cursor;
      cursor += (item.value / total) * 360;
      return `${item.color} ${start}deg ${cursor}deg`;
    });

  return `conic-gradient(${segments.join(', ')})`;
}

function buildAttendanceTrend(rows: AttendanceResultRow[]): Array<{ label: string; x: number; y: number }> {
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const buckets = labels.map((label, index) => ({ label, index, total: 0, checked: 0 }));

  rows.forEach((row) => {
    const dayIndex = new Date(`${row.date}T00:00:00`).getDay();
    const bucketIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    const bucket = buckets[bucketIndex];
    bucket.total += 1;

    if (row.primaryStatus !== 'ABSENT' && row.primaryStatus !== 'MISSING_CLOCK') {
      bucket.checked += 1;
    }
  });

  return buckets.map((bucket) => {
    const rate = bucket.total > 0 ? bucket.checked / bucket.total : 0;
    return {
      label: bucket.label,
      x: 36 + bucket.index * 48,
      y: 182 - rate * 150,
    };
  });
}

function formatApprovalMeta(item: ApprovalItem): string {
  if (item.type === 'LEAVE') {
    return `${translateRequestType(item.requestType)}：${formatDateTime(item.startAt)} - ${formatDateTime(item.endAt)}`;
  }

  return `${translateRequestType(item.requestType)}：${item.targetDate ?? '-'} ${formatDateTime(item.repairAt)}`;
}

function formatDateTime(value: string | null | undefined): string {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

function formatTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  return value.replace('T', ' ').slice(11, 16);
}

function translateAttendanceStatus(status: AttendancePrimaryStatus): string {
  const labels: Record<AttendancePrimaryStatus, string> = {
    NORMAL: '正常',
    LATE: '迟到',
    EARLY_LEAVE: '早退',
    ABSENT: '缺勤',
    LEAVE: '请假',
    MISSING_CLOCK: '缺卡',
  };

  return labels[status];
}

function translateOrgUnitType(type: OrgUnit['type']): string {
  const labels: Record<OrgUnit['type'], string> = {
    FACTORY: '工厂',
    DEPARTMENT: '部门',
    GROUP: '小组',
  };

  return labels[type];
}

function translateRequestType(type: ApprovalItem['requestType']): string {
  const labels: Record<string, string> = {
    PERSONAL: '事假',
    SICK: '病假',
    ANNUAL: '年假',
    OTHER: '其他',
    CLOCK_IN: '上班补卡',
    CLOCK_OUT: '下班补卡',
  };

  return type ? labels[type] ?? type : '申请';
}

function feedbackType(status: string): 'success' | 'info' | 'warning' | 'error' {
  if (status.includes('成功') || status.includes('已刷新') || status.includes('已创建')) {
    return 'success';
  }

  if (status.includes('失败') || status.includes('权限') || status.includes('错误')) {
    return 'error';
  }

  if (status.includes('请先')) {
    return 'warning';
  }

  return 'info';
}

function loadScope(): AdminDashboardScope {
  const raw = localStorage.getItem(scopeStorageKey);
  if (!raw) {
    return defaultScope;
  }

  try {
    return { ...defaultScope, ...JSON.parse(raw) } as AdminDashboardScope;
  } catch {
    return defaultScope;
  }
}

function loadThemeMode(): ThemeMode {
  const saved = localStorage.getItem(themeStorageKey);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function valueOr<TValue>(result: PromiseSettledResult<TValue>, fallback: TValue): TValue {
  return result.status === 'fulfilled' ? result.value : fallback;
}
