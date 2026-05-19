import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessTokenGuard, type AuthPrincipal } from '../../core/auth';
import { PermissionGuard, RequirePermission } from '../../core/permission';
import { OrganizationService } from './organization.service';
import type { CreateOrgUnitInput, UpdateOrgUnitInput } from './organization.repository';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

@Controller('org-units')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  @RequirePermission('organization:unit:view')
  async listTree(
    @Req() req: AuthenticatedRequest,
    @Query('factoryId') factoryId?: string,
  ): Promise<unknown> {
    if (!factoryId) {
      throw new BadRequestException('factoryId is required.');
    }

    return ok(
      await this.organizationService.listTree({
        tenantId: req.user.tenantId,
        factoryId,
      }),
    );
  }

  @Post()
  @RequirePermission('organization:unit:manage')
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: Omit<CreateOrgUnitInput, 'tenantId'>,
  ): Promise<unknown> {
    assertCreateOrgUnitBody(body);

    return ok(
      await this.organizationService.create({
        ...body,
        tenantId: req.user.tenantId,
      }),
    );
  }

  @Patch(':id')
  @RequirePermission('organization:unit:manage')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateOrgUnitInput,
  ): Promise<unknown> {
    return ok(await this.organizationService.update(req.user.tenantId, id, body));
  }

  @Delete(':id')
  @RequirePermission('organization:unit:manage')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    await this.organizationService.remove({
      tenantId: req.user.tenantId,
      id,
    });

    return ok(null);
  }
}

function assertCreateOrgUnitBody(
  body: Omit<CreateOrgUnitInput, 'tenantId'>,
): void {
  if (!body?.factoryId || !body.name || !body.type) {
    throw new BadRequestException('Invalid organization unit request.');
  }
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
