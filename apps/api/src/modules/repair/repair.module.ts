import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth';
import { PermissionModule } from '../../core/permission';
import { AttendanceModule, AttendanceRecalculationService } from '../attendance';
import { RepairController } from './repair.controller';
import { PrismaRepairRequestRepository } from './repair.repository';
import { RepairService } from './repair.service';

export const repairRequestRepositoryToken = Symbol('RepairRequestRepository');

@Module({
  imports: [AuthModule, PermissionModule, AttendanceModule],
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
      ) => new RepairService(repository, recalculation),
      inject: [repairRequestRepositoryToken, AttendanceRecalculationService],
    },
  ],
  exports: [RepairService, repairRequestRepositoryToken],
})
export class RepairModule {}
