import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient, ReportExportTaskStatus } from '@prisma/client';
import type { AttendanceResultRecord } from '../attendance';

export type MonthlyReportQuery = {
  tenantId: string;
  factoryId: string;
  orgUnitId: string | null;
  month: string;
};

export type ReportTaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type ReportTaskRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  orgUnitId: string | null;
  month: string;
  status: ReportTaskStatus;
  downloadUrl: string | null;
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateReportTaskInput = MonthlyReportQuery & {
  requestedBy: string;
};

export interface ReportRepository {
  listMonthlyResults(query: MonthlyReportQuery): Promise<AttendanceResultRecord[]>;
  finalizeMonthlyResults(query: MonthlyReportQuery): Promise<number>;
  createExportTask(input: CreateReportTaskInput): Promise<ReportTaskRecord>;
  findExportTask(
    tenantId: string,
    id: string,
  ): Promise<ReportTaskRecord | null>;
  updateExportTask(
    tenantId: string,
    id: string,
    input: Partial<Pick<ReportTaskRecord, 'status' | 'downloadUrl'>>,
  ): Promise<ReportTaskRecord>;
}

@Injectable()
export class PrismaReportRepository
  implements ReportRepository, OnModuleInit, OnModuleDestroy
{
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async listMonthlyResults(
    query: MonthlyReportQuery,
  ): Promise<AttendanceResultRecord[]> {
    const results = await this.prisma.attendanceResult.findMany({
      where: {
        tenantId: query.tenantId,
        factoryId: query.factoryId,
        date: monthRange(query.month),
        deletedAt: null,
        ...(query.orgUnitId
          ? {
              employee: {
                orgUnitId: query.orgUnitId,
              },
            }
          : {}),
      },
      orderBy: [{ date: 'asc' }, { employeeId: 'asc' }],
    });

    return results.map(toAttendanceResultRecord);
  }

  async finalizeMonthlyResults(query: MonthlyReportQuery): Promise<number> {
    const result = await this.prisma.attendanceResult.updateMany({
      where: {
        tenantId: query.tenantId,
        factoryId: query.factoryId,
        date: monthRange(query.month),
        deletedAt: null,
        isFinalized: false,
        ...(query.orgUnitId
          ? {
              employee: {
                orgUnitId: query.orgUnitId,
              },
            }
          : {}),
      },
      data: {
        isFinalized: true,
        finalizedAt: new Date(),
      },
    });

    return result.count;
  }

  async createExportTask(
    input: CreateReportTaskInput,
  ): Promise<ReportTaskRecord> {
    const task = await this.prisma.reportExportTask.create({
      data: {
        tenantId: input.tenantId,
        factoryId: input.factoryId,
        orgUnitId: input.orgUnitId,
        month: input.month,
        requestedBy: input.requestedBy,
      },
    });

    return toReportTaskRecord(task);
  }

  async findExportTask(
    tenantId: string,
    id: string,
  ): Promise<ReportTaskRecord | null> {
    const task = await this.prisma.reportExportTask.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    return task ? toReportTaskRecord(task) : null;
  }

  async updateExportTask(
    tenantId: string,
    id: string,
    input: Partial<Pick<ReportTaskRecord, 'status' | 'downloadUrl'>>,
  ): Promise<ReportTaskRecord> {
    const result = await this.prisma.reportExportTask.updateMany({
      where: {
        id,
        tenantId,
      },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.downloadUrl !== undefined
          ? { downloadUrl: input.downloadUrl }
          : {}),
      },
    });

    if (result.count === 0) {
      throw new Error('Report task not found.');
    }

    const task = await this.findExportTask(tenantId, id);

    if (!task) {
      throw new Error('Report task not found.');
    }

    return task;
  }
}

type PrismaAttendanceResultRecord = Omit<
  AttendanceResultRecord,
  'date' | 'statusFlags' | 'anomalyFlags' | 'calculationVersion'
> & {
  date: Date;
  statusFlags: string[];
  anomalyFlags: string[];
  calculationVersion: number;
};

type PrismaReportTaskRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  orgUnitId: string | null;
  month: string;
  status: ReportExportTaskStatus;
  downloadUrl: string | null;
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

function toAttendanceResultRecord(
  record: PrismaAttendanceResultRecord,
): AttendanceResultRecord {
  return {
    ...record,
    date: record.date.toISOString().slice(0, 10),
    statusFlags: record.statusFlags as AttendanceResultRecord['statusFlags'],
    anomalyFlags: record.anomalyFlags as AttendanceResultRecord['anomalyFlags'],
    calculationVersion: 1,
  };
}

export function toReportTaskRecord(
  record: PrismaReportTaskRecord,
): ReportTaskRecord {
  return {
    ...record,
    status: record.status,
  };
}

function monthRange(month: string): { gte: Date; lt: Date } {
  const startAt = new Date(`${month}-01T00:00:00.000Z`);
  const endAt = new Date(startAt);
  endAt.setUTCMonth(endAt.getUTCMonth() + 1);

  return {
    gte: startAt,
    lt: endAt,
  };
}
