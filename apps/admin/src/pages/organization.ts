import type { OrgUnit } from '@easy-erp/shared-types';
import { buildQuery, createAdminResourceContext, requestData, type AdminDashboardScope } from './common';
import type { ApiClient } from '@easy-erp/shared-types';

export function createOrganizationPage(client: ApiClient, scope: AdminDashboardScope) {
  const context = createAdminResourceContext(client, scope);

  return {
    load(): Promise<OrgUnit[]> {
      return requestData(
        context.client.get<OrgUnit[]>(`/api/v1/org-units${buildQuery({ factoryId: context.scope.factoryId })}`),
      );
    },
  };
}
