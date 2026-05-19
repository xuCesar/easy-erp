import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth';
import { PermissionModule } from '../../core/permission';
import { ShiftController } from './shift.controller';
import { PrismaShiftRepository } from './shift.repository';
import { ShiftService } from './shift.service';

export const shiftRepositoryToken = Symbol('ShiftRepository');

@Module({
  imports: [AuthModule, PermissionModule],
  controllers: [ShiftController],
  providers: [
    PrismaShiftRepository,
    {
      provide: shiftRepositoryToken,
      useExisting: PrismaShiftRepository,
    },
    {
      provide: ShiftService,
      useFactory: (repository: PrismaShiftRepository) =>
        new ShiftService(repository),
      inject: [shiftRepositoryToken],
    },
  ],
  exports: [ShiftService, shiftRepositoryToken],
})
export class ShiftModule {}
