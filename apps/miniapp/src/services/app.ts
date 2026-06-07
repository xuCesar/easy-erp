import {
  createAttendanceRecordsEndpoint,
  createAuthEndpoint,
  createCheckinEndpoint,
  createLeaveRequestEndpoint,
  createProfileEndpoint,
  createRepairRequestEndpoint,
  createRequestsEndpoint,
} from '../api';

export function createAppServices() {
  return {
    auth: createAuthEndpoint(),
    checkin: createCheckinEndpoint(),
    attendanceRecords: createAttendanceRecordsEndpoint(),
    leaveRequest: createLeaveRequestEndpoint(),
    repairRequest: createRepairRequestEndpoint(),
    requests: createRequestsEndpoint(),
    profile: createProfileEndpoint(),
  };
}

export type AppServices = ReturnType<typeof createAppServices>;
