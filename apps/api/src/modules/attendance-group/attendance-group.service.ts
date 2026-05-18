import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { EmployeeRepository } from '../employee';
import type { ShiftRepository } from '../shift';
import type {
  AddAttendanceGroupMembersInput,
  AttendanceGroupMemberRecord,
  AttendanceGroupRecord,
  AttendanceGroupRepository,
  CreateAttendanceGroupInput,
  UpdateAttendanceGroupInput,
} from './attendance-group.repository';

@Injectable()
export class AttendanceGroupService {
  constructor(
    private readonly attendanceGroupRepository: AttendanceGroupRepository,
    private readonly shiftRepository: Pick<ShiftRepository, 'findById'>,
    private readonly employeeRepository: Pick<EmployeeRepository, 'findById'>,
  ) {}

  async listByFactory(
    tenantId: string,
    factoryId: string,
  ): Promise<AttendanceGroupRecord[]> {
    return this.attendanceGroupRepository.listByFactory(tenantId, factoryId);
  }

  async create(
    input: CreateAttendanceGroupInput,
  ): Promise<AttendanceGroupRecord> {
    await this.assertShiftInSameFactory(input);
    this.assertCheckinSettings(input);

    return this.attendanceGroupRepository.create(input);
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateAttendanceGroupInput,
  ): Promise<AttendanceGroupRecord> {
    const current = await this.attendanceGroupRepository.findById(tenantId, id);

    if (!current) {
      throw new NotFoundException('Attendance group not found.');
    }

    const next = {
      ...current,
      ...input,
      tenantId,
      factoryId: current.factoryId,
    };
    await this.assertShiftInSameFactory(next);
    this.assertCheckinSettings(next);

    return this.attendanceGroupRepository.update(tenantId, id, input);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const current = await this.attendanceGroupRepository.findById(tenantId, id);

    if (!current) {
      throw new NotFoundException('Attendance group not found.');
    }

    await this.attendanceGroupRepository.softDelete(tenantId, id);
  }

  async addMembers(
    input: Omit<AddAttendanceGroupMembersInput, 'factoryId'>,
  ): Promise<AttendanceGroupMemberRecord[]> {
    const group = await this.attendanceGroupRepository.findById(
      input.tenantId,
      input.attendanceGroupId,
    );

    if (!group) {
      throw new NotFoundException('Attendance group not found.');
    }

    await this.assertEmployeesInSameFactory(
      input.tenantId,
      group.factoryId,
      input.employeeIds,
    );

    return this.attendanceGroupRepository.addMembers({
      ...input,
      factoryId: group.factoryId,
    });
  }

  async findMemberByEmployeeAndDate(
    tenantId: string,
    employeeId: string,
    date: Date,
  ): Promise<AttendanceGroupMemberRecord | null> {
    return this.attendanceGroupRepository.findMemberByEmployeeAndDate(
      tenantId,
      employeeId,
      date,
    );
  }

  private async assertShiftInSameFactory(
    input: CreateAttendanceGroupInput,
  ): Promise<void> {
    const shift = await this.shiftRepository.findById(
      input.tenantId,
      input.shiftId,
    );

    if (!shift || shift.factoryId !== input.factoryId) {
      throw new NotFoundException('Shift not found.');
    }
  }

  private async assertEmployeesInSameFactory(
    tenantId: string,
    factoryId: string,
    employeeIds: string[],
  ): Promise<void> {
    for (const employeeId of employeeIds) {
      const employee = await this.employeeRepository.findById(tenantId, employeeId);

      if (!employee || employee.factoryId !== factoryId) {
        throw new NotFoundException('Employee not found.');
      }
    }
  }

  private assertCheckinSettings(input: CreateAttendanceGroupInput): void {
    if (
      input.checkinMethods.includes('GPS') &&
      (input.gpsLat === null ||
        input.gpsLng === null ||
        input.gpsRadiusMeters === null)
    ) {
      throw new BadRequestException('GPS check-in requires coordinates and radius.');
    }

    if (
      input.checkinMethods.includes('WIFI') &&
      (!input.wifiSsid || !input.wifiBssid)
    ) {
      throw new BadRequestException('Wi-Fi check-in requires SSID and BSSID.');
    }
  }
}
