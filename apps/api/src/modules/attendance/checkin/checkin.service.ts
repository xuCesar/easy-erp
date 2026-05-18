import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthPrincipal } from '../../../core/auth';
import type { AttendanceGroupRepository, AttendanceGroupRecord } from '../../attendance-group';
import type { EmployeeRepository } from '../../employee';
import type { ShiftRecord, ShiftRepository } from '../../shift';
import type { CheckinRecord, CheckinRepository, CreateCheckinInput } from './checkin.repository';

export type CheckinRequest = {
  checkinType: 'CLOCK_IN' | 'CLOCK_OUT';
  clientEventAt: Date | null;
  idempotencyKey: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  wifi: {
    ssid: string;
    bssid: string;
  } | null;
  deviceId: string | null;
  photoUrl: string | null;
};

export type CheckinResponse = {
  recordId: string;
  checkinType: 'CLOCK_IN' | 'CLOCK_OUT';
  checkinAt: Date;
  isValid: boolean;
  invalidReason: string | null;
  message: string;
};

export type CheckinContext = {
  date: string;
  shift: Pick<ShiftRecord, 'id' | 'name' | 'startTime' | 'endTime' | 'crossDay'>;
  attendanceGroup: Pick<
    AttendanceGroupRecord,
    'id' | 'name' | 'checkinMethods' | 'requirePhoto'
  >;
  status: {
    clockInAt: Date | null;
    clockOutAt: Date | null;
    nextAction: 'CLOCK_IN' | 'CLOCK_OUT';
  };
};

@Injectable()
export class CheckinService {
  constructor(
    private readonly checkinRepository: CheckinRepository,
    private readonly attendanceGroupRepository: Pick<
      AttendanceGroupRepository,
      'findById' | 'findMemberByEmployeeAndDate'
    >,
    private readonly shiftRepository: Pick<ShiftRepository, 'findById'>,
    private readonly employeeRepository: Pick<EmployeeRepository, 'findById'>,
  ) {}

  async getContext(principal: AuthPrincipal, date: string): Promise<CheckinContext> {
    const employeeId = this.requireEmployeeId(principal);
    const { group, shift } = await this.resolveGroupAndShift(
      principal.tenantId,
      employeeId,
      dateOnly(date),
    );
    const window = resolveShiftWindow(date, shift);
    const records = await this.checkinRepository.listByEmployeeAndWindow(
      principal.tenantId,
      employeeId,
      window.startAt,
      window.endAt,
    );
    const clockInAt = firstRecordAt(records, 'CLOCK_IN');
    const clockOutAt = firstRecordAt(records, 'CLOCK_OUT');

    return {
      date,
      shift: {
        id: shift.id,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        crossDay: shift.crossDay,
      },
      attendanceGroup: {
        id: group.id,
        name: group.name,
        checkinMethods: group.checkinMethods,
        requirePhoto: group.requirePhoto,
      },
      status: {
        clockInAt,
        clockOutAt,
        nextAction: clockInAt && !clockOutAt ? 'CLOCK_OUT' : 'CLOCK_IN',
      },
    };
  }

  async checkin(
    principal: AuthPrincipal,
    request: CheckinRequest,
  ): Promise<CheckinResponse> {
    const employeeId = this.requireEmployeeId(principal);
    const duplicated = await this.checkinRepository.findByIdempotencyKey(
      principal.tenantId,
      employeeId,
      request.idempotencyKey,
    );

    if (duplicated) {
      return toCheckinResponse(duplicated);
    }

    const employee = await this.employeeRepository.findById(
      principal.tenantId,
      employeeId,
    );

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    const checkinAt = request.clientEventAt ?? new Date();
    const attendanceDate = toDateString(checkinAt);
    const { group } = await this.resolveGroupAndShift(
      principal.tenantId,
      employeeId,
      dateOnly(attendanceDate),
    );
    const validation = validateCheckin(group, request);
    const input: CreateCheckinInput = {
      tenantId: principal.tenantId,
      factoryId: employee.factoryId,
      employeeId,
      checkinType: request.checkinType,
      checkinAt,
      clientEventAt: request.clientEventAt,
      method: resolveMethod(group, request),
      latitude: request.location?.latitude ?? null,
      longitude: request.location?.longitude ?? null,
      wifiSsid: request.wifi?.ssid ?? null,
      wifiBssid: request.wifi?.bssid ?? null,
      photoUrl: request.photoUrl,
      deviceId: request.deviceId,
      idempotencyKey: request.idempotencyKey,
      isValid: validation.isValid,
      invalidReason: validation.invalidReason,
      rawData: request,
    };

    return toCheckinResponse(await this.checkinRepository.create(input));
  }

