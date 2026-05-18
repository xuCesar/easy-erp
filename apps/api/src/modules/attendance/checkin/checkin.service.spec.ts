import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { CheckinService } from './checkin.service';
import type {
  CheckinRecord,
  CheckinRepository,
  CreateCheckinInput,
} from './checkin.repository';
import type { AttendanceGroupRepository, AttendanceGroupRecord, AttendanceGroupMemberRecord } from '../../attendance-group';
import type { ShiftRepository, ShiftRecord } from '../../shift';
import type { EmployeeRepository, EmployeeRecord } from '../../employee';
import type { AuthPrincipal } from '../../../core/auth';

class FakeCheckinRepository implements CheckinRepository {
  readonly records = new Map<string, CheckinRecord>();

  constructor(records: CheckinRecord[] = []) {
    for (const record of records) {
      this.records.set(record.id, record);
    }
  }

  async findByIdempotencyKey(
    tenantId: string,
    employeeId: string,
    idempotencyKey: string,
  ): Promise<CheckinRecord | null> {
    return (
      [...this.records.values()].find(
        (record) =>
          record.tenantId === tenantId &&
          record.employeeId === employeeId &&
          record.idempotencyKey === idempotencyKey &&
          record.deletedAt === null,
      ) ?? null
    );
  }

  async create(input: CreateCheckinInput): Promise<CheckinRecord> {
    const record: CheckinRecord = {
      id: `record-${this.records.size + 1}`,
      tenantId: input.tenantId,
      factoryId: input.factoryId,
      employeeId: input.employeeId,
      checkinType: input.checkinType,
      checkinAt: input.checkinAt,
      clientEventAt: input.clientEventAt,
      method: input.method,
      latitude: input.latitude,
      longitude: input.longitude,
      wifiSsid: input.wifiSsid,
      wifiBssid: input.wifiBssid,
      photoUrl: input.photoUrl,
      deviceId: input.deviceId,
      idempotencyKey: input.idempotencyKey,
      isValid: input.isValid,
      invalidReason: input.invalidReason,
      rawData: input.rawData,
      createdAt: new Date('2026-05-18T00:00:00.000Z'),
      updatedAt: new Date('2026-05-18T00:00:00.000Z'),
      deletedAt: null,
    };
    this.records.set(record.id, record);

    return record;
  }

  async listByEmployeeAndWindow(
    tenantId: string,
    employeeId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<CheckinRecord[]> {
    return [...this.records.values()].filter(
      (record) =>
        record.tenantId === tenantId &&
        record.employeeId === employeeId &&
        record.checkinAt >= startAt &&
        record.checkinAt <= endAt &&
        record.deletedAt === null,
    );
  }
}

class FakeAttendanceGroupRepository
  implements Pick<AttendanceGroupRepository, 'findById' | 'findMemberByEmployeeAndDate'>
{
  constructor(
    private readonly groups: AttendanceGroupRecord[],
    private readonly members: AttendanceGroupMemberRecord[],
  ) {}

  async findById(tenantId: string, id: string): Promise<AttendanceGroupRecord | null> {
    return (
      this.groups.find(
        (group) => group.tenantId === tenantId && group.id === id && group.deletedAt === null,
      ) ?? null
    );
  }

  async findMemberByEmployeeAndDate(
    tenantId: string,
    employeeId: string,
    date: Date,
  ): Promise<AttendanceGroupMemberRecord | null> {
    return (
      this.members.find(
        (member) =>
          member.tenantId === tenantId &&
          member.employeeId === employeeId &&
          member.effectiveFrom <= date &&
          (!member.effectiveTo || member.effectiveTo >= date),
      ) ?? null
    );
  }
}

class FakeShiftRepository implements Pick<ShiftRepository, 'findById'> {
  constructor(private readonly shifts: ShiftRecord[]) {}

  async findById(tenantId: string, id: string): Promise<ShiftRecord | null> {
    return (
      this.shifts.find(
        (shift) => shift.tenantId === tenantId && shift.id === id && shift.deletedAt === null,
      ) ?? null
    );
  }
}

class FakeEmployeeRepository implements Pick<EmployeeRepository, 'findById'> {
  constructor(private readonly employees: EmployeeRecord[]) {}

