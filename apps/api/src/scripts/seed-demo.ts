import {
  AttendancePrimaryStatus,
  CheckinMethod,
  CheckinType,
  DataScopeType,
  EmployeeStatus,
  EntityStatus,
  PrismaClient,
  RoleName,
} from '@prisma/client';
import { PasswordService } from '../core/auth/password.service';

const prisma = new PrismaClient();
const passwordService = new PasswordService();

const demo = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  factoryId: '22222222-2222-4222-8222-222222222222',
  orgUnitId: '33333333-3333-4333-8333-333333333333',
  adminAccountId: '44444444-4444-4444-8444-444444444444',
  adminEmployeeId: '55555555-5555-4555-8555-555555555555',
  workerAccountId: '56565656-5656-4656-8656-565656565656',
  workerEmployeeId: '66666666-6666-4666-8666-666666666666',
  shiftId: '77777777-7777-4777-8777-777777777777',
  attendanceGroupId: '88888888-8888-4888-8888-888888888888',
  groupMemberAdminId: '99999999-9999-4999-8999-999999999999',
  groupMemberWorkerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  clockInRecordId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  clockOutRecordId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  attendanceResultId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  adminTenantScopeId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  workerEmployeeScopeId: 'efefefef-efef-4fef-8fef-efefefefefef',
} as const;

const adminPhone = process.env.DEMO_ADMIN_PHONE ?? '13800000000';
const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? 'EasyERP@demo123';
const employeePhone = process.env.DEMO_EMPLOYEE_PHONE ?? '13900000001';
const employeePassword = process.env.DEMO_EMPLOYEE_PASSWORD ?? 'EasyERP@demo123';

