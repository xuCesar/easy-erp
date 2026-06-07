import type { EmployeeProfileSummary } from '@easy-erp/shared-types';
import { createApiModule } from '../core/createModule';

const loadProfile = createApiModule<void, EmployeeProfileSummary>({
  url: '/api/v1/profile',
});

export const profileApi = {
  load(): Promise<EmployeeProfileSummary> {
    return loadProfile(undefined);
  },
};

export function createProfileEndpoint() {
  return profileApi;
}
