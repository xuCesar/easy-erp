import type { ApiClient, AttendanceResultQuery, AttendanceResultRow, PaginatedData } from '@easy-erp/shared-types';
import { buildQuery, requestData } from './common';

export function createAttendanceRecordsPage(client: ApiClient) {
  return {
    search(query: Pick<AttendanceResultQuery, 'startDate' | 'endDate' | 'page' | 'pageSize'>): Promise<PaginatedData<AttendanceResultRow>> {
      return requestData(client.get<PaginatedData<AttendanceResultRow>>(`/api/v1/attendance/results${buildQuery(query)}`));
    },
  };
}
