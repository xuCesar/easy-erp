import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth';
import { PermissionModule } from '../../core/permission';
import { OrganizationController } from './organization.controller';
import {
  PrismaOrganizationRepository,
} from './organization.repository';
import { OrganizationService } from './organization.service';

export const organizationRepositoryToken = Symbol('OrganizationRepository');

@Module({
  imports: [AuthModule, PermissionModule],
  controllers: [OrganizationController],
  providers: [
    PrismaOrganizationRepository,
    {
      provide: organizationRepositoryToken,
      useExisting: PrismaOrganizationRepository,
    },
    {
      provide: OrganizationService,
      useFactory: (repository: PrismaOrganizationRepository) =>
        new OrganizationService(repository),
      inject: [organizationRepositoryToken],
    },
  ],
  exports: [OrganizationService, organizationRepositoryToken],
})
export class OrganizationModule {}
