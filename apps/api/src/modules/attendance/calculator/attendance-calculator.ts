import type {
  AttendanceAnomalyFlag,
  AttendanceCalculationInput,
  AttendanceCalculationResult,
  AttendanceCheckinFact,
  AttendancePrimaryStatus,
  AttendanceStatusFlag,
} from './attendance-calculator.types';

export function calculateAttendanceResult(
  input: AttendanceCalculationInput,
): AttendanceCalculationResult {
  const shiftWindow = resolveShiftWindow(input.date, input.shift);
  const anomalyFlags = collectRecordAnomalies(input.records);
  const validRecords = input.records.filter((record) => record.isValid);
  const clockIn = earliest(
    validRecords.filter((record) => record.checkinType === 'CLOCK_IN'),
  );
  const clockOut = latest(
    validRecords.filter((record) => record.checkinType === 'CLOCK_OUT'),
  );
  const fullLeave = coversWindow(input.leaves, shiftWindow.startAt, shiftWindow.endAt);
  const partialLeave = !fullLeave && input.leaves.length > 0;

  if (fullLeave) {
    return buildResult(input, {
      clockIn,
      clockOut,
      primaryStatus: 'LEAVE',
      statusFlags: [],
      anomalyFlags: [],
      shiftWindow,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      workMinutes: 0,
      overtimeMinutes: 0,
      absenceMinutes: 0,
    });
  }

  const missingClockFlags = collectMissingClockFlags(clockIn, clockOut, partialLeave);
  const allAnomalyFlags = uniqueFlags([...anomalyFlags, ...missingClockFlags]);
  const lateMinutes = clockIn
    ? Math.max(
        0,
        minutesBetween(addMinutes(shiftWindow.startAt, input.shift.lateGraceMinutes), clockIn.checkinAt),
      )
    : 0;
  const earlyLeaveMinutes = clockOut
    ? Math.max(
        0,
        minutesBetween(clockOut.checkinAt, addMinutes(shiftWindow.endAt, -input.shift.earlyLeaveGraceMinutes)),
      )
    : 0;
  const rawOvertimeMinutes = clockOut
    ? Math.max(0, minutesBetween(shiftWindow.endAt, clockOut.checkinAt))
    : 0;
  const overtimeMinutes =
    rawOvertimeMinutes >= input.shift.overtimeStartMinutes ? rawOvertimeMinutes : 0;
  const statusFlags = collectStatusFlags({
    lateMinutes,
    earlyLeaveMinutes,
    overtimeMinutes,
    partialLeave,
  });
  const primaryStatus: AttendancePrimaryStatus =
    allAnomalyFlags.length > 0 ? 'ABNORMAL' : 'NORMAL';
  const workMinutes =
    clockIn && clockOut ? Math.max(0, minutesBetween(clockIn.checkinAt, clockOut.checkinAt)) : 0;

  return buildResult(input, {
    clockIn,
    clockOut,
    primaryStatus,
    statusFlags,
    anomalyFlags: allAnomalyFlags,
    shiftWindow,
    lateMinutes,
    earlyLeaveMinutes,
    workMinutes,
    overtimeMinutes,
    absenceMinutes: missingClockFlags.length > 0 ? input.shift.workMinutes : 0,
  });
}

type BuildResultInput = {
  clockIn: AttendanceCheckinFact | null;
  clockOut: AttendanceCheckinFact | null;
  primaryStatus: AttendancePrimaryStatus;
  statusFlags: AttendanceStatusFlag[];
  anomalyFlags: AttendanceAnomalyFlag[];
  shiftWindow: {
    startAt: Date;
    endAt: Date;
  };
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workMinutes: number;
  overtimeMinutes: number;
  absenceMinutes: number;
};

