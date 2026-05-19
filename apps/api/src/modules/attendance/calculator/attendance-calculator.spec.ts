import { describe, expect, it } from 'vitest';
import { calculateAttendanceResult } from './attendance-calculator';
import type {
  AttendanceCalculationInput,
  AttendanceCheckinFact,
} from './attendance-calculator.types';

describe('calculateAttendanceResult', () => {
  it.each([
    {
      caseNo: 'C001',
      title: '正常白班',
      records: [clockIn('2026-05-17T08:00:00.000Z'), clockOut('2026-05-17T17:00:00.000Z')],
      expected: {
        primaryStatus: 'NORMAL',
        workMinutes: 540,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        statusFlags: [],
        anomalyFlags: [],
      },
    },
    {
      caseNo: 'C002',
      title: '宽限内迟到',
      records: [clockIn('2026-05-17T08:03:00.000Z'), clockOut('2026-05-17T17:00:00.000Z')],
      expected: {
        primaryStatus: 'NORMAL',
        lateMinutes: 0,
        statusFlags: [],
      },
    },
    {
      caseNo: 'C003',
      title: '超出宽限迟到',
      records: [clockIn('2026-05-17T08:10:00.000Z'), clockOut('2026-05-17T17:00:00.000Z')],
      expected: {
        primaryStatus: 'NORMAL',
        lateMinutes: 5,
        statusFlags: ['LATE'],
      },
    },
    {
      caseNo: 'C004',
      title: '早退',
      records: [clockIn('2026-05-17T08:00:00.000Z'), clockOut('2026-05-17T16:40:00.000Z')],
      expected: {
        primaryStatus: 'NORMAL',
        earlyLeaveMinutes: 20,
        statusFlags: ['EARLY_LEAVE'],
      },
    },
    {
      caseNo: 'C005',
      title: '加班不足阈值',
      records: [clockIn('2026-05-17T08:00:00.000Z'), clockOut('2026-05-17T17:20:00.000Z')],
      expected: {
        primaryStatus: 'NORMAL',
        overtimeMinutes: 0,
        statusFlags: [],
      },
    },
    {
      caseNo: 'C006',
      title: '加班达到阈值',
      records: [clockIn('2026-05-17T08:00:00.000Z'), clockOut('2026-05-17T17:45:00.000Z')],
      expected: {
        primaryStatus: 'NORMAL',
        overtimeMinutes: 45,
        statusFlags: ['OVERTIME'],
      },
    },
    {
      caseNo: 'C007',
      title: '缺上班卡',
      records: [clockOut('2026-05-17T17:00:00.000Z')],
      expected: {
        primaryStatus: 'ABNORMAL',
        anomalyFlags: ['NO_CLOCK_IN'],
      },
    },
    {
      caseNo: 'C008',
      title: '缺下班卡',
      records: [clockIn('2026-05-17T08:00:00.000Z')],
      expected: {
        primaryStatus: 'ABNORMAL',
        anomalyFlags: ['NO_CLOCK_OUT'],
      },
    },
    {
      caseNo: 'C009',
      title: '双缺卡',
      records: [],
      expected: {
        primaryStatus: 'ABNORMAL',
        anomalyFlags: ['NO_CLOCK_IN', 'NO_CLOCK_OUT'],
      },
    },
    {
      caseNo: 'C010',
      title: '全天请假',
      records: [],
      leaves: [
        {
          startAt: new Date('2026-05-17T08:00:00.000Z'),
          endAt: new Date('2026-05-17T17:00:00.000Z'),
        },
      ],
      expected: {
        primaryStatus: 'LEAVE',
        anomalyFlags: [],
      },
    },
    {
      caseNo: 'C011',
      title: '半天请假',
      records: [clockIn('2026-05-17T08:00:00.000Z'), clockOut('2026-05-17T12:00:00.000Z')],
      leaves: [
        {
          startAt: new Date('2026-05-17T13:00:00.000Z'),
          endAt: new Date('2026-05-17T17:00:00.000Z'),
        },
      ],
      expected: {
        primaryStatus: 'NORMAL',
        statusFlags: ['PARTIAL_LEAVE'],
        anomalyFlags: [],
      },
    },
    {
      caseNo: 'C014',
      title: 'GPS 无效',
      records: [
        clockIn('2026-05-17T08:00:00.000Z', { isValid: false, invalidReason: 'LOCATION_INVALID' }),
        clockOut('2026-05-17T17:00:00.000Z'),
      ],
      expected: {
        primaryStatus: 'ABNORMAL',
        anomalyFlags: ['LOCATION_INVALID', 'NO_CLOCK_IN'],
      },
    },
    {
      caseNo: 'C015',
      title: '设备不匹配',
      records: [
        clockIn('2026-05-17T08:00:00.000Z', { deviceMatched: false }),
        clockOut('2026-05-17T17:00:00.000Z'),
      ],
      expected: {
        primaryStatus: 'ABNORMAL',
        anomalyFlags: ['DEVICE_MISMATCH'],
      },
    },
    {
      caseNo: 'C016',
      title: '补卡通过',
      records: [clockIn('2026-05-17T08:00:00.000Z'), clockOut('2026-05-17T17:00:00.000Z', { method: 'MANUAL' })],
      expected: {
        primaryStatus: 'NORMAL',
        clockOutAt: new Date('2026-05-17T17:00:00.000Z'),
        anomalyFlags: [],
      },
    },
  ])('$caseNo $title', ({ records, leaves, expected }) => {
    expect(calculateAttendanceResult(dayShiftInput({ records, leaves }))).toMatchObject(expected);
  });

  it('C012 夜班正常，结果归属班次开始日期', () => {
    const result = calculateAttendanceResult(
      nightShiftInput({
        records: [
          clockIn('2026-05-17T20:00:00.000Z'),
          clockOut('2026-05-18T08:00:00.000Z'),
        ],
      }),
    );

    expect(result).toMatchObject({
      date: '2026-05-17',
      primaryStatus: 'NORMAL',
      workMinutes: 720,
      anomalyFlags: [],
    });
  });

  it('C013 夜班缺下班卡，仍归属班次开始日期', () => {
    const result = calculateAttendanceResult(
      nightShiftInput({
        records: [clockIn('2026-05-17T20:00:00.000Z')],
      }),
    );

    expect(result).toMatchObject({
      date: '2026-05-17',
      primaryStatus: 'ABNORMAL',
      anomalyFlags: ['NO_CLOCK_OUT'],
    });
  });

  it('does not mutate original check-in records', () => {
    const records = [clockIn('2026-05-17T08:00:00.000Z'), clockOut('2026-05-17T17:00:00.000Z')];
    const before = records.map((record) => ({ ...record }));

    calculateAttendanceResult(dayShiftInput({ records }));

    expect(records).toEqual(before);
  });
});

