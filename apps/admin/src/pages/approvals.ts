import type {
  ApiClient,
  ApprovalItem,
  ApprovalQuery,
  ApprovalStatus,
  PaginatedData,
} from '@easy-erp/shared-types';
import {
  buildQuery,
  emptyPage,
  requestData,
  toAdminFeedback,
  type AdminDashboardScope,
  type AdminFeedback,
} from './common';

export interface ApprovalPage {
  emptyData: PaginatedData<ApprovalItem>;
  list(query?: Partial<ApprovalQuery>): Promise<PaginatedData<ApprovalItem>>;
  approve(id: string, comment: string): Promise<void>;
  reject(id: string, rejectReason: string): Promise<void>;
  approveSafely(id: string, comment: string): Promise<AdminFeedback>;
  rejectSafely(id: string, rejectReason: string): Promise<AdminFeedback>;
}

export function createLeaveApprovalsPage(client: ApiClient, scope: AdminDashboardScope): ApprovalPage {
  return createApprovalPage(client, scope, '/api/v1/leave/requests');
}

export function createRepairApprovalsPage(client: ApiClient, scope: AdminDashboardScope): ApprovalPage {
  return createApprovalPage(client, scope, '/api/v1/repair/requests');
}

function createApprovalPage(client: ApiClient, scope: AdminDashboardScope, resourcePath: string): ApprovalPage {
  return {
    emptyData: emptyPage<ApprovalItem>(),

    list(query: Partial<ApprovalQuery> = {}): Promise<PaginatedData<ApprovalItem>> {
      return requestData(
        client.get<PaginatedData<ApprovalItem>>(
          `${resourcePath}${buildQuery({
            factoryId: query.factoryId ?? scope.factoryId,
            orgUnitId: query.orgUnitId ?? scope.orgUnitId,
            status: query.status,
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20,
          })}`,
        ),
      );
    },

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

export const approvalStatuses: ApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
