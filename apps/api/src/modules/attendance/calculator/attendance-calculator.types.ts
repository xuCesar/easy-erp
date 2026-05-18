export type AttendanceCheckinType = 'CLOCK_IN' | 'CLOCK_OUT';

export type AttendanceCheckinMethod = 'GPS' | 'WIFI' | 'PHOTO' | 'DEVICE' | 'MANUAL';

export type AttendancePrimaryStatus =
  | 'NORMAL'
  | 'ABNORMAL'
  | 'ABSENT'
  | 'LEAVE'
  | 'REST'
  | 'HOLIDAY';

export type AttendanceStatusFlag =
  | 'LATE'
  | 'EARLY_LEAVE'
  | 'OVERTIME'
  | 'PARTIAL_LEAVE';

export type AttendanceAnomalyFlag =
  | 'NO_CLOCK_IN'
  | 'NO_CLOCK_OUT'
  | 'LOCATION_INVALID'
  | 'TIME_MISMATCH'
  | 'DEVICE_MISMATCH'
  | 'CLIENT_TIME_DRIFT';

export type AttendanceCheckinFact = {
  id: string;
  checkinType: AttendanceCheckinType;
  checkinAt: Date;
  method: AttendanceCheckinMethod;
  isValid: boolean;
  invalidReason: AttendanceAnomalyFlag | string | null;
  deviceMatched: boolean;
};

export type AttendanceLeaveFact = {
  startAt: Date;
  endAt: Date;
};

export type AttendanceShiftFact = {
  startTime: string;
  endTime: string;
  crossDay: boolean;
  workMinutes: number;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  overtimeStartMinutes: number;
};

export type AttendanceCalculationInput = {
  tenantId: string;
  factoryId: string;
  employeeId: string;
  attendanceGroupId: string;
  shiftId: string;
  date: string;
  shift: AttendanceShiftFact;
  records: AttendanceCheckinFact[];
  leaves: AttendanceLeaveFact[];
  calculatedAt: Date;
};

export type AttendanceCalculationResult = {
  tenantId: string;
  factoryId: string;
  employeeId: string;
  attendanceGroupId: string;
  shiftId: string;
  date: string;
  clockInRecordId: string | null;
  clockOutRecordId: string | null;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  workMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  absenceMinutes: number;
  overtimeMinutes: number;
  primaryStatus: AttendancePrimaryStatus;
  statusFlags: AttendanceStatusFlag[];
  anomalyFlags: AttendanceAnomalyFlag[];
  calculatedAt: Date;
  calculationVersion: 1;
};