async function main(): Promise<void> {
  const adminPasswordHash = await passwordService.hashPassword(adminPassword);
  const employeePasswordHash = await passwordService.hashPassword(employeePassword);

  await prisma.$transaction(async (tx) => {
    await tx.tenant.upsert({
      where: { id: demo.tenantId },
      create: {
        id: demo.tenantId,
        name: '示例工厂企业',
        status: EntityStatus.ACTIVE,
      },
      update: {
        name: '示例工厂企业',
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
    });

    await tx.factory.upsert({
      where: { id: demo.factoryId },
      create: {
        id: demo.factoryId,
        tenantId: demo.tenantId,
        name: '杭州一厂',
        address: '杭州市示例工业园 1 号',
        timezone: 'Asia/Shanghai',
        status: EntityStatus.ACTIVE,
      },
      update: {
        name: '杭州一厂',
        address: '杭州市示例工业园 1 号',
        timezone: 'Asia/Shanghai',
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
    });

    await tx.orgUnit.upsert({
      where: { id: demo.orgUnitId },
      create: {
        id: demo.orgUnitId,
        tenantId: demo.tenantId,
        factoryId: demo.factoryId,
        name: '生产一组',
        type: 'GROUP',
        sortOrder: 10,
        status: EntityStatus.ACTIVE,
      },
      update: {
        name: '生产一组',
        type: 'GROUP',
        sortOrder: 10,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
    });

    await tx.employee.upsert({
      where: { id: demo.adminEmployeeId },
      create: {
        id: demo.adminEmployeeId,
        tenantId: demo.tenantId,
        factoryId: demo.factoryId,
        orgUnitId: demo.orgUnitId,
        empNo: 'ADMIN001',
        name: '试点管理员',
        phone: adminPhone,
        entryDate: dateOnly('2026-05-01'),
        status: EmployeeStatus.ACTIVE,
      },
      update: {
        factoryId: demo.factoryId,
        orgUnitId: demo.orgUnitId,
        name: '试点管理员',
        phone: adminPhone,
        status: EmployeeStatus.ACTIVE,
        deletedAt: null,
      },
    });

    await tx.employee.upsert({
      where: { id: demo.workerEmployeeId },
      create: {
        id: demo.workerEmployeeId,
        tenantId: demo.tenantId,
        factoryId: demo.factoryId,
        orgUnitId: demo.orgUnitId,
        empNo: 'EMP001',
        name: '张三',
        phone: employeePhone,
        entryDate: dateOnly('2026-05-01'),
        status: EmployeeStatus.ACTIVE,
      },
      update: {
        factoryId: demo.factoryId,
        orgUnitId: demo.orgUnitId,
        name: '张三',
        phone: employeePhone,
        status: EmployeeStatus.ACTIVE,
        deletedAt: null,
      },
    });

    await tx.accountUser.upsert({
      where: { id: demo.adminAccountId },
      create: {
        id: demo.adminAccountId,
        tenantId: demo.tenantId,
        employeeId: demo.adminEmployeeId,
        phone: adminPhone,
        passwordHash: adminPasswordHash,
        status: 'ACTIVE',
      },
      update: {
        employeeId: demo.adminEmployeeId,
        phone: adminPhone,
        passwordHash: adminPasswordHash,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    await tx.accountUser.upsert({
      where: { id: demo.workerAccountId },
      create: {
        id: demo.workerAccountId,
        tenantId: demo.tenantId,
        employeeId: demo.workerEmployeeId,
        phone: employeePhone,
        passwordHash: employeePasswordHash,
        status: 'ACTIVE',
      },
      update: {
        employeeId: demo.workerEmployeeId,
        phone: employeePhone,
        passwordHash: employeePasswordHash,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    await tx.accountRole.upsert({
      where: {
        tenantId_accountUserId_roleName: {
          tenantId: demo.tenantId,
          accountUserId: demo.adminAccountId,
          roleName: RoleName.TENANT_ADMIN,
        },
      },
      create: {
        tenantId: demo.tenantId,
        accountUserId: demo.adminAccountId,
        roleName: RoleName.TENANT_ADMIN,
      },
      update: {},
    });

    await tx.accountDataScope.upsert({
      where: { id: demo.adminTenantScopeId },
      create: {
        id: demo.adminTenantScopeId,
        tenantId: demo.tenantId,
        accountUserId: demo.adminAccountId,
        scopeType: DataScopeType.TENANT,
      },
      update: {
        tenantId: demo.tenantId,
        accountUserId: demo.adminAccountId,
        scopeType: DataScopeType.TENANT,
        factoryId: null,
        orgUnitId: null,
        employeeId: null,
      },
    });

    await tx.accountRole.upsert({
      where: {
        tenantId_accountUserId_roleName: {
          tenantId: demo.tenantId,
          accountUserId: demo.workerAccountId,
          roleName: RoleName.EMPLOYEE,
        },
      },
      create: {
        tenantId: demo.tenantId,
        accountUserId: demo.workerAccountId,
        roleName: RoleName.EMPLOYEE,
      },
      update: {},
    });

    await tx.accountDataScope.upsert({
      where: { id: demo.workerEmployeeScopeId },
      create: {
        id: demo.workerEmployeeScopeId,
        tenantId: demo.tenantId,
        accountUserId: demo.workerAccountId,
        scopeType: DataScopeType.EMPLOYEE,
        employeeId: demo.workerEmployeeId,
      },
      update: {
        tenantId: demo.tenantId,
        accountUserId: demo.workerAccountId,
        scopeType: DataScopeType.EMPLOYEE,
        factoryId: null,
        orgUnitId: null,
        employeeId: demo.workerEmployeeId,
      },
    });

    await tx.shift.upsert({
      where: { id: demo.shiftId },
      create: {
        id: demo.shiftId,
        tenantId: demo.tenantId,
        factoryId: demo.factoryId,
        name: '白班 08:00-17:00',
        startTime: timeOnly('08:00'),
        endTime: timeOnly('17:00'),
        crossDay: false,
        workMinutes: 540,
        lateGraceMinutes: 5,
        earlyLeaveGraceMinutes: 0,
        overtimeStartMinutes: 30,
        color: '#2563EB',
      },
      update: {
        name: '白班 08:00-17:00',
        startTime: timeOnly('08:00'),
        endTime: timeOnly('17:00'),
        crossDay: false,
        workMinutes: 540,
        lateGraceMinutes: 5,
        earlyLeaveGraceMinutes: 0,
        overtimeStartMinutes: 30,
        color: '#2563EB',
        deletedAt: null,
      },
    });

    await tx.attendanceGroup.upsert({
      where: { id: demo.attendanceGroupId },
      create: {
        id: demo.attendanceGroupId,
        tenantId: demo.tenantId,
        factoryId: demo.factoryId,
        name: '生产一组考勤',
        shiftId: demo.shiftId,
        checkinMethods: [CheckinMethod.GPS],
        gpsLat: '30.2741000',
        gpsLng: '120.1551000',
        gpsRadiusMeters: 300,
        requirePhoto: false,
        allowOutsideCheckin: true,
      },
      update: {
        name: '生产一组考勤',
        shiftId: demo.shiftId,
        checkinMethods: [CheckinMethod.GPS],
        gpsLat: '30.2741000',
        gpsLng: '120.1551000',
        gpsRadiusMeters: 300,
        requirePhoto: false,
        allowOutsideCheckin: true,
        deletedAt: null,
      },
    });

    await upsertAttendanceGroupMember(tx, {
      id: demo.groupMemberAdminId,
      employeeId: demo.adminEmployeeId,
    });
    await upsertAttendanceGroupMember(tx, {
      id: demo.groupMemberWorkerId,
      employeeId: demo.workerEmployeeId,
    });

    await tx.checkinRecord.upsert({
      where: { id: demo.clockInRecordId },
      create: {
        id: demo.clockInRecordId,
        tenantId: demo.tenantId,
        factoryId: demo.factoryId,
        employeeId: demo.workerEmployeeId,
        checkinType: CheckinType.CLOCK_IN,
        checkinAt: new Date('2026-05-18T00:58:00.000Z'),
        method: CheckinMethod.GPS,
        latitude: '30.2741000',
        longitude: '120.1551000',
        rawData: { source: 'demo-seed' },
      },
      update: {
        checkinAt: new Date('2026-05-18T00:58:00.000Z'),
        method: CheckinMethod.GPS,
        isValid: true,
        deletedAt: null,
      },
    });

    await tx.checkinRecord.upsert({
      where: { id: demo.clockOutRecordId },
      create: {
        id: demo.clockOutRecordId,
        tenantId: demo.tenantId,
        factoryId: demo.factoryId,
        employeeId: demo.workerEmployeeId,
        checkinType: CheckinType.CLOCK_OUT,
        checkinAt: new Date('2026-05-18T09:03:00.000Z'),
        method: CheckinMethod.GPS,
        latitude: '30.2741000',
        longitude: '120.1551000',
        rawData: { source: 'demo-seed' },
      },
      update: {
        checkinAt: new Date('2026-05-18T09:03:00.000Z'),
        method: CheckinMethod.GPS,
        isValid: true,
        deletedAt: null,
      },
    });

    await tx.attendanceResult.upsert({
      where: {
        tenantId_employeeId_date: {
          tenantId: demo.tenantId,
          employeeId: demo.workerEmployeeId,
          date: dateOnly('2026-05-18'),
        },
      },
      create: {
        id: demo.attendanceResultId,
        tenantId: demo.tenantId,
        factoryId: demo.factoryId,
        employeeId: demo.workerEmployeeId,
        attendanceGroupId: demo.attendanceGroupId,
        shiftId: demo.shiftId,
        date: dateOnly('2026-05-18'),
        clockInRecordId: demo.clockInRecordId,
        clockOutRecordId: demo.clockOutRecordId,
        clockInAt: new Date('2026-05-18T00:58:00.000Z'),
        clockOutAt: new Date('2026-05-18T09:03:00.000Z'),
        workMinutes: 485,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        absenceMinutes: 0,
        overtimeMinutes: 0,
        primaryStatus: AttendancePrimaryStatus.NORMAL,
        statusFlags: ['NORMAL'],
        anomalyFlags: [],
        calculatedAt: new Date('2026-05-18T09:05:00.000Z'),
        calculationVersion: 1,
      },
      update: {
        attendanceGroupId: demo.attendanceGroupId,
        shiftId: demo.shiftId,
        clockInRecordId: demo.clockInRecordId,
        clockOutRecordId: demo.clockOutRecordId,
        clockInAt: new Date('2026-05-18T00:58:00.000Z'),
        clockOutAt: new Date('2026-05-18T09:03:00.000Z'),
        workMinutes: 485,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        absenceMinutes: 0,
        overtimeMinutes: 0,
        primaryStatus: AttendancePrimaryStatus.NORMAL,
        statusFlags: ['NORMAL'],
        anomalyFlags: [],
        calculatedAt: new Date('2026-05-18T09:05:00.000Z'),
        calculationVersion: 1,
        isFinalized: false,
        finalizedAt: null,
        deletedAt: null,
      },
    });
  });

  printSummary();
}

type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

async function upsertAttendanceGroupMember(
  tx: TransactionClient,
  input: { id: string; employeeId: string },
): Promise<void> {
  await tx.attendanceGroupMember.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      tenantId: demo.tenantId,
      factoryId: demo.factoryId,
      employeeId: input.employeeId,
      attendanceGroupId: demo.attendanceGroupId,
      effectiveFrom: dateOnly('2026-05-01'),
      createdBy: demo.adminAccountId,
    },
    update: {
      attendanceGroupId: demo.attendanceGroupId,
      effectiveFrom: dateOnly('2026-05-01'),
      effectiveTo: null,
      deletedAt: null,
    },
  });
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function timeOnly(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function printSummary(): void {
  console.info('Demo seed completed.');
  console.info(`Tenant ID: ${demo.tenantId}`);
  console.info(`Factory ID: ${demo.factoryId}`);
  console.info(`Admin phone: ${adminPhone}`);
  console.info(`Employee phone: ${employeePhone}`);
  console.info('Admin password: from DEMO_ADMIN_PASSWORD, or local default when unset.');
  console.info('Employee password: from DEMO_EMPLOYEE_PASSWORD, or local default when unset.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
