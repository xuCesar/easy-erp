import type { ApiClient } from '@easy-erp/shared-types';
import type { MiniappRuntime } from './common';
import { createAttendanceRecordsPage } from './attendance-records';
import { createCheckinPage } from './checkin';
import { createCheckinResultPage } from './checkin-result';
import { createLeaveRequestPage } from './leave-request';
import { createLoginPage } from './login';
import { createProfilePage } from './profile';
import { createRepairRequestPage } from './repair-request';

export function createMiniappPages(client: ApiClient, runtime: MiniappRuntime) {
  const checkin = createCheckinPage(client, runtime);

  return {
    login: createLoginPage(client),
    checkin,
    checkinResult: createCheckinResultPage(() => checkin.getLastResult()),
    records: createAttendanceRecordsPage(client),
    leaveRequest: createLeaveRequestPage(client, runtime),
    repairRequest: createRepairRequestPage(client, runtime),
    profile: createProfilePage(client),
  };
}

export type { MiniappFeedback, MiniappRuntime } from './common';
