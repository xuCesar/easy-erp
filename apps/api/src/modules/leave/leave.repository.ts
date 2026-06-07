import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ApprovalStatus, LeaveType, Prisma, PrismaClient } from '@prisma/client';
import {
  toPublicApprovalStatus,
  type ApprovalListItem,
  type PaginatedResult,
} from '../approval-view.types';

export type LeaveRequestRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  employeeId: string;
  leaveType: LeaveType;
  startAt: Date;
  endAt: Date;
  durationHours: number;
  reason: string;
  attachments: string[];
  status: ApprovalStatus;
  approverId: string | null;
  approvedAt: Date | null;
  rejectReason: string | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateLeaveRequestInput = {
  tenantId: string;
  factoryId: string;
  employeeId: string;
  leaveType: LeaveType;
  startAt: Date;
  endAt: Date;
  durationHours: number;
  reason: string;
  attachments: string[];
};

export type UpdateLeaveStatusInput = {
  status: ApprovalStatus;
  approverId?: string | null;
  approvedAt?: Date | null;
  rejectReason?: string | null;
  cancelReason?: string | null;
};

export type LeaveRequestListQuery = {
  factoryId: string;
  orgUnitId?: string | null;
  employeeId?: string | null;
  status?: ApprovalStatus;
  page: number;
  pageSize: number;
};

export interface LeaveRequestRepository {
  create(input: CreateLeaveRequestInput): Promise<LeaveRequestRecord>;
  findById(tenantId: string, id: string): Promise<LeaveRequestRecord | null>;
  list(
    tenantId: string,
    query: LeaveRequestListQuery,
  ): Promise<PaginatedResult<ApprovalListItem>>;
  updateStatus(
    tenantId: string,
    id: string,
    input: UpdateLeaveStatusInput,
  ): Promise<LeaveRequestRecord>;
}

@Injectable()
export class PrismaLeaveRequestRepository
  implements LeaveRequestRepository, OnModuleInit, OnModuleDestroy
{
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async create(input: CreateLeaveRequestInput): Promise<LeaveRequestRecord> {
    const record = await this.prisma.leaveRequest.create({
      data: {
        tenantId: input.tenantId,
        factoryId: input.factoryId,
        employeeId: input.employeeId,
        leaveType: input.leaveType,
        startAt: input.startAt,
        endAt: input.endAt,
        durationHours: input.durationHours,
        reason: input.reason,
        attachments: input.attachments,
        status: ApprovalStatus.PENDING,
      },
    });

    return toLeaveRequestRecord(record);
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<LeaveRequestRecord | null> {
    const record = await this.prisma.leaveRequest.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    return record ? toLeaveRequestRecord(record) : null;
  }

  async list(
    tenantId: string,
    query: LeaveRequestListQuery,
  ): Promise<PaginatedResult<ApprovalListItem>> {
    const where = {
      tenantId,
      factoryId: query.factoryId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.orgUnitId
        ? {
            employee: {
              orgUnitId: query.orgUnitId,
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.leaveRequest.findMany({
        where,
        include: {
          employee: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.leaveRequest.count({
        where,
      }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        type: 'LEAVE',
        employeeId: item.employeeId,
        employeeName: item.employee.name,
        empNo: item.employee.empNo,
        status: toPublicApprovalStatus(item.status),
        reason: item.reason,
        createdAt: item.createdAt.toISOString(),
        startAt: item.startAt.toISOString(),
        endAt: item.endAt.toISOString(),
        requestType: item.leaveType,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async updateStatus(
    tenantId: string,
    id: string,
    input: UpdateLeaveStatusInput,
  ): Promise<LeaveRequestRecord> {
    await this.assertExists(tenantId, id);
    const record = await this.prisma.leaveRequest.update({
      where: {
        id,
      },
      data: input,
    });

    return toLeaveRequestRecord(record);
  }

  private async assertExists(tenantId: string, id: string): Promise<void> {
    const count = await this.prisma.leaveRequest.count({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (count === 0) {
      throw new Error('Leave request not found.');
    }
  }
}

type PrismaLeaveRequestRecord = Omit<LeaveRequestRecord, 'durationHours'> & {
  durationHours: Prisma.Decimal;
};

function toLeaveRequestRecord(record: PrismaLeaveRequestRecord): LeaveRequestRecord {
  return {
    ...record,
    durationHours: record.durationHours.toNumber(),
  };
}
