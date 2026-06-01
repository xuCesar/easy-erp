import type {
  ApiClient,
  ApprovalItem,
  EmployeeProfileSummary,
  LeaveRequestCreateRequest,
  LeaveRequestDraft,
  PaginatedData,
  RepairRequestCreateRequest,
  RepairRequestDraft,
} from '@easy-erp/shared-types';
import { requestData } from '../../shared/api/response';
import type { MiniappRuntime } from '../../shared/runtime/types';
import { isoDate } from '../../shared/utils/date';
import { buildQuery } from '../../shared/utils/query';
import { createProfilePage } from '../profile/api';

export function createLeaveRequestPage(client: ApiClient, runtime: MiniappRuntime) {
  return {
    async submit(draft: LeaveRequestDraft): Promise<{ id: string }> {
      const now = runtime.now();
      const profile = await createProfilePage(client).load();

      if (!profile.employee) {
        throw new Error('当前账号未绑定员工档案，无法提交请假申请。');
      }

      const body: LeaveRequestCreateRequest = {
        factoryId: profile.employee.factoryId,
        leaveType: draft.leaveType,
        startAt: draft.startAt ?? now,
        endAt: draft.endAt ?? now,
        durationHours: draft.durationHours ?? 0,
        reason: draft.reason,
        attachments: draft.attachments ?? [],
      };

      return requestData(
        client.post<{ id: string }, LeaveRequestCreateRequest>('/api/v1/leave/requests', body),
      );
    },
  };
}

export function createRepairRequestPage(client: ApiClient, runtime: MiniappRuntime) {
  return {
    async submit(draft: RepairRequestDraft): Promise<{ id: string }> {
      const now = runtime.now();
      const profile = await createProfilePage(client).load();

      if (!profile.employee) {
        throw new Error('当前账号未绑定员工档案，无法提交补卡申请。');
      }

      const body: RepairRequestCreateRequest = {
        factoryId: profile.employee.factoryId,
        targetDate: draft.targetDate ?? isoDate(now),
        repairType: draft.repairType,
        repairAt: draft.repairAt ?? now,
        reason: draft.reason,
        attachments: draft.attachments ?? [],
      };

      return requestData(
        client.post<{ id: string }, RepairRequestCreateRequest>(
          '/api/v1/repair/requests',
          body,
        ),
      );
    },
  };
}

export function createRequestsPage(client: ApiClient) {
  return {
    async load(): Promise<ApprovalItem[]> {
      const profile = await requestData(client.get<EmployeeProfileSummary>('/api/v1/profile'));

      if (!profile.employee) {
        throw new Error('当前账号未绑定员工档案，无法读取申请。');
      }

      const query = buildQuery({
        factoryId: profile.employee.factoryId,
        page: 1,
        pageSize: 50,
      });

      const [leaveRequests, repairRequests] = await Promise.all([
        requestData(client.get<PaginatedData<ApprovalItem>>(`/api/v1/leave/requests${query}`)),
        requestData(client.get<PaginatedData<ApprovalItem>>(`/api/v1/repair/requests${query}`)),
      ]);

      return [...leaveRequests.items, ...repairRequests.items].sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
      );
    },
  };
}
