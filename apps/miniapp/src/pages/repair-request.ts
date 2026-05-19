import type { ApiClient, RepairRequestCreateRequest, RepairRequestDraft } from '@easy-erp/shared-types';
import { isoDate, requestData, type MiniappRuntime } from './common';

export function createRepairRequestPage(client: ApiClient, runtime: MiniappRuntime) {
  return {
    submit(draft: RepairRequestDraft): Promise<{ id: string }> {
      const now = runtime.now();
      const body: RepairRequestCreateRequest = {
        targetDate: draft.targetDate ?? isoDate(now),
        repairType: draft.repairType,
        repairAt: draft.repairAt ?? now,
        reason: draft.reason,
        attachments: draft.attachments ?? [],
      };

      return requestData(client.post<{ id: string }, RepairRequestCreateRequest>('/api/v1/repair/requests', body));
    },
  };
}
