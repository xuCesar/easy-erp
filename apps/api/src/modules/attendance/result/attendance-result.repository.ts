import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { AttendanceCalculationResult } from '../calculator/attendance-calculator.types';

export type AttendanceResultDisplayStatus =
  | 'NORMAL'
  | 'LATE'
  | 'EARLY_LEAVE'
  | 'ABSENT'
  | 'LEAVE'
  | 'MISSING_CLOCK';

export type AttendanceResultRecord = AttendanceCalculationResult & {
  id: string;
  isFinalized: boolean;
  finalizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type AttendanceResultRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  empNo: string;
  date: string;
  primaryStatus: AttendanceResultDisplayStatus;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  workMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  isFinalized: boolean;
};

export type AttendanceResultListQuery = {
  tenantId: string;
  factoryId?: string;
  employeeId?: string;
  orgUnitId?: string | null;
  startDate: string;
  endDate: string;
  primaryStatus?: AttendanceResultDisplayStatus;
  page: number;
  pageSize: number;
};

export interface AttendanceResultRepository {
  findByEmployeeAndDate(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<AttendanceResultRecord | null>;
  list(
    query: AttendanceResultListQuery,
  ): Promise<{ items: AttendanceResultRow[]; total: number }>;
  upsert(input: AttendanceCalculationResult): Promise<AttendanceResultRecord>;
}

@Injectable()
export class PrismaAttendanceResultRepository
  implements AttendanceResultRepository, OnModuleInit, OnModuleDestroy
{
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async findByEmployeeAndDate(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<AttendanceResultRecord | null> {
    const result = await this.prisma.attendanceResult.findFirst({
      where: {
        tenantId,
        employeeId,
        date: dateOnly(date),
        deletedAt: null,
      },
    });

    return result ? toAttendanceResultRecord(result) : null;
  }

  async list(
    query: AttendanceResultListQuery,
  ): Promise<{ items: AttendanceResultRow[]; total: number }> {
    const where = {
      tenantId: query.tenantId,
      deletedAt: null,
      date: dateRange(query.startDate, query.endDate),
      ...(query.factoryId ? { factoryId: query.factoryId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.primaryStatus ? statusWhere(query.primaryStatus) : {}),
      employee: {
        deletedAt: null,
        ...(query.orgUnitId ? { orgUnitId: query.orgUnitId } : {}),
      },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.attendanceResult.findMany({
        where,
        include: {
          employee: {
            select: {
              name: true,
              empNo: true,
            },
          },
        },
        orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.attendanceResult.count({ where }),
    ]);

    return {
      items: items.map(toAttendanceResultRow),
      total,
    };
  }

  async upsert(
    input: AttendanceCalculationResult,
  ): Promise<AttendanceResultRecord> {
    const date = dateOnly(input.date);
    const result = await this.prisma.attendanceResult.upsert({
      where: {
        tenantId_employeeId_date: {
          tenantId: input.tenantId,
          employeeId: input.employeeId,
          date,
        },
      },
      create: toPrismaWrite(input, date),
      update: toPrismaWrite(input, date),
    });

    return toAttendanceResultRecord(result);
  }
}

type PrismaAttendanceResultRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  employeeId: string;
  attendanceGroupId: string;
  shiftId: string;
  date: Date;
  clockInRecordId: string | null;
  clockOutRecordId: string | null;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  workMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  absenceMinutes: number;
  overtimeMinutes: number;
  primaryStatus: AttendanceResultRecord['primaryStatus'];
  statusFlags: string[];
  anomalyFlags: string[];
  calculatedAt: Date;
  calculationVersion: number;
  isFinalized: boolean;
  finalizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type PrismaAttendanceResultRowRecord = PrismaAttendanceResultRecord & {
  employee: {
    name: string;
    empNo: string;
  };
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

export function toAttendanceResultRow(
  record: PrismaAttendanceResultRowRecord,
): AttendanceResultRow {
  return {
    id: record.id,
    employeeId: record.employeeId,
    employeeName: record.employee.name,
    empNo: record.employee.empNo,
    date: record.date.toISOString().slice(0, 10),
    primaryStatus: toDisplayStatus(record),
    clockInAt: record.clockInAt,
    clockOutAt: record.clockOutAt,
    workMinutes: record.workMinutes,
    lateMinutes: record.lateMinutes,
    earlyLeaveMinutes: record.earlyLeaveMinutes,
    isFinalized: record.isFinalized,
  };
}

function toDisplayStatus(
  record: Pick<
    PrismaAttendanceResultRecord,
    | 'primaryStatus'
    | 'statusFlags'
    | 'anomalyFlags'
    | 'absenceMinutes'
  >,
): AttendanceResultDisplayStatus {
  if (record.anomalyFlags.includes('NO_CLOCK_IN') || record.anomalyFlags.includes('NO_CLOCK_OUT')) {
    return 'MISSING_CLOCK';
  }

  if (record.statusFlags.includes('LATE')) {
    return 'LATE';
  }

  if (record.statusFlags.includes('EARLY_LEAVE')) {
    return 'EARLY_LEAVE';
  }

  if (record.primaryStatus === 'LEAVE') {
    return 'LEAVE';
  }

  if (record.primaryStatus === 'ABNORMAL' || record.absenceMinutes > 0) {
    return 'ABSENT';
  }

  return 'NORMAL';
}

function dateRange(startDate: string, endDate: string): { gte: Date; lte: Date } {
  return {
    gte: dateOnly(startDate),
    lte: dateOnly(endDate),
  };
}

function statusWhere(status: AttendanceResultDisplayStatus): object {
  switch (status) {
    case 'NORMAL':
      return {
        primaryStatus: 'NORMAL',
        statusFlags: { isEmpty: true },
        anomalyFlags: { isEmpty: true },
      };
    case 'LATE':
      return { statusFlags: { has: 'LATE' } };
    case 'EARLY_LEAVE':
      return { statusFlags: { has: 'EARLY_LEAVE' } };
    case 'LEAVE':
      return { primaryStatus: 'LEAVE' };
    case 'MISSING_CLOCK':
      return { anomalyFlags: { hasSome: ['NO_CLOCK_IN', 'NO_CLOCK_OUT'] } };
    case 'ABSENT':
      return {
        primaryStatus: 'ABNORMAL',
        absenceMinutes: { gt: 0 },
      };
  }
}

function toPrismaWrite(
  input: AttendanceCalculationResult,
  date: Date,
): Omit<PrismaAttendanceResultRecord, 'id' | 'isFinalized' | 'finalizedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  return {
    tenantId: input.tenantId,
    factoryId: input.factoryId,
    employeeId: input.employeeId,
    attendanceGroupId: input.attendanceGroupId,
    shiftId: input.shiftId,
    date,
    clockInRecordId: input.clockInRecordId,
    clockOutRecordId: input.clockOutRecordId,
    clockInAt: input.clockInAt,
    clockOutAt: input.clockOutAt,
    workMinutes: input.workMinutes,
    lateMinutes: input.lateMinutes,
    earlyLeaveMinutes: input.earlyLeaveMinutes,
    absenceMinutes: input.absenceMinutes,
    overtimeMinutes: input.overtimeMinutes,
    primaryStatus: input.primaryStatus,
    statusFlags: input.statusFlags,
    anomalyFlags: input.anomalyFlags,
    calculatedAt: input.calculatedAt,
    calculationVersion: input.calculationVersion,
  };
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
