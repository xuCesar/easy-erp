import type {
  ApprovalItem,
  EmployeeProfileSummary,
  LeaveRequestCreateRequest,
  LeaveRequestDraft,
  PaginatedData,
  RepairRequestCreateRequest,
  RepairRequestDraft,
} from '@easy-erp/shared-types';
import { createApiModule } from '../core/createModule';
import { createTaroRuntime } from '../../utils/runtime';
import { isoDate } from '../../shared/utils/date';
import { buildQuery } from '../../shared/utils/query';
import { profileApi } from './profile';

const createLeaveRequest = createApiModule<LeaveRequestCreateRequest, { id: string }>({
  url: '/api/v1/leave/requests',
  method: 'POST',
});

const createRepairRequest = createApiModule<RepairRequestCreateRequest, { id: string }>({
  url: '/api/v1/repair/requests',
  method: 'POST',
});

const loadLeaveRequests = createApiModule<
  { factoryId: string; page: number; pageSize: number },
  PaginatedData<ApprovalItem>
>({
  url: (query) => `/api/v1/leave/requests${buildQuery(query)}`,
});

const loadRepairRequests = createApiModule<
  { factoryId: string; page: number; pageSize: number },
  PaginatedData<ApprovalItem>
>({
  url: (query) => `/api/v1/repair/requests${buildQuery(query)}`,
});

export const approvalApi = {
  async submitLeaveRequest(draft: LeaveRequestDraft): Promise<{ id: string }> {
    const runtime = createTaroRuntime();
    const now = runtime.now();
    const profile = await profileApi.load();

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

    return createLeaveRequest(body);
  },

  async submitRepairRequest(draft: RepairRequestDraft): Promise<{ id: string }> {
    const runtime = createTaroRuntime();
    const now = runtime.now();
    const profile = await profileApi.load();

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

    return createRepairRequest(body);
  },

  async loadRequests(): Promise<ApprovalItem[]> {
    const profile = await profileApi.load();

    if (!profile.employee) {
      throw new Error('当前账号未绑定员工档案，无法读取申请。');
    }

    const query = {
      factoryId: profile.employee.factoryId,
      page: 1,
      pageSize: 50,
    };

    const [leaveRequests, repairRequests] = await Promise.all([
      loadLeaveRequests(query),
      loadRepairRequests(query),
    ]);

    return [...leaveRequests.items, ...repairRequests.items].sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    );
  },
};

export function createLeaveRequestEndpoint() {
  return {
    submit: approvalApi.submitLeaveRequest,
  };
}

export function createRepairRequestEndpoint() {
  return {
    submit: approvalApi.submitRepairRequest,
  };
}

export function createRequestsEndpoint() {
  return {
    load: approvalApi.loadRequests,
  };
}
