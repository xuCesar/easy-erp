import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EntityStatus, OrgUnitType, PrismaClient } from '@prisma/client';

export type OrgUnitRecord = {
  id: string;
  tenantId: string;
  factoryId: string;
  parentId: string | null;
  name: string;
  type: OrgUnitType;
  sortOrder: number;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateOrgUnitInput = {
  tenantId: string;
  factoryId: string;
  parentId: string | null;
  name: string;
  type: OrgUnitType;
  sortOrder: number;
};

export type UpdateOrgUnitInput = Partial<{
  parentId: string | null;
  name: string;
  type: OrgUnitType;
  sortOrder: number;
  status: EntityStatus;
}>;

export interface OrganizationRepository {
  listByFactory(tenantId: string, factoryId: string): Promise<OrgUnitRecord[]>;
  findById(tenantId: string, id: string): Promise<OrgUnitRecord | null>;
  create(input: CreateOrgUnitInput): Promise<OrgUnitRecord>;
  update(
    tenantId: string,
    id: string,
    input: UpdateOrgUnitInput,
  ): Promise<OrgUnitRecord>;
  hasChildren(tenantId: string, id: string): Promise<boolean>;
  hasActiveEmployees(tenantId: string, id: string): Promise<boolean>;
  softDelete(tenantId: string, id: string): Promise<void>;
}

@Injectable()
export class PrismaOrganizationRepository
  implements OrganizationRepository, OnModuleInit, OnModuleDestroy
{
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async listByFactory(
    tenantId: string,
    factoryId: string,
  ): Promise<OrgUnitRecord[]> {
    return this.prisma.orgUnit.findMany({
      where: {
        tenantId,
        factoryId,
        deletedAt: null,
      },
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });
  }

  async findById(tenantId: string, id: string): Promise<OrgUnitRecord | null> {
    return this.prisma.orgUnit.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });
  }

  async create(input: CreateOrgUnitInput): Promise<OrgUnitRecord> {
    return this.prisma.orgUnit.create({
      data: {
        tenantId: input.tenantId,
        factoryId: input.factoryId,
        parentId: input.parentId,
        name: input.name,
        type: input.type,
        sortOrder: input.sortOrder,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateOrgUnitInput,
  ): Promise<OrgUnitRecord> {
    await this.assertExists(tenantId, id);

    return this.prisma.orgUnit.update({
      where: {
        id,
      },
      data: input,
    });
  }

  async hasChildren(tenantId: string, id: string): Promise<boolean> {
    const count = await this.prisma.orgUnit.count({
      where: {
        tenantId,
        parentId: id,
        deletedAt: null,
      },
    });

    return count > 0;
  }

  async hasActiveEmployees(tenantId: string, id: string): Promise<boolean> {
    const count = await this.prisma.employee.count({
      where: {
        tenantId,
        orgUnitId: id,
        deletedAt: null,
        status: {
          not: 'RESIGNED',
        },
      },
    });

    return count > 0;
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.assertExists(tenantId, id);

    await this.prisma.orgUnit.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  private async assertExists(tenantId: string, id: string): Promise<void> {
    const count = await this.prisma.orgUnit.count({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (count === 0) {
      throw new Error('Organization unit not found.');
    }
  }
}
