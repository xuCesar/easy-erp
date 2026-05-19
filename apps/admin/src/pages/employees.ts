import type { ApiClient, EmployeeProfile, EmployeeQuery, PaginatedData } from '@easy-erp/shared-types';
import { buildQuery, emptyPage, requestData, type AdminDashboardScope } from './common';

export function createEmployeesPage(client: ApiClient, scope: AdminDashboardScope) {
  return {
    emptyData: emptyPage<EmployeeProfile>(),

    search(query: Partial<EmployeeQuery> = {}): Promise<PaginatedData<EmployeeProfile>> {
      return requestData(
        client.get<PaginatedData<EmployeeProfile>>(
          `/api/v1/employees${buildQuery({
            factoryId: scope.factoryId,
            orgUnitId: scope.orgUnitId,
            ...query,
          })}`,
        ),
      );
    },
  };
}
