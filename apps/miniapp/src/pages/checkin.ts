import type {
  ApiClient,
  CheckinContext,
  CheckinRequest,
  CheckinResult,
  CheckinType,
  GeoLocationPayload,
  WifiPayload,
} from '@easy-erp/shared-types';
import {
  requestData,
  toMiniappFeedback,
  withNetworkRetry,
  type MiniappFeedback,
  type MiniappRuntime,
} from './common';

export interface CheckinSubmitInput {
  checkinType: CheckinType;
  location?: GeoLocationPayload;
  wifi?: WifiPayload;
  photoUrl?: string | null;
}

export function createCheckinPage(client: ApiClient, runtime: MiniappRuntime) {
  let pendingSubmit: Promise<CheckinResult> | null = null;
  let lastResult: CheckinResult | null = null;

  return {
    loadContext(): Promise<CheckinContext> {
      return requestData(client.get<CheckinContext>('/api/v1/attendance/checkin-context'));
    },

    submit(input: CheckinSubmitInput): Promise<CheckinResult> {
      if (pendingSubmit) {
        return pendingSubmit;
      }

      const body: CheckinRequest = {
        checkinType: input.checkinType,
        clientEventAt: runtime.now(),
        idempotencyKey: runtime.idempotencyKey(input.checkinType),
        location: input.location,
        wifi: input.wifi,
        deviceId: runtime.deviceId,
        photoUrl: input.photoUrl ?? null,
      };

      pendingSubmit = withNetworkRetry(() =>
        requestData(client.post<CheckinResult, CheckinRequest>('/api/v1/attendance/checkin', body)),
      ).then((result) => {
        lastResult = result;
        return result;
      }).finally(() => {
        pendingSubmit = null;
      });

      return pendingSubmit;
    },

    async submitSafely(input: CheckinSubmitInput): Promise<{ result: CheckinResult | null; feedback: MiniappFeedback }> {
      try {
        const result = await this.submit(input);
        return { result, feedback: { type: 'success', message: result.message } };
      } catch (error) {
        return { result: null, feedback: toMiniappFeedback(error) };
      }
    },

    getLastResult(): CheckinResult | null {
      return lastResult;
    },
  };
}
