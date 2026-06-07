import { Module } from '@nestjs/common';
import { AccountModule } from './core/account';
import { AuthModule } from './core/auth';
import { PermissionModule } from './core/permission';
import { TenantModule } from './core/tenant';
import { AttendanceModule } from './modules/attendance';
import { AttendanceGroupModule } from './modules/attendance-group';
import { EmployeeModule } from './modules/employee';
import { LeaveModule } from './modules/leave';
import { OrganizationModule } from './modules/organization';
import { RepairModule } from './modules/repair';
import { ReportModule } from './modules/report';
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
    AttendanceModule,
    LeaveModule,
    RepairModule,
    ReportModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
