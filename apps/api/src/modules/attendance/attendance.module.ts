import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth';
import { PermissionModule } from '../../core/permission';
import {
  AttendanceGroupModule,
  attendanceGroupRepositoryToken,
  type AttendanceGroupRepository,
} from '../attendance-group';
import {
  EmployeeModule,
  employeeRepositoryToken,
  type EmployeeRepository,
} from '../employee';
import { ShiftModule, shiftRepositoryToken, type ShiftRepository } from '../shift';
import { CheckinController } from './checkin/checkin.controller';
import { PrismaCheckinRepository } from './checkin/checkin.repository';
import { CheckinService } from './checkin/checkin.service';
import {
  AttendanceResultController,
  AttendanceRecalculationService,
  AttendanceResultService,
  PrismaAttendanceResultRepository,
} from './result';
import {
  attendanceResultRepositoryToken,
  checkinRepositoryToken,
} from './attendance.tokens';

@Module({
  imports: [
    AuthModule,
    PermissionModule,
    AttendanceGroupModule,
    ShiftModule,
    EmployeeModule,
  ],
  controllers: [CheckinController, AttendanceResultController],
  providers: [
    PrismaCheckinRepository,
    {
      provide: checkinRepositoryToken,
      useExisting: PrismaCheckinRepository,
    },
    PrismaAttendanceResultRepository,
    {
      provide: attendanceResultRepositoryToken,
      useExisting: PrismaAttendanceResultRepository,
    },
    {
      provide: CheckinService,
      useFactory: (
        checkinRepository: PrismaCheckinRepository,
        attendanceGroupRepository: AttendanceGroupRepository,
        shiftRepository: ShiftRepository,
        employeeRepository: EmployeeRepository,
      ) =>
        new CheckinService(
          checkinRepository,
          attendanceGroupRepository,
          shiftRepository,
          employeeRepository,
        ),
      inject: [
        checkinRepositoryToken,
        attendanceGroupRepositoryToken,
        shiftRepositoryToken,
        employeeRepositoryToken,
      ],
    },
    {
      provide: AttendanceResultService,
      useFactory: (repository: PrismaAttendanceResultRepository) =>
        new AttendanceResultService(repository),
      inject: [attendanceResultRepositoryToken],
    },
    {
      provide: AttendanceRecalculationService,
      useFactory: (
        attendanceResultService: AttendanceResultService,
        checkinRepository: PrismaCheckinRepository,
        attendanceGroupRepository: AttendanceGroupRepository,
        shiftRepository: ShiftRepository,
        employeeRepository: EmployeeRepository,
      ) =>
        new AttendanceRecalculationService(
          attendanceResultService,
          checkinRepository,
          attendanceGroupRepository,
          shiftRepository,
          employeeRepository,
        ),
      inject: [
        AttendanceResultService,
        checkinRepositoryToken,
        attendanceGroupRepositoryToken,
        shiftRepositoryToken,
        employeeRepositoryToken,
      ],
    },
  ],
  exports: [
    CheckinService,
    AttendanceResultService,
    AttendanceRecalculationService,
    checkinRepositoryToken,
    attendanceResultRepositoryToken,
  ],
})
export class AttendanceModule {}
