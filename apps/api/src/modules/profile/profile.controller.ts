import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ApiSuccessResponse,
  EmployeeProfile,
  EmployeeProfileSummary,
} from '@easy-erp/shared-types';
import { AccessTokenGuard, type AuthPrincipal } from '../../core/auth';
import { PermissionGuard, RequirePermission } from '../../core/permission';
import type { EmployeeRecord } from '../employee';
import { EmployeeService } from '../employee';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

@Controller('profile')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class ProfileController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get()
  @RequirePermission('employee:profile:view')
  async getProfile(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<EmployeeProfileSummary>> {
    const employee = req.user.employeeId
      ? await this.employeeService.findById(req.user.tenantId, req.user.employeeId)
      : null;

    return ok({
      user: {
        id: req.user.id,
        tenantId: req.user.tenantId,
        employeeId: req.user.employeeId,
        roles: req.user.roles,
      },
      employee: employee ? toEmployeeProfile(employee) : null,
    });
  }
}

function toEmployeeProfile(employee: EmployeeRecord): EmployeeProfile {
  return {
    id: employee.id,
    factoryId: employee.factoryId,
    orgUnitId: employee.orgUnitId,
    empNo: employee.empNo,
    name: employee.name,
    phone: employee.phone ?? '',
    entryDate: employee.entryDate.toISOString().slice(0, 10),
    status: employee.status,
  };
}

function ok<T>(data: T): ApiSuccessResponse<T> {
  return {
    code: 0,
    message: 'success',
    data,
    requestId: randomUUID(),
  };
}
