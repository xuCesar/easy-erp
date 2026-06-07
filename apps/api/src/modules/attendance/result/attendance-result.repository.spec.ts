import { describe, expect, it } from 'vitest';
import { toAttendanceResultRow } from './attendance-result.repository';

describe('toAttendanceResultRow', () => {
  it('maps persisted attendance result with employee info into response row', () => {
    expect(
      toAttendanceResultRow({
        id: 'result-1',
        tenantId: 'tenant-1',
        factoryId: 'factory-1',
        employeeId: 'employee-1',
        attendanceGroupId: 'group-1',
        shiftId: 'shift-1',
        date: new Date('2026-05-17T00:00:00.000Z'),
        clockInRecordId: 'clock-in-1',
        clockOutRecordId: null,
        clockInAt: new Date('2026-05-17T00:05:00.000Z'),
        clockOutAt: null,
        workMinutes: 480,
        lateMinutes: 5,
        earlyLeaveMinutes: 0,
        absenceMinutes: 0,
        overtimeMinutes: 0,
        primaryStatus: 'NORMAL',
        statusFlags: ['LATE'],
        anomalyFlags: [],
        calculatedAt: new Date('2026-05-17T10:00:00.000Z'),
        calculationVersion: 1,
        isFinalized: false,
        finalizedAt: null,
        createdAt: new Date('2026-05-17T10:00:00.000Z'),
        updatedAt: new Date('2026-05-17T10:00:00.000Z'),
        deletedAt: null,
        employee: {
          name: '张三',
          empNo: 'EMP001',
        },
      }),
    ).toMatchObject({
      id: 'result-1',
      employeeId: 'employee-1',
      employeeName: '张三',
      empNo: 'EMP001',
      date: '2026-05-17',
      primaryStatus: 'LATE',
      lateMinutes: 5,
      isFinalized: false,
    });
  });
});