  async findById(tenantId: string, id: string): Promise<EmployeeRecord | null> {
    return (
      this.employees.find(
        (employee) => employee.tenantId === tenantId && employee.id === id && employee.deletedAt === null,
      ) ?? null
    );
  }
}

describe('CheckinService', () => {
  it('returns check-in context with next action', async () => {
    const service = createService({
      records: [checkinRecord({ checkinType: 'CLOCK_IN', checkinAt: dateTime('2026-05-17T08:00:00.000Z') })],
    });

    const context = await service.getContext(principal(), '2026-05-17');

    expect(context).toMatchObject({
      date: '2026-05-17',
      shift: {
        id: 'shift-1',
        name: '白班',
      },
      attendanceGroup: {
        id: 'group-1',
      },
      status: {
        clockInAt: dateTime('2026-05-17T08:00:00.000Z'),
        clockOutAt: null,
        nextAction: 'CLOCK_OUT',
      },
    });
  });

  it('creates check-in record and returns first result for duplicate idempotency key', async () => {
    const repository = new FakeCheckinRepository();
    const service = createService({ repository });
    const request = {
      checkinType: 'CLOCK_IN' as const,
      clientEventAt: dateTime('2026-05-17T08:00:03.000Z'),
      idempotencyKey: 'device-uuid:2026-05-17:CLOCK_IN:nonce',
      location: {
        latitude: 30.1234567,
        longitude: 120.1234567,
      },
      wifi: {
        ssid: 'factory-wifi',
        bssid: '00:11:22:33:44:55',
      },
      deviceId: 'device-1',
      photoUrl: null,
    };

    const first = await service.checkin(principal(), request);
    const second = await service.checkin(principal(), request);

    expect(first.recordId).toBe(second.recordId);
    expect(repository.records.size).toBe(1);
  });

  it('marks check-in invalid when location is outside allowed radius', async () => {
    const service = createService();

    const result = await service.checkin(principal(), {
      checkinType: 'CLOCK_IN',
      clientEventAt: dateTime('2026-05-17T08:00:03.000Z'),
      idempotencyKey: 'device-uuid:2026-05-17:CLOCK_IN:outside',
      location: {
        latitude: 31,
        longitude: 121,
      },
      wifi: {
        ssid: 'factory-wifi',
        bssid: '00:11:22:33:44:55',
      },
      deviceId: 'device-1',
      photoUrl: null,
    });

    expect(result).toMatchObject({
      isValid: false,
      invalidReason: 'LOCATION_INVALID',
    });
  });

  it('rejects check-in when principal is not linked to employee', async () => {
    const service = createService();

    await expect(service.getContext({ ...principal(), employeeId: null }, '2026-05-17')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects check-in when employee has no attendance group for date', async () => {
    const service = createService({ members: [] });

    await expect(service.getContext(principal(), '2026-05-17')).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createService(options: {
  repository?: FakeCheckinRepository;
  records?: CheckinRecord[];
  groups?: AttendanceGroupRecord[];
  members?: AttendanceGroupMemberRecord[];
  shifts?: ShiftRecord[];
  employees?: EmployeeRecord[];
} = {}): CheckinService {
  return new CheckinService(
    options.repository ?? new FakeCheckinRepository(options.records),
    new FakeAttendanceGroupRepository(options.groups ?? [group()], options.members ?? [member()]),
    new FakeShiftRepository(options.shifts ?? [shift()]),
    new FakeEmployeeRepository(options.employees ?? [employee()]),
  );
}

function principal(): AuthPrincipal {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    employeeId: 'employee-1',
    roles: ['EMPLOYEE'],
    dataScopes: [{ type: 'EMPLOYEE', employeeId: 'employee-1' }],
  };
}

function group(overrides: Partial<AttendanceGroupRecord> = {}): AttendanceGroupRecord {
  return {
    id: 'group-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    name: '生产一组考勤',
    shiftId: 'shift-1',
    checkinMethods: ['GPS', 'WIFI'],
    gpsLat: 30.1234567,
    gpsLng: 120.1234567,
    gpsRadiusMeters: 200,
    wifiSsid: 'factory-wifi',
    wifiBssid: '00:11:22:33:44:55',
    requirePhoto: false,
    allowOutsideCheckin: false,
    createdAt: dateTime('2026-05-17T00:00:00.000Z'),
    updatedAt: dateTime('2026-05-17T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function member(overrides: Partial<AttendanceGroupMemberRecord> = {}): AttendanceGroupMemberRecord {
  return {
    id: 'member-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    employeeId: 'employee-1',
    attendanceGroupId: 'group-1',
    effectiveFrom: date('2026-05-01'),
    effectiveTo: null,
    createdBy: 'user-1',
    createdAt: dateTime('2026-05-17T00:00:00.000Z'),
    updatedAt: dateTime('2026-05-17T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function shift(overrides: Partial<ShiftRecord> = {}): ShiftRecord {
  return {
    id: 'shift-1',
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
    restStartTime: null,
    restEndTime: null,
    color: null,
    createdAt: dateTime('2026-05-17T00:00:00.000Z'),
    updatedAt: dateTime('2026-05-17T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function employee(overrides: Partial<EmployeeRecord> = {}): EmployeeRecord {
  return {
    id: 'employee-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    orgUnitId: null,
    empNo: 'E001',
    name: '张三',
    phone: '13800000000',
    entryDate: date('2026-05-01'),
    status: 'ACTIVE',
    createdAt: dateTime('2026-05-17T00:00:00.000Z'),
    updatedAt: dateTime('2026-05-17T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function checkinRecord(overrides: Partial<CheckinRecord> = {}): CheckinRecord {
  return {
    id: 'record-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    employeeId: 'employee-1',
    checkinType: 'CLOCK_IN',
    checkinAt: dateTime('2026-05-17T08:00:00.000Z'),
    clientEventAt: dateTime('2026-05-17T08:00:00.000Z'),
    method: 'GPS',
    latitude: 30.1234567,
    longitude: 120.1234567,
    wifiSsid: 'factory-wifi',
    wifiBssid: '00:11:22:33:44:55',
    photoUrl: null,
    deviceId: 'device-1',
    idempotencyKey: 'key-1',
    isValid: true,
    invalidReason: null,
    rawData: {},
    createdAt: dateTime('2026-05-17T00:00:00.000Z'),
    updatedAt: dateTime('2026-05-17T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function date(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateTime(value: string): Date {
  return new Date(value);
}
