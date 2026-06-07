import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessTokenGuard, type AuthPrincipal } from '../../core/auth';
import { PermissionGuard, RequirePermission } from '../../core/permission';
import type { CreateRepairRequestInput } from './repair.repository';
import { RepairService } from './repair.service';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

@Controller('repair/requests')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class RepairController {
  constructor(private readonly repairService: RepairService) {}

  @Get()
  @RequirePermission('repair:request:view')
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('factoryId') factoryId?: string,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVOKED' | 'DRAFT',
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    if (!factoryId) {
      throw new BadRequestException('factoryId is required.');
    }

    return ok(
      await this.repairService.list(req.user, {
        factoryId,
        status,
        keyword: keyword ?? null,
        page: parsePositiveInt(page, 1),
        pageSize: Math.min(parsePositiveInt(pageSize, 20), 100),
      }),
    );
  }

  @Post()
  @RequirePermission('repair:request:create')
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: RepairRequestBody,
  ): Promise<unknown> {
    const employeeId = requireEmployeeId(req.user);
    assertCreateBody(body);

    return ok(
      await this.repairService.create({
        tenantId: req.user.tenantId,
        factoryId: body.factoryId,
        employeeId,
        targetDate: new Date(`${body.targetDate}T00:00:00.000Z`),
        repairType: body.repairType,
        repairAt: new Date(body.repairAt),
        reason: body.reason,
        attachments: body.attachments ?? [],
      }),
    );
  }

  @Post(':id/approve')
  @RequirePermission('repair:request:approve')
  async approve(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return ok(await this.repairService.approve(req.user, id));
  }

  @Post(':id/reject')
  @RequirePermission('repair:request:approve')
  async reject(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { rejectReason?: string },
  ): Promise<unknown> {
    if (!body.rejectReason) {
      throw new BadRequestException('rejectReason is required.');
    }

    return ok(await this.repairService.reject(req.user, id, body.rejectReason));
  }
}

type RepairRequestBody = Omit<
  CreateRepairRequestInput,
  'tenantId' | 'employeeId' | 'targetDate' | 'repairAt'
> & {
  targetDate: string;
  repairAt: string;
};

function requireEmployeeId(principal: AuthPrincipal): string {
  if (!principal.employeeId) {
    throw new ForbiddenException('Current account is not linked to employee.');
  }

  return principal.employeeId;
}

function assertCreateBody(body: RepairRequestBody): void {
  if (!body?.factoryId || !body.targetDate || !body.repairType || !body.repairAt) {
    throw new BadRequestException('Invalid repair request.');
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function ok<T>(
  data: T,
): { code: 0; message: 'success'; data: T; requestId: string } {
  return {
    code: 0,
    message: 'success',
    data,
    requestId: randomUUID(),
  };
}
