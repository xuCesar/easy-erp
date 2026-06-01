import type { ApiClient } from '@easy-erp/shared-types';
import { createAttendanceRecordsPage, createCheckinPage, createCheckinResultPage } from './attendance/api';
import { createLoginPage } from './auth/api';
import { createLeaveRequestPage, createRepairRequestPage, createRequestsPage } from './approvals/api';
import { createProfilePage } from './profile/api';
import type { MiniappRuntime } from '../shared/runtime/types';

export function createMiniappPages(client: ApiClient, runtime: MiniappRuntime) {
  const checkin = createCheckinPage(client, runtime);

  return {
    login: createLoginPage(client),
    checkin,
    checkinResult: createCheckinResultPage(() => checkin.getLastResult()),
    records: createAttendanceRecordsPage(client),
    leaveRequest: createLeaveRequestPage(client, runtime),
    repairRequest: createRepairRequestPage(client, runtime),
    requests: createRequestsPage(client),
    profile: createProfilePage(client),
  };
}

export type { MiniappFeedback } from '../shared/api/response';
export type { MiniappRuntime } from '../shared/runtime/types';
