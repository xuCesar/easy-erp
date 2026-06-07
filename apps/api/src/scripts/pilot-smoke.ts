type ApiResponse<TData> =
  | {
      code: 0;
      message: string;
      data: TData;
      requestId: string;
    }
  | {
      code: number;
      message: string;
      data: null;
      requestId: string;
    };

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    tenantId: string;
    employeeId: string | null;
    roles: string[];
  };
};

type MonthlyReport = {
  summary: {
    totalEmployees: number;
    normalDays: number;
  };
  items: Array<{ employeeId: string; isFinalized: boolean }>;
};

type PaginatedData<TItem> = {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type ReportTask = {
  taskId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  downloadUrl: string | null;
};

const baseUrl = trimTrailingSlash(
  process.env.PILOT_API_BASE_URL ?? 'http://127.0.0.1:3000/api/v1',
);
const adminPhone = process.env.DEMO_ADMIN_PHONE ?? '13800000000';
const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? 'EasyERP@demo123';
const employeePhone = process.env.DEMO_EMPLOYEE_PHONE ?? '13900000001';
const employeePassword = process.env.DEMO_EMPLOYEE_PASSWORD ?? 'EasyERP@demo123';

const demo = {
  factoryId: '22222222-2222-4222-8222-222222222222',
  orgUnitId: '33333333-3333-4333-8333-333333333333',
  workerEmployeeId: '66666666-6666-4666-8666-666666666666',
  shiftId: '77777777-7777-4777-8777-777777777777',
  attendanceGroupId: '88888888-8888-4888-8888-888888888888',
} as const;

const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

async function main(): Promise<void> {
  await step('health check', async () => {
    const health = await rawGet<{ status: string; service: string }>('/health');
    assert(health.status === 'ok', 'health status should be ok');
    assert(health.service === 'easy-erp-api', 'health service should match API');
  });

  const admin = await step('admin login', () =>
    login(adminPhone, adminPassword, 'TENANT_ADMIN'),
  );
  const employee = await step('employee login', () =>
    login(employeePhone, employeePassword, 'EMPLOYEE'),
  );

  await step('admin can load workspace context', async () => {
    const profile = await get<{
      factories: Array<{ id: string }>;
      defaultScope: { factoryId: string | null };
    }>('/auth/me', admin.accessToken);
    assert(
      profile.factories.some((factory) => factory.id === demo.factoryId),
      'workspace should include demo factory',
    );
    assert(profile.defaultScope.factoryId, 'workspace should provide default factory');
  });

  await step('admin can list accounts', async () => {
    const page = await get<PaginatedData<{ id: string; phone: string; roles: string[] }>>(
      '/accounts',
      admin.accessToken,
    );
    assert(
      page.items.some((account) => account.phone === adminPhone),
      'account list should include demo admin',
    );
  });

  await step('admin can create employee', async () => {
    const created = await post<{ id: string }>(
      '/employees',
      {
        factoryId: demo.factoryId,
        orgUnitId: demo.orgUnitId,
        empNo: `SMOKE-${runId}`,
        name: `冒烟员工 ${runId}`,
        phone: `139${runId.slice(-8)}`,
        entryDate: '2026-05-01',
        status: 'ACTIVE',
      },
      admin.accessToken,
    );
    assert(Boolean(created.id), 'created employee should return id');
  });

  await step('admin can read shift setup', async () => {
    const shifts = await get<Array<{ id: string; name: string }>>(
      `/shifts?factoryId=${demo.factoryId}`,
      admin.accessToken,
    );
    assert(
      shifts.some((shift) => shift.id === demo.shiftId),
      'demo shift should exist',
    );
  });

  await step('admin can read attendance group setup', async () => {
    const groups = await get<Array<{ id: string; name: string }>>(
      `/attendance-groups?factoryId=${demo.factoryId}`,
      admin.accessToken,
    );
    assert(
      groups.some((group) => group.id === demo.attendanceGroupId),
      'demo attendance group should exist',
    );
  });

  await step('employee can load check-in context', async () => {
    const context = await get<{
      attendanceGroup: { id: string };
      shift: { id: string };
      status: { nextAction: string };
    }>('/attendance/checkin-context?date=2026-05-18', employee.accessToken);
    assert(context.attendanceGroup.id === demo.attendanceGroupId, 'group should match demo');
    assert(context.shift.id === demo.shiftId, 'shift should match demo');
  });

  await step('employee can query attendance records', async () => {
    const records = await get<PaginatedData<{ employeeId: string }>>(
      '/attendance/results?startDate=2026-05-01&endDate=2026-05-31&page=1&pageSize=31',
      employee.accessToken,
    );
    assert(records.total >= 1, 'attendance records should include demo result');
    assert(
      records.items.some((item) => item.employeeId === demo.workerEmployeeId),
      'attendance records should include demo worker',
    );
  });

  await step('employee can check in with idempotency key', async () => {
    const result = await post<{ recordId: string; isValid: boolean }>(
      '/attendance/checkin',
      {
        checkinType: 'CLOCK_IN',
        clientEventAt: '2026-05-19T00:59:00.000Z',
        idempotencyKey: `smoke-clock-in-${runId}`,
        location: { latitude: 30.2741, longitude: 120.1551 },
        deviceId: 'smoke-device',
        photoUrl: null,
      },
      employee.accessToken,
    );
    assert(Boolean(result.recordId), 'check-in should return record id');
    assert(result.isValid, 'check-in should be valid');
  });

  const leave = await step('employee can submit leave request', () =>
    post<{ id: string }>(
      '/leave/requests',
      {
        factoryId: demo.factoryId,
        leaveType: 'PERSONAL',
        startAt: '2026-05-20T01:00:00.000Z',
        endAt: '2026-05-20T03:00:00.000Z',
        durationHours: 2,
        reason: `pilot-smoke-${runId}`,
        attachments: [],
      },
      employee.accessToken,
    ),
  );

  await step('admin can list pending leave approvals', async () => {
    const page = await get<PaginatedData<{ id: string; status: string }>>(
      `/leave/requests?factoryId=${demo.factoryId}&status=PENDING`,
      admin.accessToken,
    );
    assert(page.items.some((item) => item.id === leave.id), 'leave approval list should include pending leave');
  });

  await step('admin can approve leave request', async () => {
    const approved = await post<{ id: string; status: string }>(
      `/leave/requests/${leave.id}/approve`,
      {},
      admin.accessToken,
    );
    assert(approved.status === 'APPROVED', 'leave request should be approved');
  });

  const repair = await step('employee can submit repair request', () =>
    post<{ id: string }>(
      '/repair/requests',
      {
        factoryId: demo.factoryId,
        targetDate: '2026-05-21',
        repairType: 'CLOCK_IN',
        repairAt: '2026-05-21T01:00:00.000Z',
        reason: `pilot-smoke-${runId}`,
        attachments: [],
      },
      employee.accessToken,
    ),
  );

  await step('admin can list pending repair approvals', async () => {
    const page = await get<PaginatedData<{ id: string; status: string }>>(
      `/repair/requests?factoryId=${demo.factoryId}&status=PENDING`,
      admin.accessToken,
    );
    assert(page.items.some((item) => item.id === repair.id), 'repair approval list should include pending repair');
  });

  await step('admin can approve repair request', async () => {
    const approved = await post<{ request: { status: string }; checkinRecordId: string }>(
      `/repair/requests/${repair.id}/approve`,
      {},
      admin.accessToken,
    );
    assert(approved.request.status === 'APPROVED', 'repair request should be approved');
    assert(Boolean(approved.checkinRecordId), 'repair approval should create manual check-in');
  });

  await step('monthly report contains demo result', async () => {
    const report = await get<MonthlyReport>(
      `/reports/monthly?factoryId=${demo.factoryId}&month=2026-05`,
      admin.accessToken,
    );
    assert(report.summary.totalEmployees >= 1, 'monthly report should include employees');
    assert(report.summary.normalDays >= 1, 'monthly report should include normal days');
    assert(
      report.items.some((item) => item.employeeId === demo.workerEmployeeId),
      'monthly report should include demo worker',
    );
  });

  await step('admin can query abnormal attendance results', async () => {
    const page = await get<PaginatedData<{ id: string; primaryStatus: string }>>(
      `/attendance/results?factoryId=${demo.factoryId}&startDate=2026-05-01&endDate=2026-05-31&primaryStatus=ABSENT`,
      admin.accessToken,
    );
    assert(Array.isArray(page.items), 'abnormal result query should return page items');
  });

  await step('monthly lock finalizes report results', async () => {
    const result = await post<{ lockedCount: number }>(
      '/reports/monthly/lock',
      {
        factoryId: demo.factoryId,
        orgUnitId: null,
        month: '2026-05',
      },
      admin.accessToken,
    );
    assert(result.lockedCount >= 1, 'monthly lock should affect at least one row');
  });

  const exportTask = await step('admin can create export task', () =>
    post<{ taskId: string }>(
      '/reports/monthly/export',
      {
        factoryId: demo.factoryId,
        orgUnitId: null,
        month: '2026-05',
      },
      admin.accessToken,
    ),
  );

  await step('admin can query export task', async () => {
    const task = await get<ReportTask>(
      `/reports/tasks/${exportTask.taskId}`,
      admin.accessToken,
    );
    assert(task.taskId === exportTask.taskId, 'task id should match');
    assert(task.status === 'PENDING', 'new export task should be pending');
  });

  await step('employee is blocked from export task query', async () => {
    await expectApiError(
      () => get<ReportTask>(`/reports/tasks/${exportTask.taskId}`, employee.accessToken),
      (error) => error.code === 403 || (error.code >= 40300 && error.code < 40400),
      'employee export query should be forbidden',
    );
  });

  console.info('Pilot smoke acceptance passed.');
}

async function step<T>(name: string, action: () => Promise<T>): Promise<T> {
  try {
    const result = await action();
    console.info(`PASS ${name}`);
    return result;
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

async function login(
  phone: string,
  password: string,
  expectedRole: string,
): Promise<LoginResponse> {
  const result = await post<LoginResponse>('/auth/login', { phone, password });
  assert(
    result.user.roles.includes(expectedRole),
    `login user should include role ${expectedRole}`,
  );
  return result;
}

async function rawGet<TData>(path: string): Promise<TData> {
  const response = await fetch(`${baseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${path}`);
  }

  return response.json() as Promise<TData>;
}

async function get<TData>(path: string, token?: string): Promise<TData> {
  return request<TData>('GET', path, undefined, token);
}

async function post<TData>(
  path: string,
  body: unknown,
  token?: string,
): Promise<TData> {
  return request<TData>('POST', path, body, token);
}

async function request<TData>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  token?: string,
): Promise<TData> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse<TData> | null;

  if (isSuccessResponse(payload)) {
    return payload.data;
  }

  throw new ApiRequestError(
    payload?.code ?? response.status,
    payload?.message ?? `HTTP ${response.status}`,
    path,
  );
}

function isSuccessResponse<TData>(
  payload: ApiResponse<TData> | null,
): payload is Extract<ApiResponse<TData>, { code: 0 }> {
  return payload?.code === 0;
}

async function expectApiError(
  action: () => Promise<unknown>,
  predicate: (error: ApiRequestError) => boolean,
  message: string,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof ApiRequestError && predicate(error)) {
      return;
    }

    throw error;
  }

  throw new Error(message);
}

class ApiRequestError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly path: string,
  ) {
    super(`${message} (${code}) at ${path}`);
    this.name = 'ApiRequestError';
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
