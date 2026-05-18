import { Module } from '@nestjs/common';
import { AccountModule } from './core/account';
import { AuthModule } from './core/auth';
import { PermissionModule } from './core/permission';
import { TenantModule } from './core/tenant';
import { AttendanceGroupModule } from './modules/attendance-group';
import { EmployeeModule } from './modules/employee';
import { OrganizationModule } from './modules/organization';
import { ShiftModule } from './modules/shift';
import { AppController } from './app.controller';

@Module({
  imports: [
    TenantModule,
    AccountModule,
    AuthModule,
    PermissionModule,
    OrganizationModule,
    EmployeeModule,
    ShiftModule,
    AttendanceGroupModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
