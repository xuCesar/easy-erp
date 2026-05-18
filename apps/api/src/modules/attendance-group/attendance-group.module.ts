import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth';
import { PermissionModule } from '../../core/permission';
import {
  EmployeeModule,
  employeeRepositoryToken,
  type EmployeeRepository,
} from '../employee';
import { ShiftModule, shiftRepositoryToken, type ShiftRepository } from '../shift';
import { AttendanceGroupController } from './attendance-group.controller';
import { PrismaAttendanceGroupRepository } from './attendance-group.repository';
import { AttendanceGroupService } from './attendance-group.service';

export const attendanceGroupRepositoryToken = Symbol('AttendanceGroupRepository');

@Module({
  imports: [AuthModule, PermissionModule, ShiftModule, EmployeeModule],
  controllers: [AttendanceGroupController],
  providers: [
    PrismaAttendanceGroupRepository,
    {
      provide: attendanceGroupRepositoryToken,
      useExisting: PrismaAttendanceGroupRepository,
    },
    {
      provide: AttendanceGroupService,
      useFactory: (
        repository: PrismaAttendanceGroupRepository,
        shiftRepository: ShiftRepository,
        employeeRepository: EmployeeRepository,
      ) =>
        new AttendanceGroupService(
          repository,
          shiftRepository,
          employeeRepository,
        ),
      inject: [
        attendanceGroupRepositoryToken,
        shiftRepositoryToken,
        employeeRepositoryToken,
      ],
    },
  ],
  exports: [AttendanceGroupService, attendanceGroupRepositoryToken],
})
export class AttendanceGroupModule {}
