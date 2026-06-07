import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { AccountModule } from './core/account';
import { AuthModule } from './core/auth';
import { RequestObservabilityMiddleware } from './core/observability';
import { PermissionModule } from './core/permission';
import { TenantModule } from './core/tenant';
import { AttendanceModule } from './modules/attendance';
import { AttendanceGroupModule } from './modules/attendance-group';
import { EmployeeModule } from './modules/employee';
import { FactoryModule } from './modules/factory';
import { LeaveModule } from './modules/leave';
import { OrganizationModule } from './modules/organization';
import { ProfileModule } from './modules/profile';
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
    FactoryModule,
    OrganizationModule,
    EmployeeModule,
    ShiftModule,
    AttendanceGroupModule,
    AttendanceModule,
    LeaveModule,
    RepairModule,
    ProfileModule,
    ReportModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestObservabilityMiddleware).forRoutes('*');
  }
}
