import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AttendanceGroupService } from './attendance-group.service';
import type {
  AddAttendanceGroupMembersInput,
  AttendanceGroupMemberRecord,
  AttendanceGroupRecord,
  AttendanceGroupRepository,
  CreateAttendanceGroupInput,
  UpdateAttendanceGroupInput,
} from './attendance-group.repository';
import type { ShiftRepository, ShiftRecord } from '../shift';
import type { EmployeeRepository, EmployeeRecord } from '../employee';

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
        (employee) =>
          employee.tenantId === tenantId &&
          employee.id === id &&
          employee.deletedAt === null,
      ) ?? null
    );
  }
}

class FakeAttendanceGroupRepository implements AttendanceGroupRepository {
  readonly groups = new Map<string, AttendanceGroupRecord>();
  readonly members = new Map<string, AttendanceGroupMemberRecord>();

  constructor(
    groups: AttendanceGroupRecord[] = [],
    members: AttendanceGroupMemberRecord[] = [],
  ) {
    for (const group of groups) {
      this.groups.set(group.id, group);
    }

    for (const member of members) {
      this.members.set(member.id, member);
    }
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<AttendanceGroupRecord | null> {
    const group = this.groups.get(id);

    return group && group.tenantId === tenantId && group.deletedAt === null
      ? group
      : null;
  }

  async listByFactory(
    tenantId: string,
    factoryId: string,
  ): Promise<AttendanceGroupRecord[]> {
    return [...this.groups.values()].filter(
      (group) =>
        group.tenantId === tenantId &&
        group.factoryId === factoryId &&
        group.deletedAt === null,
    );
  }

  async create(input: CreateAttendanceGroupInput): Promise<AttendanceGroupRecord> {
    const record: AttendanceGroupRecord = {
      id: `group-${this.groups.size + 1}`,
      tenantId: input.tenantId,
      factoryId: input.factoryId,
      name: input.name,
      shiftId: input.shiftId,
      checkinMethods: input.checkinMethods,
      gpsLat: input.gpsLat,
      gpsLng: input.gpsLng,
      gpsRadiusMeters: input.gpsRadiusMeters,
      wifiSsid: input.wifiSsid,
      wifiBssid: input.wifiBssid,
      requirePhoto: input.requirePhoto,
      allowOutsideCheckin: input.allowOutsideCheckin,
      createdAt: new Date('2026-05-18T00:00:00.000Z'),
      updatedAt: new Date('2026-05-18T00:00:00.000Z'),
      deletedAt: null,
    };
    this.groups.set(record.id, record);

    return record;
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateAttendanceGroupInput,
  ): Promise<AttendanceGroupRecord> {
    const current = await this.findById(tenantId, id);

    if (!current) {
      throw new Error('Attendance group not found.');
    }

    const next = {
      ...current,
      ...input,
      updatedAt: new Date('2026-05-19T00:00:00.000Z'),
    };
    this.groups.set(id, next);

    return next;
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    const current = await this.findById(tenantId, id);

    if (!current) {
      throw new Error('Attendance group not found.');
    }

    this.groups.set(id, {
      ...current,
      deletedAt: new Date('2026-05-20T00:00:00.000Z'),
    });
  }

  async addMembers(
    input: AddAttendanceGroupMembersInput,
  ): Promise<AttendanceGroupMemberRecord[]> {
    for (const member of this.members.values()) {
      if (
        member.tenantId === input.tenantId &&
        input.employeeIds.includes(member.employeeId) &&
        member.effectiveTo === null &&
        member.deletedAt === null
      ) {
        member.effectiveTo = previousDate(input.effectiveFrom);
      }
    }

    const created = input.employeeIds.map((employeeId, index) => {
      const record: AttendanceGroupMemberRecord = {
        id: `member-${this.members.size + index + 1}`,
        tenantId: input.tenantId,
        factoryId: input.factoryId,
        employeeId,
        attendanceGroupId: input.attendanceGroupId,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: null,
        createdBy: input.createdBy,
        createdAt: new Date('2026-05-18T00:00:00.000Z'),
        updatedAt: new Date('2026-05-18T00:00:00.000Z'),
        deletedAt: null,
      };
      this.members.set(record.id, record);
      return record;
    });

    return created;
  }

  async findMemberByEmployeeAndDate(
    tenantId: string,
    employeeId: string,
    date: Date,
  ): Promise<AttendanceGroupMemberRecord | null> {
    return (
      [...this.members.values()].find(
        (member) =>
          member.tenantId === tenantId &&
          member.employeeId === employeeId &&
          member.deletedAt === null &&
          member.effectiveFrom <= date &&
          (!member.effectiveTo || member.effectiveTo >= date),
      ) ?? null
    );
  }
}

describe('AttendanceGroupService', () => {
  it('creates attendance group bound to a shift in the same factory', async () => {
    const service = createService({
      shifts: [shift({ id: 'shift-1', factoryId: 'factory-1' })],
    });

    const group = await service.create({
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
    });

    expect(group).toMatchObject({
      factoryId: 'factory-1',
      shiftId: 'shift-1',
      checkinMethods: ['GPS', 'WIFI'],
    });
  });

  it('rejects attendance group when shift belongs to another factory', async () => {
    const service = createService({
      shifts: [shift({ id: 'shift-2', factoryId: 'factory-2' })],
    });

    await expect(
      service.create({
        tenantId: 'tenant-1',
        factoryId: 'factory-1',
        name: '错误考勤组',
        shiftId: 'shift-2',
        checkinMethods: ['GPS'],
        gpsLat: null,
        gpsLng: null,
        gpsRadiusMeters: null,
        wifiSsid: null,
        wifiBssid: null,
        requirePhoto: false,
        allowOutsideCheckin: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires GPS coordinates when GPS check-in is enabled', async () => {
    const service = createService({
      shifts: [shift({ id: 'shift-1', factoryId: 'factory-1' })],
    });

    await expect(
      service.create({
        tenantId: 'tenant-1',
        factoryId: 'factory-1',
        name: 'GPS 考勤组',
        shiftId: 'shift-1',
        checkinMethods: ['GPS'],
        gpsLat: null,
        gpsLng: null,
        gpsRadiusMeters: null,
        wifiSsid: null,
        wifiBssid: null,
        requirePhoto: false,
        allowOutsideCheckin: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates attendance group settings when the new shift is in the same factory', async () => {
    const repository = new FakeAttendanceGroupRepository([
      group({ id: 'group-1', factoryId: 'factory-1', shiftId: 'shift-1' }),
    ]);
    const service = createService({
      repository,
      shifts: [shift({ id: 'shift-2', factoryId: 'factory-1' })],
    });

    const updated = await service.update('tenant-1', 'group-1', {
      name: '生产二组考勤',
      shiftId: 'shift-2',
      checkinMethods: ['WIFI'],
      wifiSsid: 'factory-wifi',
      wifiBssid: '00:11:22:33:44:55',
    });

    expect(updated).toMatchObject({
      name: '生产二组考勤',
      shiftId: 'shift-2',
      checkinMethods: ['WIFI'],
    });
  });

  it('soft deletes attendance group', async () => {
    const repository = new FakeAttendanceGroupRepository([
      group({ id: 'group-1', factoryId: 'factory-1' }),
    ]);
    const service = createService({ repository });

    await service.remove('tenant-1', 'group-1');

    expect(repository.groups.get('group-1')?.deletedAt).toEqual(
      new Date('2026-05-20T00:00:00.000Z'),
    );
  });

  it('closes previous effective membership when adding employee to a new group', async () => {
    const repository = new FakeAttendanceGroupRepository(
      [
        group({ id: 'group-old', factoryId: 'factory-1' }),
        group({ id: 'group-new', factoryId: 'factory-1' }),
      ],
      [
        member({
          id: 'member-old',
          employeeId: 'employee-1',
          attendanceGroupId: 'group-old',
          effectiveFrom: date('2026-05-01'),
          effectiveTo: null,
        }),
      ],
    );
    const service = createService({
      repository,
      employees: [employee({ id: 'employee-1', factoryId: 'factory-1' })],
    });

    await service.addMembers({
      tenantId: 'tenant-1',
      attendanceGroupId: 'group-new',
      employeeIds: ['employee-1'],
      effectiveFrom: date('2026-05-17'),
      createdBy: 'user-1',
    });

    expect(repository.members.get('member-old')?.effectiveTo).toEqual(
      date('2026-05-16'),
    );
    await expect(
      service.findMemberByEmployeeAndDate('tenant-1', 'employee-1', date('2026-05-18')),
    ).resolves.toMatchObject({
      attendanceGroupId: 'group-new',
    });
  });
});

function createService(options: {
  repository?: FakeAttendanceGroupRepository;
  shifts?: ShiftRecord[];
  employees?: EmployeeRecord[];
} = {}): AttendanceGroupService {
  return new AttendanceGroupService(
    options.repository ?? new FakeAttendanceGroupRepository(),
    new FakeShiftRepository(options.shifts ?? []),
    new FakeEmployeeRepository(options.employees ?? []),
  );
}

function shift(overrides: Partial<ShiftRecord>): ShiftRecord {
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
    createdAt: new Date('2026-05-18T00:00:00.000Z'),
    updatedAt: new Date('2026-05-18T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function group(overrides: Partial<AttendanceGroupRecord>): AttendanceGroupRecord {
  return {
    id: 'group-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    name: '考勤组',
    shiftId: 'shift-1',
    checkinMethods: ['GPS'],
    gpsLat: 30,
    gpsLng: 120,
    gpsRadiusMeters: 200,
    wifiSsid: null,
    wifiBssid: null,
    requirePhoto: false,
    allowOutsideCheckin: false,
    createdAt: new Date('2026-05-18T00:00:00.000Z'),
    updatedAt: new Date('2026-05-18T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function member(
  overrides: Partial<AttendanceGroupMemberRecord>,
): AttendanceGroupMemberRecord {
  return {
    id: 'member-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    employeeId: 'employee-1',
    attendanceGroupId: 'group-1',
    effectiveFrom: date('2026-05-01'),
    effectiveTo: null,
    createdBy: 'user-1',
    createdAt: new Date('2026-05-18T00:00:00.000Z'),
    updatedAt: new Date('2026-05-18T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function employee(overrides: Partial<EmployeeRecord>): EmployeeRecord {
  return {
    id: 'employee-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    orgUnitId: null,
    empNo: 'E001',
    name: '员工',
    phone: null,
    entryDate: date('2026-05-01'),
    status: 'ACTIVE',
    createdAt: new Date('2026-05-18T00:00:00.000Z'),
    updatedAt: new Date('2026-05-18T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function previousDate(value: Date): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() - 1);
  return next;
}

function date(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
