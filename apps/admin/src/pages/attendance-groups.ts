import type { ApiClient, AttendanceGroup } from '@easy-erp/shared-types';
import { buildQuery, requestData, type AdminDashboardScope } from './common';

export function createAttendanceGroupsPage(client: ApiClient, scope: AdminDashboardScope) {
  return {
    load(): Promise<AttendanceGroup[]> {
      return requestData(
        client.get<AttendanceGroup[]>(`/api/v1/attendance-groups${buildQuery({ factoryId: scope.factoryId })}`),
      );
    },
  };
}
