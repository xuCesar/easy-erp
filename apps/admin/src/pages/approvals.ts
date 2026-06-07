import type { ApiClient, ApprovalItem, PaginatedData } from '@easy-erp/shared-types';
import {
  emptyPage,
  requestData,
  toAdminFeedback,
  type AdminDashboardScope,
  type AdminFeedback,
} from './common';

export interface ApprovalPage {
  emptyData: PaginatedData<ApprovalItem>;
  approve(id: string, comment: string): Promise<void>;
  reject(id: string, rejectReason: string): Promise<void>;
  approveSafely(id: string, comment: string): Promise<AdminFeedback>;
  rejectSafely(id: string, rejectReason: string): Promise<AdminFeedback>;
}

export function createLeaveApprovalsPage(client: ApiClient, _scope: AdminDashboardScope): ApprovalPage {
  return createApprovalPage(client, '/api/v1/leave/requests');
}

export function createRepairApprovalsPage(client: ApiClient, _scope: AdminDashboardScope): ApprovalPage {
  return createApprovalPage(client, '/api/v1/repair/requests');
}

function createApprovalPage(client: ApiClient, resourcePath: string): ApprovalPage {
  return {
    emptyData: emptyPage<ApprovalItem>(),

    async approve(id: string, comment: string): Promise<void> {
      await requestData(client.post<null, { comment: string }>(`${resourcePath}/${id}/approve`, { comment }));
    },

    async reject(id: string, rejectReason: string): Promise<void> {
      await requestData(client.post<null, { rejectReason: string }>(`${resourcePath}/${id}/reject`, { rejectReason }));
    },

    async approveSafely(id: string, comment: string): Promise<AdminFeedback> {
      try {
        await this.approve(id, comment);
        return { type: 'success', message: '审批已通过。' };
      } catch (error) {
        return toAdminFeedback(error);
      }
    },

    async rejectSafely(id: string, rejectReason: string): Promise<AdminFeedback> {
      try {
        await this.reject(id, rejectReason);
        return { type: 'success', message: '审批已驳回。' };
      } catch (error) {
        return toAdminFeedback(error);
      }
    },
  };
}
