import type {
  AttendanceResultQuery,
  AttendanceResultRow,
  CheckinContext,
  CheckinRequest,
  CheckinResult,
  CheckinType,
  GeoLocationPayload,
  PaginatedData,
  WifiPayload,
} from '@easy-erp/shared-types';
import { createApiModule } from '../core/createModule';
import {
  toOperationFeedback,
  withNetworkRetry,
  type OperationFeedback,
} from '../core/response';
import { createTaroRuntime } from '../../utils/runtime';
import { buildQuery } from '../../shared/utils/query';

export interface CheckinSubmitInput {
  checkinType: CheckinType;
  location?: GeoLocationPayload;
  wifi?: WifiPayload;
  photoUrl?: string | null;
}

const loadCheckinContext = createApiModule<void, CheckinContext>({
  url: '/api/v1/attendance/checkin-context',
});

const submitCheckinRecord = createApiModule<CheckinRequest, CheckinResult>({
  url: '/api/v1/attendance/checkin',
  method: 'POST',
});

const searchAttendanceRecords = createApiModule<
  Pick<AttendanceResultQuery, 'startDate' | 'endDate' | 'page' | 'pageSize'>,
  PaginatedData<AttendanceResultRow>
>({
  url: (query) => `/api/v1/attendance/results${buildQuery(query)}`,
});

let pendingSubmit: Promise<CheckinResult> | null = null;

export const attendanceApi = {
  loadCheckinContext(): Promise<CheckinContext> {
    return loadCheckinContext(undefined);
  },

  submitCheckin(input: CheckinSubmitInput): Promise<CheckinResult> {
    if (pendingSubmit) {
      return pendingSubmit;
    }

    const runtime = createTaroRuntime();
    const body: CheckinRequest = {
      checkinType: input.checkinType,
      clientEventAt: runtime.now(),
      idempotencyKey: runtime.idempotencyKey(input.checkinType),
      location: input.location,
      wifi: input.wifi,
      deviceId: runtime.deviceId,
      photoUrl: input.photoUrl ?? null,
    };

    pendingSubmit = withNetworkRetry(() => submitCheckinRecord(body)).finally(() => {
      pendingSubmit = null;
    });

    return pendingSubmit;
  },

  async submitCheckinSafely(
    input: CheckinSubmitInput,
  ): Promise<{ result: CheckinResult | null; feedback: OperationFeedback }> {
    try {
      const result = await this.submitCheckin(input);
      return { result, feedback: { type: 'success', message: result.message } };
    } catch (error) {
      return { result: null, feedback: toOperationFeedback(error) };
    }
  },

  searchRecords(
    query: Pick<
      AttendanceResultQuery,
      'startDate' | 'endDate' | 'page' | 'pageSize'
    >,
  ): Promise<PaginatedData<AttendanceResultRow>> {
    return searchAttendanceRecords(query);
  },
};

export function createCheckinEndpoint() {
  return {
    loadContext: attendanceApi.loadCheckinContext,
    submit: attendanceApi.submitCheckin,
    submitSafely: attendanceApi.submitCheckinSafely.bind(attendanceApi),
  };
}

export function createAttendanceRecordsEndpoint() {
  return {
    search: attendanceApi.searchRecords,
  };
}
