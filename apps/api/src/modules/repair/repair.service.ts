import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, CheckinMethod } from '@prisma/client';
import type { AttendanceRecalculationPort } from '../attendance';
import type {
  CreateRepairRequestInput,
  RepairApprovalResult,
  RepairRequestRecord,
  RepairRequestRepository,
} from './repair.repository';

@Injectable()
export class RepairService {
  constructor(
    private readonly repository: RepairRequestRepository,
    private readonly recalculation: AttendanceRecalculationPort,
  ) {}

  async create(input: CreateRepairRequestInput): Promise<RepairRequestRecord> {
    return this.repository.create(input);
  }

  async approve(
    tenantId: string,
    id: string,
    approverId: string,
  ): Promise<RepairApprovalResult> {
    const request = await this.findRequest(tenantId, id);
    assertTransition(request.status, ApprovalStatus.APPROVED);

    const approvedAt = new Date();
    const result = await this.repository.approveWithManualCheckin({
      tenantId,
      id,
      approverId,
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
    tenantId: string,
    id: string,
    rejectReason: string,
  ): Promise<RepairRequestRecord> {
    const request = await this.findRequest(tenantId, id);
    assertTransition(request.status, ApprovalStatus.REJECTED);

    return this.repository.updateStatus(tenantId, id, {
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
