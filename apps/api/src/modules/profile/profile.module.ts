import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth';
import { PermissionModule } from '../../core/permission';
import { EmployeeModule } from '../employee';
import { ProfileController } from './profile.controller';

@Module({
  imports: [AuthModule, PermissionModule, EmployeeModule],
  controllers: [ProfileController],
})
export class ProfileModule {}
