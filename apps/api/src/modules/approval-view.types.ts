import type { ApprovalStatus, CheckinType, LeaveType } from '@prisma/client';

export type ApprovalKind = 'LEAVE' | 'REPAIR';

export type PublicApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ApprovalListQuery = {
  factoryId: string;
  orgUnitId?: string | null;
  status?: PublicApprovalStatus;
  page?: number;
  pageSize?: number;
};

export type ApprovalListItem = {
  id: string;
  type: ApprovalKind;
  employeeId: string;
  employeeName: string;
  empNo: string;
  status: PublicApprovalStatus;
  reason: string;
  createdAt: string;
  startAt?: string;
  endAt?: string;
  targetDate?: string;
  repairAt?: string;
  requestType?: LeaveType | CheckinType;
};

export type PaginatedResult<TItem> = {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function toPrismaApprovalStatus(
  status: PublicApprovalStatus | undefined,
): ApprovalStatus | undefined {
  if (!status) {
    return undefined;
  }

  return status as ApprovalStatus;
}

export function toPublicApprovalStatus(
  status: ApprovalStatus,
): PublicApprovalStatus {
  if (status === 'APPROVED') {
    return 'APPROVED';
  }

  if (status === 'REJECTED') {
    return 'REJECTED';
  }

  return 'PENDING';
}
