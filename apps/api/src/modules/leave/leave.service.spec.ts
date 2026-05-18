import { ConflictException, NotFoundException } from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { LeaveService } from './leave.service';
import type {
  CreateLeaveRequestInput,
  LeaveRequestRecord,
  LeaveRequestRepository,
} from './leave.repository';

describe('LeaveService', () => {
  it('creates leave request as pending', async () => {
    const repository = new FakeLeaveRequestRepository();
    const service = new LeaveService(repository, new FakeRecalculationPort());

    const request = await service.create({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      employeeId: 'employee-1',
      leaveType: 'PERSONAL',
      startAt: dateTime('2026-05-17T13:00:00.000Z'),
      endAt: dateTime('2026-05-17T17:00:00.000Z'),
      durationHours: 4,
      reason: '个人事务',
      attachments: [],
    });

    expect(request).toMatchObject({
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      status: ApprovalStatus.PENDING,
    });
  });

  it('approves pending leave request and triggers affected date recalculation', async () => {
    const repository = new FakeLeaveRequestRepository([
      leaveRequest({ status: ApprovalStatus.PENDING }),
    ]);
    const recalculation = new FakeRecalculationPort();
    const service = new LeaveService(repository, recalculation);

    const approved = await service.approve('tenant-1', 'leave-1', 'approver-1');

    expect(approved).toMatchObject({
      status: ApprovalStatus.APPROVED,
      approverId: 'approver-1',
    });
    expect(recalculation.calls).toEqual([
      {
        tenantId: 'tenant-1',
        employeeId: 'employee-1',
        date: '2026-05-17',
        leaves: [
          {
            startAt: dateTime('2026-05-17T13:00:00.000Z'),
            endAt: dateTime('2026-05-17T17:00:00.000Z'),
          },
        ],
      },
    ]);
  });

  it('rejects invalid leave approval transition', async () => {
    const service = new LeaveService(
      new FakeLeaveRequestRepository([
        leaveRequest({ status: ApprovalStatus.APPROVED }),
      ]),
      new FakeRecalculationPort(),
    );

    await expect(
      service.approve('tenant-1', 'leave-1', 'approver-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects missing leave request', async () => {
    const service = new LeaveService(
      new FakeLeaveRequestRepository(),
      new FakeRecalculationPort(),
    );

    await expect(
      service.approve('tenant-1', 'missing', 'approver-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

class FakeLeaveRequestRepository implements LeaveRequestRepository {
  private readonly records = new Map<string, LeaveRequestRecord>();

  constructor(records: LeaveRequestRecord[] = []) {
    for (const record of records) {
      this.records.set(record.id, record);
    }
  }

  async create(input: CreateLeaveRequestInput): Promise<LeaveRequestRecord> {
    const record = leaveRequest({
      ...input,
      id: 'leave-created',
      status: ApprovalStatus.PENDING,
    });
    this.records.set(record.id, record);
    return record;
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<LeaveRequestRecord | null> {
    const record = this.records.get(id);
    return record?.tenantId === tenantId ? record : null;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    input: {
      status: ApprovalStatus;
      approverId?: string | null;
      approvedAt?: Date | null;
      rejectReason?: string | null;
      cancelReason?: string | null;
    },
  ): Promise<LeaveRequestRecord> {
    const current = await this.findById(tenantId, id);
    if (!current) {
      throw new Error('Leave request not found.');
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

function leaveRequest(
  overrides: Partial<LeaveRequestRecord> = {},
): LeaveRequestRecord {
  return {
    id: 'leave-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    employeeId: 'employee-1',
    leaveType: 'PERSONAL',
    startAt: dateTime('2026-05-17T13:00:00.000Z'),
    endAt: dateTime('2026-05-17T17:00:00.000Z'),
    durationHours: 4,
    reason: '个人事务',
    attachments: [],
    status: ApprovalStatus.PENDING,
    approverId: null,
    approvedAt: null,
    rejectReason: null,
    cancelReason: null,
    createdAt: dateTime('2026-05-17T12:00:00.000Z'),
    updatedAt: dateTime('2026-05-17T12:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function dateTime(value: string): Date {
  return new Date(value);
}
