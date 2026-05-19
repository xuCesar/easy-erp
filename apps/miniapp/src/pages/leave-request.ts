import type { ApiClient, LeaveRequestCreateRequest, LeaveRequestDraft } from '@easy-erp/shared-types';
import { requestData, type MiniappRuntime } from './common';

export function createLeaveRequestPage(client: ApiClient, runtime: MiniappRuntime) {
  return {
    submit(draft: LeaveRequestDraft): Promise<{ id: string }> {
      const now = runtime.now();
      const body: LeaveRequestCreateRequest = {
        leaveType: draft.leaveType,
        startAt: draft.startAt ?? now,
        endAt: draft.endAt ?? now,
        durationHours: draft.durationHours ?? 0,
        reason: draft.reason,
        attachments: draft.attachments ?? [],
      };

      return requestData(client.post<{ id: string }, LeaveRequestCreateRequest>('/api/v1/leave/requests', body));
    },
  };
}
