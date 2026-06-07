import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, CheckinMethod } from '@prisma/client';
import type { AuthPrincipal } from '../../core/auth';
import { PermissionService } from '../../core/permission';
import type { AttendanceRecalculationPort } from '../attendance';
import type { EmployeeRepository } from '../employee';
import type {
  ApprovalListQuery,
  CreateRepairRequestInput,
  RepairApprovalResult,
  RepairApprovalListItem,
  RepairRequestRecord,
  RepairRequestRepository,
} from './repair.repository';

export type ApprovalItem = {
  id: string;
  type: 'REPAIR';
  factoryId: string;
  employeeId: string;
  employeeName: string;
  empNo: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVOKED' | 'DRAFT';
  reason: string;
  createdAt: string;
  targetDate: string;
  repairAt: string;
  repairType: string;
};

export type ApprovalPage = {
  items: ApprovalItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

@Injectable()
export class RepairService {
  constructor(
    private readonly repository: RepairRequestRepository,
    private readonly recalculation: AttendanceRecalculationPort,
    private readonly permissionService: PermissionService,
    private readonly employeeRepository: Pick<EmployeeRepository, 'findById'>,
  ) {}

  async create(input: CreateRepairRequestInput): Promise<RepairRequestRecord> {
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
      total: items.length,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(items.length / query.pageSize),
    };
  }

  async approve(
    principal: AuthPrincipal,
    id: string,
  ): Promise<RepairApprovalResult> {
    const request = await this.findRequest(principal.tenantId, id);
    assertTransition(request.status, ApprovalStatus.APPROVED);
    await this.assertCanAccessRequest(principal, request);

    const approvedAt = new Date();
    const result = await this.repository.approveWithManualCheckin({
      tenantId: principal.tenantId,
      id,
      approverId: principal.id,
      approvedAt,
      manualCheckin: {
        tenantId: request.tenantId,
        factoryId: request.factoryId,
        employeeId: request.employeeId,
        checkinType: request.repairType,
        checkinAt: request.repairAt,
        method: CheckinMethod.MANUAL,
        sourceRequestId: request.id,
        idempotencyKey: `repair:${request.id}`,
      },
    });

    await this.recalculation.recalculateEmployeeDate({
      tenantId: request.tenantId,
      employeeId: request.employeeId,
      date: toDateString(request.targetDate),
    });

    return result;
  }

  async reject(
    principal: AuthPrincipal,
    id: string,
    rejectReason: string,
  ): Promise<RepairRequestRecord> {
    const request = await this.findRequest(principal.tenantId, id);
    assertTransition(request.status, ApprovalStatus.REJECTED);
    await this.assertCanAccessRequest(principal, request);

    return this.repository.updateStatus(principal.tenantId, id, {
      status: ApprovalStatus.REJECTED,
      rejectReason,
    });
  }

  async cancel(tenantId: string, id: string): Promise<RepairRequestRecord> {
    const request = await this.findRequest(tenantId, id);
    assertTransition(request.status, ApprovalStatus.CANCELLED);

    return this.repository.updateStatus(tenantId, id, {
      status: ApprovalStatus.CANCELLED,
    });
  }

  async revoke(tenantId: string, id: string): Promise<RepairRequestRecord> {
    const request = await this.findRequest(tenantId, id);
    assertTransition(request.status, ApprovalStatus.REVOKED);

    const revoked = await this.repository.updateStatus(tenantId, id, {
      status: ApprovalStatus.REVOKED,
    });
    await this.recalculation.recalculateEmployeeDate({
      tenantId: request.tenantId,
      employeeId: request.employeeId,
      date: toDateString(request.targetDate),
    });

    return revoked;
  }

  private async findRequest(
    tenantId: string,
    id: string,
  ): Promise<RepairRequestRecord> {
    const request = await this.repository.findById(tenantId, id);

    if (!request) {
      throw new NotFoundException('Repair request not found.');
    }

    return request;
  }

  private async assertCanAccessRequest(
    principal: AuthPrincipal,
    request: RepairRequestRecord,
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
    request: RepairApprovalListItem,
  ): boolean {
    return this.permissionService.canAccessResource(principal, {
      tenantId: request.tenantId,
      factoryId: request.factoryId,
      employeeId: request.employeeId,
      orgUnitId: request.orgUnitId,
    });
  }
}

function toApprovalItem(request: RepairApprovalListItem): ApprovalItem {
  return {
    id: request.id,
    type: 'REPAIR',
    factoryId: request.factoryId,
    employeeId: request.employeeId,
    employeeName: request.employeeName,
    empNo: request.empNo,
    status: request.status,
    reason: request.reason,
    createdAt: request.createdAt.toISOString(),
    targetDate: request.targetDate.toISOString().slice(0, 10),
    repairAt: request.repairAt.toISOString(),
    repairType: request.repairType,
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

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}