function buildResult(
  input: AttendanceCalculationInput,
  result: BuildResultInput,
): AttendanceCalculationResult {
  return {
    tenantId: input.tenantId,
    factoryId: input.factoryId,
    employeeId: input.employeeId,
    attendanceGroupId: input.attendanceGroupId,
    shiftId: input.shiftId,
    date: input.date,
    clockInRecordId: result.clockIn?.id ?? null,
    clockOutRecordId: result.clockOut?.id ?? null,
    clockInAt: result.clockIn?.checkinAt ?? null,
    clockOutAt: result.clockOut?.checkinAt ?? null,
    workMinutes: result.workMinutes,
    lateMinutes: result.lateMinutes,
    earlyLeaveMinutes: result.earlyLeaveMinutes,
    absenceMinutes: result.absenceMinutes,
    overtimeMinutes: result.overtimeMinutes,
    primaryStatus: result.primaryStatus,
    statusFlags: result.statusFlags,
    anomalyFlags: result.anomalyFlags,
    calculatedAt: new Date(input.calculatedAt),
    calculationVersion: 1,
  };
}

function resolveShiftWindow(
  date: string,
  shift: AttendanceCalculationInput['shift'],
): { startAt: Date; endAt: Date } {
  const startAt = new Date(`${date}T${shift.startTime}:00.000Z`);
  const endAt = new Date(`${date}T${shift.endTime}:00.000Z`);

  if (shift.crossDay) {
    endAt.setUTCDate(endAt.getUTCDate() + 1);
  }

  return { startAt, endAt };
}

function collectRecordAnomalies(
  records: AttendanceCheckinFact[],
): AttendanceAnomalyFlag[] {
  const flags: AttendanceAnomalyFlag[] = [];

  for (const record of records) {
    if (!record.isValid && record.invalidReason) {
      flags.push(toKnownAnomalyFlag(record.invalidReason));
    }

    if (!record.deviceMatched) {
      flags.push('DEVICE_MISMATCH');
    }
  }

  return uniqueFlags(flags);
}

function collectMissingClockFlags(
  clockIn: AttendanceCheckinFact | null,
  clockOut: AttendanceCheckinFact | null,
  partialLeave: boolean,
): AttendanceAnomalyFlag[] {
  const flags: AttendanceAnomalyFlag[] = [];

  if (!clockIn) {
    flags.push('NO_CLOCK_IN');
  }

  if (!clockOut && !partialLeave) {
    flags.push('NO_CLOCK_OUT');
  }

  return flags;
}

function collectStatusFlags(input: {
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  partialLeave: boolean;
}): AttendanceStatusFlag[] {
  const flags: AttendanceStatusFlag[] = [];

  if (input.lateMinutes > 0) {
    flags.push('LATE');
  }

  if (input.earlyLeaveMinutes > 0 && !input.partialLeave) {
    flags.push('EARLY_LEAVE');
  }

  if (input.overtimeMinutes > 0) {
    flags.push('OVERTIME');
  }

  if (input.partialLeave) {
    flags.push('PARTIAL_LEAVE');
  }

  return flags;
}

function earliest(records: AttendanceCheckinFact[]): AttendanceCheckinFact | null {
  return [...records].sort((left, right) => left.checkinAt.getTime() - right.checkinAt.getTime())[0] ?? null;
}

function latest(records: AttendanceCheckinFact[]): AttendanceCheckinFact | null {
  return [...records].sort((left, right) => right.checkinAt.getTime() - left.checkinAt.getTime())[0] ?? null;
}

function coversWindow(
  leaves: AttendanceCalculationInput['leaves'],
  startAt: Date,
  endAt: Date,
): boolean {
  return leaves.some(
    (leave) => leave.startAt.getTime() <= startAt.getTime() && leave.endAt.getTime() >= endAt.getTime(),
  );
}

function minutesBetween(startAt: Date, endAt: Date): number {
  return Math.floor((endAt.getTime() - startAt.getTime()) / 60_000);
}

function addMinutes(value: Date, minutes: number): Date {
  return new Date(value.getTime() + minutes * 60_000);
}

function uniqueFlags<T extends string>(flags: T[]): T[] {
  return [...new Set(flags)];
}

function toKnownAnomalyFlag(value: string): AttendanceAnomalyFlag {
  const knownFlags: AttendanceAnomalyFlag[] = [
    'NO_CLOCK_IN',
    'NO_CLOCK_OUT',
    'LOCATION_INVALID',
    'TIME_MISMATCH',
    'DEVICE_MISMATCH',
    'CLIENT_TIME_DRIFT',
  ];

  return knownFlags.includes(value as AttendanceAnomalyFlag)
    ? (value as AttendanceAnomalyFlag)
    : 'TIME_MISMATCH';
}
