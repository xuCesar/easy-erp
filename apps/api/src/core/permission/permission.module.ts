import { Module } from '@nestjs/common';
import { PermissionGuard } from './permission.guard';
import { PermissionService } from './permission.service';

@Module({
  providers: [PermissionGuard, PermissionService],
  exports: [PermissionGuard, PermissionService],
})
export class PermissionModule {}
