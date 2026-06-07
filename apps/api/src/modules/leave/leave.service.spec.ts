import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { PermissionService } from '../../core/permission';
import type { AuthPrincipal } from '../../core/auth';
import type { EmployeeRecord, EmployeeRepository } from '../employee';
import type { ApprovalListItem, PaginatedResult } from '../approval-view.types';
import { LeaveService } from './leave.service';
import type {
  CreateLeaveRequestInput,
  LeaveRequestListQuery,
  LeaveRequestRecord,
  LeaveRequestRepository,
} from './leave.repository';

describe('LeaveService', () => {
  it('creates leave request as pending', async () => {
    const repository = new FakeLeaveRequestRepository();
    const service = createService(repository);

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
    const service = createService(repository, recalculation);

    const approved = await service.approve(principal(), 'leave-1');

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
    const service = createService(
      new FakeLeaveRequestRepository([
        leaveRequest({ status: ApprovalStatus.APPROVED }),
      ]),
    );

    await expect(
      service.approve(principal(), 'leave-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects missing leave request', async () => {
    const service = createService(new FakeLeaveRequestRepository());

    await expect(
      service.approve(principal(), 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects leave approval outside approver data scope', async () => {
    const repository = new FakeLeaveRequestRepository([
      leaveRequest({ status: ApprovalStatus.PENDING }),
    ]);
    const recalculation = new FakeRecalculationPort();
    const service = createService(repository, recalculation);

    await expect(
      service.approve(
        {
          ...principal(),
          dataScopes: [{ type: 'EMPLOYEE', employeeId: 'other-employee' }],
        },
        'leave-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(recalculation.calls).toEqual([]);
  });

  it('lists leave approvals inside current employee data scope', async () => {
    const repository = new FakeLeaveRequestRepository([
      leaveRequest({ id: 'leave-1', employeeId: 'employee-1', status: ApprovalStatus.PENDING }),
      leaveRequest({ id: 'leave-2', employeeId: 'other-employee', status: ApprovalStatus.PENDING }),
      leaveRequest({ id: 'leave-3', employeeId: 'employee-1', status: ApprovalStatus.APPROVED }),
    ]);
    const service = createService(repository);

    const page = await service.list(principal(), {
      factoryId: 'factory-1',
      status: 'PENDING',
      page: 1,
      pageSize: 20,
    });

    expect(page.items.map((item) => item.id)).toEqual(['leave-1']);
    expect(repository.lastListQuery).toMatchObject({
      employeeId: 'employee-1',
      status: ApprovalStatus.PENDING,
    });
  });

  it('rejects leave approval list without factory scope', async () => {
    const service = createService(new FakeLeaveRequestRepository());

    await expect(
      service.list(principal(), {
        factoryId: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function createService(
  repository: LeaveRequestRepository,
  recalculation = new FakeRecalculationPort(),
): LeaveService {
  return new LeaveService(
    repository,
    recalculation,
    new PermissionService(),
    new FakeEmployeeRepository(),
  );
}

class FakeLeaveRequestRepository implements LeaveRequestRepository {
  lastListQuery: LeaveRequestListQuery | null = null;
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

  async list(
    tenantId: string,
    query: LeaveRequestListQuery,
  ): Promise<PaginatedResult<ApprovalListItem>> {
    this.lastListQuery = query;
    const items = [...this.records.values()]
      .filter((record) => record.tenantId === tenantId)
      .filter((record) => record.factoryId === query.factoryId)
      .filter((record) => !query.employeeId || record.employeeId === query.employeeId)
      .filter((record) => !query.status || record.status === query.status)
      .map((record) => ({
        id: record.id,
        type: 'LEAVE' as const,
        employeeId: record.employeeId,
        employeeName: record.employeeId === 'employee-1' ? '张三' : '李四',
        empNo: record.employeeId === 'employee-1' ? 'E001' : 'E002',
        status: record.status === ApprovalStatus.APPROVED
          ? 'APPROVED' as const
          : record.status === ApprovalStatus.REJECTED
            ? 'REJECTED' as const
            : 'PENDING' as const,
        reason: record.reason,
        createdAt: record.createdAt.toISOString(),
        startAt: record.startAt.toISOString(),
        endAt: record.endAt.toISOString(),
        requestType: record.leaveType,
      }));

    return {
      items,
      total: items.length,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(items.length / query.pageSize),
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

class FakeEmployeeRepository implements Pick<EmployeeRepository, 'findById'> {
  async findById(
    tenantId: string,
    id: string,
  ): Promise<EmployeeRecord | null> {
    if (tenantId !== 'tenant-1' || id !== 'employee-1') {
      return null;
    }

    return {
      id: 'employee-1',
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      orgUnitId: 'org-1',
      empNo: 'E001',
      name: '张三',
      phone: '13800000000',
      entryDate: dateTime('2026-05-01T00:00:00.000Z'),
      status: 'ACTIVE',
      createdAt: dateTime('2026-05-01T00:00:00.000Z'),
      updatedAt: dateTime('2026-05-01T00:00:00.000Z'),
      deletedAt: null,
    };
  }
}

function principal(): AuthPrincipal {
  return {
    id: 'approver-1',
    tenantId: 'tenant-1',
    employeeId: 'approver-employee-1',
    roles: ['ORG_MANAGER'],
    dataScopes: [{ type: 'EMPLOYEE', employeeId: 'employee-1' }],
  };
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
