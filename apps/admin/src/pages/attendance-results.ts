import type {
  ApiClient,
  AttendanceResultQuery,
  AttendanceResultRow,
  PaginatedData,
} from '@easy-erp/shared-types';
import { buildQuery, emptyPage, requestData, type AdminDashboardScope } from './common';

export function createAttendanceResultsPage(client: ApiClient, scope: AdminDashboardScope) {
  return {
    emptyData: emptyPage<AttendanceResultRow>(),

    search(query: Omit<AttendanceResultQuery, 'factoryId' | 'orgUnitId'>): Promise<PaginatedData<AttendanceResultRow>> {
      return requestData(
        client.get<PaginatedData<AttendanceResultRow>>(
          `/api/v1/attendance/results${buildQuery({
            factoryId: scope.factoryId,
            orgUnitId: scope.orgUnitId,
            ...query,
          })}`,
        ),
      );
    },
  };
}
