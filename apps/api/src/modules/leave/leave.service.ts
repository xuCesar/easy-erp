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
  LeaveRequestRecord,
  LeaveRequestRepository,
} from './leave.repository';

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
