import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ShiftService } from './shift.service';
import type {
  CreateShiftInput,
  ShiftRecord,
  ShiftRepository,
  UpdateShiftInput,
} from './shift.repository';

class FakeShiftRepository implements ShiftRepository {
  private readonly shifts = new Map<string, ShiftRecord>();

  constructor(records: ShiftRecord[] = []) {
    for (const record of records) {
      this.shifts.set(record.id, record);
    }
  }

  async listByFactory(tenantId: string, factoryId: string): Promise<ShiftRecord[]> {
    return [...this.shifts.values()].filter(
      (shift) =>
        shift.tenantId === tenantId &&
        shift.factoryId === factoryId &&
        shift.deletedAt === null,
    );
  }

  async findById(tenantId: string, id: string): Promise<ShiftRecord | null> {
    const shift = this.shifts.get(id);

    return shift && shift.tenantId === tenantId && shift.deletedAt === null
      ? shift
      : null;
  }

  async create(input: CreateShiftInput): Promise<ShiftRecord> {
    const record: ShiftRecord = {
      id: `shift-${this.shifts.size + 1}`,
      tenantId: input.tenantId,
      factoryId: input.factoryId,
      name: input.name,
      startTime: input.startTime,
      endTime: input.endTime,
      crossDay: input.crossDay,
      workMinutes: input.workMinutes,
      lateGraceMinutes: input.lateGraceMinutes,
      earlyLeaveGraceMinutes: input.earlyLeaveGraceMinutes,
      overtimeStartMinutes: input.overtimeStartMinutes,
      restStartTime: input.restStartTime,
      restEndTime: input.restEndTime,
      color: input.color,
      createdAt: new Date('2026-05-18T00:00:00.000Z'),
      updatedAt: new Date('2026-05-18T00:00:00.000Z'),
      deletedAt: null,
    };
    this.shifts.set(record.id, record);

    return record;
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateShiftInput,
  ): Promise<ShiftRecord> {
    const current = await this.findById(tenantId, id);

    if (!current) {
      throw new Error('Shift not found.');
    }

    const next = {
      ...current,
      ...input,
      updatedAt: new Date('2026-05-19T00:00:00.000Z'),
    };
    this.shifts.set(id, next);

    return next;
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    const current = await this.findById(tenantId, id);

    if (!current) {
      throw new Error('Shift not found.');
    }

    this.shifts.set(id, {
      ...current,
      deletedAt: new Date('2026-05-20T00:00:00.000Z'),
    });
  }
}

describe('ShiftService', () => {
  it('creates a normal day shift', async () => {
    const service = new ShiftService(new FakeShiftRepository());

    const shift = await service.create({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      name: '白班',
      startTime: '08:00',
      endTime: '17:00',
      crossDay: false,
      workMinutes: 540,
      lateGraceMinutes: 5,
      earlyLeaveGraceMinutes: 0,
      overtimeStartMinutes: 30,
      restStartTime: '12:00',
      restEndTime: '13:00',
      color: '#1677ff',
    });

    expect(shift).toMatchObject({
      name: '白班',
      crossDay: false,
      workMinutes: 540,
    });
  });

  it('creates a cross-day shift when end time is earlier than start time', async () => {
    const service = new ShiftService(new FakeShiftRepository());

    const shift = await service.create({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      name: '夜班',
      startTime: '20:00',
      endTime: '08:00',
      crossDay: true,
      workMinutes: 720,
      lateGraceMinutes: 5,
      earlyLeaveGraceMinutes: 0,
      overtimeStartMinutes: 30,
      restStartTime: null,
      restEndTime: null,
      color: null,
    });

    expect(shift.crossDay).toBe(true);
  });

  it('rejects same-day shifts whose end time is not after start time', async () => {
    const service = new ShiftService(new FakeShiftRepository());

    await expect(
      service.create({
        tenantId: 'tenant-1',
        factoryId: 'factory-1',
        name: '错误班次',
        startTime: '20:00',
        endTime: '08:00',
        crossDay: false,
        workMinutes: 720,
        lateGraceMinutes: 5,
        earlyLeaveGraceMinutes: 0,
        overtimeStartMinutes: 30,
        restStartTime: null,
        restEndTime: null,
        color: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
