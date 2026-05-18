import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export type ShiftRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  name: string;
  startTime: string;
  endTime: string;
  crossDay: boolean;
  workMinutes: number;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  overtimeStartMinutes: number;
  restStartTime: string | null;
  restEndTime: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateShiftInput = {
  tenantId: string;
  factoryId: string;
  name: string;
  startTime: string;
  endTime: string;
  crossDay: boolean;
  workMinutes: number;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  overtimeStartMinutes: number;
  restStartTime: string | null;
  restEndTime: string | null;
  color: string | null;
};

export type UpdateShiftInput = Partial<Omit<CreateShiftInput, 'tenantId'>>;

export interface ShiftRepository {
  listByFactory(tenantId: string, factoryId: string): Promise<ShiftRecord[]>;
  findById(tenantId: string, id: string): Promise<ShiftRecord | null>;
  create(input: CreateShiftInput): Promise<ShiftRecord>;
  update(tenantId: string, id: string, input: UpdateShiftInput): Promise<ShiftRecord>;
  softDelete(tenantId: string, id: string): Promise<void>;
}

@Injectable()
export class PrismaShiftRepository
  implements ShiftRepository, OnModuleInit, OnModuleDestroy
{
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async listByFactory(
    tenantId: string,
    factoryId: string,
  ): Promise<ShiftRecord[]> {
    const shifts = await this.prisma.shift.findMany({
      where: {
        tenantId,
        factoryId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return shifts.map(toShiftRecord);
  }

  async findById(tenantId: string, id: string): Promise<ShiftRecord | null> {
    const shift = await this.prisma.shift.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    return shift ? toShiftRecord(shift) : null;
  }

  async create(input: CreateShiftInput): Promise<ShiftRecord> {
    const shift = await this.prisma.shift.create({
      data: {
        tenantId: input.tenantId,
        factoryId: input.factoryId,
        name: input.name,
        startTime: timeToDate(input.startTime),
        endTime: timeToDate(input.endTime),
        crossDay: input.crossDay,
        workMinutes: input.workMinutes,
        lateGraceMinutes: input.lateGraceMinutes,
        earlyLeaveGraceMinutes: input.earlyLeaveGraceMinutes,
        overtimeStartMinutes: input.overtimeStartMinutes,
        restStartTime: input.restStartTime ? timeToDate(input.restStartTime) : null,
        restEndTime: input.restEndTime ? timeToDate(input.restEndTime) : null,
        color: input.color,
      },
    });

    return toShiftRecord(shift);
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateShiftInput,
  ): Promise<ShiftRecord> {
    await this.assertExists(tenantId, id);
    const shift = await this.prisma.shift.update({
      where: {
        id,
      },
      data: {
        ...input,
        startTime: input.startTime ? timeToDate(input.startTime) : undefined,
        endTime: input.endTime ? timeToDate(input.endTime) : undefined,
        restStartTime:
          input.restStartTime === undefined
            ? undefined
            : input.restStartTime
              ? timeToDate(input.restStartTime)
              : null,
        restEndTime:
          input.restEndTime === undefined
            ? undefined
            : input.restEndTime
              ? timeToDate(input.restEndTime)
              : null,
      },
    });

    return toShiftRecord(shift);
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.assertExists(tenantId, id);
    await this.prisma.shift.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  private async assertExists(tenantId: string, id: string): Promise<void> {
    const count = await this.prisma.shift.count({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (count === 0) {
      throw new Error('Shift not found.');
    }
  }
}

type PrismaShiftRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  name: string;
  startTime: Date;
  endTime: Date;
  crossDay: boolean;
  workMinutes: number;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  overtimeStartMinutes: number;
  restStartTime: Date | null;
  restEndTime: Date | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function toShiftRecord(record: PrismaShiftRecord): ShiftRecord {
  return {
    ...record,
    startTime: dateToTime(record.startTime),
    endTime: dateToTime(record.endTime),
    restStartTime: record.restStartTime ? dateToTime(record.restStartTime) : null,
    restEndTime: record.restEndTime ? dateToTime(record.restEndTime) : null,
  };
}

function timeToDate(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function dateToTime(value: Date): string {
  return value.toISOString().slice(11, 16);
}
