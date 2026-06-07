import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PermissionService } from '../../../core/permission';
import type { AuthPrincipal } from '../../../core/auth/auth.types';
import type { EmployeeRecord } from '../../employee';
import type {
  AttendanceCalculationInput,
  AttendanceCalculationResult,
} from '../calculator/attendance-calculator.types';
import { AttendanceResultService } from './attendance-result.service';
import type {
  AttendanceResultRecord,
  AttendanceResultRow,
  AttendanceResultRepository,
} from './attendance-result.repository';

describe('AttendanceResultService', () => {
  it('lets employee query only own attendance results without factoryId', async () => {
    const repository = new FakeAttendanceResultRepository({
      rows: [attendanceResultRow()],
    });
    const service = createService(repository);

    const page = await service.list(employeePrincipal(), {
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      page: 1,
      pageSize: 20,
    });

    expect(repository.lastListQuery).toMatchObject({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      employeeId: 'employee-1',
    });
    expect(page).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    expect(page.items[0]).toMatchObject({
      employeeName: '张三',
      empNo: 'EMP001',
      clockInAt: '2026-05-17T00:00:00.000Z',
    });
  });

  it('rejects employee querying another employee result', async () => {
    const service = createService();

    await expect(
      service.list(employeePrincipal(), {
        employeeId: 'employee-2',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets tenant admin query paginated attendance results by factory', async () => {
    const repository = new FakeAttendanceResultRepository({
      rows: [attendanceResultRow({ employeeId: 'employee-2' })],
    });
    const service = createService(repository);

    const page = await service.list(adminPrincipal(), {
      factoryId: 'factory-1',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      page: 2,
      pageSize: 1,
    });

    expect(repository.lastListQuery).toMatchObject({
      tenantId: 'tenant-1',
      factoryId: 'factory-1',
      page: 2,
      pageSize: 1,
    });
    expect(page.totalPages).toBe(1);
  });

  it('rejects invalid date range for attendance result query', async () => {
    const service = createService();

    await expect(
      service.list(employeePrincipal(), {
        startDate: '2026-05-31',
        endDate: '2026-05-01',
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recalculates and persists attendance result', async () => {
    const repository = new FakeAttendanceResultRepository();
    const service = createService(repository);

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
    const service = createService(repository);

    await expect(service.recalculate(dayShiftInput())).rejects.toThrow(
      ConflictException,
    );
    expect(repository.upserted).toBeNull();
  });
});

class FakeAttendanceResultRepository implements AttendanceResultRepository {
  upserted: AttendanceCalculationResult | null = null;
  lastListQuery: Parameters<AttendanceResultRepository['list']>[0] | null = null;

  constructor(
    private readonly options: {
      existing?: AttendanceResultRecord | null;
      rows?: AttendanceResultRow[];
    } = {},
  ) {}

  async findByEmployeeAndDate(): Promise<AttendanceResultRecord | null> {
    return this.options.existing ?? null;
  }

  async list(
    query: Parameters<AttendanceResultRepository['list']>[0],
  ): ReturnType<AttendanceResultRepository['list']> {
    this.lastListQuery = query;

    return {
      items: this.options.rows ?? [],
      total: this.options.rows?.length ?? 0,
    };
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
}

class FakeEmployeeRepository {
  constructor(
    private readonly employees: EmployeeRecord[] = [
      employeeRecord({ id: 'employee-1' }),
      employeeRecord({ id: 'employee-2', empNo: 'EMP002', name: '李四' }),
    ],
  ) {}

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

function createService(
  repository: AttendanceResultRepository = new FakeAttendanceResultRepository(),
): AttendanceResultService {
  return new AttendanceResultService(
    repository,
    new PermissionService(),
    new FakeEmployeeRepository(),
  );
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

function attendanceResultRow(
  overrides: Partial<AttendanceResultRow> = {},
): AttendanceResultRow {
  return {
    id: 'result-1',
    employeeId: 'employee-1',
    employeeName: '张三',
    empNo: 'EMP001',
    date: '2026-05-17',
    primaryStatus: 'NORMAL',
    clockInAt: new Date('2026-05-17T00:00:00.000Z'),
    clockOutAt: null,
    workMinutes: 540,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    isFinalized: false,
    ...overrides,
  };
}

function employeeRecord(overrides: Partial<EmployeeRecord> = {}): EmployeeRecord {
  return {
    id: 'employee-1',
    tenantId: 'tenant-1',
    factoryId: 'factory-1',
    orgUnitId: 'org-1',
    empNo: 'EMP001',
    name: '张三',
    phone: '13900000001',
    entryDate: new Date('2026-05-01T00:00:00.000Z'),
    status: 'ACTIVE',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function employeePrincipal(): AuthPrincipal {
  return {
    id: 'account-employee-1',
    tenantId: 'tenant-1',
    employeeId: 'employee-1',
    roles: ['EMPLOYEE'],
    dataScopes: [{ type: 'EMPLOYEE', employeeId: 'employee-1' }],
  };
}

function adminPrincipal(): AuthPrincipal {
  return {
    id: 'account-admin-1',
    tenantId: 'tenant-1',
    employeeId: 'admin-employee-1',
    roles: ['TENANT_ADMIN'],
    dataScopes: [{ type: 'TENANT' }],
  };
}
