import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import type { AuthPrincipal } from '../../core/auth';
import { PermissionService } from '../../core/permission';
import type { AttendanceRecalculationPort } from '../attendance';
import type { EmployeeRepository } from '../employee';
import type {
  CreateLeaveRequestInput,
  ApprovalListQuery,
  LeaveApprovalListItem,
  LeaveRequestRecord,
  LeaveRequestRepository,
} from './leave.repository';

export type ApprovalItem = {
  id: string;
  type: 'LEAVE';
  factoryId: string;
  employeeId: string;
  employeeName: string;
  empNo: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVOKED' | 'DRAFT';
  reason: string;
  createdAt: string;
  startAt: string;
  endAt: string;
  durationHours: number;
  leaveType: string;
};

export type ApprovalPage = {
  items: ApprovalItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

@Injectable()
export class LeaveService {
  constructor(
    private readonly repository: LeaveRequestRepository,
    private readonly recalculation: AttendanceRecalculationPort,
    private readonly permissionService: PermissionService,
    private readonly employeeRepository: Pick<EmployeeRepository, 'findById'>,
  ) {}

  async create(input: CreateLeaveRequestInput): Promise<LeaveRequestRecord> {
    return this.repository.create(input);
  }

  async list(
    principal: AuthPrincipal,
    query: ApprovalListQuery,
  ): Promise<ApprovalPage> {
    const result = await this.repository.list(principal.tenantId, query);
    const items = result.items
      .filter((item) => this.canAccessListItem(principal, item))
      .map(toApprovalItem);

    return {
      items,
      // 当前页再做权限过滤，避免普通主管看到越权记录；total 按过滤后返回，语义更贴近用户实际可见数据。
      total: items.length,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(items.length / query.pageSize),
    };
  }

  async approve(
    principal: AuthPrincipal,
    id: string,
  ): Promise<LeaveRequestRecord> {
    const request = await this.findRequest(principal.tenantId, id);
    assertTransition(request.status, ApprovalStatus.APPROVED);
    await this.assertCanAccessRequest(principal, request);

    const approved = await this.repository.updateStatus(principal.tenantId, id, {
      status: ApprovalStatus.APPROVED,
      approverId: principal.id,
      approvedAt: new Date(),
      rejectReason: null,
      cancelReason: null,
    });

    await this.recalculateAffectedDates(approved);

    return approved;
  }

  async reject(
    principal: AuthPrincipal,
    id: string,
    rejectReason: string,
  ): Promise<LeaveRequestRecord> {
    const request = await this.findRequest(principal.tenantId, id);
    assertTransition(request.status, ApprovalStatus.REJECTED);
    await this.assertCanAccessRequest(principal, request);

    return this.repository.updateStatus(principal.tenantId, id, {
      status: ApprovalStatus.REJECTED,
      rejectReason,
    });
  }

  async cancel(
    tenantId: string,
    id: string,
    cancelReason: string,
  ): Promise<LeaveRequestRecord> {
    const request = await this.findRequest(tenantId, id);
    assertTransition(request.status, ApprovalStatus.CANCELLED);

    return this.repository.updateStatus(tenantId, id, {
      status: ApprovalStatus.CANCELLED,
      cancelReason,
    });
  }

  async revoke(tenantId: string, id: string): Promise<LeaveRequestRecord> {
    const request = await this.findRequest(tenantId, id);
    assertTransition(request.status, ApprovalStatus.REVOKED);

    const revoked = await this.repository.updateStatus(tenantId, id, {
      status: ApprovalStatus.REVOKED,
    });
    await this.recalculateAffectedDates(revoked);

    return revoked;
  }

  private async findRequest(
    tenantId: string,
    id: string,
  ): Promise<LeaveRequestRecord> {
    const request = await this.repository.findById(tenantId, id);

    if (!request) {
      throw new NotFoundException('Leave request not found.');
    }

    return request;
  }

  private async assertCanAccessRequest(
    principal: AuthPrincipal,
    request: LeaveRequestRecord,
  ): Promise<void> {
    const employee = await this.employeeRepository.findById(
      request.tenantId,
      request.employeeId,
    );

    if (
      !this.permissionService.canAccessResource(principal, {
        tenantId: request.tenantId,
        factoryId: request.factoryId,
        employeeId: request.employeeId,
        orgUnitId: employee?.orgUnitId ?? null,
      })
    ) {
      throw new ForbiddenException('Permission denied for target employee.');
    }
  }

  private canAccessListItem(
    principal: AuthPrincipal,
    request: LeaveApprovalListItem,
  ): boolean {
    return this.permissionService.canAccessResource(principal, {
      tenantId: request.tenantId,
      factoryId: request.factoryId,
      employeeId: request.employeeId,
      orgUnitId: request.orgUnitId,
    });
  }

  private async recalculateAffectedDates(
    request: LeaveRequestRecord,
  ): Promise<void> {
    await Promise.all(
      affectedDates(request.startAt, request.endAt).map((date) =>
        this.recalculation.recalculateEmployeeDate({
          tenantId: request.tenantId,
          employeeId: request.employeeId,
          date,
          leaves:
            request.status === ApprovalStatus.APPROVED
              ? [{ startAt: request.startAt, endAt: request.endAt }]
              : [],
        }),
      ),
    );
  }
}

function toApprovalItem(request: LeaveApprovalListItem): ApprovalItem {
  return {
    id: request.id,
    type: 'LEAVE',
    factoryId: request.factoryId,
    employeeId: request.employeeId,
    employeeName: request.employeeName,
    empNo: request.empNo,
    status: request.status,
    reason: request.reason,
    createdAt: request.createdAt.toISOString(),
    startAt: request.startAt.toISOString(),
    endAt: request.endAt.toISOString(),
    durationHours: request.durationHours,
    leaveType: request.leaveType,
  };
}

function assertTransition(
  from: ApprovalStatus,
  to: ApprovalStatus,
): void {
  const allowed: Record<ApprovalStatus, ApprovalStatus[]> = {
    [ApprovalStatus.DRAFT]: [ApprovalStatus.PENDING, ApprovalStatus.CANCELLED],
    [ApprovalStatus.PENDING]: [
      ApprovalStatus.APPROVED,
      ApprovalStatus.REJECTED,
      ApprovalStatus.CANCELLED,
    ],
    [ApprovalStatus.APPROVED]: [ApprovalStatus.REVOKED],
    [ApprovalStatus.REJECTED]: [],
    [ApprovalStatus.CANCELLED]: [],
    [ApprovalStatus.REVOKED]: [],
  };

  if (!allowed[from].includes(to)) {
    throw new ConflictException(`Invalid approval transition: ${from} -> ${to}.`);
  }
}

function affectedDates(startAt: Date, endAt: Date): string[] {
  const dates: string[] = [];
  const current = new Date(
    Date.UTC(startAt.getUTCFullYear(), startAt.getUTCMonth(), startAt.getUTCDate()),
  );
  const end = new Date(
    Date.UTC(endAt.getUTCFullYear(), endAt.getUTCMonth(), endAt.getUTCDate()),
  );

  while (current.getTime() <= end.getTime()) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}
