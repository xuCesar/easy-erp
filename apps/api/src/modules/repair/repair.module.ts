import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth';
import { PermissionModule, PermissionService } from '../../core/permission';
import { AttendanceModule, AttendanceRecalculationService } from '../attendance';
import {
  EmployeeModule,
  employeeRepositoryToken,
  type EmployeeRepository,
} from '../employee';
import { RepairController } from './repair.controller';
import { PrismaRepairRequestRepository } from './repair.repository';
import { RepairService } from './repair.service';

export const repairRequestRepositoryToken = Symbol('RepairRequestRepository');

@Module({
  imports: [AuthModule, PermissionModule, AttendanceModule, EmployeeModule],
  controllers: [RepairController],
  providers: [
    PrismaRepairRequestRepository,
    {
      provide: repairRequestRepositoryToken,
      useExisting: PrismaRepairRequestRepository,
    },
    {
      provide: RepairService,
      useFactory: (
        repository: PrismaRepairRequestRepository,
        recalculation: AttendanceRecalculationService,
        permissionService: PermissionService,
        employeeRepository: EmployeeRepository,
      ) =>
        new RepairService(
          repository,
          recalculation,
          permissionService,
          employeeRepository,
        ),
      inject: [
        repairRequestRepositoryToken,
        AttendanceRecalculationService,
        PermissionService,
        employeeRepositoryToken,
      ],
    },
  ],
  exports: [RepairService, repairRequestRepositoryToken],
})
export class RepairModule {}
