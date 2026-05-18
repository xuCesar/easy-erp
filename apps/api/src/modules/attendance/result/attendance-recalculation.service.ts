import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AttendanceGroupRepository,
  AttendanceGroupRecord,
} from '../../attendance-group';
import type { EmployeeRepository } from '../../employee';
import type { ShiftRecord, ShiftRepository } from '../../shift';
import type { CheckinRecord, CheckinRepository } from '../checkin/checkin.repository';
import type { AttendanceLeaveFact } from '../calculator/attendance-calculator.types';
import type { AttendanceResultRecord } from './attendance-result.repository';
import { AttendanceResultService } from './attendance-result.service';

export type RecalculateEmployeeDateInput = {
  tenantId: string;
  employeeId: string;
  date: string;
  leaves?: AttendanceLeaveFact[];
};

export interface AttendanceRecalculationPort {
  recalculateEmployeeDate(
    input: RecalculateEmployeeDateInput,
  ): Promise<unknown>;
}

@Injectable()
export class AttendanceRecalculationService implements AttendanceRecalculationPort {
  constructor(
    private readonly attendanceResultService: AttendanceResultService,
    private readonly checkinRepository: CheckinRepository,
    private readonly attendanceGroupRepository: Pick<
      AttendanceGroupRepository,
      'findById' | 'findMemberByEmployeeAndDate'
    >,
    private readonly shiftRepository: Pick<ShiftRepository, 'findById'>,
    private readonly employeeRepository: Pick<EmployeeRepository, 'findById'>,
  ) {}

  async recalculateEmployeeDate(
    input: RecalculateEmployeeDateInput,
  ): Promise<AttendanceResultRecord> {
    const employee = await this.employeeRepository.findById(
      input.tenantId,
      input.employeeId,
    );

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    const { group, shift } = await this.resolveGroupAndShift(
      input.tenantId,
      input.employeeId,
      input.date,
    );
    const window = resolveShiftWindow(input.date, shift);
    const records = await this.checkinRepository.listByEmployeeAndWindow(
      input.tenantId,
      input.employeeId,
      window.startAt,
      window.endAt,
    );

    return this.attendanceResultService.recalculate({
      tenantId: input.tenantId,
      factoryId: employee.factoryId,
      employeeId: input.employeeId,
      attendanceGroupId: group.id,
      shiftId: shift.id,
      date: input.date,
      shift: {
        startTime: shift.startTime,
        endTime: shift.endTime,
        crossDay: shift.crossDay,
        workMinutes: shift.workMinutes,
        lateGraceMinutes: shift.lateGraceMinutes,
        earlyLeaveGraceMinutes: shift.earlyLeaveGraceMinutes,
        overtimeStartMinutes: shift.overtimeStartMinutes,
      },
      records: records.map(toCalculationCheckinFact),
      leaves: input.leaves ?? [],
      calculatedAt: new Date(),
    });
  }

  private async resolveGroupAndShift(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<{ group: AttendanceGroupRecord; shift: ShiftRecord }> {
    const member = await this.attendanceGroupRepository.findMemberByEmployeeAndDate(
      tenantId,
      employeeId,
      dateOnly(date),
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

function toCalculationCheckinFact(record: CheckinRecord): {
  id: string;
  checkinType: CheckinRecord['checkinType'];
  checkinAt: Date;
  method: CheckinRecord['method'];
  isValid: boolean;
  invalidReason: string | null;
  deviceMatched: boolean;
} {
  return {
    id: record.id,
    checkinType: record.checkinType,
    checkinAt: record.checkinAt,
    method: record.method,
    isValid: record.isValid,
    invalidReason: record.invalidReason,
    deviceMatched: true,
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

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
