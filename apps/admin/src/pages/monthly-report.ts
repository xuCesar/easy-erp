import type {
  ApiClient,
  MonthlyReportExportRequest,
  MonthlyReportExportResponse,
  MonthlyReportRow,
  PaginatedData,
  ReportTask,
} from '@easy-erp/shared-types';
import { buildQuery, emptyPage, requestData, type AdminDashboardScope } from './common';

export function createMonthlyReportPage(client: ApiClient, scope: AdminDashboardScope) {
  const exportBody: MonthlyReportExportRequest = {
    factoryId: scope.factoryId,
    orgUnitId: scope.orgUnitId ?? null,
    month: scope.month,
  };

  return {
    emptyData: emptyPage<MonthlyReportRow>(),

    load(): Promise<PaginatedData<MonthlyReportRow>> {
      return requestData(
        client.get<PaginatedData<MonthlyReportRow>>(
          `/api/v1/reports/monthly${buildQuery({
            factoryId: scope.factoryId,
            orgUnitId: scope.orgUnitId,
            month: scope.month,
          })}`,
        ),
      );
    },

    export(): Promise<MonthlyReportExportResponse> {
      return requestData(
        client.post<MonthlyReportExportResponse, MonthlyReportExportRequest>('/api/v1/reports/monthly/export', exportBody),
      );
    },

    getTask(taskId: string): Promise<ReportTask> {
      return requestData(client.get<ReportTask>(`/api/v1/reports/tasks/${taskId}`));
    },
  };
}