function dayShiftInput(overrides: Partial<AttendanceCalculationInput> = {}): AttendanceCalculationInput {
  const { leaves, records, ...restOverrides } = overrides;

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
    records: records ?? [],
    leaves: leaves ?? [],
    calculatedAt: new Date('2026-05-17T18:00:00.000Z'),
    ...restOverrides,
  };
}

function nightShiftInput(overrides: Partial<AttendanceCalculationInput> = {}): AttendanceCalculationInput {
  return {
    ...dayShiftInput(overrides),
    shiftId: 'shift-night',
    shift: {
      startTime: '20:00',
      endTime: '08:00',
      crossDay: true,
      workMinutes: 720,
      lateGraceMinutes: 5,
      earlyLeaveGraceMinutes: 0,
      overtimeStartMinutes: 30,
    },
  };
}

function clockIn(
  at: string,
  overrides: Partial<AttendanceCheckinFact> = {},
): AttendanceCheckinFact {
  return checkin('CLOCK_IN', at, overrides);
}

function clockOut(
  at: string,
  overrides: Partial<AttendanceCheckinFact> = {},
): AttendanceCheckinFact {
  return checkin('CLOCK_OUT', at, overrides);
}

function checkin(
  checkinType: 'CLOCK_IN' | 'CLOCK_OUT',
  at: string,
  overrides: Partial<AttendanceCheckinFact>,
): AttendanceCheckinFact {
  return {
    id: `${checkinType}-${at}`,
    checkinType,
    checkinAt: new Date(at),
    method: 'GPS',
    isValid: true,
    invalidReason: null,
    deviceMatched: true,
    ...overrides,
  };
}
