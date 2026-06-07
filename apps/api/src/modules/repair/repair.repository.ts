import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  ApprovalStatus,
  CheckinMethod,
  CheckinType,
  Prisma,
  PrismaClient,
} from '@prisma/client';

export type RepairRequestRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  employeeId: string;
  targetDate: Date;
  repairType: CheckinType;
  repairAt: Date;
  reason: string;
  attachments: string[];
  status: ApprovalStatus;
  approverId: string | null;
  approvedAt: Date | null;
  rejectReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateRepairRequestInput = {
  tenantId: string;
  factoryId: string;
  employeeId: string;
  targetDate: Date;
  repairType: CheckinType;
  repairAt: Date;
  reason: string;
  attachments: string[];
};

export type ManualCheckinInput = {
  tenantId: string;
  factoryId: string;
  employeeId: string;
  checkinType: CheckinType;
  checkinAt: Date;
  method: CheckinMethod;
  sourceRequestId: string;
  idempotencyKey: string;
};

export type RepairApprovalResult = {
  request: RepairRequestRecord;
  checkinRecordId: string;
};

export type UpdateRepairStatusInput = {
  status: ApprovalStatus;
  approverId?: string | null;
  approvedAt?: Date | null;
  rejectReason?: string | null;
};

export type ApprovalListQuery = {
  factoryId: string;
  status?: ApprovalStatus;
  keyword?: string | null;
  page: number;
  pageSize: number;
};

export type RepairApprovalListItem = RepairRequestRecord & {
  employeeName: string;
  empNo: string;
  orgUnitId: string | null;
};

export interface RepairRequestRepository {
  create(input: CreateRepairRequestInput): Promise<RepairRequestRecord>;
  findById(tenantId: string, id: string): Promise<RepairRequestRecord | null>;
  list(
    tenantId: string,
    query: ApprovalListQuery,
  ): Promise<{ items: RepairApprovalListItem[]; total: number }>;
  approveWithManualCheckin(input: {
    tenantId: string;
    id: string;
    approverId: string;
    approvedAt: Date;
    manualCheckin: ManualCheckinInput;
  }): Promise<RepairApprovalResult>;
  updateStatus(
    tenantId: string,
    id: string,
    input: UpdateRepairStatusInput,
  ): Promise<RepairRequestRecord>;
}

@Injectable()
export class PrismaRepairRequestRepository
  implements RepairRequestRepository, OnModuleInit, OnModuleDestroy
{
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async create(input: CreateRepairRequestInput): Promise<RepairRequestRecord> {
    const record = await this.prisma.repairRequest.create({
      data: {
        tenantId: input.tenantId,
        factoryId: input.factoryId,
        employeeId: input.employeeId,
        targetDate: input.targetDate,
        repairType: input.repairType,
        repairAt: input.repairAt,
        reason: input.reason,
        attachments: input.attachments,
        status: ApprovalStatus.PENDING,
      },
    });

    return toRepairRequestRecord(record);
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<RepairRequestRecord | null> {
    const record = await this.prisma.repairRequest.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    return record ? toRepairRequestRecord(record) : null;
  }

  async list(
    tenantId: string,
    query: ApprovalListQuery,
  ): Promise<{ items: RepairApprovalListItem[]; total: number }> {
    const where = {
      tenantId,
      factoryId: query.factoryId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword
        ? {
            OR: [
              { reason: { contains: query.keyword, mode: 'insensitive' as const } },
              {
                employee: {
                  name: { contains: query.keyword, mode: 'insensitive' as const },
                },
              },
              {
                employee: {
                  empNo: { contains: query.keyword, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.repairRequest.findMany({
        where,
        include: {
          employee: {
            select: {
              name: true,
              empNo: true,
              orgUnitId: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.repairRequest.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...toRepairRequestRecord(item),
        employeeName: item.employee.name,
        empNo: item.employee.empNo,
        orgUnitId: item.employee.orgUnitId,
      })),
      total,
    };
  }

  async approveWithManualCheckin(input: {
    tenantId: string;
    id: string;
    approverId: string;
    approvedAt: Date;
    manualCheckin: ManualCheckinInput;
  }): Promise<RepairApprovalResult> {
    const [request, checkin] = await this.prisma.$transaction([
      this.prisma.repairRequest.update({
        where: {
          id: input.id,
        },
        data: {
          status: ApprovalStatus.APPROVED,
          approverId: input.approverId,
          approvedAt: input.approvedAt,
          rejectReason: null,
        },
      }),
      this.prisma.checkinRecord.create({
        data: {
          tenantId: input.manualCheckin.tenantId,
          factoryId: input.manualCheckin.factoryId,
          employeeId: input.manualCheckin.employeeId,
          checkinType: input.manualCheckin.checkinType,
          checkinAt: input.manualCheckin.checkinAt,
          clientEventAt: null,
          method: input.manualCheckin.method,
          latitude: null,
          longitude: null,
          wifiSsid: null,
          wifiBssid: null,
          photoUrl: null,
          deviceId: null,
          idempotencyKey: input.manualCheckin.idempotencyKey,
          sourceRequestId: input.manualCheckin.sourceRequestId,
          isValid: true,
          invalidReason: null,
          rawData: input.manualCheckin as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    return {
      request: toRepairRequestRecord(request),
      checkinRecordId: checkin.id,
    };
  }

  async updateStatus(
    tenantId: string,
    id: string,
    input: UpdateRepairStatusInput,
  ): Promise<RepairRequestRecord> {
    await this.assertExists(tenantId, id);
    const record = await this.prisma.repairRequest.update({
      where: {
        id,
      },
      data: input,
    });

    return toRepairRequestRecord(record);
  }

  private async assertExists(tenantId: string, id: string): Promise<void> {
    const count = await this.prisma.repairRequest.count({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (count === 0) {
      throw new Error('Repair request not found.');
    }
  }
}

function toRepairRequestRecord(record: RepairRequestRecord): RepairRequestRecord {
  return record;
}
