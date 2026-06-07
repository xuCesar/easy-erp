import type {
  ApiClient,
  ApiResponse,
  AttendancePrimaryStatus,
  MonthlyReportRow,
  PaginatedData,
} from '@easy-erp/shared-types';
import { createAdminDashboardPage } from './index';

function success<TData>(data: TData): Promise<ApiResponse<TData>> {
  return Promise.resolve({ code: 0, message: 'success', data, requestId: 'req-1' });
}

const client: ApiClient = {
  get: <TData>() => success({} as TData),
  post: <TData>() => success({} as TData),
  patch: <TData>() => success({} as TData),
  delete: <TData>() => success({} as TData),
};

const dashboard = createAdminDashboardPage(client, {
  factoryId: 'factory-1',
  orgUnitId: null,
  month: '2026-05',
});

dashboard.organization.load();
dashboard.employees.search({ keyword: '张三', status: 'ACTIVE' });
dashboard.shifts.load();
dashboard.attendanceGroups.load();
dashboard.attendanceResults.search({
  primaryStatus: 'ABSENT' satisfies AttendancePrimaryStatus,
  startDate: '2026-05-01',
  endDate: '2026-05-31',
});
dashboard.leaveApprovals.approve('leave-1', '同意');
dashboard.repairApprovals.reject('repair-1', '补卡时间不准确');
dashboard.monthlyReport.export();

const rows: PaginatedData<MonthlyReportRow> = dashboard.monthlyReport.emptyData;
rows.items.forEach((row) => row.employeeName.toUpperCase());
