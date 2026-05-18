import { ConflictException, NotFoundException } from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { RepairService } from './repair.service';
import type {
  CreateRepairRequestInput,
  ManualCheckinInput,
  RepairApprovalResult,
  RepairRequestRecord,
  RepairRequestRepository,
} from './repair.repository';

describe('RepairService', () => {
  it('creates repair request as pending', async () => {
    const repository = new FakeRepairRequestRepository();
    const service = new RepairService(repository, new FakeRecalculationPort());

    const request = await service.create({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      employeeId: 'employee-1',
      targetDate: dateOnly('2026-05-17'),
      repairType: 'CLOCK_OUT',
      repairAt: dateTime('2026-05-17T17:00:00.000Z'),
      reason: '下班忘记打卡',
      attachments: [],
    });

    expect(request).toMatchObject({
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      status: ApprovalStatus.PENDING,
    });
  });

  it('approves pending repair request, creates manual check-in, and triggers recalculation', async () => {
    const repository = new FakeRepairRequestRepository([
      repairRequest({ status: ApprovalStatus.PENDING }),
    ]);
    const recalculation = new FakeRecalculationPort();
    const service = new RepairService(repository, recalculation);

    const approved = await service.approve('tenant-1', 'repair-1', 'approver-1');

    expect(approved.request).toMatchObject({
      status: ApprovalStatus.APPROVED,
      approverId: 'approver-1',
    });
    expect(repository.manualCheckins).toEqual([
      expect.objectContaining({
        tenantId: 'tenant-1',
        employeeId: 'employee-1',
        checkinType: 'CLOCK_OUT',
        checkinAt: dateTime('2026-05-17T17:00:00.000Z'),
        method: 'MANUAL',
        sourceRequestId: 'repair-1',
      }),
    ]);
    expect(recalculation.calls).toEqual([
      {
        tenantId: 'tenant-1',
        employeeId: 'employee-1',
        date: '2026-05-17',
        leaves: [],
      },
    ]);
  });

  it('rejects invalid repair approval transition', async () => {
    const service = new RepairService(
      new FakeRepairRequestRepository([
        repairRequest({ status: ApprovalStatus.APPROVED }),
      ]),
      new FakeRecalculationPort(),
    );

    await expect(
      service.approve('tenant-1', 'repair-1', 'approver-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects missing repair request', async () => {
    const service = new RepairService(
      new FakeRepairRequestRepository(),
      new FakeRecalculationPort(),
    );

    await expect(
      service.approve('tenant-1', 'missing', 'approver-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

class FakeRepairRequestRepository implements RepairRequestRepository {
  readonly manualCheckins: ManualCheckinInput[] = [];
  private readonly records = new Map<string, RepairRequestRecord>();

  constructor(records: RepairRequestRecord[] = []) {
    for (const record of records) {
      this.records.set(record.id, record);
    }
  }

  async create(input: CreateRepairRequestInput): Promise<RepairRequestRecord> {
    const record = repairRequest({
      ...input,
      id: 'repair-created',
      status: ApprovalStatus.PENDING,
    });
    this.records.set(record.id, record);
    return record;
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<RepairRequestRecord | null> {
    const record = this.records.get(id);
    return record?.tenantId === tenantId ? record : null;
  }

  async approveWithManualCheckin(input: {
    tenantId: string;
    id: string;
    approverId: string;
    approvedAt: Date;
    manualCheckin: ManualCheckinInput;
  }): Promise<RepairApprovalResult> {
    const current = await this.findById(input.tenantId, input.id);
    if (!current) {
      throw new Error('Repair request not found.');
    }

    const updated = {
      ...current,
      status: ApprovalStatus.APPROVED,
      approverId: input.approverId,
      approvedAt: input.approvedAt,
      updatedAt: dateTime('2026-05-17T18:00:00.000Z'),
    };
    this.records.set(input.id, updated);
    this.manualCheckins.push(input.manualCheckin);

    return {
      request: updated,
      checkinRecordId: 'manual-checkin-1',
    };
  }

  async updateStatus(
    tenantId: string,
    id: string,
    input: {
      status: ApprovalStatus;
      approverId?: string | null;
      approvedAt?: Date | null;
      rejectReason?: string | null;
    },
  ): Promise<RepairRequestRecord> {
    const current = await this.findById(tenantId, id);
    if (!current) {
      throw new Error('Repair request not found.');
    }

    const updated = {
      ...current,
      ...input,
      updatedAt: dateTime('2026-05-17T18:00:00.000Z'),
    };
    this.records.set(id, updated);
    return updated;
  }
}

class FakeRecalculationPort {
  calls: Array<{
    tenantId: string;
    employeeId: string;
    date: string;
    leaves: Array<{ startAt: Date; endAt: Date }>;
  }> = [];

  async recalculateEmployeeDate(input: {
    tenantId: string;
    employeeId: string;
    date: string;
    leaves?: Array<{ startAt: Date; endAt: Date }>;
  }): Promise<void> {
    this.calls.push({
      ...input,
      leaves: input.leaves ?? [],
    });
  }
}

function repairRequest(
  overrides: Partial<RepairRequestRecord> = {},
): RepairRequestRecord {
  return {
    id: 'repair-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    employeeId: 'employee-1',
    targetDate: dateOnly('2026-05-17'),
    repairType: 'CLOCK_OUT',
    repairAt: dateTime('2026-05-17T17:00:00.000Z'),
    reason: '下班忘记打卡',
    attachments: [],
    status: ApprovalStatus.PENDING,
    approverId: null,
    approvedAt: null,
    rejectReason: null,
    createdAt: dateTime('2026-05-17T12:00:00.000Z'),
    updatedAt: dateTime('2026-05-17T12:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateTime(value: string): Date {
  return new Date(value);
}
