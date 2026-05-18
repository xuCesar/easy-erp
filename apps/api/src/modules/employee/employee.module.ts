import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth';
import { PermissionModule } from '../../core/permission';
import {
  OrganizationModule,
  organizationRepositoryToken,
  type OrganizationRepository,
} from '../organization';
import { EmployeeController } from './employee.controller';
import { PrismaEmployeeRepository } from './employee.repository';
import { EmployeeService } from './employee.service';

export const employeeRepositoryToken = Symbol('EmployeeRepository');

@Module({
  imports: [AuthModule, PermissionModule, OrganizationModule],
  controllers: [EmployeeController],
  providers: [
    PrismaEmployeeRepository,
    {
      provide: employeeRepositoryToken,
      useExisting: PrismaEmployeeRepository,
    },
    {
      provide: EmployeeService,
      useFactory: (
        employeeRepository: PrismaEmployeeRepository,
        organizationRepository: OrganizationRepository,
      ) => new EmployeeService(employeeRepository, organizationRepository),
      inject: [employeeRepositoryToken, organizationRepositoryToken],
    },
  ],
  exports: [EmployeeService, employeeRepositoryToken],
})
export class EmployeeModule {}
