import type { ApiClient, CurrentUser, EmployeeProfile } from '@easy-erp/shared-types';
import { requestData } from './common';

export interface EmployeeProfileSummary {
  user: CurrentUser;
  employee: EmployeeProfile | null;
}

export function createProfilePage(client: ApiClient) {
  return {
    load(): Promise<EmployeeProfileSummary> {
      return requestData(client.get<EmployeeProfileSummary>('/api/v1/profile'));
    },
  };
}
