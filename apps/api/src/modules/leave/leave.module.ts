import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth';
import { PermissionModule } from '../../core/permission';
import { AttendanceModule, AttendanceRecalculationService } from '../attendance';
import { LeaveController } from './leave.controller';
import { PrismaLeaveRequestRepository } from './leave.repository';
import { LeaveService } from './leave.service';

export const leaveRequestRepositoryToken = Symbol('LeaveRequestRepository');

@Module({
  imports: [AuthModule, PermissionModule, AttendanceModule],
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
      ) => new LeaveService(repository, recalculation),
      inject: [leaveRequestRepositoryToken, AttendanceRecalculationService],
    },
  ],
  exports: [LeaveService, leaveRequestRepositoryToken],
})
export class LeaveModule {}
