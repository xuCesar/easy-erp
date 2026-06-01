import type { ApiClient, EmployeeProfileSummary } from '@easy-erp/shared-types';
import { requestData } from '../../shared/api/response';

export function createProfilePage(client: ApiClient) {
  return {
    load(): Promise<EmployeeProfileSummary> {
      return requestData(client.get<EmployeeProfileSummary>('/api/v1/profile'));
    },
  };
}