  private requireEmployeeId(principal: AuthPrincipal): string {
    if (!principal.employeeId) {
      throw new ForbiddenException('Current account is not linked to employee.');
    }

    return principal.employeeId;
  }

  private async resolveGroupAndShift(
    tenantId: string,
    employeeId: string,
    date: Date,
  ): Promise<{ group: AttendanceGroupRecord; shift: ShiftRecord }> {
    const member = await this.attendanceGroupRepository.findMemberByEmployeeAndDate(
      tenantId,
      employeeId,
      date,
    );

    if (!member) {
      throw new NotFoundException('Attendance group membership not found.');
    }

    const group = await this.attendanceGroupRepository.findById(
      tenantId,
      member.attendanceGroupId,
    );

    if (!group) {
      throw new NotFoundException('Attendance group not found.');
    }

    const shift = await this.shiftRepository.findById(tenantId, group.shiftId);

    if (!shift) {
      throw new NotFoundException('Shift not found.');
    }

    return { group, shift };
  }
}

function validateCheckin(
  group: AttendanceGroupRecord,
  request: CheckinRequest,
): { isValid: boolean; invalidReason: string | null } {
  if (
    group.checkinMethods.includes('GPS') &&
    group.gpsLat !== null &&
    group.gpsLng !== null &&
    group.gpsRadiusMeters !== null &&
    request.location
  ) {
    const distance = distanceInMeters(
      group.gpsLat,
      group.gpsLng,
      request.location.latitude,
      request.location.longitude,
    );

    if (distance > group.gpsRadiusMeters) {
      return { isValid: false, invalidReason: 'LOCATION_INVALID' };
    }
  }

  if (
    group.checkinMethods.includes('WIFI') &&
    request.wifi &&
    (request.wifi.ssid !== group.wifiSsid || request.wifi.bssid !== group.wifiBssid)
  ) {
    return { isValid: false, invalidReason: 'WIFI_INVALID' };
  }

  return { isValid: true, invalidReason: null };
}

function resolveMethod(group: AttendanceGroupRecord, request: CheckinRequest): CreateCheckinInput['method'] {
  if (group.checkinMethods.includes('GPS') && request.location) {
    return 'GPS';
  }

  if (group.checkinMethods.includes('WIFI') && request.wifi) {
    return 'WIFI';
  }

  return group.requirePhoto ? 'PHOTO' : 'DEVICE';
}

function toCheckinResponse(record: CheckinRecord): CheckinResponse {
  return {
    recordId: record.id,
    checkinType: record.checkinType,
    checkinAt: record.checkinAt,
    isValid: record.isValid,
    invalidReason: record.invalidReason,
    message: record.isValid ? '打卡成功' : '打卡异常',
  };
}

function resolveShiftWindow(
  date: string,
  shift: ShiftRecord,
): { startAt: Date; endAt: Date } {
  const startAt = new Date(`${date}T${shift.startTime}:00.000Z`);
  const endAt = new Date(`${date}T${shift.endTime}:00.000Z`);

  if (shift.crossDay) {
    endAt.setUTCDate(endAt.getUTCDate() + 1);
  }

  return { startAt, endAt };
}

function firstRecordAt(
  records: CheckinRecord[],
  checkinType: 'CLOCK_IN' | 'CLOCK_OUT',
): Date | null {
  return (
    records
      .filter((record) => record.checkinType === checkinType)
      .sort((left, right) => left.checkinAt.getTime() - right.checkinAt.getTime())[0]
      ?.checkinAt ?? null
  );
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function distanceInMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
