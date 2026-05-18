import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth';
import { PermissionModule, PermissionService } from '../../core/permission';
import { AttendanceModule, AttendanceRecalculationService } from '../attendance';
import {
  EmployeeModule,
  employeeRepositoryToken,
  type EmployeeRepository,
} from '../employee';
import { LeaveController } from './leave.controller';
import { PrismaLeaveRequestRepository } from './leave.repository';
import { LeaveService } from './leave.service';

export const leaveRequestRepositoryToken = Symbol('LeaveRequestRepository');

@Module({
  imports: [AuthModule, PermissionModule, AttendanceModule, EmployeeModule],
  controllers: [LeaveController],
  providers: [
    PrismaLeaveRequestRepository,
    {
      provide: leaveRequestRepositoryToken,
      useExisting: PrismaLeaveRequestRepository,
    },
    {
      provide: LeaveService,
      useFactory: (
        repository: PrismaLeaveRequestRepository,
        recalculation: AttendanceRecalculationService,
        permissionService: PermissionService,
        employeeRepository: EmployeeRepository,
      ) =>
        new LeaveService(
          repository,
          recalculation,
          permissionService,
          employeeRepository,
        ),
      inject: [
        leaveRequestRepositoryToken,
        AttendanceRecalculationService,
        PermissionService,
        employeeRepositoryToken,
      ],
    },
  ],
  exports: [LeaveService, leaveRequestRepositoryToken],
})
export class LeaveModule {}
