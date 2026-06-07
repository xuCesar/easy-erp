import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { AttendanceCalculationResult } from '../calculator/attendance-calculator.types';

export type AttendanceResultRecord = AttendanceCalculationResult & {
  id: string;
  isFinalized: boolean;
  finalizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export interface AttendanceResultRepository {
  findByEmployeeAndDate(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<AttendanceResultRecord | null>;
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
