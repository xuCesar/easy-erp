import type { ApiClient, Shift } from '@easy-erp/shared-types';
import { buildQuery, requestData, type AdminDashboardScope } from './common';

export function createShiftsPage(client: ApiClient, scope: AdminDashboardScope) {
  return {
    load(): Promise<Shift[]> {
      return requestData(client.get<Shift[]>(`/api/v1/shifts${buildQuery({ factoryId: scope.factoryId })}`));
    },
  };
}
