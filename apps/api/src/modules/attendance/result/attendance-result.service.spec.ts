import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type {
  AttendanceCalculationInput,
  AttendanceCalculationResult,
} from '../calculator/attendance-calculator.types';
import { AttendanceResultService } from './attendance-result.service';
import type {
  AttendanceResultListItem,
  AttendanceResultListQuery,
  AttendanceResultRecord,
  AttendanceResultRepository,
} from './attendance-result.repository';

describe('AttendanceResultService', () => {
  it('recalculates and persists attendance result', async () => {
    const repository = new FakeAttendanceResultRepository();
    const service = new AttendanceResultService(repository);

    const result = await service.recalculate(dayShiftInput());

    expect(result).toMatchObject({
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      date: '2026-05-17',
      primaryStatus: 'NORMAL',
      workMinutes: 540,
    });
    expect(repository.upserted).toMatchObject({
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      date: '2026-05-17',
      primaryStatus: 'NORMAL',
    });
  });

  it('C018 rejects recalculation when attendance result is finalized', async () => {
    const repository = new FakeAttendanceResultRepository({
      existing: {
        ...baseResultRecord(),
        isFinalized: true,
        finalizedAt: new Date('2026-05-31T10:00:00.000Z'),
      },
    });
    const service = new AttendanceResultService(repository);

    await expect(service.recalculate(dayShiftInput())).rejects.toThrow(
      ConflictException,
    );
    expect(repository.upserted).toBeNull();
  });
});

class FakeAttendanceResultRepository implements AttendanceResultRepository {
  upserted: AttendanceCalculationResult | null = null;

  constructor(
    private readonly options: { existing?: AttendanceResultRecord | null } = {},
  ) {}

  async findByEmployeeAndDate(): Promise<AttendanceResultRecord | null> {
    return this.options.existing ?? null;
  }

  async upsert(
    input: AttendanceCalculationResult,
  ): Promise<AttendanceResultRecord> {
    this.upserted = input;

    return {
      ...baseResultRecord(),
      ...input,
    };
  }

  async list(
    _tenantId: string,
    _query: AttendanceResultListQuery,
  ): Promise<{ items: AttendanceResultListItem[]; total: number }> {
    return { items: [], total: 0 };
  }
}

function dayShiftInput(): AttendanceCalculationInput {
  return {
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    employeeId: 'employee-1',
    attendanceGroupId: 'group-1',
    shiftId: 'shift-1',
    date: '2026-05-17',
    shift: {
      startTime: '08:00',
      endTime: '17:00',
      crossDay: false,
      workMinutes: 540,
      lateGraceMinutes: 5,
      earlyLeaveGraceMinutes: 0,
      overtimeStartMinutes: 30,
    },
    records: [
      {
        id: 'clock-in-1',
        checkinType: 'CLOCK_IN',
        checkinAt: new Date('2026-05-17T08:00:00.000Z'),
        method: 'GPS',
        isValid: true,
        invalidReason: null,
        deviceMatched: true,
      },
      {
        id: 'clock-out-1',
        checkinType: 'CLOCK_OUT',
        checkinAt: new Date('2026-05-17T17:00:00.000Z'),
        method: 'GPS',
        isValid: true,
        invalidReason: null,
        deviceMatched: true,
      },
    ],
    leaves: [],
    calculatedAt: new Date('2026-05-17T18:00:00.000Z'),
  };
}

function baseResultRecord(): AttendanceResultRecord {
  return {
    id: 'result-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    employeeId: 'employee-1',
    attendanceGroupId: 'group-1',
    shiftId: 'shift-1',
    date: '2026-05-17',
    clockInRecordId: null,
    clockOutRecordId: null,
    clockInAt: null,
    clockOutAt: null,
    workMinutes: 0,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    absenceMinutes: 0,
    overtimeMinutes: 0,
    primaryStatus: 'NORMAL',
    statusFlags: [],
    anomalyFlags: [],
    calculatedAt: new Date('2026-05-17T18:00:00.000Z'),
    calculationVersion: 1,
    isFinalized: false,
    finalizedAt: null,
    createdAt: new Date('2026-05-17T18:00:00.000Z'),
    updatedAt: new Date('2026-05-17T18:00:00.000Z'),
    deletedAt: null,
  };
}
