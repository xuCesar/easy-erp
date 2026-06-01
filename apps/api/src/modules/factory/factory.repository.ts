import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EntityStatus, PrismaClient } from '@prisma/client';

export type FactoryRecord = {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  timezone: string;
  status: EntityStatus;
};

export interface FactoryRepository {
  listAccessible(tenantId: string, factoryIds?: string[]): Promise<FactoryRecord[]>;
  listByOrgUnits(tenantId: string, orgUnitIds: string[]): Promise<FactoryRecord[]>;
}

@Injectable()
export class PrismaFactoryRepository
  implements FactoryRepository, OnModuleInit, OnModuleDestroy
{
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async listAccessible(
    tenantId: string,
    factoryIds?: string[],
  ): Promise<FactoryRecord[]> {
    return this.prisma.factory.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(factoryIds ? { id: { in: factoryIds } } : {}),
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async listByOrgUnits(
    tenantId: string,
    orgUnitIds: string[],
  ): Promise<FactoryRecord[]> {
    if (orgUnitIds.length === 0) {
      return [];
    }

    const units = await this.prisma.orgUnit.findMany({
      where: {
        tenantId,
        id: { in: orgUnitIds },
        deletedAt: null,
      },
      select: {
        factoryId: true,
      },
    });
    const factoryIds = Array.from(new Set(units.map((unit) => unit.factoryId)));

    return this.listAccessible(tenantId, factoryIds);
  }
}
